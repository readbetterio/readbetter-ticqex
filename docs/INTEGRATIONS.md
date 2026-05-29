# Integrations

> Related: [API.md](./API.md) | [DATA-MODEL.md](./DATA-MODEL.md) | [PHASES.md](./PHASES.md) | [SENDGRID-INTEGRATION-GUIDE.md](./SENDGRID-INTEGRATION-GUIDE.md)

## Integration architecture

```
                    ┌─────────────┐
  Inbound email ──► │   Resend    │──webhook──► Next.js webhook route
                    └─────────────┘                    │
                                                       ▼
                                               after() background work
                                               (parse + match)
                                                       │
                                                       ▼
                                               Service layer ──► Supabase

  Admin reply ──► POST /api/v1/tickets/:id/messages
                           │
                           ▼
                   after() ──► Resend ──► Customer inbox

  Admin UI (read) ──► Supabase Realtime ──► Board update
  Admin UI (write) ──► REST API (same as external clients)
```

## Email (Resend)

### Channel and integration contracts

Email is a channel. Resend is the provider integration that powers the email channel in this repo.

```typescript
// server/channels/email/types.ts

interface ParsedEmail {
  from: string
  to: string[]
  cc: string[]
  subject: string
  body: string
  messageId: string
  providerRef?: EmailProviderRef
  inReplyTo?: string
  references?: string[]
  attachments: ParsedEmailAttachment[]
}

interface OutboundEmail {
  to: string
  from: string           // "Support <support@yourdomain.com>"
  subject: string
  body: string
  html?: string
  cc?: string[]
  inReplyTo?: string     // Message-ID for threading
  references?: string[]  // Thread Message-IDs
  attachments?: EmailAttachment[]
}
```

Resend-specific code lives in `server/integrations/resend/`. Email channel behavior lives in `server/channels/email/`.

### Inbound email flow

```
1. Customer sends email to support@yourdomain.com
2. Resend receives → POST /api/webhooks/integrations/resend/inbound
3. Webhook route validates signature → schedules background work via `after()`
4. Background work runs:
   a. Parse email (from, subject, body, headers, attachments)
   b. Find/create customer by `from` address → customers.username
   c. Match ticket (see Threading below)
   d. Create message (visibility: public, author: customer, channel: email)
   e. Store attachments in Supabase Storage
   f. If new ticket: set origin=email, title=subject, status=first lane
5. Realtime pushes update to admin board
```

### Email threading

Priority order for matching inbound email to existing ticket:

| Priority | Method | How |
|----------|--------|-----|
| 1 | **Message-ID / In-Reply-To** | `In-Reply-To` header matches any `messages.email_message_id` for this instance → attach to that ticket |
| 2 | **References header** | Any ID in `References` matches a known `email_message_id` |
| 3 | **Subject + customer fallback** | Normalize subject (strip `Re:`, `Fwd:`, `[TAGS]`) + match `email_threads.subject` + `customer.username` |
| 4 | **Create new ticket** | No match found |

Normalization example:

```
"Re: [Bug] Emails not sending" → "Emails not sending"
"Fwd: Re: Emails not sending"  → "Emails not sending"
```

Store mapping in `email_threads` table when a ticket is first created via email.

### Outbound email flow

Triggered when a **public** message is created with `channel: admin` or `channel: api`:

```
1. POST /api/v1/tickets/:id/messages { visibility: "public", ... }
2. Service layer creates message in DB
3. Schedules outbound send via `after()`:
   a. Load ticket + customer + thread history
   b. Build email with proper headers:
      - From: "Support <support@yourdomain.com>"
      - To: customer.username
      - Subject: "Re: {ticket.title}"
      - In-Reply-To: last message's email_message_id
      - References: all message IDs in thread
   c. Send via Resend integration
   d. Store returned Message-ID on the message row
4. Internal notes (visibility: internal) skip this flow entirely
```

### Customer matching

```typescript
async function findOrCreateCustomer(username: string): Promise<Customer> {
  const existing = await db.customers.findByUsername(username)
  if (existing) return existing
  return db.customers.create({ username })
}
```

`username` is typically an email address but can be any unique string (external ID, handle).

### Webhook URLs (Resend)

Configure Resend webhooks to hit the generic integration route (no installation IDs):

| Event | Resend event type(s) | URL |
|-------|----------------------|-----|
| Inbound | `email.received` | `{NEXT_PUBLIC_APP_URL}/api/webhooks/integrations/resend/inbound` |
| Delivery | `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.failed` | `{NEXT_PUBLIC_APP_URL}/api/webhooks/integrations/resend/events` |

Svix verification and payload handling live in `server/integrations/resend/webhooks.ts`; the route dispatches via `server/integrations/webhook-dispatch.ts`.

### Environment variables

```env
RESEND_API_KEY=re_...
RESEND_INBOUND_WEBHOOK_SECRET=whsec_...
# Optional separate signing secret for delivery events (defaults to inbound secret)
# RESEND_EVENTS_WEBHOOK_SECRET=whsec_...
SUPPORT_EMAIL=support@yourdomain.com
SUPPORT_FROM_NAME=Support
```

## Background email processing

