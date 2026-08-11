/**
 * Client helpers for the external workspace-docs app (iframe + REST list API).
 *
 * Document mentions use frontmatter `id` as the stable entity key. Path is
 * mutable; the list API resolves id → path for navigation.
 */

export type WorkspaceDocListItem = {
  id: string;
  title: string;
  path: string;
  updatedAt: string;
};

/** Resolve the base URL of the workspace-docs app (no trailing slash). */
export function resolveDocsAppUrl(): string {
  if (typeof process !== "undefined") {
    const fromEnv =
      process.env.NEXT_PUBLIC_WORKSPACE_DOCS_URL ||
      process.env.NEXT_PUBLIC_DOCS_APP_URL;
    if (fromEnv?.trim()) return fromEnv.trim().replace(/\/$/, "");
  }
  // Same-origin reverse proxy default (Zeabur: /docs-app → workspace-docs).
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/docs-app`;
  }
  return "https://multica.zephwu.com/docs-app";
}

/**
 * Build an embeddable iframe URL that opens a specific doc when path is set.
 * Deep link contract (workspace-docs): `#/doc/<path>` or `?path=` + `?embed=1`.
 */
export function docsAppEmbedUrl(docPath?: string | null): string {
  const base = resolveDocsAppUrl();
  const params = new URLSearchParams({ embed: "1" });
  if (docPath?.trim()) {
    params.set("path", docPath.trim());
  }
  const hash = docPath?.trim()
    ? `#/doc/${encodeURIComponent(docPath.trim())}`
    : "";
  return `${base}/?${params.toString()}${hash}`;
}

/** Multica in-app docs route with optional deep-link query. */
export function workspaceDocsHref(
  docsBasePath: string,
  docPath?: string | null,
): string {
  if (!docPath?.trim()) return docsBasePath;
  const sep = docsBasePath.includes("?") ? "&" : "?";
  return `${docsBasePath}${sep}doc=${encodeURIComponent(docPath.trim())}`;
}

let listCache: { at: number; docs: WorkspaceDocListItem[] } | null = null;
const LIST_TTL_MS = 30_000;

/** List workspace docs from the docs app API (`GET /api/docs`). */
export async function fetchWorkspaceDocs(options?: {
  signal?: AbortSignal;
  force?: boolean;
}): Promise<WorkspaceDocListItem[]> {
  const now = Date.now();
  if (
    !options?.force &&
    listCache &&
    now - listCache.at < LIST_TTL_MS
  ) {
    return listCache.docs;
  }

  const base = resolveDocsAppUrl();
  const res = await fetch(`${base}/api/docs`, {
    signal: options?.signal,
    credentials: "omit",
  });
  if (!res.ok) {
    throw new Error(`docs list failed: ${res.status}`);
  }
  const data = (await res.json()) as { docs?: WorkspaceDocListItem[] };
  const docs = Array.isArray(data.docs) ? data.docs : [];
  listCache = { at: now, docs };
  return docs;
}

/** Client-side filter by title or path (case-insensitive substring). */
export function filterWorkspaceDocs(
  docs: WorkspaceDocListItem[],
  query: string,
  limit = 20,
): WorkspaceDocListItem[] {
  const q = query.trim().toLowerCase();
  const matched = q
    ? docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.path.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q),
      )
    : docs;
  return matched.slice(0, limit);
}

export function findDocById(
  docs: WorkspaceDocListItem[],
  id: string,
): WorkspaceDocListItem | undefined {
  return docs.find((d) => d.id === id);
}
