"use client";

import { FileText } from "lucide-react";
import { cn } from "@multica/ui/lib/utils";

/**
 * Compact presentational chip for a workspace document — mirror of ProjectChip.
 * Not a link; DocumentMentionCard wraps it for navigation.
 */
export interface DocumentChipProps {
  /** Display title (usually frontmatter title). */
  title: string;
  /** Optional path under docs/ for secondary display. */
  path?: string | null;
  className?: string;
}

const BASE_CLASS =
  "document-chip inline-flex items-center gap-1.5 rounded-md border mx-0.5 px-2 py-0.5 text-caption max-w-72";

export function DocumentChip({ title, path, className }: DocumentChipProps) {
  return (
    <span
      className={cn(BASE_CLASS, className)}
      data-testid="document-chip"
      title={path ?? title}
    >
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate text-foreground">{title}</span>
    </span>
  );
}
