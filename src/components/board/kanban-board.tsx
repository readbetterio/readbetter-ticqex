"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { PlusIcon } from "@phosphor-icons/react";
import type { BoardSort } from "@shared/board-sort";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { useBoardView } from "@/hooks/use-board-view";
import { useBoardQuery, type BoardResponse } from "@/hooks/use-board-query";
import { useBoardDrag } from "@/hooks/use-board-drag";
import { useBoardRealtime } from "@/hooks/use-board-realtime";
import { seedManualOrder } from "./board-lane-order-client";
import { BoardFilterBar } from "./board-filter-bar";
import { BoardSearchBar } from "./board-search-bar";
import { BoardSortSelect } from "./board-sort-select";
import { TicketCard } from "./ticket-card";
import { LaneColumn } from "./lane-column";
import { TicketModal } from "./ticket-modal";
import { CreateTicketModal } from "./create-ticket-modal";
import type { BoardLane, TicketDetail } from "./types";

const MANUAL_SORT: BoardSort = { mode: "manual" };

export function KanbanBoard() {
  const queryClient = useQueryClient();
  const {
    filter,
    sort,
    searchQuery,
    setFilter,
    setSort,
    setSearchQuery,
    searchActive,
    viewNarrowedActive,
  } = useBoardView();

  const [querySort, setQuerySort] = useState(sort);

  const boardQuery = useBoardQuery(filter, querySort, searchQuery);
  const lanes = boardQuery.data?.lanes ?? [];
  const capped = boardQuery.data?.capped ?? false;
  const subsetActive = viewNarrowedActive || capped;

  const [allStatuses, setAllStatuses] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const muteRealtimeUntil = useRef(0);
  const statusesLoaded = useRef(false);

  const loading = boardQuery.isPending && !boardQuery.data;
  const error =
    boardQuery.error instanceof Error ? boardQuery.error.message : null;

  useEffect(() => {
    if (statusesLoaded.current) return;
    void apiFetch<{ id: string; name: string }[]>("/api/v1/statuses").then(
      (statuses) => {
        setAllStatuses(statuses);
        statusesLoaded.current = true;
      },
    );
  }, []);

  const setLanes = useCallback(
    (updater: React.SetStateAction<BoardLane[]>) => {
      queryClient.setQueryData<BoardResponse>(
        boardQuery.queryKey,
        (current) => {
          if (!current) return current;
          const nextLanes =
            typeof updater === "function" ? updater(current.lanes) : updater;
          return { ...current, lanes: nextLanes };
        },
      );
    },
    [queryClient, boardQuery.queryKey],
  );

  const reloadBoard = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["board"] });
  }, [queryClient]);

  const patchTicketUnread = useCallback(
    (ticketId: string, unreadCount: number) => {
      queryClient.setQueriesData<BoardResponse>(
        { queryKey: ["board"] },
        (current) => {
          if (!current) return current;
          return {
            ...current,
            lanes: current.lanes.map((lane) => ({
              ...lane,
              tickets: lane.tickets.map((ticket) =>
                ticket.id === ticketId
                  ? { ...ticket, unread_count: unreadCount }
                  : ticket,
              ),
            })),
          };
        },
      );
    },
    [queryClient],
  );

  useBoardRealtime(reloadBoard, muteRealtimeUntil);

  const handleBoardChange = useCallback(
    (updated?: TicketDetail) => {
      if (updated && updated.unread_count === 0) {
        patchTicketUnread(updated.id, 0);
        return;
      }
      reloadBoard();
    },
    [patchTicketUnread, reloadBoard],
  );

  const handleSortChange = useCallback(
    async (next: BoardSort) => {
      if (next.mode === "manual" && sort.mode !== "manual") {
        try {
          await seedManualOrder(lanes, {
            onlyIfEmpty: true,
            mergeVisible: subsetActive,
          });
        } catch (e) {
          setMoveError(
            e instanceof Error ? e.message : "Could not save custom order",
          );
          return;
        }
      }
      setSort(next);
      setQuerySort(next);
    },
    [lanes, setSort, sort.mode, subsetActive],
  );

  const onDragCommitManual = useCallback(() => {
    setSort(MANUAL_SORT);
    setQuerySort(MANUAL_SORT);
  }, [setSort]);

  const {
    sensors,
    collisionDetection,
    activeTicket,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
  } = useBoardDrag({
    lanes,
    setLanes,
    subsetActive,
    sortMode: sort.mode,
    onDragCommitManual,
    onMoveError: setMoveError,
    muteRealtimeUntilRef: muteRealtimeUntil,
    reloadBoard,
  });

  const hasSearchResults = lanes.some((lane) => lane.tickets.length > 0);

  const header = (
    <div className="flex shrink-0 items-start gap-3 px-4 pt-3">
      <div className="min-w-0 flex-1">
        <BoardFilterBar filter={filter} onFilterChange={setFilter} />
      </div>
      <BoardSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        className="shrink-0"
      />
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort:</span>
        <BoardSortSelect
          sort={sort}
          onSortChange={(next) => void handleSortChange(next)}
        />
        <Button size="sm" className="shrink-0" onClick={() => setShowCreate(true)}>
          <PlusIcon />
          New Ticket
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-start gap-3 px-4 pt-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mx-auto h-8 w-72" />
          <Skeleton className="h-8 w-56" />
        </div>
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full w-max min-w-full justify-center gap-4 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-full w-72 shrink-0 rounded-xl" />
            ))}
          </div>
        </div>
        {selectedId && (
          <TicketModal
            ticketId={selectedId}
            onClose={() => setSelectedId(null)}
            onBoardChange={handleBoardChange}
          />
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 p-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header}

      {searchActive && !boardQuery.isFetching && !hasSearchResults ? (
        <p className="px-4 pt-2 text-sm text-muted-foreground">
          No tickets match &ldquo;{searchQuery.trim()}&rdquo;.
        </p>
      ) : null}

      {moveError && (
        <Alert variant="destructive" className="mx-4 mt-2 shrink-0">
          <AlertDescription>{moveError}</AlertDescription>
        </Alert>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={(event) => void onDragEnd(event)}
          onDragCancel={onDragCancel}
        >
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex h-full w-max min-w-full justify-center gap-4 p-4">
              {lanes.map((lane) => (
                <LaneColumn
                  key={lane.status.id}
                  lane={lane}
                  sortable
                  onTicketClick={setSelectedId}
                />
              ))}
            </div>
          </div>
          <DragOverlay dropAnimation={null}>
            {activeTicket ? (
              <div className="w-72 cursor-grabbing">
                <TicketCard ticket={activeTicket} onClick={() => {}} dragOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {selectedId && (
        <TicketModal
          ticketId={selectedId}
          onClose={() => setSelectedId(null)}
          onBoardChange={handleBoardChange}
        />
      )}

      {showCreate && (
        <CreateTicketModal
          statuses={allStatuses}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            reloadBoard();
          }}
        />
      )}
    </div>
  );
}
