import { listChannelKeys } from "@server/channels";
import {
  getChannelDefinition,
  type ChannelDefinition,
} from "@server/channels";
import {
  configureIntegration,
  listIntegrationKeys,
  type IntegrationRuntime,
} from "@server/integrations";
import { loadTicqexConfig } from "@server/config/load";
import type {
  ConfigValidationIssue,
  ConfigValidationResult,
  TicqexConfig,
} from "@server/config/types";
import {
  validateAppEnvWhenEmailEnabled,
  validateConfigBindings,
} from "@shared/ticqex-config/validate";
import { assertConfigShape } from "@shared/ticqex-config/load";

export type ChannelRuntime = {
  channel: ChannelDefinition;
  binding: TicqexConfig["channels"][keyof TicqexConfig["channels"]];
  integration: IntegrationRuntime | null;
  integrationKey: string | null;
};

function validateIntegrationEnv(
  config: TicqexConfig,
  env: NodeJS.ProcessEnv,
): ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];

  for (const [channelKey, binding] of Object.entries(config.channels)) {
    if (!binding.enabled || !binding.integration) continue;

    const integrationBinding =
      config.integrations[
        binding.integration as keyof TicqexConfig["integrations"]
      ];
    if (!integrationBinding?.enabled) {
      issues.push({
        path: `channels.${channelKey}`,
        message: `Channel "${channelKey}" is enabled but integration "${binding.integration}" is disabled or missing`,
      });
      continue;
    }

    const runtime = configureIntegration(binding.integration, env, {
      enabled: integrationBinding.enabled,
    });
    if (!runtime) continue;

    if (!runtime.configured) {
      for (const envKey of runtime.missingEnv) {
        issues.push({
          path: `env.${envKey}`,
          message: `Missing required env var for ${binding.integration} (${channelKey} channel)`,
        });
      }
    }
  }

  return issues;
}

function configShapeIssues(config: TicqexConfig): ConfigValidationIssue[] {
  try {
    assertConfigShape(config);
    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [{ path: "config", message }];
  }
}

export function validateTicqexConfig(
  config: TicqexConfig,
  env: NodeJS.ProcessEnv = process.env,
): ConfigValidationResult {
  const issues = [
    ...configShapeIssues(config),
    ...validateConfigBindings(
      config,
      listChannelKeys(),
      listIntegrationKeys(),
    ),
    ...validateIntegrationEnv(config, env),
    ...validateAppEnvWhenEmailEnabled(config, env),
  ];

  return {
    ok: issues.length === 0,
    config,
    issues,
  };
}

export function resolveChannelRuntime(
  channelKey: string,
  options: {
    config?: TicqexConfig;
    configPath?: string;
    env?: NodeJS.ProcessEnv;
  } = {},
): ChannelRuntime | null {
  const config = options.config ?? loadTicqexConfig(options.configPath);
  const env = options.env ?? process.env;
  const channel = getChannelDefinition(channelKey);
  const binding =
    config.channels[channelKey as keyof TicqexConfig["channels"]];

  if (!channel || !binding) return null;

  let integration: IntegrationRuntime | null = null;
  const integrationKey = binding.integration;

  if (binding.enabled && integrationKey) {
    const integrationBinding =
      config.integrations[
        integrationKey as keyof TicqexConfig["integrations"]
      ];
    if (integrationBinding) {
      integration = configureIntegration(integrationKey, env, {
        enabled: integrationBinding.enabled,
      });
    }
  }

  return {
    channel,
    binding,
    integration,
    integrationKey,
  };
}

/** Resolves the active email channel and its configured integration runtime. */
export function getEmailChannelRuntime(
  options: {
    config?: TicqexConfig;
    configPath?: string;
    env?: NodeJS.ProcessEnv;
  } = {},
): ChannelRuntime | null {
  return resolveChannelRuntime("email", options);
}
