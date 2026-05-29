# Hypothetical SendGrid integration guide

This is a hypothetical implementation guide. Ticqex currently ships with the compiled Resend integration only. SendGrid is not implemented until the integration key, config shape, provider folder, webhook handlers, and tests described here are added.

The goal is to add SendGrid as another email provider integration while keeping the existing email channel behavior unchanged.

## Architecture fit

Email provider integrations are compiled TypeScript folders, not runtime plugins.

```text
shared/channels/email/transport.ts      # provider-neutral email payloads
server/channels/email/                  # ticket/message behavior for email
server/integrations/types.ts            # provider integration contract
server/integrations/resend/             # current provider example
server/integrations/sendgrid/           # hypothetical provider folder
shared/integrations/sendgrid/           # hypothetical shared payload parsers
shared/ticqex-keys/index.ts             # compiled integration keys
config/ticqex.config.json               # local channel to provider binding
```

The boundary should stay the same:

- The email channel owns product behavior: inbound ticket creation, outbound reply decisions, threading, attachments, field policy, card display, and delivery status updates.
- The SendGrid integration owns SendGrid API calls, webhook verification, webhook payload parsing, provider IDs, and conversion into provider-neutral email payloads.
- Provider-specific words such as `sendgrid_message_id`, `sg_event_id`, or SendGrid webhook payload shapes should not leak into `server/channels/email/*` or ticket services.

## Contracts to implement

The shared email transport types are the main channel contract:

```typescript
// shared/channels/email/transport.ts
export interface ParsedEmail {
  from: string;
  fromName?: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  messageId: string;
  providerRef?: EmailProviderRef;
  inReplyTo?: string;
  references?: string[];
  attachments: ParsedEmailAttachment[];
}

export interface OutboundEmail {
  to: string;
  from: string;
  subject: string;
  body: string;
  html?: string;
  cc?: string[];
  inReplyTo?: string;
  references?: string[];
  attachments?: EmailAttachment[];
}
```

The server integration contract is:

```typescript
// server/integrations/types.ts
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
  configure(env: NodeJS.ProcessEnv, config?: IntegrationBindingConfig): IntegrationRuntime;
  email?: IntegrationEmailHandler;
  webhooks?: Partial<Record<string, IntegrationWebhookEventHandler>>;
};
```

A SendGrid integration should implement `email.send`, `email.resolveInbound`, and webhook handlers for `inbound` and `events`.

## Provider folder layout

Use a folder parallel to Resend:

```text
server/integrations/sendgrid/
  email.ts
  integration.ts
  verify-signature.ts
  webhooks.ts

shared/integrations/sendgrid/
  index.ts
  webhook-types.ts
```

Suggested responsibilities:

| File | Responsibility |
|------|----------------|
| `integration.ts` | Declare `sendgridIntegration`, required env vars, capabilities, and the provider email handler. |
| `email.ts` | Send outbound mail through SendGrid and normalize inbound parse payloads into `ParsedEmail`. |
| `webhooks.ts` | Verify raw webhook requests, parse provider payloads, enqueue inbound work, and handle delivery events. |
| `verify-signature.ts` | Keep SendGrid signature, token, or gateway verification code isolated. |
| `shared/integrations/sendgrid/webhook-types.ts` | Define and validate SendGrid webhook payload shapes before normalization. |

## Compile the integration key

The repo intentionally uses explicit registries. Adding SendGrid requires code changes in the key and registry files.

```typescript
// shared/ticqex-keys/index.ts
export const INTEGRATION_KEYS = ["resend", "sendgrid"] as const;
```

Extend the config shape:

```typescript
// shared/ticqex-config/types.ts
export type TicqexConfig = {
  version: typeof TICQEX_CONFIG_VERSION;
  channels: {
    email: {
      enabled: boolean;
      integration: IntegrationKey | null;
    };
  };
  integrations: {
    resend: { enabled: boolean };
    sendgrid: { enabled: boolean };
  };
};
```

Register the integration and webhook events:

```typescript
// server/integrations/index.ts
import { sendgridIntegration } from "@server/integrations/sendgrid/integration";
import {
  handleSendGridEventsWebhook,
  handleSendGridInboundWebhook,
} from "@server/integrations/sendgrid/webhooks";

const sendgridWithWebhooks: IntegrationDefinition = {
  ...sendgridIntegration,
  webhooks: {
    inbound: handleSendGridInboundWebhook,
    events: handleSendGridEventsWebhook,
  },
};

const integrations = createRegistry<IntegrationKey, IntegrationDefinition>({
  resend: resendWithWebhooks,
  sendgrid: sendgridWithWebhooks,
});
```

