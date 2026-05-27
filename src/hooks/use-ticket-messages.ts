"use client";

import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { MessageRow } from "@/components/board/types";

export function ticketMessagesQueryKey(ticketId: string) {
  return ["ticket", ticketId, "messages"] as const;
}

export function useTicketMessages(ticketId: string) {
  return useSuspenseQuery({
    queryKey: ticketMessagesQueryKey(ticketId),
    queryFn: () =>
      apiFetch<MessageRow[]>(`/api/v1/tickets/${ticketId}/messages`),
  });
}

export function invalidateTicketMessages(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: ticketMessagesQueryKey(ticketId),
  });
}
