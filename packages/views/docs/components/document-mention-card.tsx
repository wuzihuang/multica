"use client";

import { useQuery } from "@tanstack/react-query";
import { AppLink } from "../../navigation";
import { useWorkspacePaths } from "@multica/core/paths";
import { DocumentChip } from "./document-chip";
import {
  fetchWorkspaceDocs,
  findDocById,
  workspaceDocsHref,
} from "../lib/docs-app";

interface DocumentMentionCardProps {
  /** Frontmatter document id (stable). */
  documentId: string;
  /** Fallback label when the doc cannot be resolved. */
  fallbackLabel?: string;
}

/**
 * Navigable document chip. Pure render — never enqueues an agent.
 * Resolves id → path via the workspace-docs list API, then links to
 * `/{slug}/docs?doc=<path>` so the docs page can deep-link the iframe.
 */
export function DocumentMentionCard({
  documentId,
  fallbackLabel,
}: DocumentMentionCardProps) {
  const p = useWorkspacePaths();
  const { data: docs = [] } = useQuery({
    queryKey: ["workspace-docs", "list"],
    queryFn: () => fetchWorkspaceDocs(),
    staleTime: 30_000,
    retry: 1,
  });

  const doc = findDocById(docs, documentId);
  const title =
    doc?.title ??
    stripDocEmoji(fallbackLabel) ??
    documentId.slice(0, 8);
  const href = workspaceDocsHref(p.docs(), doc?.path ?? null);

  return (
    <AppLink
      href={href}
      newTabTitle={title}
      className="document-mention inline-flex"
    >
      <DocumentChip
        title={title}
        path={doc?.path}
        className="cursor-pointer hover:bg-accent transition-colors"
      />
    </AppLink>
  );
}

/** Labels are inserted as `📄 Title` — chip shows title without the emoji. */
function stripDocEmoji(label?: string): string | undefined {
  if (!label) return undefined;
  return label.replace(/^📄\s*/, "").trim() || label;
}
