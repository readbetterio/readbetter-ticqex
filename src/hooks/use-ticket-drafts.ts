"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { EmailComposePayload, MessageRow } from "@/components/board/types";

export function ticketDraftsQueryKey(ticketId: string) {
  return ["ticket", ticketId, "drafts"] as const;
}

export const OPTIMISTIC_DRAFT_ID_PREFIX = "optimistic-draft-";

export function isOptimisticDraftId(id: string): boolean {
  return id.startsWith(OPTIMISTIC_DRAFT_ID_PREFIX);
}

export function createOptimisticDraftId(): string {
  return `${OPTIMISTIC_DRAFT_ID_PREFIX}${crypto.randomUUID()}`;
}

export function buildOptimisticDraft(
  payload: EmailComposePayload,
  tempId: string,
): MessageRow {
  return {
    id: tempId,
    body: payload.body,
    visibility: "public",
    author_type: "agent",
    author_id: null,
    channel: "admin",
    created_at: new Date().toISOString(),
    email_cc: payload.email?.cc ?? [],
    email_subject: payload.email?.subject ?? null,
    email_delivery_status: "draft",
    attachments: [],
  };
}

export function applyDraftPayloadToRow(
  draft: MessageRow,
  payload: EmailComposePayload,
): MessageRow {
  return {
    ...draft,
    body: payload.body,
    email_cc: payload.email?.cc ?? [],
    email_subject: payload.email?.subject ?? null,
  };
}

export function normalizeDraftFromApi(
  message: MessageRow,
  previous?: MessageRow,
): MessageRow {
  return {
    ...message,
    attachments: message.attachments ?? previous?.attachments ?? [],
  };
}

export function useTicketDrafts(ticketId: string) {
  return useQuery({
    queryKey: ticketDraftsQueryKey(ticketId),
    queryFn: () =>
      apiFetch<MessageRow[]>(`/api/v1/tickets/${ticketId}/messages/drafts`),
  });
}

export function invalidateTicketDrafts(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: ticketDraftsQueryKey(ticketId),
  });
}