## Define the SendGrid integration

The provider definition should declare every env var needed for a configured runtime.

```typescript
// server/integrations/sendgrid/integration.ts
import type {
  IntegrationBindingConfig,
  IntegrationDefinition,
  IntegrationRuntime,
} from "@server/integrations/types";
import {
  resolveSendGridInbound,
  sendSendGridEmail,
} from "@server/integrations/sendgrid/email";

const REQUIRED_ENV = [
  "SENDGRID_API_KEY",
  "SENDGRID_INBOUND_WEBHOOK_SECRET",
  "SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY",
  "SUPPORT_EMAIL",
  "SUPPORT_FROM_NAME",
] as const;

function missingRequiredEnv(env: NodeJS.ProcessEnv, keys: readonly string[]) {
  return keys.filter((key) => !env[key]?.trim());
}

export const sendgridIntegration: IntegrationDefinition = {
  key: "sendgrid",
  label: "SendGrid",
  capabilities: ["email.inbound", "email.outbound", "email.delivery-events"],
  requiredEnv: REQUIRED_ENV,
  configure(
    env: NodeJS.ProcessEnv,
    config: IntegrationBindingConfig = { enabled: true },
  ): IntegrationRuntime {
    const missingEnv = config.enabled
      ? missingRequiredEnv(env, REQUIRED_ENV)
      : [...REQUIRED_ENV].filter((key) => !env[key]?.trim());

    return {
      key: "sendgrid",
      label: "SendGrid",
      capabilities: sendgridIntegration.capabilities,
      configured: config.enabled && missingEnv.length === 0,
      missingEnv,
    };
  },
  email: {
    send: sendSendGridEmail,
    resolveInbound: resolveSendGridInbound,
  },
};
```

If inbound and delivery verification use different credentials, keep them as separate env vars. Do not reuse a SendGrid API key as a webhook signing secret.

## Configure SendGrid locally

Example local activation:

```json
{
  "version": 1,
  "channels": {
    "email": {
      "enabled": true,
      "integration": "sendgrid"
    }
  },
  "integrations": {
    "resend": {
      "enabled": false
    },
    "sendgrid": {
      "enabled": true
    }
  }
}
```

Example `.env.local` entries:

```env
SENDGRID_API_KEY=SG...
SENDGRID_INBOUND_WEBHOOK_SECRET=long-random-local-secret
SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY=...
SUPPORT_EMAIL=support@yourdomain.com
SUPPORT_FROM_NAME=Support
NEXT_PUBLIC_APP_URL=https://support.example.com
```

`NEXT_PUBLIC_APP_URL` is app-level config used to build webhook URLs and links. `SUPPORT_EMAIL` and `SUPPORT_FROM_NAME` are channel sender settings shared by email providers.

## Outbound sending

Outbound email already flows through the email channel:

```text
POST /api/v1/tickets/:id/messages
  -> server/services/messages.ts
  -> server/channels/email/background.ts
  -> server/channels/email/outbound.ts
  -> getChannelIntegrationEmail("email")
  -> active provider email.send()
```

The SendGrid `send()` implementation only needs to satisfy `OutboundEmail`.

Implementation notes:

- Send to `params.to`, `params.cc`, `params.from`, `params.subject`, `params.body`, and `params.html`.
- Preserve threading headers by passing `Message-ID`, `In-Reply-To`, and `References` when SendGrid accepts custom headers.
- Generate a stable RFC `Message-ID` before sending if SendGrid does not return one suitable for email threading.
- Return that RFC message ID as `messageId`; `server/channels/email/outbound.ts` stores it in `messages.email_message_id`.
- Store the SendGrid provider ID separately in `providerRef.externalId`; delivery events can use it to find the message through `message_external_refs`.
- Convert attachments from `Buffer` to the base64 attachment format SendGrid expects.

Sketch:

