"use client";

import { Suspense } from "react";
import { EmailConversationPanel } from "./email-conversation-panel";
import { TicketConversationSkeleton } from "./ticket-modal-skeletons";
import { useTicketMessages } from "@/hooks/use-ticket-messages";
import type { EmailComposePayload } from "./types";
import type { EmailThreadOrder } from "./email-conversation-panel";
import type { ConversationTicketSummary } from "@/types/tickets";

function TicketConversationContent({
  summary,
  ticketId,
  threadOrder,
  onSubmit,
  saving,
  onToggleMessageRead,
}: {
  summary: ConversationTicketSummary;
  ticketId: string;
  threadOrder: EmailThreadOrder;
  onSubmit: (payload: EmailComposePayload) => Promise<void>;
  saving: boolean;
  onToggleMessageRead: (messageId: string) => void;
}) {
  const { data: messages } = useTicketMessages(ticketId);

  return (
    <EmailConversationPanel
      ticket={{ ...summary, messages }}
      ticketId={ticketId}
      threadOrder={threadOrder}
      onSubmit={onSubmit}
      saving={saving}
      onToggleMessageRead={onToggleMessageRead}
    />
  );
}

export function TicketConversationSection({
  summary,
  ticketId,
  threadOrder,
  onSubmit,
  saving,
  onToggleMessageRead,
}: {
  summary: ConversationTicketSummary;
  ticketId: string;
  threadOrder: EmailThreadOrder;
  onSubmit: (payload: EmailComposePayload) => Promise<void>;
  saving: boolean;
  onToggleMessageRead: (messageId: string) => void;
}) {
  return (
    <Suspense fallback={<TicketConversationSkeleton />}>
      <TicketConversationContent
        summary={summary}
        ticketId={ticketId}
        threadOrder={threadOrder}
        onSubmit={onSubmit}
        saving={saving}
        onToggleMessageRead={onToggleMessageRead}
      />
    </Suspense>
  );
}
