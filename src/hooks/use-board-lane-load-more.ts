"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TicketFilter } from "@shared/ticket-filter";
import type { BoardSort } from "@shared/board-sort";
import { BOARD_LANE_LOAD_MORE_SIZE } from "@shared/board-limits";
import { buildBoardLaneTicketsApiPath } from "@shared/board-api-path";
import type { LaneTicketsPageResponse } from "@shared/board-lane-page";
import { apiFetch } from "@/lib/api-client";
import {
  boardQueryKey,
  type BoardResponse,
} from "@/hooks/use-board-query";
import type { BoardLane, BoardTicket } from "@/components/board/types";

export function useBoardLaneLoadMore({
  filter,
  sort,
  searchQuery,
  searchActive,
}: {
  filter: TicketFilter;
  sort: BoardSort;
  searchQuery: string;
  searchActive: boolean;
}) {
  const queryClient = useQueryClient();
  const loadingRef = useRef<Set<string>>(new Set());
  const [loadingLaneIds, setLoadingLaneIds] = useState<Set<string>>(
    () => new Set(),
  );

  const syncLoadingState = useCallback(() => {
    setLoadingLaneIds(new Set(loadingRef.current));
  }, []);

  const loadMore = useCallback(
    async (lane: BoardLane) => {
      if (searchActive) return;

      const statusId = lane.status.id;
      if (lane.has_more === false || loadingRef.current.has(statusId)) return;

      loadingRef.current.add(statusId);
      syncLoadingState();

      try {
        const page = await apiFetch<LaneTicketsPageResponse>(
          buildBoardLaneTicketsApiPath(
            statusId,
            filter,
            sort,
            lane.tickets.length,
            BOARD_LANE_LOAD_MORE_SIZE,
          ),
        );

        queryClient.setQueryData<BoardResponse>(
          boardQueryKey(filter, sort, searchQuery),
          (current) => {
            if (!current) return current;

            const nextLanes = current.lanes.map((entry) => {
              if (entry.status.id !== statusId) return entry;

              const existingIds = new Set(entry.tickets.map((ticket) => ticket.id));
              const appended = page.tickets.filter(
                (ticket): ticket is BoardTicket =>
                  !existingIds.has(ticket.id),
              );

              return {
                ...entry,
                tickets: [...entry.tickets, ...appended],
                total_count: page.total_count,
                has_more: page.has_more,
              };
            });

            const capped = nextLanes.some((entry) => entry.has_more);

            return { ...current, lanes: nextLanes, capped };
          },
        );
      } finally {
        loadingRef.current.delete(statusId);
        syncLoadingState();
      }
    },
    [filter, queryClient, searchActive, searchQuery, sort, syncLoadingState],
  );

  return { loadMore, loadingLaneIds };
}
