import { NextRequest } from "next/server";
import { jsonList } from "@server/lib/response";
import { withAuth } from "@server/lib/route-handler";
import { listActivityEvents } from "@server/services/activity";
import { loadTicketRow } from "@server/domain/ticket";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return withAuth(request, async () => {
    const { id } = await params;
    await loadTicketRow(id);

    const result = await listActivityEvents(request.nextUrl.searchParams, {
      ticket_id: id,
      hide_self_referential: false,
    });

    return jsonList(result.events, {
      total: result.total,
      page: result.page,
      per_page: result.perPage,
    });
  });
}
