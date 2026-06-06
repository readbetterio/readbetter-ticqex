import { NextRequest } from "next/server";
import { jsonData } from "@server/lib/response";
import { withAuth, parseJsonBody } from "@server/lib/route-handler";
import {
  commentUpdateSchema,
  parseBody,
} from "@server/lib/validation/schemas";
import {
  deleteTicketComment,
  updateTicketComment,
} from "@server/services/comments";

type Params = { params: Promise<{ id: string; commentId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(request, async (auth) => {
    const { id, commentId } = await params;
    const body = parseBody(commentUpdateSchema, await parseJsonBody(request));
    const comment = await updateTicketComment(id, commentId, body, auth);
    return jsonData(comment);
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return withAuth(request, async (auth) => {
    const { id, commentId } = await params;
    const result = await deleteTicketComment(id, commentId, auth);
    return jsonData(result);
  });
}
