import type {
  IntegrationBindingConfig,
  IntegrationDefinition,
  IntegrationRuntime,
} from "@server/integrations/types";
import {
  resolveResendInbound,
  sendResendEmail,
} from "@server/integrations/resend/email";
import type { ResendInboundWebhookPayload } from "@shared/integrations/resend/webhook-types";

export type ResendIntegrationConfig = IntegrationBindingConfig;

const REQUIRED_ENV = [
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "SUPPORT_EMAIL",
  "SUPPORT_FROM_NAME",
] as const;

const OPTIONAL_ENV = [] as const;

function missingRequiredEnv(
  env: NodeJS.ProcessEnv,
  keys: readonly string[],
): string[] {
  return keys.filter((key) => !env[key]?.trim());
}

export const resendIntegration: IntegrationDefinition = {
  key: "resend",
  label: "Resend",
  capabilities: [
    "email.inbound",
    "email.outbound",
    "email.delivery-events",
  ],
  requiredEnv: REQUIRED_ENV,
  optionalEnv: OPTIONAL_ENV,
  configure(
    env: NodeJS.ProcessEnv,
    config: ResendIntegrationConfig = { enabled: true },
  ): IntegrationRuntime {
    const missingEnv = config.enabled
      ? missingRequiredEnv(env, REQUIRED_ENV)
      : [...REQUIRED_ENV].filter((key) => !env[key]?.trim());

    return {
      key: "resend",
      label: "Resend",
      capabilities: resendIntegration.capabilities,
      configured: config.enabled && missingEnv.length === 0,
      missingEnv,
    };
  },
  email: {
    send: sendResendEmail,
    resolveInbound: (raw) =>
      resolveResendInbound(raw as ResendInboundWebhookPayload),
  },
};
