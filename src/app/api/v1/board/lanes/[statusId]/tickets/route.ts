import { NextRequest } from "next/server";
import { jsonData } from "@server/lib/response";
import { withAuth } from "@server/lib/route-handler";
import { ApiError } from "@server/lib/errors";
import { parseTicketFilterParam } from "@server/domain/ticket-filter";
import { parseBoardSortParam } from "@server/domain/board-sort";
import { BOARD_LANE_LOAD_MORE_SIZE } from "@shared/board-limits";
import { getLaneTicketsPage } from "@server/services/board";

type Params = { params: Promise<{ statusId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return withAuth(request, async (auth) => {
    const { statusId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const offsetRaw = searchParams.get("offset");
    if (offsetRaw === null || offsetRaw.trim() === "") {
      throw ApiError.badRequest("offset is required");
    }
    const offset = parseInt(offsetRaw, 10);
    const limit = parseInt(
      searchParams.get("limit") ?? String(BOARD_LANE_LOAD_MORE_SIZE),
      10,
    );
    const filter = parseTicketFilterParam(searchParams.get("filter"));
    const sort = parseBoardSortParam(searchParams.get("sort"));

    const page = await getLaneTicketsPage(
      statusId,
      offset,
      limit,
      auth.userId,
      filter,
      sort,
    );
    return jsonData(page);
  });
}
