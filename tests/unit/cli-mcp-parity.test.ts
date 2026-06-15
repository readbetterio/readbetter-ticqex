import { describe, expect, it } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTicqexTools } from "@server/mcp/tools";
import {
  MCP_TOOL_NAMES,
  REST_ONLY_ADMIN_OPERATIONS,
  listOperationNames,
} from "@ticqex/api-spec";

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

describe("CLI / MCP parity", () => {
  const mcpTools = listRegisteredMcpToolNames();
  const catalogNames = new Set(listOperationNames());

  it("includes every MCP tool in the CLI catalog", () => {
    for (const toolName of mcpTools) {
      expect(catalogNames.has(toolName), toolName).toBe(true);
      expect(MCP_TOOL_NAMES).toContain(toolName);
    }
  });

  it("includes REST-only api-key operations in the CLI catalog but not MCP", () => {
    for (const operationName of REST_ONLY_ADMIN_OPERATIONS) {
      expect(catalogNames.has(operationName), operationName).toBe(true);
      expect(mcpTools).not.toContain(operationName);
    }
  });
});
