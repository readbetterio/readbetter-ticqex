"use client";

import { useQuery } from "@tanstack/react-query";
import type { CustomFieldDefinition } from "@shared/custom-fields/types";
import { apiFetch } from "@/lib/api-client";

const STALE_MS = 5 * 60_000;

export const ticketCustomFieldsQueryKey = [
  "custom-fields",
  "ticket",
] as const;

const EMPTY: CustomFieldDefinition[] = [];

/** Ticket custom-field definitions including select/multiselect options. */
export function useTicketCustomFieldDefinitions(enabled = true) {
  const query = useQuery({
    queryKey: ticketCustomFieldsQueryKey,
    queryFn: () =>
      apiFetch<CustomFieldDefinition[]>("/api/v1/custom-fields?group=ticket"),
    staleTime: STALE_MS,
    enabled,
  });

  return {
    definitions: query.data ?? EMPTY,
    isPending: query.isPending,
    isFetching: query.isFetching,
  };
}
