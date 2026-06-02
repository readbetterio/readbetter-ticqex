import { NextRequest } from "next/server";
import { jsonData } from "@server/lib/response";
import { withAuth, parseJsonBody } from "@server/lib/route-handler";
import {
  updateContactSchema,
  parseBody,
} from "@server/lib/validation/schemas";
import {
  getContact,
  updateContact,
  deleteContact,
} from "@server/services/contacts";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return withAuth(request, async () => {
    const { id } = await params;
    return jsonData(await getContact(id));
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(request, async () => {
    const { id } = await params;
    const body = parseBody(updateContactSchema, await parseJsonBody(request));
    return jsonData(await updateContact(id, body));
  });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return withAuth(request, async () => {
    const { id } = await params;
    await deleteContact(id);
    return jsonData({ deleted: true });
  });
}
