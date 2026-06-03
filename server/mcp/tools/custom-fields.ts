import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAdminClient } from "@server/lib/supabase-admin";
import {
  createCustomFieldSchema,
  parseBody,
  updateCustomFieldSchema,
} from "@server/lib/validation/schemas";
import {
  createDefinition,
  deleteDefinition,
  listDefinitions,
  updateDefinition,
} from "@server/services/custom-fields";
import { registerAuthedTool, toolResult, uuid } from "../core";

export function registerCustomFieldTools(server: McpServer) {
  registerAuthedTool(
    server,
    "ticqex_list_custom_fields",
    {
      title: "List Custom Fields",
      description: "List custom field definitions. Ticket field card/ticket visibility is configured via global settings (`ticket_field_visibility` / `ticket_field_layout`).",
      inputSchema: { group: z.enum(["ticket", "contact"]).optional() },
    },
    async ({ group }) => toolResult(await listDefinitions(createAdminClient(), group)),
  );

  registerAuthedTool(
    server,
    "ticqex_create_custom_field",
    {
      title: "Create Custom Field",
      description:
        "Create a custom field definition (text, number, date, boolean, select, multiselect, url, json). Select and multiselect fields require options.values. Admin only.",
      inputSchema: createCustomFieldSchema.shape,
      admin: true,
    },
    async (input) =>
      toolResult(
        await createDefinition(createAdminClient(), parseBody(createCustomFieldSchema, input)),
      ),
  );

  registerAuthedTool(
    server,
    "ticqex_update_custom_field",
    {
      title: "Update Custom Field",
      description:
        "Update a custom field definition. Type changes are rejected when stored values exist. Admin only.",
      inputSchema: { id: uuid, patch: updateCustomFieldSchema },
      admin: true,
    },
    async ({ id, patch }) =>
      toolResult(
        await updateDefinition(createAdminClient(), id, parseBody(updateCustomFieldSchema, patch)),
      ),
  );

  registerAuthedTool(
    server,
    "ticqex_delete_custom_field",
    {
      title: "Delete Custom Field",
      description: "Delete a custom field definition. Admin only.",
      inputSchema: { id: uuid },
      admin: true,
    },
    async ({ id }) => {
      await deleteDefinition(createAdminClient(), id);
      return toolResult({ deleted: true });
    },
  );
}
