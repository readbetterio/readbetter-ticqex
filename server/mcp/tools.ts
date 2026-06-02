import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerBoardTools } from "./tools/board";
import { registerContactTools } from "./tools/contacts";
import { registerCustomFieldTools } from "./tools/custom-fields";
import { registerEmailSnippetTools } from "./tools/email-snippets";
import { registerSettingsTools } from "./tools/settings";
import { registerStatusTools } from "./tools/statuses";
import { registerTagTools } from "./tools/tags";
import { registerTicketTools } from "./tools/tickets";
import { registerUserTools } from "./tools/users";

export function registerTicqexTools(server: McpServer) {
  registerUserTools(server);
  registerTicketTools(server);
  registerBoardTools(server);
  registerContactTools(server);
  registerStatusTools(server);
  registerTagTools(server);
  registerCustomFieldTools(server);
  registerSettingsTools(server);
  registerEmailSnippetTools(server);
}
