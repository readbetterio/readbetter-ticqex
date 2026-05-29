import {
  resolveChannelRuntime,
  type ChannelRuntime,
} from "@server/config/resolve";
import { loadTicqexConfig } from "@server/config/load";
import {
  getActiveChannels,
  getActiveIntegrations,
} from "@shared/ticqex-config/validate";

/** Load and validate ticqex config (shape assertion on every read). */
export function loadRuntimeConfig() {
  return loadTicqexConfig();
}

/** Throws when the channel is missing, disabled, or its integration is not configured. */
export function requireChannelRuntime(
  channelKey: string,
  env: NodeJS.ProcessEnv = process.env,
): ChannelRuntime {
  const runtime = resolveChannelRuntime(channelKey, { env });
  if (!runtime) {
    throw new Error(`Channel "${channelKey}" is not configured`);
  }

  if (!runtime.binding.enabled) {
    throw new Error(`Channel "${channelKey}" is not enabled in ticqex config`);
  }

  if (!runtime.integrationKey) {
    throw new Error(`Channel "${channelKey}" has no integration binding`);
  }

  if (!runtime.integration?.configured) {
    const missing = runtime.integration?.missingEnv.join(", ") ?? "unknown";
    throw new Error(
      `Integration "${runtime.integrationKey}" is missing env: ${missing}`,
    );
  }

  return runtime;
}

export function summarizeActiveRuntime(): {
  channels: string[];
  integrations: string[];
} {
  const config = loadRuntimeConfig();
  return {
    channels: getActiveChannels(config),
    integrations: getActiveIntegrations(config),
  };
}

export type { ChannelRuntime };
