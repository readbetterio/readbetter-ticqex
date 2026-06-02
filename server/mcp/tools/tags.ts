import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createTagSchema,
  parseBody,
  updateTagSchema,
} from "@server/lib/validation/schemas";
import { createTag, deleteTag, listTags, updateTag } from "@server/services/tags";
import { registerAuthedTool, toolResult, uuid } from "../core";

export function registerTagTools(server: McpServer) {
  registerAuthedTool(
    server,
    "ticqex_list_tags",
    {
      title: "List Tags",
      description: "List tags.",
      inputSchema: {},
    },
    async () => toolResult(await listTags()),
  );

  registerAuthedTool(
    server,
    "ticqex_create_tag",
    {
      title: "Create Tag",
      description: "Create a tag. Admin only.",
      inputSchema: createTagSchema.shape,
      admin: true,
    },
    async (input) => toolResult(await createTag(parseBody(createTagSchema, input))),
  );

  registerAuthedTool(
    server,
    "ticqex_update_tag",
    {
      title: "Update Tag",
      description: "Update a tag. Admin only.",
      inputSchema: { id: uuid, patch: updateTagSchema },
      admin: true,
    },
    async ({ id, patch }) =>
      toolResult(await updateTag(id, parseBody(updateTagSchema, patch))),
  );

  registerAuthedTool(
    server,
    "ticqex_delete_tag",
    {
      title: "Delete Tag",
      description: "Delete a tag. Admin only.",
      inputSchema: { id: uuid },
      admin: true,
    },
    async ({ id }) => {
      await deleteTag(id);
      return toolResult({ deleted: true });
    },
  );
}
