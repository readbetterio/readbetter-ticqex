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
  findLaneIdForTicket,
  findTicketInLanes,
  moveTicketBetweenLanes,
  reorderTicketInLane,
  resolveDropLaneId,
} from "@/components/board/board-dnd-utils";
import type { BoardLane, BoardTicket } from "@/components/board/types";

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
  muteRealtimeUntilRef: React.MutableRefObject<number>;
  reloadBoard: () => void;
};

export function useBoardDrag({
  lanes,
  setLanes,
  subsetActive,
  sortMode,
  onDragCommitManual,
  onMoveError,
  muteRealtimeUntilRef,
  reloadBoard,
}: UseBoardDragOptions) {
  const [activeTicket, setActiveTicket] = useState<BoardTicket | null>(null);
  const lanesAtDragStart = useRef<BoardLane[] | null>(null);
  const wasManualAtDragStart = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const revertDrag = useCallback(() => {
    const snapshot = lanesAtDragStart.current;
    if (snapshot) setLanes(snapshot);
    lanesAtDragStart.current = null;
  }, [setLanes]);

  const onDragStart = useCallback(
    (event: DragStartEvent) => {
      lanesAtDragStart.current = lanes;
      wasManualAtDragStart.current = sortMode === "manual";
      const match = findTicketInLanes(lanes, String(event.active.id));
      if (match) setActiveTicket(match.ticket);
    },
    [lanes, sortMode],
  );

  const onDragCancel = useCallback(
    (_event: DragCancelEvent) => {
      setActiveTicket(null);
      revertDrag();
    },
    [revertDrag],
  );

  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;
      const ticketId = String(active.id);
      const overId = String(over.id);
      if (ticketId === overId) return;
      setLanes((current) => {
        const fromLaneId = findLaneIdForTicket(lanes, ticketId);
        const toLaneId = resolveDropLaneId(lanes, overId);
        if (!fromLaneId || !toLaneId || fromLaneId === toLaneId) return current;

        return (
          moveTicketBetweenLanes(current, ticketId, fromLaneId, toLaneId, overId) ??
          current
        );
      });
    },
    [lanes, setLanes],
  );

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTicket(null);
      const { active, over } = event;

      if (!over) {
        revertDrag();
        return;
      }

      const ticketId = String(active.id);
      const overId = String(over.id);
      const startLanes = lanesAtDragStart.current ?? lanes;
      const startMatch = findTicketInLanes(startLanes, ticketId);
      if (!startMatch) {
        revertDrag();
        return;
      }

      const fromLaneId = startMatch.laneId;
      const toLaneId = resolveDropLaneId(lanes, overId);
      if (!toLaneId) {
        revertDrag();
        return;
      }

      muteRealtimeUntilRef.current = Date.now() + REALTIME_MUTE_MS;
      onMoveError("");

      const crossLane = fromLaneId !== toLaneId;
      let finalLanes = lanes;

      try {
        if (!crossLane) {
          if (overId === toLaneId) {
            revertDrag();
            return;
          }
          const reordered = reorderTicketInLane(lanes, fromLaneId, ticketId, overId);
          if (!reordered) {
            revertDrag();
            return;
          }
          finalLanes = reordered;
          setLanes(reordered);
        } else if (findLaneIdForTicket(lanes, ticketId) !== toLaneId) {
          const moved = moveTicketBetweenLanes(
            lanes,
            ticketId,
            fromLaneId,
            toLaneId,
            overId,
          );
          if (moved) {
            finalLanes = moved;
            setLanes(moved);
          }
        }

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
      }
    },
    [
      lanes,
      muteRealtimeUntilRef,
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
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
  };
}
