import { Resend } from "resend";
import {
  isHttpsAppUrl,
  RESEND_WEBHOOK_EVENTS,
  RESEND_WEBHOOK_HTTPS_REQUIRED,
  resendWebhookUrl,
} from "@shared/integrations/resend/webhook-endpoints";

export type ProvisionResendWebhooksInput = {
  apiKey: string;
  appUrl: string;
};

export type ProvisionResendWebhooksResult = {
  endpoint: string;
  signingSecret: string;
  created: boolean;
};

function formatResendError(error: { message: string; name?: string }): string {
  return error.name ? `${error.name}: ${error.message}` : error.message;
}

async function listAllWebhooks(
  resend: Resend,
): Promise<Array<{ id: string; endpoint: string }>> {
  const webhooks: Array<{ id: string; endpoint: string }> = [];
  let after: string | undefined;

  do {
    const { data, error } = await resend.webhooks.list(
      after ? { after } : undefined,
    );
    if (error) {
      throw new Error(formatResendError(error));
    }

    for (const webhook of data?.data ?? []) {
      webhooks.push({ id: webhook.id, endpoint: webhook.endpoint });
    }

    after = data?.has_more ? data.data.at(-1)?.id : undefined;
  } while (after);

  return webhooks;
}

async function signingSecretForEndpoint(
  resend: Resend,
  endpoint: string,
): Promise<string | null> {
  const webhooks = await listAllWebhooks(resend);
  const match = webhooks.find((webhook) => webhook.endpoint === endpoint);
  if (!match) return null;

  const { data, error } = await resend.webhooks.get(match.id);
  if (error) {
    throw new Error(formatResendError(error));
  }

  const secret = data?.signing_secret?.trim();
  return secret || null;
}

async function ensureWebhook(
  resend: Resend,
  endpoint: string,
  events: readonly string[],
): Promise<{ signingSecret: string; created: boolean }> {
  const existingSecret = await signingSecretForEndpoint(resend, endpoint);
  if (existingSecret) {
    return { signingSecret: existingSecret, created: false };
  }

  const { data, error } = await resend.webhooks.create({
    endpoint,
    events: [...events],
  });
  if (error) {
    throw new Error(formatResendError(error));
  }

  const signingSecret = data?.signing_secret?.trim();
  if (!signingSecret) {
    throw new Error(
      `Resend created webhook at ${endpoint} but did not return a signing secret.`,
    );
  }

  return { signingSecret, created: true };
}

export async function provisionResendWebhooks(
  input: ProvisionResendWebhooksInput,
): Promise<ProvisionResendWebhooksResult> {
  const apiKey = input.apiKey.trim();
  const appUrl = input.appUrl.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to provision webhooks.");
  }
  if (!appUrl) {
    throw new Error("Public app URL is required to provision webhooks.");
  }
  if (!isHttpsAppUrl(appUrl)) {
    throw new Error(RESEND_WEBHOOK_HTTPS_REQUIRED);
  }

  const resend = new Resend(apiKey);
  const endpoint = resendWebhookUrl(appUrl);
  const webhook = await ensureWebhook(resend, endpoint, RESEND_WEBHOOK_EVENTS);

  return {
    endpoint,
    signingSecret: webhook.signingSecret,
    created: webhook.created,
  };
}
