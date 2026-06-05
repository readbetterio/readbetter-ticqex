import type {
  IntegrationDefinition,
  IntegrationKey,
  IntegrationRuntime,
} from "@server/integrations/types";
import { resendIntegration } from "@server/integrations/resend/integration";
import { handleResendWebhook } from "@server/integrations/resend/webhooks";
import { createRegistry } from "@shared/registry";

export type {
  IntegrationDefinition,
  IntegrationRuntime,
} from "@server/integrations/types";
export type { IntegrationKey } from "@shared/ticqex-keys";
export { resendIntegration } from "@server/integrations/resend/integration";
export type { ResendIntegrationConfig } from "@server/integrations/resend/integration";

const resendWithWebhooks: IntegrationDefinition = {
  ...resendIntegration,
  webhooks: {
    webhook: handleResendWebhook,
  },
};

const integrations = createRegistry<IntegrationKey, IntegrationDefinition>({
  resend: resendWithWebhooks,
});

export const integrationRegistry = integrations.registry;
export const integrationKeys = integrations.keys;

export const listIntegrationKeys = integrations.listKeys;
export const getIntegrationDefinition = integrations.get;
export const listIntegrationDefinitions = integrations.list;

export function configureIntegration(
  key: string,
  env: NodeJS.ProcessEnv,
  config?: { enabled?: boolean },
): IntegrationRuntime | null {
  const definition = getIntegrationDefinition(key);
  if (!definition) return null;
  return definition.configure(env, { enabled: config?.enabled ?? true });
}
