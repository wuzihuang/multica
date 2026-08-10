"use client";

import { useMemo } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { useWorkspacePaths } from "@multica/core/paths";
import { Button } from "@multica/ui/components/ui/button";
import { useT } from "../i18n";

/**
 * Resolve the public URL of the Workspace Docs service.
 *
 * Set `NEXT_PUBLIC_WORKSPACE_DOCS_URL` at web build/runtime (e.g.
 * `https://docs.example.com` or a reverse-proxied path on the same host).
 * When unset, we show setup instructions instead of a blank iframe.
 */
function resolveDocsBaseUrl(): string {
  const raw =
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_WORKSPACE_DOCS_URL) ||
    "";
  return raw.replace(/\/+$/, "");
}

/**
 * Workspace-scoped Docs surface: embeds the Feishu-style Tiptap editor from
 * the `workspace-docs` service (Markdown true source in `docs/**/*.md`).
 */
export function WorkspaceDocsPage() {
  const { t } = useT("docs");
  const wsPaths = useWorkspacePaths();
  const base = useMemo(() => resolveDocsBaseUrl(), []);

  const iframeSrc = useMemo(() => {
    if (!base) return "";
    try {
      const absolute = /^https?:\/\//i.test(base)
        ? new URL(base)
        : new URL(
            base,
            typeof window !== "undefined"
              ? window.location.origin
              : "http://localhost",
          );
      absolute.searchParams.set("embed", "1");
      return absolute.toString();
    } catch {
      const sep = base.includes("?") ? "&" : "?";
      return `${base}${sep}embed=1`;
    }
  }, [base]);

  if (!base) {
    return (
      <div className="absolute inset-0 flex min-h-0 flex-col overflow-auto">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <FileText className="size-4 text-muted-foreground" />
          <h1 className="text-body font-medium">{t(($) => $.page.title)}</h1>
        </div>
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-6">
          <p className="text-body text-muted-foreground">
            {t(($) => $.setup.lead)}
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-caption text-muted-foreground">
            <li>{t(($) => $.setup.step_deploy)}</li>
            <li>{t(($) => $.setup.step_env)}</li>
            <li>{t(($) => $.setup.step_rebuild)}</li>
          </ol>
          <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-micro leading-relaxed">
{`# docker compose (sidecar)
workspace-docs:
  build: ../workspace-docs
  ports: ["5177:5177"]
  volumes:
    - workspace_docs_data:/app/docs

# Multica web env
NEXT_PUBLIC_WORKSPACE_DOCS_URL=https://docs.<your-host>`}
          </pre>
          <p className="text-caption text-muted-foreground">
            {t(($) => $.setup.local_hint)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              render={
                <a
                  href="https://github.com/wuzihuang/workspace-docs"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <ExternalLink className="size-3.5" />
              {t(($) => $.setup.open_repo)}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              render={<a href={wsPaths.projects()} />}
            >
              {t(($) => $.setup.back_projects)}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 min-h-0">
      <iframe
        title={t(($) => $.page.title)}
        src={iframeSrc}
        className="h-full w-full border-0 bg-background"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
