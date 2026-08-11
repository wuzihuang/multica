"use client";

import { StickyNote } from "lucide-react";
import { cn } from "@multica/ui/lib/utils";

/**
 * Compact presentational chip for a Notion page — mirror of DocumentChip.
 * Not a link; NotionMentionCard wraps it for navigation.
 */
export interface NotionChipProps {
  title: string;
  /** Optional secondary line (URL host or id snippet). */
  subtitle?: string | null;
  className?: string;
}

const BASE_CLASS =
  "notion-chip inline-flex items-center gap-1.5 rounded-md border mx-0.5 px-2 py-0.5 text-caption max-w-72";

export function NotionChip({ title, subtitle, className }: NotionChipProps) {
  return (
    <span
      className={cn(BASE_CLASS, className)}
      data-testid="notion-chip"
      title={subtitle ?? title}
    >
      <StickyNote className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate text-foreground">{title}</span>
    </span>
  );
}
