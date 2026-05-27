import { BoardTicketModalRoute } from "@/components/board/board-ticket-modal-route";

type Params = { params: Promise<{ id: string }> };

export default async function BoardTicketPage({ params }: Params) {
  const { id } = await params;
  return <BoardTicketModalRoute ticketId={id} />;
}
