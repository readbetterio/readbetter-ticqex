import { getIntegrationDefinition } from "@server/integrations";
import type { IntegrationWebhookResult } from "@server/integrations/types";

export type { IntegrationWebhookResult } from "@server/integrations/types";

export async function dispatchIntegrationWebhook(
  integrationKey: string,
  event: string,
  rawBody: string,
  headers: Headers,
): Promise<IntegrationWebhookResult> {
  const definition = getIntegrationDefinition(integrationKey);
  if (!definition) {
    return {
      status: 404,
      body: {
        error: {
          code: "not_found",
          message: `Unknown integration "${integrationKey}"`,
        },
      },
    };
  }

  const handler = definition.webhooks?.[event];
  if (!handler) {
    return {
      status: 404,
      body: {
        error: {
          code: "not_found",
          message: `Unknown webhook event "${event}" for integration "${integrationKey}"`,
        },
      },
    };
  }

  return handler(rawBody, headers);
}
