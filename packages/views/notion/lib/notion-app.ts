/**
 * Client helpers for the in-product Notion hub (embed + recent pages + mentions).
 *
 * Notion's main app refuses iframe embedding (X-Frame-Options: SAMEORIGIN /
 * frame-ancestors self). We never iframe notion.so / notion.com by default —
 * the hub opens pages externally and only embeds when the URL is known to allow
 * framing (public notion.site pages, or an operator-configured embed base).
 */

export type NotionPageListItem = {
  /** Stable page id (32-hex from Notion URL, or full URL hash). */
  id: string;
  title: string;
  /** Absolute https URL to open the page in Notion. */
  url: string;
  updatedAt: string;
};

const RECENT_KEY = "multica.notion.recent_pages";
const RECENT_MAX = 40;

/** Default Notion workspace home (always open in a new tab — not embeddable). */
export const DEFAULT_NOTION_HOME = "https://www.notion.so";

/**
 * True when a URL is likely allowed inside a cross-origin iframe.
 * - `*.notion.site` public share sites often allow framing
 * - Operator-configured embed bases that are NOT the main Notion app
 * Main app hosts (notion.so / notion.com / app.notion.com) always return false.
 */
export function isNotionEmbeddableUrl(url: string): boolean {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = u.hostname.toLowerCase();
    if (
      host === "www.notion.so" ||
      host === "notion.so" ||
      host === "www.notion.com" ||
      host === "notion.com" ||
      host === "app.notion.com"
    ) {
      return false;
    }
    // Public Notion share sites
    if (host.endsWith(".notion.site") || host === "notion.site") {
      return true;
    }
    // Explicit operator embed URL on another host (or path) is trusted
    const configured = resolveConfiguredEmbedBase();
    if (configured) {
      try {
        const base = new URL(configured);
        if (host === base.hostname.toLowerCase()) return true;
      } catch {
        // ignore bad env
      }
    }
    return false;
  } catch {
    return false;
  }
}

function resolveConfiguredEmbedBase(): string | null {
  if (typeof process === "undefined") return null;
  const fromEnv = process.env.NEXT_PUBLIC_NOTION_EMBED_URL;
  if (!fromEnv?.trim()) return null;
  return fromEnv.trim().replace(/\/$/, "");
}

/**
 * Base URL for the Notion embed iframe, or null when nothing is safely embeddable.
 * - NEXT_PUBLIC_NOTION_EMBED_URL: public share / embed-capable URL only
 * - Does NOT fall back to the main Notion app (would show "refused to connect")
 */
export function resolveNotionEmbedUrl(): string | null {
  const configured = resolveConfiguredEmbedBase();
  if (configured && isNotionEmbeddableUrl(configured)) return configured;
  return null;
}

/** Workspace home link used by "Open Notion" actions. */
export function resolveNotionHomeUrl(): string {
  if (typeof process !== "undefined") {
    const fromEnv =
      process.env.NEXT_PUBLIC_NOTION_HOME_URL ||
      process.env.NEXT_PUBLIC_NOTION_EMBED_URL;
    if (fromEnv?.trim()) return fromEnv.trim().replace(/\/$/, "");
  }
  return DEFAULT_NOTION_HOME;
}

/**
 * Extract a 32-char hex Notion page id from a URL or raw id string.
 * Notion ids often appear with hyphens (UUID style) at the end of the path.
 */
