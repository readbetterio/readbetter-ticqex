"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { TicketModal } from "./ticket-modal";
import { useBoardTicketModalContext } from "./board-ticket-modal-context";

export function BoardTicketModalRoute({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const {
    statuses,
    getInitialSeed,
    onStatusChange,
    onBoardChange,
    onTicketDeleted,
  } = useBoardTicketModalContext();

  const closeTicket = useCallback(() => {
    router.push("/board");
  }, [router]);

  const handleTicketDeleted = useCallback(
    (deletedId: string) => {
      onTicketDeleted(deletedId);
      closeTicket();
    },
    [closeTicket, onTicketDeleted],
  );

  return (
    <TicketModal
      ticketId={ticketId}
      initialSeed={getInitialSeed(ticketId)}
      statuses={statuses}
      onStatusChange={onStatusChange}
      onClose={closeTicket}
      onBoardChange={onBoardChange}
      onTicketDeleted={handleTicketDeleted}
    />
  );
}
