import { describe, expect, it } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTicqexTools } from "@server/mcp/tools";

/** Every user-facing mutation should map to at least one MCP tool (REST is always available). */
const FRONTEND_MUTATION_MCP_TOOLS: Record<string, string> = {
  "POST /api/v1/tickets": "ticqex_create_ticket",
  "PATCH /api/v1/tickets/:id": "ticqex_update_ticket",
  "DELETE /api/v1/tickets/:id": "ticqex_delete_ticket",
  "POST /api/v1/tickets/:id/read": "ticqex_mark_ticket_read",
  "POST /api/v1/tickets/:id/attachment-uploads": "ticqex_stage_ticket_attachment_upload",
  "POST /api/v1/tickets/:id/messages": "ticqex_create_ticket_message",
  "POST /api/v1/tickets/:id/comments": "ticqex_create_ticket_comment",
  "PATCH /api/v1/tickets/:id/comments/:commentId": "ticqex_update_ticket_comment",
  "DELETE /api/v1/tickets/:id/comments/:commentId": "ticqex_delete_ticket_comment",
  "POST /api/v1/tickets/:id/messages/drafts": "ticqex_create_ticket_draft",
  "PATCH /api/v1/tickets/:id/messages/drafts/:messageId": "ticqex_update_ticket_draft",
  "POST /api/v1/tickets/:id/messages/drafts/:messageId/send": "ticqex_send_ticket_draft",
  "DELETE /api/v1/tickets/:id/messages/drafts/:messageId": "ticqex_delete_ticket_draft",
  "PATCH /api/v1/tickets/:id/messages/:messageId/read": "ticqex_set_message_read",
  "POST /api/v1/board/move-ticket": "ticqex_move_ticket_on_board",
  "PUT /api/v1/board/manual-order": "ticqex_seed_manual_board_orders",
  "POST /api/v1/statuses": "ticqex_create_status",
  "PATCH /api/v1/statuses/:id": "ticqex_update_status",
  "DELETE /api/v1/statuses/:id": "ticqex_delete_status",
  "PUT /api/v1/statuses/reorder": "ticqex_reorder_statuses",
  "POST /api/v1/tags": "ticqex_create_tag",
  "PATCH /api/v1/tags/:id": "ticqex_update_tag",
  "DELETE /api/v1/tags/:id": "ticqex_delete_tag",
  "POST /api/v1/custom-fields": "ticqex_create_custom_field",
  "PATCH /api/v1/custom-fields/:id": "ticqex_update_custom_field",
  "DELETE /api/v1/custom-fields/:id": "ticqex_delete_custom_field",
  "PUT /api/v1/custom-fields/reorder": "ticqex_reorder_custom_fields",
  "PATCH /api/v1/settings": "ticqex_patch_settings",
  "POST /api/v1/email-snippets": "ticqex_create_email_snippet",
  "DELETE /api/v1/email-snippets/:id": "ticqex_delete_email_snippet",
};

/** Read routes the UI uses that should have MCP list/get parity. */
const FRONTEND_READ_MCP_TOOLS: Record<string, string> = {
  "GET /api/v1/tickets/:id/comments": "ticqex_list_ticket_comments",
};

/** Intentionally REST-only: bootstrap credentials and session auth. */
const REST_ONLY_MUTATIONS = [
  "POST /api/v1/api-keys",
  "DELETE /api/v1/api-keys/:id",
  "supabase.auth.signInWithPassword",
  "supabase.auth.signOut",
  "next-themes setTheme",
] as const;

function listRegisteredMcpToolNames(): string[] {
  const server = new McpServer({ name: "ticqex-test", version: "0.0.0" });
  registerTicqexTools(server);
  const registered = (
    server as unknown as { _registeredTools: Record<string, { enabled?: boolean }> }
  )._registeredTools;
  return Object.entries(registered)
    .filter(([, tool]) => tool.enabled !== false)
    .map(([name]) => name)
    .sort();
}

describe("MCP / API parity for frontend mutations", () => {
  const mcpTools = listRegisteredMcpToolNames();

  it("registers an MCP tool for each frontend REST mutation", () => {
    for (const [route, toolName] of Object.entries(FRONTEND_MUTATION_MCP_TOOLS)) {
      expect(mcpTools, `${route} → ${toolName}`).toContain(toolName);
    }
  });

  it("does not expose API key management over MCP", () => {
    const forbidden = [
      "ticqex_list_api_keys",
      "ticqex_create_api_key",
      "ticqex_revoke_api_key",
    ];
    for (const name of forbidden) {
      expect(mcpTools).not.toContain(name);
    }
    expect(REST_ONLY_MUTATIONS).toContain("POST /api/v1/api-keys");
  });

  it("includes board read tools used by filter/sort UI", () => {
    expect(mcpTools).toContain("ticqex_get_board");
    expect(mcpTools).toContain("ticqex_get_board_filter_options");
  });

  it("registers an MCP tool for each frontend REST read route", () => {
    for (const [route, toolName] of Object.entries(FRONTEND_READ_MCP_TOOLS)) {
      expect(mcpTools, `${route} → ${toolName}`).toContain(toolName);
    }
  });
});
