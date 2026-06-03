"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import {
  ticketCustomFieldsQueryKey,
  useTicketCustomFieldDefinitions,
} from "@/hooks/use-ticket-custom-field-definitions";
import type {
  Assignee,
  BoardFilterOptions,
  Contact,
  CustomFieldDef,
  Tag,
} from "./filter-types";

const OPTIONS_STALE_MS = 5 * 60_000;

export const boardFilterOptionsQueryKey = ["board", "filter-options"] as const;
export { ticketCustomFieldsQueryKey };

const EMPTY_OPTIONS: BoardFilterOptions = {
  contacts: [],
  assignees: [],
  tags: [],
};

/**
 * Loads the data needed to render and resolve filter labels (assignee/contact
 * usernames, tags, custom-field labels). Backed by React Query so the desktop
 * bar and mobile sheet share a single fetch, and so active-filter chips can
 * resolve names eagerly instead of falling back to raw ids.
 */
export function useBoardFilterOptions(enabled: boolean) {
  const optionsQuery = useQuery({
    queryKey: boardFilterOptionsQueryKey,
    queryFn: () => apiFetch<BoardFilterOptions>("/api/v1/board/filter-options"),
    staleTime: OPTIONS_STALE_MS,
    enabled,
  });

  const { definitions: rawFields } = useTicketCustomFieldDefinitions(enabled);

  const options = optionsQuery.data ?? EMPTY_OPTIONS;
  const customFields = rawFields as CustomFieldDef[];

  return {
    contacts: options.contacts as Contact[],
    assignees: options.assignees as Assignee[],
    tags: options.tags as Tag[],
    customFields,
  };
}
