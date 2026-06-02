import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadTicqexConfig } from "@server/config";
import { parseBody, patchSettingsSchema } from "@server/lib/validation/schemas";
import { getSettings, patchSettings } from "@server/services/settings";
import { registerAuthedTool, toolResult } from "../core";

export function registerSettingsTools(server: McpServer) {
  registerAuthedTool(
    server,
    "ticqex_get_settings",
    {
      title: "Get Settings",
      description: "Get global settings and configured channel availability.",
      inputSchema: {},
    },
    async () =>
      toolResult({
        ...(await getSettings()),
        channels: loadTicqexConfig().channels,
      }),
  );

  registerAuthedTool(
    server,
    "ticqex_patch_settings",
    {
      title: "Patch Settings",
      description: "Update global settings. Admin only.",
      inputSchema: patchSettingsSchema.shape,
      admin: true,
    },
    async (input) => toolResult(await patchSettings(parseBody(patchSettingsSchema, input))),
  );
}
