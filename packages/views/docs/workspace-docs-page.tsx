"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { useWorkspacePaths } from "@multica/core/paths";
import { Button } from "@multica/ui/components/ui/button";
import { useT } from "../i18n";
import { docsAppEmbedUrl, resolveDocsAppUrl } from "./lib/docs-app";

function readDocPathFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("doc") || params.get("path");
}

/**
 * Workspace-scoped Docs surface: embeds the Feishu-style Tiptap editor from
 * the workspace-docs service (Markdown true source under docs/).
 *
 * Deep link: `/{slug}/docs?doc=<path-relative-to-docs/>` opens that file in the
 * iframe (workspace-docs `#/doc/<path>` contract).
 */
export function WorkspaceDocsPage() {
  const { t } = useT("docs");
  const wsPaths = useWorkspacePaths();
  const [docPath, setDocPath] = useState<string | null>(null);

  useEffect(() => {
    setDocPath(readDocPathFromLocation());
    const onPop = () => setDocPath(readDocPathFromLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const base = useMemo(() => resolveDocsAppUrl(), []);
  const iframeSrc = useMemo(() => {
    if (!base) return "";
    return docsAppEmbedUrl(docPath);
  }, [base, docPath]);

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
        key={iframeSrc}
        title={t(($) => $.page.title)}
        src={iframeSrc}
        className="h-full w-full border-0 bg-background"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
