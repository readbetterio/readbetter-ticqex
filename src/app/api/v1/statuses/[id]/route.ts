import { NextRequest } from "next/server";
import { jsonData } from "@server/lib/response";
import { withAuth, parseJsonBody } from "@server/lib/route-handler";
import {
  updateStatusSchema,
  deleteStatusSchema,
  parseBody,
} from "@server/lib/validation/schemas";
import { updateStatus, deleteStatus } from "@server/services/statuses";
import { ApiError } from "@server/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(
    request,
    async () => {
      const { id } = await params;
      const body = parseBody(updateStatusSchema, await parseJsonBody(request));
      return jsonData(await updateStatus(id, body));
    },
    { admin: true },
  );
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return withAuth(
    request,
    async () => {
      const { id } = await params;
      let reassignTo: string | undefined;
      const contentType = request.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        try {
          const body = parseBody(
            deleteStatusSchema,
            await parseJsonBody(request),
          );
          reassignTo = body.reassign_to;
        } catch (e) {
          if (e instanceof ApiError && e.code === "bad_request") throw e;
        }
      }
      await deleteStatus(id, reassignTo);
      return jsonData({ deleted: true });
    },
    { admin: true },
  );
}