Async email work uses Next.js [`after()`](https://nextjs.org/docs/app/api-reference/functions/after) on Vercel — same process, no external job runner.

| Work | Trigger | Purpose |
|------|---------|---------|
| Inbound parse + ticket create | Resend webhook → `enqueueInboundEmail()` | Fetch body, match thread, persist message |
| Outbound reply | Public message created | Send via Resend integration |
| Stale ticket digest | Cron (daily) | Optional; not implemented |
| Cleanup attachments | Cron (weekly) | Optional; not implemented |

### Why `after()`

- Inbound parsing can be slow (attachments, storage upload) — respond to webhook quickly
- Outbound send shouldn't block the API response
- Vercel Fluid Compute extends function lifetime for background work
- DB dedupe (`message_external_refs`, `email_message_id`) prevents duplicate messages on webhook retries

### Implementation

Resend webhook handlers verify and normalize provider payloads inside `server/integrations/resend/`, then enqueue normalized `ParsedEmail` / `EmailDeliveryEvent` payloads for the email channel. The channel owns email semantics; provider IDs travel as generic `providerRef` metadata for dedupe and delivery lookup.

Phase 5 scheduled jobs can use Vercel Cron or Supabase pg_cron when needed.

## Supabase Realtime

### Usage

Admin UI only. Read-only push channel.

```typescript
// Subscribe to ticket changes
supabase.channel('board')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tickets'
  }, (payload) => {
    // Re-fetch affected lane or patch local state
  })
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages'
  }, (payload) => {
    // Update ticket card preview if message belongs to visible ticket
  })
  .subscribe()
```

### RLS for Realtime

Authenticated staff users need **SELECT** policy on `tickets`, `messages`, `customers`, `custom_field_values` for Realtime to deliver events. Write policies are not needed (writes go through API with service role).

```sql
-- Example: agents can read all tickets (single-tenant v1)
CREATE POLICY "Staff can read tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (true);
```

### What Realtime does NOT do

- Auth validation (handled by Supabase Auth session)
- Business logic (handled by API)
- Write operations (handled by API)

## Supabase Storage

### Bucket: `attachments`

- Path: `attachments/{ticket_id}/{message_id}/{filename}`
- Access: signed URLs via API (never public bucket)
- Max file size: configure in Supabase (default 50MB; v1 email attachments typically smaller)
- Allowed types: v1 permissive (email can attach anything); restrict in hosted version if needed

## Webhooks (deferred — Phase 7)

Placeholder contract for when implemented:

```typescript
interface WebhookEndpoint {
  id: string
  url: string
  events: WebhookEvent[]
  secret: string  // HMAC signing
  active: boolean
}

type WebhookEvent =
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.status_changed'
  | 'message.created'
  | 'customer.created'
```

Delivery via background job with exponential backoff (TBD — Vercel Cron or pg_cron). Payload signed with `X-Ticqex-Signature` HMAC header.

v1: not implemented. API + email cover initial integration needs.

## AI agent integration (v1)

No special SDK needed. Agents use the REST API with an API key:

```bash
# Agent creates a ticket
curl -X POST https://instance.com/api/v1/tickets \
  -H "Authorization: Bearer tq_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Auto-detected: API latency spike",
    "customer": { "username": "monitoring@internal" },
    "origin": "api",
    "message": { "body": "Latency exceeded 2s threshold...", "visibility": "internal" }
  }'

# Agent reads context
curl https://instance.com/api/v1/tickets/:id/context \
  -H "Authorization: Bearer tq_live_..."
```

Future: MCP server or `@ticqex/agent` SDK (post-v1).

## OSS configuration (channels and integrations)

Open-source installs configure **activation** in JSON and **secrets** in `.env.local`. There is no hosted control plane in this repo.

| File | Committed | Purpose |
|------|-----------|---------|
| `config/ticqex.config.example.json` | Yes | Example active channels and integration bindings |
| `config/ticqex.config.json` | No (gitignored) | Local activation choices |
| `.env.local` | No | Supabase keys, Resend credentials, support sender |

Interactive setup:

```bash
pnpm ticqex init
```

Manual flow:

```bash
cp config/ticqex.config.example.json config/ticqex.config.json
pnpm db:start && pnpm db:env
pnpm config:sync    # validate activation + dry-run field policy sync
pnpm config:check   # validate bindings + required env vars
```

Folder layout (compiled TypeScript registries, not runtime plugins):

```text
config/ticqex.config.json     # operator activation
server/channels/email/        # product behavior
server/integrations/resend/   # provider webhooks + API
```

Email send/receive now goes through `server/channels/email/*` and `server/integrations/resend/*`; webhook entrypoints use the generic route under `src/app/api/webhooks/integrations/`.

## Environment variables (complete)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...

# Auth
# (handled by Supabase — no extra vars)

# Email
RESEND_API_KEY=re_...
RESEND_INBOUND_WEBHOOK_SECRET=whsec_...
SUPPORT_EMAIL=support@yourdomain.com
SUPPORT_FROM_NAME=Support

# App
NEXT_PUBLIC_APP_URL=https://your-instance.com
```

## Integration swap guide

| Integration | Contract location | v1 impl | To swap |
|-------------|-------------------|---------|---------|
| Email provider | `server/channels/email/types.ts` + `server/integrations/types.ts` | `server/integrations/resend` | Add a compiled provider folder and bind it in `config/ticqex.config.json` |
| Database | Direct Supabase client in services | Supabase | Phase 6+ if needed |
| Job queue | Next.js `after()` on Vercel | `server/channels/email/background.ts` | Would need external runner if moving off Vercel |
| Realtime | Supabase Realtime | Supabase | Would need WebSocket server |

Email provider integrations are the first swappable integration surface. Everything else is Supabase-native by design.

For a repo-specific hypothetical walkthrough of adding another email provider, see [SENDGRID-INTEGRATION-GUIDE.md](./SENDGRID-INTEGRATION-GUIDE.md). That guide does not mean SendGrid is implemented; it documents the expected shape of a future compiled provider integration.
