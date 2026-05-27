"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BoardDragSession } from "@/hooks/use-board-drag";

const DEBOUNCE_MS = 400;

function useDebouncedRefresh(
  onRefresh: () => void,
  dragSessionRef?: RefObject<BoardDragSession>,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const dragSessionRefStable = useRef(dragSessionRef);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
    dragSessionRefStable.current = dragSessionRef;
  }, [onRefresh, dragSessionRef]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      const session = dragSessionRefStable.current?.current;
      if (session?.active) return;
      if (Date.now() < (session?.mutedUntil ?? 0)) return;
      onRefreshRef.current();
    }, DEBOUNCE_MS);
  }, []);
}

export function useBoardRealtime(
  onRefresh: () => void,
  dragSessionRef?: RefObject<BoardDragSession>,
) {
  const scheduleRefresh = useDebouncedRefresh(onRefresh, dragSessionRef);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reads" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "status_types" },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [scheduleRefresh]);
}

export function useTicketRealtime(ticketId: string, onRefresh: () => void) {
  const scheduleRefresh = useDebouncedRefresh(onRefresh);

  useEffect(() => {
    const supabase = createClient();
    const ticketFilter = `id=eq.${ticketId}`;
    const messageFilter = `ticket_id=eq.${ticketId}`;

    const channel = supabase
      .channel(`ticket:${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: messageFilter,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: ticketFilter,
        },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [ticketId, scheduleRefresh]);
}
