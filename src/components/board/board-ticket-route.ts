export const BOARD_TICKET_PATH = "/board/tickets";

export function boardTicketPath(ticketId: string) {
  return `${BOARD_TICKET_PATH}/${ticketId}`;
}
