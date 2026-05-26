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
