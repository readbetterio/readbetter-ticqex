import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createEmailSnippetSchema,
  parseBody,
} from "@server/lib/validation/schemas";
import {
  createEmailSnippet,
  deleteEmailSnippet,
  listEmailSnippets,
} from "@server/services/email-snippets";
import { registerAuthedTool, toolResult, uuid } from "../core";

export function registerEmailSnippetTools(server: McpServer) {
  registerAuthedTool(
    server,
    "ticqex_list_email_snippets",
    {
      title: "List Email Snippets",
      description: "List email snippets.",
      inputSchema: {},
    },
    async () => toolResult(await listEmailSnippets()),
  );

  registerAuthedTool(
    server,
    "ticqex_create_email_snippet",
    {
      title: "Create Email Snippet",
      description: "Create an email snippet. Admin only.",
      inputSchema: createEmailSnippetSchema.shape,
      admin: true,
    },
    async (input, auth) => {
      const body = parseBody(createEmailSnippetSchema, input);
      return toolResult(
        await createEmailSnippet({
          title: body.title,
          body: body.body,
          createdBy: auth.userId,
        }),
      );
    },
  );

  registerAuthedTool(
    server,
    "ticqex_delete_email_snippet",
    {
      title: "Delete Email Snippet",
      description: "Delete an email snippet. Admin only.",
      inputSchema: { id: uuid },
      admin: true,
    },
    async ({ id }) => {
      await deleteEmailSnippet(id);
      return toolResult({ deleted: true });
    },
  );
}
