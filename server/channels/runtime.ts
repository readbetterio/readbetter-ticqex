import { getIntegrationDefinition } from "@server/integrations";
import type { IntegrationEmailHandler } from "@server/integrations/types";
import type { ChannelKey } from "@server/channels/types";
import { resolveChannelRuntime } from "@server/config/resolve";
import type { TicqexConfig } from "@server/config/types";

export function getChannelIntegrationEmail(
  channelKey: ChannelKey,
  options: {
    config?: TicqexConfig;
    configPath?: string;
    env?: NodeJS.ProcessEnv;
  } = {},
): IntegrationEmailHandler | null {
  const runtime = resolveChannelRuntime(channelKey, options);
  if (!runtime?.binding.enabled || !runtime.integrationKey) return null;

  const integration = getIntegrationDefinition(runtime.integrationKey);
  return integration?.email ?? null;
}
