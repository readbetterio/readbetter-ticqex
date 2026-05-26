import { createAdminClient } from "@server/lib/supabase-admin";
import { ApiError } from "@server/lib/errors";
import { BOARD_TICKET_SELECT, type BoardTicketRow } from "@server/domain/ticket";
import type { TicketFilter } from "@server/domain/ticket-filter";
import { isTicketFilterActive } from "@server/domain/ticket-filter";
import type { BoardSort } from "@server/domain/board-sort";
import { DEFAULT_BOARD_SORT } from "@shared/board-sort";
import { sortBoardTickets } from "@shared/board-sort";
import { perLaneTicketLimit } from "@shared/board-limits";
import { enrichTicketsForBoard } from "@server/services/board-enrichment";
import { loadLaneOrdersForUser } from "@server/services/board-lane-orders";
import { resolveFilteredTicketIds } from "@server/services/ticket-filters";
import { resolveSearchTicketIds } from "@server/services/board-search";
import { CHUNK_SIZE, chunkArray } from "@server/lib/chunked-array";

type LightweightTicketRow = {
  id: string;
  created_at: string;
  updated_at: string;
};

const LIGHTWEIGHT_TICKET_SELECT = "id, created_at, updated_at";

function asBoardTicketRows(data: unknown): BoardTicketRow[] {
  if (!Array.isArray(data)) return [];
  return data as BoardTicketRow[];
}

function asLightweightRows(data: unknown): LightweightTicketRow[] {
  if (!Array.isArray(data)) return [];
  return data as LightweightTicketRow[];
}