```typescript
// server/integrations/sendgrid/email.ts
import { EMAIL_PROVIDER_MESSAGE_REF_TYPE } from "@server/channels/email/types";
import type { OutboundEmail } from "@server/channels/email/types";

export async function sendSendGridEmail(params: OutboundEmail) {
  const messageId = createLocalMessageId();

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: parseAddress(params.from),
      personalizations: [
        {
          to: [{ email: params.to }],
          cc: params.cc?.map((email) => ({ email })),
          subject: params.subject,
          headers: {
            "Message-ID": messageId,
            ...(params.inReplyTo ? { "In-Reply-To": params.inReplyTo } : {}),
            ...(params.references ? { References: params.references.join(" ") } : {}),
          },
        },
      ],
      content: [
        { type: "text/plain", value: params.body },
        ...(params.html ? [{ type: "text/html", value: params.html }] : []),
      ],
      attachments: params.attachments?.map((attachment) => ({
        filename: attachment.filename,
        type: attachment.contentType,
        content: attachment.content.toString("base64"),
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`SendGrid send failed: ${response.status}`);
  }

  const sendgridMessageId = response.headers.get("x-message-id") ?? messageId;

  return {
    messageId,
    providerRef: {
      provider: "sendgrid",
      integrationKey: "sendgrid",
      direction: "outbound",
      refType: EMAIL_PROVIDER_MESSAGE_REF_TYPE,
      externalId: sendgridMessageId,
    },
  };
}
```

The exact request body should follow the SendGrid Mail Send API. Keep provider request construction inside `server/integrations/sendgrid/email.ts`.

## Inbound webhook handling

Webhook entrypoints already use the generic route:

```text
POST /api/webhooks/integrations/[integration]/[event]
```

For SendGrid, configure:

| SendGrid surface | Event | Ticqex URL |
|------------------|-------|------------|
| Inbound Parse | inbound email | `{NEXT_PUBLIC_APP_URL}/api/webhooks/integrations/sendgrid/inbound` |
| Event Webhook | delivery events | `{NEXT_PUBLIC_APP_URL}/api/webhooks/integrations/sendgrid/events` |

`server/integrations/sendgrid/webhooks.ts` should verify first, parse second, and only then enqueue or process normalized data.

```typescript
// server/integrations/sendgrid/webhooks.ts
export async function handleSendGridInboundWebhook(rawBody: string, headers: Headers) {
  if (!verifySendGridInboundWebhook(rawBody, headers)) {
    return {
      status: 401,
      body: { error: { code: "unauthorized", message: "Invalid webhook signature" } },
    };
  }

  const payload = parseSendGridInboundPayload(rawBody, headers);
  if (!payload) {
    return {
      status: 400,
      body: { error: { code: "bad_request", message: "Invalid payload" } },
    };
  }

  const {
    channelUnavailableWebhookResult,
    getOperationalEmailChannel,
  } = await import("@server/config/channel-gate");
  const channel = getOperationalEmailChannel();
  if (!channel) return channelUnavailableWebhookResult();

  const { enqueueChannelInbound } = await import("@server/channels/email/background");
  enqueueChannelInbound("email", () => resolveSendGridInbound(payload));

  return { status: 200, body: { accepted: true } };
}
```

Important details:

- Verify against the exact raw request body before parsing.
- Keep SendGrid verification code in `verify-signature.ts`.
- SendGrid Event Webhook signatures use provider-specific headers and a configured public key; delivery events should validate those headers before processing.
- Inbound Parse security may require a separate shared secret, signed gateway, or provider-supported signature depending on the SendGrid setup. Validate this in `verifySendGridInboundWebhook()` and document the chosen mode in `.env.example`.
- If full binary attachment support is needed and SendGrid posts multipart form-data, confirm the current `rawBody: string` webhook contract preserves the bytes you need. If it does not, change the integration webhook contract deliberately instead of adding SendGrid-specific logic to the generic route.

## Normalize inbound email

`resolveSendGridInbound()` converts the provider payload into `ParsedEmail`.

Mapping guidance:

| `ParsedEmail` field | SendGrid source |
|---------------------|-----------------|
| `from` | Parsed sender email from Inbound Parse `from` or envelope data |
| `fromName` | Display name from the parsed `From` header |
| `to` | Parsed `to` recipients |
| `cc` | Parsed `cc` recipients, default `[]` |
| `subject` | Inbound `subject`, defaulting to `(no subject)` only if needed |
| `body` | Plain text body, or HTML converted to text as a fallback |
| `bodyHtml` | HTML body when provided |
| `messageId` | RFC `Message-ID` header, normalized with the same rules as other email |
| `inReplyTo` | RFC `In-Reply-To` header |
| `references` | Split RFC `References` header |
| `attachments` | Inbound attachments as `Buffer` plus filename, type, and size |
| `providerRef` | Stable SendGrid-specific external ID for dedupe and delivery lookups |

