"use client";

import { Badge } from "@/components/ui/badge";
import type { TicketComment } from "@/types/comments";

export function formatCommentAuthor(comment: TicketComment): string {
  return comment.author_label || "Unknown";
}

export function CommentAuthorLabel({ comment }: { comment: TicketComment }) {
  const label = formatCommentAuthor(comment);
  const isApiKey = comment.author_type === "api_key";

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate text-sm font-medium text-foreground">
        {label}
      </span>
      {isApiKey ? (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          API
        </Badge>
      ) : null}
    </div>
  );
}
