import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createStatusSchema,
  deleteStatusSchema,
  parseBody,
  reorderStatusesSchema,
  updateStatusSchema,
} from "@server/lib/validation/schemas";
import {
  createStatus,
  deleteStatus,
  listStatuses,
  reorderStatuses,
  updateStatus,
} from "@server/services/statuses";
import { registerAuthedTool, toolResult, uuid } from "../core";

export function registerStatusTools(server: McpServer) {
  registerAuthedTool(
    server,
    "ticqex_list_statuses",
    {
      title: "List Statuses",
      description: "List board statuses.",
      inputSchema: {},
    },
    async () => toolResult(await listStatuses()),
  );

  registerAuthedTool(
    server,
    "ticqex_create_status",
    {
      title: "Create Status",
      description: "Create a board status. Admin only.",
      inputSchema: createStatusSchema.shape,
      admin: true,
    },
    async (input) => toolResult(await createStatus(parseBody(createStatusSchema, input))),
  );

  registerAuthedTool(
    server,
    "ticqex_update_status",
    {
      title: "Update Status",
      description: "Update a board status. Admin only.",
      inputSchema: { id: uuid, patch: updateStatusSchema },
      admin: true,
    },
    async ({ id, patch }) =>
      toolResult(await updateStatus(id, parseBody(updateStatusSchema, patch))),
  );

  registerAuthedTool(
    server,
    "ticqex_delete_status",
    {
      title: "Delete Status",
      description: "Delete a board status, optionally reassigning tickets. Admin only.",
      inputSchema: { id: uuid, options: deleteStatusSchema.optional() },
      admin: true,
    },
    async ({ id, options }) => {
      const body = parseBody(deleteStatusSchema, options ?? {});
      await deleteStatus(id, body.reassign_to);
      return toolResult({ deleted: true });
    },
  );

  registerAuthedTool(
    server,
    "ticqex_reorder_statuses",
    {
      title: "Reorder Statuses",
      description: "Replace board status order. Admin only.",
      inputSchema: reorderStatusesSchema.shape,
      admin: true,
    },
    async (input) =>
      toolResult(await reorderStatuses(parseBody(reorderStatusesSchema, input).ids)),
  );
}