export function extractNotionPageId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  // Bare 32-hex
  if (/^[a-f0-9]{32}$/i.test(raw)) return raw.toLowerCase();
  // UUID with hyphens
  const uuid = raw.replace(/-/g, "");
  if (/^[a-f0-9]{32}$/i.test(uuid) && raw.includes("-")) {
    return uuid.toLowerCase();
  }

  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (
      !/(^|\.)notion\.(so|site)$/i.test(u.hostname) &&
      !/(^|\.)notion\.com$/i.test(u.hostname) &&
      u.hostname !== "app.notion.com"
    ) {
      // Still try path/id extraction for app.notion.com/p/<id>
    }
    // app.notion.com/p/<id>
    const appP = u.pathname.match(/\/p\/([a-f0-9]{32})/i);
    if (appP?.[1]) return appP[1].toLowerCase();
    // ...-Title-<32hex> or trailing 32hex
    const pathId = u.pathname.match(/([a-f0-9]{32})(?:\/)?$/i);
    if (pathId?.[1]) return pathId[1].toLowerCase();
    // UUID-style at end
    const pathUuid = u.pathname.match(
      /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
    );
    if (pathUuid?.[1]) return pathUuid[1].replace(/-/g, "").toLowerCase();
  } catch {
    // not a URL
  }

  // Loose: last 32-hex run in the string
  const loose = raw.match(/([a-f0-9]{32})/i);
  return loose?.[1]?.toLowerCase() ?? null;
}

/** Build a canonical Notion open URL for a page id (or pass through full URLs). */
export function notionPageUrl(idOrUrl: string): string {
  const trimmed = idOrUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const id = extractNotionPageId(trimmed) ?? trimmed.replace(/-/g, "");
  return `${DEFAULT_NOTION_HOME}/${id}`;
}

/**
 * Iframe src for the hub, or null when embedding would only show a browser
 * "refused to connect" error. Prefer opening those URLs externally.
 */
export function notionEmbedSrc(pageIdOrUrl?: string | null): string | null {
  if (pageIdOrUrl?.trim()) {
    const url = notionPageUrl(pageIdOrUrl.trim());
    if (!isNotionEmbeddableUrl(url)) return null;
    try {
      const u = new URL(url);
      // Public share pages sometimes honor embed=true
      if (!u.searchParams.has("embed")) u.searchParams.set("embed", "true");
      return u.toString();
    } catch {
      return url;
    }
  }
  return resolveNotionEmbedUrl();
}

/** Multica in-app Notion route with optional page deep-link. */
export function notionHubHref(
  notionBasePath: string,
  pageIdOrUrl?: string | null,
): string {
  if (!pageIdOrUrl?.trim()) return notionBasePath;
  const id = extractNotionPageId(pageIdOrUrl) ?? pageIdOrUrl.trim();
  const sep = notionBasePath.includes("?") ? "&" : "?";
  return `${notionBasePath}${sep}page=${encodeURIComponent(id)}`;
}

function readRecent(): NotionPageListItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NotionPageListItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecent(pages: NotionPageListItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(pages.slice(0, RECENT_MAX)));
  } catch {
    // quota / private mode
  }
}

/** List recently opened/saved Notion pages (local to this browser). */
export function listRecentNotionPages(): NotionPageListItem[] {
  return readRecent();
}

/** Upsert a page into the recent list (newest first). */
export function rememberNotionPage(input: {
  id?: string | null;
  title: string;
  url: string;
}): NotionPageListItem {
  const id =
    (input.id && extractNotionPageId(input.id)) ||
    extractNotionPageId(input.url) ||
    hashUrlId(input.url);
  const item: NotionPageListItem = {
    id,
    title: input.title.trim() || "Notion page",
    url: notionPageUrl(input.url),
    updatedAt: new Date().toISOString(),
  };
  const rest = readRecent().filter((p) => p.id !== item.id);
  writeRecent([item, ...rest]);
  return item;
}

export function filterNotionPages(
  pages: NotionPageListItem[],
  query: string,
  limit = 20,
): NotionPageListItem[] {
  const q = query.trim().toLowerCase();
  const matched = q
    ? pages.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.url.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q),
      )
    : pages;
  return matched.slice(0, limit);
}

export function findNotionPageById(
  pages: NotionPageListItem[],
  id: string,
): NotionPageListItem | undefined {
  const needle = extractNotionPageId(id) ?? id.toLowerCase();
  return pages.find((p) => p.id === needle || p.id === id);
}

function hashUrlId(url: string): string {
  // Stable short id when we cannot parse a Notion page id.
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = (h * 31 + url.charCodeAt(i)) >>> 0;
  }
  return `url_${h.toString(16)}`;
}
