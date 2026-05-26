import {
  serializeTicketFilter,
  type TicketFilter,
} from "@shared/ticket-filter";
import {
  DEFAULT_BOARD_SORT,
  serializeBoardSort,
  type BoardSort,
} from "@shared/board-sort";

export function buildBoardApiPath(
  filter: TicketFilter,
  sort: BoardSort,
  searchQuery: string,
): string {
  const params = new URLSearchParams();
  if (filter.length > 0) {
    params.set("filter", serializeTicketFilter(filter));
  }
  if (serializeBoardSort(sort) !== serializeBoardSort(DEFAULT_BOARD_SORT)) {
    params.set("sort", serializeBoardSort(sort));
  }
  const q = searchQuery.trim();
  if (q) params.set("q", q);
  const qs = params.toString();
  return `/api/v1/board${qs ? `?${qs}` : ""}`;
}

export function buildBoardLaneTicketsApiPath(
  statusId: string,
  filter: TicketFilter,
  sort: BoardSort,
  offset: number,
  limit?: number,
): string {
  const params = new URLSearchParams();
  params.set("offset", String(offset));
  if (limit !== undefined) params.set("limit", String(limit));
  if (filter.length > 0) {
    params.set("filter", serializeTicketFilter(filter));
  }
  if (serializeBoardSort(sort) !== serializeBoardSort(DEFAULT_BOARD_SORT)) {
    params.set("sort", serializeBoardSort(sort));
  }
  return `/api/v1/board/lanes/${encodeURIComponent(statusId)}/tickets?${params.toString()}`;
}
