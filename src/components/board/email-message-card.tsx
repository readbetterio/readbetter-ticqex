"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { EnvelopeIcon, EnvelopeOpenIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { EmailMessageBody } from "./email-message-body";
import { EmailMessageHeader } from "./email-message-header";
import {
  messagePreview,
  messageSubject,
} from "./email-conversation-utils";
import { messageSenderEmail } from "./email-utils";
import type { ConversationTicketSummary } from "@/types/tickets";
import type { MessageRow } from "./types";

type EmailMessageTicketContext = Pick<
  ConversationTicketSummary,
  "contact_address" | "contact"
>;

export function EmailMessageCard({
  message,
  ticket,
  isCardCollapsed,
  isBodyExpanded,
  onToggleCardCollapsed,
  onToggleBodyExpanded,
  onToggleMessageRead,
  setMessageRef,
}: {
  message: MessageRow;
  ticket: EmailMessageTicketContext;
  isCardCollapsed: boolean;
  isBodyExpanded: boolean;
  onToggleCardCollapsed: () => void;
  onToggleBodyExpanded: () => void;
  onToggleMessageRead: () => void;
  setMessageRef: (node: HTMLDivElement | null) => void;
}) {
  const isIncoming = message.author_type === "contact";
  const isOutbound = !isIncoming;
  const isUnread = isIncoming && message.read === false;
  const cardBackgroundClass = isUnread ? "bg-primary/5" : "bg-muted/50";

  return (
    <div
      ref={setMessageRef}
      className={cn(
        "relative isolate rounded-lg border border-transparent p-3 text-sm ring-1 ring-foreground/5",
        isUnread && "border-primary/30",
        cardBackgroundClass,
      )}
    >
      <div
        className={cn(
          "-mx-3 -mt-3 mb-2 rounded-t-lg px-3 pt-3",
          !isCardCollapsed &&
            "sticky top-0 z-20 border-b border-border/60 pb-2 shadow-sm",
          isCardCollapsed && "pb-0",
          !isCardCollapsed && "bg-background",
          isCardCollapsed && cardBackgroundClass,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-start gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="shrink-0 text-muted-foreground"
                aria-expanded={!isCardCollapsed}
                aria-label={
                  isCardCollapsed
                    ? "Expand message card"
                    : "Collapse message card"
                }
                onClick={onToggleCardCollapsed}
              >
                {isCardCollapsed ? (
                  <ChevronRight className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </Button>
              <time
                dateTime={message.created_at}
                className="shrink-0 pt-1 text-xs tabular-nums text-muted-foreground"
              >
                {new Date(message.created_at).toLocaleString()}
              </time>
            </div>

            <p className="truncate pl-7 text-sm font-medium text-foreground">
              {messageSenderEmail(message, ticket)}
            </p>
          </div>

          {isIncoming && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className={cn(
                    "shrink-0 text-muted-foreground",
                    isUnread && "text-primary",
                  )}
                  aria-label={isUnread ? "Mark as read" : "Mark as unread"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleMessageRead();
                  }}
                >
                  {isUnread ? (
                    <EnvelopeOpenIcon weight="fill" />
                  ) : (
                    <EnvelopeIcon />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {isUnread ? "Mark as read" : "Mark as unread"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {!isCardCollapsed && (
          <div className="mt-2 pl-7">
            <EmailMessageHeader message={message} isOutbound={isOutbound} />
          </div>
        )}
      </div>

      {isCardCollapsed ? (
        <button
          type="button"
          className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/30"
          onClick={onToggleCardCollapsed}
        >
          <p className="truncate text-sm font-medium text-foreground">
            {messageSubject(message)}
          </p>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {messagePreview(message)}
          </p>
        </button>
      ) : (
        <div className="pl-7">
          <EmailMessageBody
            message={message}
            emphasize={isUnread}
            expanded={isBodyExpanded}
            onToggleExpanded={onToggleBodyExpanded}
          />
        </div>
      )}
    </div>
  );
}
