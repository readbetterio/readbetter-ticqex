import { NextRequest } from "next/server";
import { jsonData, jsonList } from "@server/lib/response";
import { withAuth, parseJsonBody } from "@server/lib/route-handler";
import {
  commentInputSchema,
  parseBody,
} from "@server/lib/validation/schemas";
import {
  createTicketComment,
  listTicketComments,
} from "@server/services/comments";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return withAuth(request, async (auth) => {
    const { id } = await params;
    const result = await listTicketComments(
      id,
      request.nextUrl.searchParams,
      auth,
    );
    return jsonList(result.comments, {
      total: result.total,
      page: result.page,
      per_page: result.perPage,
      filters: { order: result.order },
    });
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(request, async (auth) => {
    const { id } = await params;
    const body = parseBody(commentInputSchema, await parseJsonBody(request));
    const comment = await createTicketComment(id, body, auth);
    return jsonData(comment, 201);
  });
}