async function queryTicketRowsInChunks<T>(
  restrictedIds: string[] | null,
  runQuery: (
    ids: string[] | null,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  parseRows: (data: unknown) => T[],
): Promise<T[]> {
  if (restrictedIds && restrictedIds.length === 0) return [];

  if (!restrictedIds || restrictedIds.length <= CHUNK_SIZE) {
    const { data, error } = await runQuery(restrictedIds);
    if (error) throw ApiError.internal(error.message);
    return parseRows(data);
  }

  const rows: T[] = [];
  for (const chunk of chunkArray(restrictedIds, CHUNK_SIZE)) {
    const { data, error } = await runQuery(chunk);
    if (error) throw ApiError.internal(error.message);
    rows.push(...parseRows(data));
  }
  return rows;
}

async function countTicketsInLane(
  db: ReturnType<typeof createAdminClient>,
  statusId: string,
  restrictedIds: string[] | null,
): Promise<number> {
  if (restrictedIds && restrictedIds.length === 0) return 0;

  if (!restrictedIds || restrictedIds.length <= CHUNK_SIZE) {
    let query = db
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("status_id", statusId);
    if (restrictedIds) query = query.in("id", restrictedIds);
    const { count, error } = await query;
    if (error) throw ApiError.internal(error.message);
    return count ?? 0;
  }

  let total = 0;
  for (const chunk of chunkArray(restrictedIds, CHUNK_SIZE)) {
    const { count, error } = await db
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("status_id", statusId)
      .in("id", chunk);
    if (error) throw ApiError.internal(error.message);
    total += count ?? 0;
  }
  return total;
}

async function loadLightweightTicketsInLane(
  db: ReturnType<typeof createAdminClient>,
  statusId: string,
  restrictedIds: string[] | null,
): Promise<LightweightTicketRow[]> {
  return queryTicketRowsInChunks(
    restrictedIds,
    async (ids) => {
      let query = db
        .from("tickets")
        .select(LIGHTWEIGHT_TICKET_SELECT)
        .eq("status_id", statusId);
      if (ids) query = query.in("id", ids);
      return query;
    },
    asLightweightRows,
  );
}

async function loadFullTicketsInLane(
  db: ReturnType<typeof createAdminClient>,
  statusId: string,
  restrictedIds: string[] | null,
): Promise<BoardTicketRow[]> {
  return queryTicketRowsInChunks(
    restrictedIds,
    async (ids) => {
      let query = db
        .from("tickets")
        .select(BOARD_TICKET_SELECT)
        .eq("status_id", statusId);
      if (ids) query = query.in("id", ids);
      return query;
    },
    asBoardTicketRows,
  );
}

async function loadTicketsByIds(
  db: ReturnType<typeof createAdminClient>,
  ids: string[],
): Promise<BoardTicketRow[]> {
  if (ids.length === 0) return [];

  if (ids.length <= CHUNK_SIZE) {
    const { data, error } = await db
      .from("tickets")
      .select(BOARD_TICKET_SELECT)
      .in("id", ids);
    if (error) throw ApiError.internal(error.message);
    return asBoardTicketRows(data);
  }

  const rows: BoardTicketRow[] = [];
  for (const chunk of chunkArray(ids, CHUNK_SIZE)) {
    const { data, error } = await db
      .from("tickets")
      .select(BOARD_TICKET_SELECT)
      .in("id", chunk);
    if (error) throw ApiError.internal(error.message);
    rows.push(...asBoardTicketRows(data));
  }
  return rows;
}

function intersectIdLists(a: string[] | null, b: Set<string>): string[] | null {
  if (b.size === 0) return [];
  if (a === null) return [...b];
  const allowed = new Set(a);
  return [...b].filter((id) => allowed.has(id));
}

async function loadLaneTickets(
  db: ReturnType<typeof createAdminClient>,
  statusId: string,
  restrictedIds: string[] | null,
  laneLimit: number | undefined,
  sort: BoardSort,
  manualOrder: string[] | undefined,
): Promise<{ rows: BoardTicketRow[]; capped: boolean }> {
  if (laneLimit !== undefined) {
    const lightweight = await loadLightweightTicketsInLane(
      db,
      statusId,
      restrictedIds,
    );
    const sorted = sortBoardTickets(lightweight, sort, manualOrder);
    const limited = sorted.slice(0, laneLimit);
    const capped = sorted.length > limited.length;
    const ids = limited.map((row) => row.id);
    const fullRows = await loadTicketsByIds(db, ids);
    const byId = new Map(fullRows.map((row) => [row.id, row]));
    const rows = ids
      .map((id) => byId.get(id))
      .filter((row): row is BoardTicketRow => row !== undefined);
    return { rows, capped };
  }

  const rows = await loadFullTicketsInLane(db, statusId, restrictedIds);
  return {
    rows: sortBoardTickets(rows, sort, manualOrder),
    capped: false,
  };
}

export async function getBoard(
  userId?: string,
  filter: TicketFilter = [],
  sort: BoardSort = DEFAULT_BOARD_SORT,
  searchQuery = "",
) {
  const db = createAdminClient();
  const filterActive = isTicketFilterActive(filter);
  const searchActive = searchQuery.trim().length > 0;

  const { data: settings, error: settingsErr } = await db
    .from("global_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (settingsErr) throw ApiError.internal(settingsErr.message);

  const { data: statuses, error: statusErr } = await db
    .from("status_types")
    .select("*")
    .order("position");

  if (statusErr) throw ApiError.internal(statusErr.message);

  const visibleStatuses = (statuses ?? []).filter((s) => s.is_visible !== false);
  const visibleStatusIds = visibleStatuses.map((s) => s.id as string);
  const laneLimit = searchActive
    ? undefined
    : perLaneTicketLimit(visibleStatuses.length);

  const filteredIds = filterActive
    ? await resolveFilteredTicketIds(db, filter, { userId })
    : null;

  const searchIds = searchActive
    ? await resolveSearchTicketIds(db, searchQuery)
    : null;

  const restrictedIds = searchActive
    ? intersectIdLists(filteredIds, searchIds!)
    : filteredIds;

  const manualOrders =
    sort.mode === "manual" && userId
      ? await loadLaneOrdersForUser(userId, visibleStatusIds)
      : new Map<string, string[]>();

  const laneResults = await Promise.all(
    visibleStatuses.map(async (status) => {
      const statusId = status.id as string;

      if (restrictedIds !== null && restrictedIds.length === 0) {
        return {
          status: { id: status.id, name: status.name, color: status.color },
          tickets: [],
          total_count: 0,
          capped: false,
        };
      }

      const [totalCount, { rows, capped }] = await Promise.all([
        countTicketsInLane(db, statusId, restrictedIds),
        loadLaneTickets(
          db,
          statusId,
          restrictedIds,
          laneLimit,
          sort,
          manualOrders.get(statusId),
        ),
      ]);

      const enriched = await enrichTicketsForBoard(rows, userId);

      return {
        status: { id: status.id, name: status.name, color: status.color },
        tickets: enriched,
        total_count: totalCount,
        capped,
      };
    }),
  );

  const capped = laneResults.some((lane) => lane.capped);

  return {
    lanes: laneResults.map(({ capped: _capped, ...lane }) => lane),
    settings,
    filter_active: filterActive,
    search_active: searchActive,
    capped,
    sort,
  };
}
