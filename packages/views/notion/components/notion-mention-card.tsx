"use client";

import { useMemo } from "react";
import { AppLink } from "../../navigation";
import { useWorkspacePaths } from "@multica/core/paths";
import { NotionChip } from "./notion-chip";
import {
  findNotionPageById,
  listRecentNotionPages,
  notionHubHref,
  notionPageUrl,
} from "../lib/notion-app";

interface NotionMentionCardProps {
  /** Notion page id (32-hex) or stored key. */
  pageId: string;
  /** Fallback label when the page is not in recent cache. */
  fallbackLabel?: string;
}

/**
 * Navigable Notion chip. Pure render — never enqueues an agent.
 * Prefers opening the Multica Notion hub deep-link; chip also carries
 * the absolute Notion URL via title/tooltip for copy/open.
 */
export function NotionMentionCard({
  pageId,
  fallbackLabel,
}: NotionMentionCardProps) {
  const p = useWorkspacePaths();
  const recent = useMemo(() => listRecentNotionPages(), [pageId]);
  const page = findNotionPageById(recent, pageId);
  const title =
    page?.title ??
    stripNotionEmoji(fallbackLabel) ??
    pageId.slice(0, 8);
  const externalUrl = page?.url ?? notionPageUrl(pageId);
  // In-app hub keeps left nav; deep-links the selected page.
  const href = notionHubHref(p.notion(), pageId);

  return (
    <AppLink
      href={href}
      newTabTitle={title}
      className="notion-mention inline-flex"
      title={externalUrl}
    >
      <NotionChip
        title={title}
        subtitle={externalUrl}
        className="cursor-pointer hover:bg-accent transition-colors"
      />
    </AppLink>
  );
}

/** Labels are inserted as `📓 Title` — chip shows title without the emoji. */
function stripNotionEmoji(label?: string): string | undefined {
  if (!label) return undefined;
  return label.replace(/^📓\s*/, "").trim() || label;
}
