"use client";

import { useCallback, useMemo, useRef } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { usePersistedExpanded } from "@/hooks/use-persisted-expanded";
import { EmailReplySection } from "./email-reply-section";
import { EmailMessageCard } from "./email-message-card";
import { EmailThreadOutline } from "./email-thread-outline";
import {
  isNearLatest,
  orderVisibleMessages,
  scrollToLatest,
  type EmailThreadOrder,
} from "./email-conversation-utils";
import { useTicketScopedMessageSet } from "./use-ticket-scoped-message-set";
import type { ConversationTicketSummary } from "@/types/tickets";
import type { EmailComposePayload, MessageRow } from "./types";
import { isEmailMessage } from "./email-utils";

export type { EmailThreadOrder } from "./email-conversation-utils";

const CONVERSATION_EXPANDED_KEY = "ticqex.ticket-conversation.expanded.v1";

type EmailConversationTicket = Pick<
  ConversationTicketSummary,
  "title" | "channel" | "contact_address" | "contact"
> & {
  messages: MessageRow[];
};

export function EmailConversationPanel({
  ticket,
  ticketId,
  threadOrder,
  onSubmit,
  onSaveDraft,
  onUpdateDraft,
  onSendDraft,
  onDeleteDraft,
  saving,
  onToggleMessageRead,
}: {
  ticket: EmailConversationTicket;
  ticketId: string;
  threadOrder: EmailThreadOrder;
  onSubmit: (payload: EmailComposePayload) => Promise<void>;
  onSaveDraft: (payload: EmailComposePayload) => Promise<void>;
  onUpdateDraft: (id: string, payload: EmailComposePayload) => Promise<void>;
  onSendDraft: (
    id: string,
    payload: EmailComposePayload,
    includeQuote: boolean,
  ) => Promise<void>;
  onDeleteDraft: (id: string) => Promise<void>;
  saving: boolean;
  onToggleMessageRead: (messageId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef(new Map<string, HTMLDivElement>());
  const messageCountRef = useRef(0);
  const collapsedCards = useTicketScopedMessageSet(ticketId);
  const expandedBodies = useTicketScopedMessageSet(ticketId);
  const { expanded, toggleExpanded, hydrated } = usePersistedExpanded(
    CONVERSATION_EXPANDED_KEY,
    true,
  );

  const collapsedCardMessageIds = collapsedCards.messageIdsForTicket(ticketId);
  const expandedBodyMessageIds = expandedBodies.messageIdsForTicket(ticketId);

  const messages = useMemo(
    () => orderVisibleMessages(ticket.messages, threadOrder),
    [ticket.messages, threadOrder],
  );

  const lastEmailMessage = useMemo((): MessageRow | null => {
    const visible = ticket.messages.filter(
      (msg) => msg.email_delivery_status !== "draft",
    );
    if (!visible.length) return null;
    for (let i = visible.length - 1; i >= 0; i--) {
      const msg = visible[i];
      if (isEmailMessage(msg)) return msg;
    }
    return null;
  }, [ticket.messages]);

  const contactEmail =
    ticket.contact_address ?? ticket.contact?.username ?? "";
  const showOutline = messages.length > 1;

  function setMessageRef(messageId: string, node: HTMLDivElement | null) {
    if (node) {
      messageRefs.current.set(messageId, node);
      return;
    }
    messageRefs.current.delete(messageId);
  }

  function scrollToMessage(messageId: string) {
    const node = messageRefs.current.get(messageId);
    if (!node) return;
    node.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function jumpToMessage(messageId: string) {
    collapsedCards.remove(ticketId, messageId);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollToMessage(messageId));
    });
  }

  function collapseAllMessageCards() {
    collapsedCards.replaceAll(
      ticketId,
      new Set(messages.map((msg) => msg.id)),
    );
    expandedBodies.clear(ticketId);
  }

  function expandAllMessageCards() {
    collapsedCards.clear(ticketId);
  }

  const setScrollContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node;
      if (!node || messages.length === 0) return;

      const countChanged = messages.length !== messageCountRef.current;
      messageCountRef.current = messages.length;

      if (!countChanged && !isNearLatest(node, threadOrder)) return;

      scrollToLatest(node, threadOrder);
      window.requestAnimationFrame(() => scrollToLatest(node, threadOrder));
    },
    [messages.length, threadOrder],
  );


  return (
    <div className="flex min-h-0 flex-[3] flex-col overflow-hidden border-t border-border">
      <button
        type="button"
        className="flex w-full shrink-0 items-center gap-2 border-b border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
        aria-expanded={expanded}
        onClick={toggleExpanded}
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" />
        )}
        Conversation
        {!expanded && (
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {messages.length}{" "}
            {messages.length === 1 ? "message" : "messages"}
          </span>
        )}
      </button>
      {hydrated && expanded && (
        <>
          {showOutline && (
            <EmailThreadOutline
              messages={messages}
              collapsedCardMessageIds={collapsedCardMessageIds}
              onJumpToMessage={jumpToMessage}
              onCollapseAll={collapseAllMessageCards}
              onExpandAll={expandAllMessageCards}
            />
          )}
          <div
            ref={setScrollContainerRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="space-y-3 p-4">
              {messages.map((msg) => (
                <EmailMessageCard
                  key={msg.id}
                  message={msg}
                  ticket={ticket}
                  isCardCollapsed={collapsedCardMessageIds.has(msg.id)}
                  isBodyExpanded={expandedBodyMessageIds.has(msg.id)}
                  onToggleCardCollapsed={() =>
                    collapsedCards.toggle(ticketId, msg.id)
                  }
                  onToggleBodyExpanded={() =>
                    expandedBodies.toggle(ticketId, msg.id)
                  }
                  onToggleMessageRead={() => onToggleMessageRead(msg.id)}
                  setMessageRef={(node) => setMessageRef(msg.id, node)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {ticket.channel === "email" && (
        <EmailReplySection
          ticketId={ticketId}
          contactEmail={contactEmail}
          ticketTitle={ticket.title}
          lastEmailMessage={lastEmailMessage}
          onSubmit={onSubmit}
          onSaveDraft={onSaveDraft}
          onUpdateDraft={onUpdateDraft}
          onSendDraft={onSendDraft}
          onDeleteDraft={onDeleteDraft}
          saving={saving}
        />
      )}
    </div>
  );
}
