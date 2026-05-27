import { NextRequest } from "next/server";
import { jsonData } from "@server/lib/response";
import { withAuth } from "@server/lib/route-handler";
import { getTicketSummary } from "@server/services/tickets";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return withAuth(request, async (auth) => {
    const { id } = await params;
    return jsonData(await getTicketSummary(id, auth.userId));
  });
}
