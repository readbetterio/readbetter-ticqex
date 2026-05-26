"use client";

import { useCallback, useRef, useState } from "react";
import {
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { BoardSort } from "@shared/board-sort";
import {
  buildFilterContext,
  moveTicketOnBoard,
  seedManualOrder,
  visibleIdsForLane,
} from "@/components/board/board-lane-order-client";
import {
  applyTicketDrop,
  findLaneIdForTicket,
  findTicketInLanes,
  resolveDropIndex,
  resolveDropLaneId,
} from "@/components/board/board-dnd-utils";
import type { BoardLane, BoardTicket } from "@/components/board/types";

export type DropPreview = {
  laneId: string;
  index: number;
};

export type BoardDragSession = {
  active: boolean;
  mutedUntil: number;
};

const REALTIME_MUTE_MS = 600;

const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;
  return closestCenter(args);
};

type UseBoardDragOptions = {
  lanes: BoardLane[];
  setLanes: React.Dispatch<React.SetStateAction<BoardLane[]>>;
  subsetActive: boolean;
  sortMode: BoardSort["mode"];
  onDragCommitManual: () => void;
  onMoveError: (message: string) => void;
  reloadBoard: () => void;
};

export function useBoardDrag({
  lanes,
  setLanes,
  subsetActive,
  sortMode,
  onDragCommitManual,
  onMoveError,
  reloadBoard,
}: UseBoardDragOptions) {
  const [activeTicket, setActiveTicket] = useState<BoardTicket | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const lanesAtDragStart = useRef<BoardLane[] | null>(null);
  const lanesRef = useRef(lanes);
  const dragSessionRef = useRef<BoardDragSession>({
    active: false,
    mutedUntil: 0,
  });
  const wasManualAtDragStart = useRef(false);

  lanesRef.current = lanes;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const revertDrag = useCallback(() => {
    const snapshot = lanesAtDragStart.current;
    if (snapshot) setLanes(snapshot);
    lanesAtDragStart.current = null;
  }, [setLanes]);

  const clearDrag = useCallback(() => {
    dragSessionRef.current.active = false;
    setActiveTicket(null);
    setDropPreview(null);
  }, []);

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      dragSessionRef.current = {
        active: true,
        mutedUntil: Date.now() + REALTIME_MUTE_MS,
      };
      lanesAtDragStart.current = lanes;
      wasManualAtDragStart.current = sortMode === "manual";
      const match = findTicketInLanes(lanes, String(event.active.id));
      if (match) setActiveTicket(match.ticket);
    },
    [lanes, sortMode],
  );

  const onDragCancel = useCallback(
    (_event: DragCancelEvent) => {
      clearDrag();
      revertDrag();
    },
    [clearDrag, revertDrag],
  );

  const onDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setDropPreview(null);
      return;
    }

    const ticketId = String(active.id);
    const overId = String(over.id);
    if (ticketId === overId) {
      setDropPreview(null);
      return;
    }

    const current = lanesRef.current;
    const fromLaneId = findLaneIdForTicket(current, ticketId);
    const toLaneId = resolveDropLaneId(current, overId);
    if (!fromLaneId || !toLaneId) {
      setDropPreview(null);
      return;
    }

    setDropPreview({
      laneId: toLaneId,
      index: resolveDropIndex(current, toLaneId, overId),
    });
  }, []);

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTicket(null);
      setDropPreview(null);
      try {
        const { active, over } = event;

        if (!over) {
          revertDrag();
          return;
        }

        const ticketId = String(active.id);
        const overId = String(over.id);
        const startLanes = lanesAtDragStart.current ?? lanesRef.current;
        const startMatch = findTicketInLanes(startLanes, ticketId);
        if (!startMatch) {
          revertDrag();
          return;
        }

        const fromLaneId = startMatch.laneId;
        const latestLanes = lanesRef.current;
        const toLaneId = resolveDropLaneId(latestLanes, overId);
        if (!toLaneId) {
          revertDrag();
          return;
        }

        dragSessionRef.current.mutedUntil = Date.now() + REALTIME_MUTE_MS;
        onMoveError("");

        const crossLane = fromLaneId !== toLaneId;
        if (!crossLane && overId === toLaneId) {
          revertDrag();
          return;
        }

        const insertIndex = resolveDropIndex(latestLanes, toLaneId, overId);
        const moved = applyTicketDrop(
          latestLanes,
          ticketId,
          fromLaneId,
          toLaneId,
          insertIndex,
        );
        if (!moved) {
          revertDrag();
          return;
        }
        const finalLanes = moved;
        setLanes(moved);

        if (!wasManualAtDragStart.current) {
          await seedManualOrder(startLanes, {
            onlyIfEmpty: false,
            mergeVisible: subsetActive,
          });
        }

        await moveTicketOnBoard({
          ticket_id: ticketId,
          from_status_id: fromLaneId,
          to_status_id: toLaneId,
          target_ticket_ids: visibleIdsForLane(finalLanes, toLaneId),
          ...(crossLane
            ? { source_ticket_ids: visibleIdsForLane(finalLanes, fromLaneId) }
            : {}),
          filter_context: buildFilterContext({
            subsetActive,
            startLanes,
            fromLaneId,
            toLaneId,
            ticketId,
            crossLane,
          }),
        });

        if (!wasManualAtDragStart.current) {
          onDragCommitManual();
        }

        lanesAtDragStart.current = null;
      } catch {
        revertDrag();
        onMoveError("Could not save card changes. Changes were reverted.");
        reloadBoard();
      } finally {
        dragSessionRef.current.active = false;
      }
    },
    [
      onDragCommitManual,
      onMoveError,
      reloadBoard,
      revertDrag,
      setLanes,
      subsetActive,
    ],
  );

  return {
    sensors,
    collisionDetection,
    activeTicket,
    dropPreview,
    dragSessionRef,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
  };
}
