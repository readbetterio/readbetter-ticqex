import type {
  EmailProviderRef,
  OutboundEmail,
  ParsedEmail,
} from "@shared/channels/email/transport";
import type { IntegrationKey } from "@shared/ticqex-keys";

export type { IntegrationKey } from "@shared/ticqex-keys";

export type IntegrationCapability =
  | "email.inbound"
  | "email.outbound"
  | "email.delivery-events";

export type IntegrationRuntime = {
  key: IntegrationKey;
  label: string;
  capabilities: IntegrationCapability[];
  /** True when all required env vars for this integration are present. */
  configured: boolean;
  missingEnv: string[];
};

export type IntegrationBindingConfig = {
  enabled: boolean;
};

export type IntegrationWebhookResult = {
  status: number;
  body: Record<string, unknown>;
};

export type IntegrationWebhookEventHandler = (
  rawBody: string,
  headers: Headers,
) => Promise<IntegrationWebhookResult>;

/** Provider transport for email channels bound to this integration. */
export type IntegrationEmailHandler = {
  send(params: OutboundEmail): Promise<{
    messageId: string;
    providerRef?: EmailProviderRef;
  }>;
  resolveInbound(raw: unknown): Promise<ParsedEmail>;
};

export type IntegrationDefinition = {
  key: IntegrationKey;
  label: string;
  capabilities: IntegrationCapability[];
  requiredEnv: readonly string[];
  optionalEnv?: readonly string[];
  configure(
    env: NodeJS.ProcessEnv,
    config?: IntegrationBindingConfig,
  ): IntegrationRuntime;
  email?: IntegrationEmailHandler;
  webhooks?: Partial<Record<string, IntegrationWebhookEventHandler>>;
};
