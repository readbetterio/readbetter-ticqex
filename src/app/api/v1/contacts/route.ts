import { NextRequest } from "next/server";
import { jsonData, jsonList } from "@server/lib/response";
import { withAuth, parseJsonBody } from "@server/lib/route-handler";
import {
  createContactSchema,
  parseBody,
} from "@server/lib/validation/schemas";
import { listContacts, createContact } from "@server/services/contacts";

export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    const result = await listContacts(request.nextUrl.searchParams);
    return jsonList(result.contacts, {
      total: result.total,
      page: result.page,
      per_page: result.perPage,
    });
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async () => {
    const body = parseBody(createContactSchema, await parseJsonBody(request));
    const contact = await createContact(body);
    return jsonData(contact, 201);
  });
}
