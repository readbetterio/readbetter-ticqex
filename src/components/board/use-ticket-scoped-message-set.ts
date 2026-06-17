"use client";

import { useCallback, useState } from "react";

const EMPTY_MESSAGE_IDS = new Set<string>();

type TicketScopedSetState = {
  ticketId: string;
  messageIds: Set<string>;
};

export function useTicketScopedMessageSet(initialTicketId: string) {
  const [state, setState] = useState<TicketScopedSetState>(() => ({
    ticketId: initialTicketId,
    messageIds: new Set(),
  }));

  const messageIdsForTicket = useCallback(
    (ticketId: string) =>
      state.ticketId === ticketId ? state.messageIds : EMPTY_MESSAGE_IDS,
    [state],
  );

  const toggle = useCallback((ticketId: string, messageId: string) => {
    setState((current) => {
      const next = new Set(
        current.ticketId === ticketId ? current.messageIds : [],
      );
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return { ticketId, messageIds: next };
    });
  }, []);

  const remove = useCallback((ticketId: string, messageId: string) => {
    setState((current) => {
      const next = new Set(
        current.ticketId === ticketId ? current.messageIds : [],
      );
      next.delete(messageId);
      return { ticketId, messageIds: next };
    });
  }, []);

  const replaceAll = useCallback(
    (ticketId: string, messageIds: Set<string>) => {
      setState({ ticketId, messageIds });
    },
    [],
  );

  const clear = useCallback((ticketId: string) => {
    setState({ ticketId, messageIds: new Set() });
  }, []);

  return { messageIdsForTicket, toggle, remove, replaceAll, clear };
}
