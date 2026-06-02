import { NextRequest } from "next/server";
import { jsonData } from "@server/lib/response";
import { withAuth, parseJsonBody } from "@server/lib/route-handler";
import {
  parseBody,
  reorderCustomFieldsSchema,
} from "@server/lib/validation/schemas";
import { reorderDefinitions } from "@server/services/custom-fields";
import { createAdminClient } from "@server/lib/supabase-admin";

export async function PUT(request: NextRequest) {
  return withAuth(
    request,
    async () => {
      const body = parseBody(
        reorderCustomFieldsSchema,
        await parseJsonBody(request),
      );
      return jsonData(
        await reorderDefinitions(createAdminClient(), body.group, body.ids),
      );
    },
    { admin: true },
  );
}
