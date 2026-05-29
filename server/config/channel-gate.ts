import { getChannelDefinition } from "@server/channels";
import { resolveChannelRuntime } from "@server/config/resolve";
import type { TicqexConfig } from "@server/config/types";
import type { ChannelDefinition, ChannelKey } from "@server/channels/types";
import type { IntegrationWebhookResult } from "@server/integrations/types";

/** True when the channel is enabled in config and its integration is configured. */
export function isChannelOperational(
  channelKey: ChannelKey,
  options: {
    env?: NodeJS.ProcessEnv;
    config?: TicqexConfig;
  } = {},
): boolean {
  const runtime = resolveChannelRuntime(channelKey, {
    env: options.env ?? process.env,
    config: options.config,
  });
  if (!runtime) return false;

  return (
    runtime.binding.enabled &&
    Boolean(runtime.integrationKey) &&
    Boolean(runtime.integration?.configured)
  );
}

/** Email channel operational per ticqex config + env. */
export function getOperationalEmailChannel(): ChannelDefinition | null {
  const channel = getChannelDefinition("email");
  if (!channel) return null;
  if (!isChannelOperational("email")) return null;
  return channel;
}

export function channelUnavailableWebhookResult(
  message = "Email channel is disabled or integration is not configured",
): IntegrationWebhookResult {
  return {
    status: 503,
    body: {
      error: {
        code: "channel_unavailable",
        message,
      },
    },
  };
}
