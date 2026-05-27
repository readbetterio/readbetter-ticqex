"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { TicketSummary } from "@/types/tickets";

export function ticketSummaryQueryKey(ticketId: string) {
  return ["ticket", ticketId, "summary"] as const;
}

export function useTicketSummary(ticketId: string) {
  return useQuery({
    queryKey: ticketSummaryQueryKey(ticketId),
    queryFn: () =>
      apiFetch<TicketSummary>(`/api/v1/tickets/${ticketId}/summary`),
  });
}
