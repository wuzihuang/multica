"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Link2,
  Loader2,
  Plug,
  StickyNote,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspacePaths } from "@multica/core/paths";
import { api } from "@multica/core/api";
import { composioConnectionsOptions } from "@multica/core/composio";
import { Button } from "@multica/ui/components/ui/button";
import { Input } from "@multica/ui/components/ui/input";
import { useT } from "../i18n";
import {
  extractNotionPageId,
  listRecentNotionPages,
  notionEmbedSrc,
  notionHubHref,
  notionPageUrl,
  rememberNotionPage,
  resolveNotionHomeUrl,
  type NotionPageListItem,
} from "./lib/notion-app";

function readPageFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("page") || params.get("url");
}

/**
 * Workspace-scoped Notion surface: keeps Multica left nav, fills the right
 * content area with Notion (iframe embed when allowed) plus a recent-pages
 * rail that feeds bubble @notion mentions.
 *
 * Deep link: `/{slug}/notion?page=<id-or-url>` focuses that page.
 */
export function NotionPage() {
  const { t } = useT("notion");
  const wsPaths = useWorkspacePaths();
  const [pageRef, setPageRef] = useState<string | null>(null);
  const [recent, setRecent] = useState<NotionPageListItem[]>([]);
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [embedBlocked, setEmbedBlocked] = useState(false);

  const connectionsQuery = useQuery(composioConnectionsOptions());
  const notionConnected = useMemo(() => {
    return (connectionsQuery.data ?? []).some(
      (c) => c.toolkit_slug === "notion" && c.status === "active",
    );
  }, [connectionsQuery.data]);

  const refreshRecent = useCallback(() => {
    setRecent(listRecentNotionPages());
  }, []);

  useEffect(() => {
    setPageRef(readPageFromLocation());
    refreshRecent();
    const onPop = () => {
      setPageRef(readPageFromLocation());
      refreshRecent();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("storage", refreshRecent);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("storage", refreshRecent);
    };
  }, [refreshRecent]);

  const iframeSrc = useMemo(() => notionEmbedSrc(pageRef), [pageRef]);
  const canEmbed = Boolean(iframeSrc);
  const externalUrl = useMemo(
    () => (pageRef ? notionPageUrl(pageRef) : resolveNotionHomeUrl()),
    [pageRef],
  );

  // Reset embed error state when the src changes (only relevant when we actually iframe).
  useEffect(() => {
    setEmbedBlocked(false);
  }, [iframeSrc]);

  const openPage = useCallback(
    (idOrUrl: string, title?: string) => {
      const id = extractNotionPageId(idOrUrl) ?? idOrUrl.trim();
      const url = notionPageUrl(idOrUrl);
      rememberNotionPage({
        id,
        title: title || id.slice(0, 12),
        url,
      });
      refreshRecent();
      const href = notionHubHref(wsPaths.notion(), id);
      window.history.pushState({}, "", href);
      setPageRef(id);
      setEmbedBlocked(false);
    },
    [refreshRecent, wsPaths],
  );

  const handlePasteSave = () => {
    const url = pasteUrl.trim();
    if (!url) return;
    const id = extractNotionPageId(url);
    if (!id && !/^https?:\/\//i.test(url)) return;
    openPage(url, pasteTitle.trim() || undefined);
    setPasteUrl("");
    setPasteTitle("");
  };

  const handleConnectNotion = async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const { redirect_url } = await api.beginComposioConnect("notion");
      window.location.href = redirect_url;
    } catch {
      setConnecting(false);
    }
  };

  return (
    <div className="absolute inset-0 flex min-h-0 flex-col">
      {/* Toolbar — Multica chrome; left product nav stays outside this page. */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2">
        <StickyNote className="size-4 text-muted-foreground" />
        <h1 className="text-body font-medium">{t(($) => $.page.title)}</h1>
        <span className="text-caption text-muted-foreground hidden sm:inline">
          {notionConnected
            ? t(($) => $.status.connected)
            : t(($) => $.status.not_connected)}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!notionConnected && (
            <Button
              variant="outline"
              size="sm"
              disabled={connecting}
              onClick={() => void handleConnectNotion()}
            >
              {connecting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plug className="size-3.5" />
              )}
              {t(($) => $.actions.connect)}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            render={
              <a href={externalUrl} target="_blank" rel="noopener noreferrer" />
            }
          >
            <ExternalLink className="size-3.5" />
            {t(($) => $.actions.open_external)}
          </Button>
          {notionConnected && (
            <Button
              variant="ghost"
              size="sm"
              render={<a href={wsPaths.settings() + "?tab=integrations"} />}
            >
              {t(($) => $.actions.manage_integration)}
            </Button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Recent / pin rail — feeds bubble @notion mentions */}
        <aside className="flex w-64 shrink-0 flex-col border-r bg-muted/20">
          <div className="border-b p-3 space-y-2">
            <p className="text-caption font-medium">
              {t(($) => $.rail.add_title)}
            </p>
            <Input
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              placeholder={t(($) => $.rail.title_placeholder)}
              className="h-8 text-caption"
            />
            <Input
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              placeholder={t(($) => $.rail.url_placeholder)}
              className="h-8 text-caption"
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePasteSave();
              }}
            />
            <Button
              size="sm"
              className="w-full"
              variant="secondary"
              onClick={handlePasteSave}
              disabled={!pasteUrl.trim()}
            >
              <Link2 className="size-3.5" />
              {t(($) => $.rail.save)}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            <p className="px-1 pb-1 text-micro uppercase tracking-wide text-muted-foreground">
              {t(($) => $.rail.recent)}
            </p>
            {recent.length === 0 ? (
              <p className="px-1 text-caption text-muted-foreground">
                {t(($) => $.rail.empty)}
              </p>
            ) : (
              <ul className="space-y-0.5">
                {recent.map((page) => {
                  const active =
                    pageRef &&
                    (page.id === pageRef ||
                      page.id === extractNotionPageId(pageRef));
                  return (
                    <li key={page.id}>
                      <button
                        type="button"
                        className={`flex w-full flex-col rounded-md px-2 py-1.5 text-left text-caption transition-colors ${
                          active
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        }`}
                        onClick={() => openPage(page.url, page.title)}
                      >
                        <span className="truncate font-medium">{page.title}</span>
                        <span className="truncate text-micro text-muted-foreground">
                          {page.id.slice(0, 12)}…
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="border-t p-3 text-micro text-muted-foreground leading-relaxed">
            {t(($) => $.rail.mention_hint)}
          </div>
        </aside>

        {/* Main Notion area — never iframe www.notion.com (X-Frame-Options). */}
        <div className="relative min-h-0 min-w-0 flex-1 bg-background">
          {canEmbed && iframeSrc ? (
            <>
              <iframe
                key={iframeSrc}
                title={t(($) => $.page.title)}
                src={iframeSrc}
                className="h-full w-full border-0 bg-background"
                allow="clipboard-read; clipboard-write; fullscreen"
                referrerPolicy="no-referrer-when-downgrade"
                onError={() => setEmbedBlocked(true)}
              />
              <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-lg border bg-background/95 px-3 py-2 shadow-md backdrop-blur">
                <p className="pointer-events-none text-caption text-muted-foreground max-w-md text-center">
                  {embedBlocked
                    ? t(($) => $.embed.blocked)
                    : t(($) => $.embed.hint)}
                </p>
                <Button
                  size="sm"
                  className="pointer-events-auto"
                  render={
                    <a
                      href={externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <ExternalLink className="size-3.5" />
                  {t(($) => $.actions.open_external)}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl border bg-muted/40">
                <StickyNote className="size-7 text-muted-foreground" />
              </div>
              <div className="max-w-md space-y-2">
                <h2 className="text-body font-medium">
                  {t(($) => $.embed.fallback_title)}
                </h2>
                <p className="text-caption text-muted-foreground leading-relaxed">
                  {t(($) => $.embed.fallback_body)}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  size="default"
                  render={
                    <a
                      href={externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <ExternalLink className="size-3.5" />
                  {t(($) => $.actions.open_external)}
                </Button>
                {!notionConnected && (
                  <Button
                    variant="outline"
                    size="default"
                    disabled={connecting}
                    onClick={() => void handleConnectNotion()}
                  >
                    {connecting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plug className="size-3.5" />
                    )}
                    {t(($) => $.actions.connect)}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
