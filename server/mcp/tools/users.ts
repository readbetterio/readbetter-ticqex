import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAuthedTool, toolResult } from "../core";
import { getMe, listUsers } from "@server/services/users";

export function registerUserTools(server: McpServer) {
  registerAuthedTool(
    server,
    "ticqex_get_me",
    {
      title: "Get Current User",
      description: "Return the Ticqex user associated with the API key.",
      inputSchema: {},
    },
    async (_input, auth) => toolResult(await getMe(auth.userId)),
  );

  registerAuthedTool(
    server,
    "ticqex_list_users",
    {
      title: "List Users",
      description: "List staff users available for assignment.",
      inputSchema: {},
    },
    async () => toolResult(await listUsers()),
  );
}
