"use client";

import { useMemo } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { useCurrentWorkspace } from "@multica/core/paths";

/**
 * Workspace docs surface.
 *
 * Multica does not ship a first-party document store yet. This page embeds the
 * workspace-docs app (Markdown + Tiptap) so the sidebar entry is usable once the
 * app is deployed and NEXT_PUBLIC_WORKSPACE_DOCS_URL is set.
 */
function resolveDocsAppUrl(): string {
  if (typeof process !== "undefined") {
    const fromEnv =
      process.env.NEXT_PUBLIC_WORKSPACE_DOCS_URL ||
      process.env.NEXT_PUBLIC_DOCS_APP_URL;
    if (fromEnv?.trim()) return fromEnv.trim().replace(/\/$/, "");
  }
  // Self-host default for this workspace until env is wired on the Multica web image.
  return "https://workspace-docs.zephwu.com";
}

export function WorkspaceDocsPage() {
  const workspace = useCurrentWorkspace();
  const docsUrl = useMemo(() => resolveDocsAppUrl(), []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {workspace?.name ? `${workspace.name} · 文档` : "工作区文档"}
            </div>
            <div className="truncate text-caption text-muted-foreground">
              侧栏「配置 → 文档」。真源：workspace-docs 仓库 docs/**/*.md（Agent 可写回）
            </div>
          </div>
        </div>
        <a
          href={docsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-body font-medium hover:bg-muted"
        >
          <ExternalLink className="size-3.5" />
          新窗口打开
        </a>
      </div>
      <div className="min-h-0 flex-1 bg-muted/20">
        <iframe
          title="Workspace Docs"
          src={docsUrl}
          className="h-full w-full border-0"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