Provider ref example:

```typescript
{
  provider: "sendgrid",
  integrationKey: "sendgrid",
  direction: "inbound",
  refType: EMAIL_PROVIDER_MESSAGE_REF_TYPE,
  externalId: payload.sgMessageId ?? normalizedMessageId,
  metadata: {
    source: "sendgrid_inbound_parse",
  },
}
```

The email channel will use the normalized payload to find or create the customer, match the thread, create the message, store attachments, and update the board. SendGrid code should not call ticket services directly.

## Normalize delivery events

SendGrid Event Webhook payloads are provider events; the channel expects `EmailDeliveryEvent`.

Suggested status mapping:

| SendGrid event | Ticqex status |
|----------------|---------------|
| `processed` | `sent` |
| `delivered` | `delivered` |
| `bounce` | `bounced` |
| `dropped` | `failed` |

Events such as `open`, `click`, `spamreport`, `unsubscribe`, and `deferred` should be ignored at first unless the product starts displaying those states.

The normalized event should include a provider ref that matches the outbound `providerRef` saved after `send()`:

```typescript
{
  status: "delivered",
  providerEventType: "delivered",
  occurredAt: payload.timestamp ? new Date(payload.timestamp * 1000).toISOString() : undefined,
  providerRef: {
    provider: "sendgrid",
    integrationKey: "sendgrid",
    direction: "outbound",
    refType: EMAIL_PROVIDER_MESSAGE_REF_TYPE,
    externalId: payload.sg_message_id,
  },
}
```

`server/channels/email/delivery.ts` owns the database update once it receives this normalized event.

## Webhook URLs

With `NEXT_PUBLIC_APP_URL=https://support.example.com`, configure SendGrid to call:

```text
https://support.example.com/api/webhooks/integrations/sendgrid/inbound
https://support.example.com/api/webhooks/integrations/sendgrid/events
```

The generic route will dispatch `integration=sendgrid` and `event=inbound|events` through `server/integrations/webhook-dispatch.ts`.

Do not add provider-specific routes such as `/api/webhooks/sendgrid/inbound` unless the generic route contract is deliberately replaced for all providers.

## Local testing checklist

After implementing the hypothetical provider:

```bash
cp config/ticqex.config.example.json config/ticqex.config.json
# edit config/ticqex.config.json to bind email -> sendgrid
pnpm db:start
pnpm db:env
pnpm db:seed-admin
pnpm config:check
pnpm test:channel-integration-registry
pnpm dev
```

For inbound testing:

1. Run the named Cloudflare tunnel for `support.example.com`.
2. Configure SendGrid Inbound Parse to post to `/api/webhooks/integrations/sendgrid/inbound`.
3. Send an email to the configured inbound address.
4. Confirm the webhook returns `200 {"accepted":true}`.
5. Verify a new conversation ticket and message were created in Supabase.
6. Verify `message_external_refs` contains a SendGrid inbound provider ref.

For outbound testing:

1. Log in to the admin UI.
2. Open an email conversation ticket.
3. Send a public reply.
4. Verify `messages.email_message_id` is set.
5. Verify `message_external_refs` contains a SendGrid outbound provider ref.
6. Confirm the customer receives the email and replies thread back into the same ticket.

For delivery-event testing:

1. Enable the SendGrid Event Webhook for delivery events only.
2. Use a signed SendGrid test event or a captured signed payload.
3. Confirm `/api/webhooks/integrations/sendgrid/events` returns `200`.
4. Verify `messages.email_delivery_status` updates for the matching outbound provider ref.

## Documentation updates to make with the implementation

When SendGrid is actually implemented, update:

- `.env.example` with the SendGrid env vars.
- `config/ticqex.config.example.json` if SendGrid should appear in the default example.
- `docs/INTEGRATIONS.md` to list SendGrid next to Resend as an implemented provider.
- `docs/API.md` only if the public API behavior changes. A provider swap should not change `/api/v1/*`.
- Any local test script docs if a SendGrid-specific smoke script is added.

Until those code and config changes exist, this guide should remain hypothetical.
