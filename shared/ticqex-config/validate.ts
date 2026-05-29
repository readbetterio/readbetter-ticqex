import type { ChannelKey, ConfigValidationIssue, IntegrationKey, TicqexConfig } from "./types";
import {
  CHANNEL_KEYS,
  INTEGRATION_KEYS,
} from "@shared/ticqex-keys";

/** App env required when the email channel is active (not provider-specific). */
export const APP_ENV_WHEN_EMAIL_ENABLED = ["NEXT_PUBLIC_APP_URL"] as const;

export function listKnownChannelKeys(): readonly ChannelKey[] {
  return CHANNEL_KEYS;
}

export function listKnownIntegrationKeys(): readonly IntegrationKey[] {
  return INTEGRATION_KEYS;
}

export function getActiveChannels(config: TicqexConfig): ChannelKey[] {
  return CHANNEL_KEYS.filter((key) => config.channels[key]?.enabled);
}

export function getActiveIntegrations(config: TicqexConfig): IntegrationKey[] {
  return INTEGRATION_KEYS.filter((key) => config.integrations[key]?.enabled);
}

export function validateConfigBindings(
  config: TicqexConfig,
  knownChannels: readonly string[],
  knownIntegrations: readonly string[],
): ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];

  for (const [channelKey, channel] of Object.entries(config.channels)) {
    if (!knownChannels.includes(channelKey)) {
      issues.push({
        path: `channels.${channelKey}`,
        message: `Unknown channel key "${channelKey}"`,
      });
      continue;
    }

    if (!channel.enabled) continue;

    if (!channel.integration) {
      issues.push({
        path: `channels.${channelKey}.integration`,
        message: "Enabled channels must declare an integration",
      });
      continue;
    }

    if (!knownIntegrations.includes(channel.integration)) {
      issues.push({
        path: `channels.${channelKey}.integration`,
        message: `Unknown integration "${channel.integration}"`,
      });
    } else if (!config.integrations[channel.integration]?.enabled) {
      issues.push({
        path: `integrations.${channel.integration}.enabled`,
        message: `Channel "${channelKey}" requires integration "${channel.integration}" to be enabled`,
      });
    }
  }

  for (const [integrationKey, integration] of Object.entries(
    config.integrations,
  )) {
    if (!knownIntegrations.includes(integrationKey)) {
      issues.push({
        path: `integrations.${integrationKey}`,
        message: `Unknown integration key "${integrationKey}"`,
      });
      continue;
    }

    if (!integration.enabled) continue;

    const boundChannel = Object.entries(config.channels).find(
      ([, channel]) => channel.enabled && channel.integration === integrationKey,
    );
    if (!boundChannel) {
      issues.push({
        path: `integrations.${integrationKey}.enabled`,
        message: `Integration "${integrationKey}" is enabled but no channel binds to it`,
      });
    }
  }

  return issues;
}

export function validateAppEnvWhenEmailEnabled(
  config: TicqexConfig,
  env: NodeJS.ProcessEnv = process.env,
): ConfigValidationIssue[] {
  if (!config.channels.email?.enabled || !config.integrations.resend?.enabled) {
    return [];
  }

  const issues: ConfigValidationIssue[] = [];
  for (const key of APP_ENV_WHEN_EMAIL_ENABLED) {
    if (!env[key]?.trim()) {
      issues.push({
        path: `env.${key}`,
        message: `Missing required environment variable ${key}`,
      });
    }
  }
  return issues;
}
