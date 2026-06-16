"use client";

import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { apiFetchList } from "@/lib/api-client";
import type { ActivityEvent } from "@shared/activity/types";

const ACTIVITY_PER_PAGE = 25;

export type ActivityListResponse = {
  data: ActivityEvent[];
  meta: {
    total: number;
    page: number;
    per_page: number;
  };
};

export type ActivityFilters = {
  actor_user_id?: string;
  api_key_id?: string;
  source?: string;
  action?: string;
  outcome?: string;
  target_type?: string;
  operation?: string;
  request_method?: string;
  request_path?: string;
  status_code?: string;
  occurred_after?: string;
  occurred_before?: string;
  hide_self_referential?: boolean;
};

function buildActivityQuery(filters: ActivityFilters, page: number) {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(ACTIVITY_PER_PAGE),
  });

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "") continue;
    if (key === "hide_self_referential") {
      params.set(key, value ? "true" : "false");
      continue;
    }
    params.set(key, String(value));
  }

  return `/api/v1/activity?${params.toString()}`;
}

export function activityQueryKey(filters: ActivityFilters) {
  return ["activity", filters] as const;
}

export function useActivity(filters: ActivityFilters = {}) {
  return useInfiniteQuery({
    queryKey: activityQueryKey(filters),
    queryFn: async ({ pageParam }) => {
      const page = pageParam ?? 1;
      return apiFetchList<ActivityEvent>(buildActivityQuery(filters, page));
    },
    initialPageParam: 1 as const,
    getNextPageParam: (lastPage: ActivityListResponse) => {
      const { page, per_page, total } = lastPage.meta;
      return page * per_page < total ? page + 1 : undefined;
    },
  });
}

export function flattenActivityEvents(
  pages: ActivityListResponse[] | undefined,
): ActivityEvent[] {
  if (!pages?.length) return [];
  return pages.flatMap((page) => page.data);
}

export function ticketActivityQueryKey(ticketId: string) {
  return ["ticket", ticketId, "activity"] as const;
}

export function invalidateTicketActivity(
  queryClient: QueryClient,
  ticketId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: ticketActivityQueryKey(ticketId),
  });
}

export function useTicketActivity(ticketId: string) {
  return useInfiniteQuery({
    queryKey: ticketActivityQueryKey(ticketId),
    queryFn: async ({ pageParam }) => {
      const page = pageParam ?? 1;
      return apiFetchList<ActivityEvent>(
        `/api/v1/tickets/${ticketId}/activity?page=${page}&per_page=${ACTIVITY_PER_PAGE}`,
      );
    },
    initialPageParam: 1 as const,
    getNextPageParam: (lastPage: ActivityListResponse) => {
      const { page, per_page, total } = lastPage.meta;
      return page * per_page < total ? page + 1 : undefined;
    },
    enabled: Boolean(ticketId),
  });
}

export type { InfiniteData };
