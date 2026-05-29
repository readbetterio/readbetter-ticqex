import { Resend } from "resend";

let webhookClient: Resend | null = null;

function getWebhookClient(): Resend {
  if (!webhookClient) {
    webhookClient = new Resend(process.env.RESEND_API_KEY ?? "re_test");
  }
  return webhookClient;
}

export function verifySvixWebhook(
  payload: string,
  headers: Headers,
  webhookSecret: string | undefined,
): boolean {
  if (!webhookSecret) return process.env.NODE_ENV !== "production";

  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!id || !timestamp || !signature) return false;

  try {
    getWebhookClient().webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    });
    return true;
  } catch {
    return false;
  }
}
