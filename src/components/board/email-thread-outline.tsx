"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  messagePreview,
  messageSubject,
} from "./email-conversation-utils";
import type { MessageRow } from "./types";

export function EmailThreadOutline({
  messages,
  collapsedCardMessageIds,
  onJumpToMessage,
  onCollapseAll,
  onExpandAll,
}: {
  messages: MessageRow[];
  collapsedCardMessageIds: Set<string>;
  onJumpToMessage: (messageId: string) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}) {
  return (
    <div className="shrink-0 border-b border-border bg-background px-4 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Outline
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onCollapseAll}
          >
            Collapse all
          </Button>
          <Button type="button" variant="ghost" size="xs" onClick={onExpandAll}>
            Expand all
          </Button>
        </div>
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {messages.map((msg, index) => {
          const isCardCollapsed = collapsedCardMessageIds.has(msg.id);
          return (
            <button
              key={msg.id}
              type="button"
              className={cn(
                "flex max-w-56 shrink-0 flex-col rounded-md border border-border bg-background px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/50",
                !isCardCollapsed && "border-primary/30 bg-primary/5",
              )}
              onClick={() => onJumpToMessage(msg.id)}
            >
              <span className="truncate font-medium text-foreground">
                {index + 1}. {messageSubject(msg)}
              </span>
              <span className="mt-0.5 truncate text-muted-foreground">
                {messagePreview(msg)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
