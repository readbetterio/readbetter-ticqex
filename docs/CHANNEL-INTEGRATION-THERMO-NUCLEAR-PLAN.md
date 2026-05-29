# Channel and Integration Migration Plan

Thermo-nuclear plan for moving the current Resend email implementation onto a channel/integration architecture that stays open-source friendly: managed by folders, checked-in config examples, local config files, and environment variables rather than a hosted admin UI.

## Goal, Constraints, And Non-Goals

**Goal:** make email a first-class `channel` powered by a Resend `integration`, with the current inbound webhook, outbound replies, delivery events, field requirements, and board/card UX running through the new channel/integration path.

**Open-source constraint:** this repo should be fully operable through checked-in folders, typed config files, and env vars. No paid/hosted control plane is required to configure channels or integrations.

**Hosted future constraint:** the hosted version will live in a separate repo. This OSS repo should keep contracts clean enough to inspire or share code with hosted later, but it should not prebuild hosted tenancy, hosted secrets management, or integration setup screens.

**No compatibility constraint:** there are no production clients or production data to preserve. This migration may rewrite migrations, drop provider-specific columns outright, and require wiping local databases with `pnpm db:reset`.

**Explicitly out of scope for this migration:**

- Arbitrary runtime plugin loading from npm, remote code, or user-provided scripts.
- Adding Slack, Postmark, Mailgun, or other providers in the same implementation pass.
- Replacing the whole settings system or ticket model.
- Moving secrets into the database for OSS.
- Building a hosted integration marketplace UI.

Assumption: compiled TypeScript folders own behavior, while an ignored local JSON config file is acceptable for OSS activation choices. `.env` remains the place for secrets and deployment-specific values.

## Simplest Viable Approach

The code-judo move is to avoid a generic plugin engine. Make channels and integrations **compiled folders with explicit TypeScript contracts**.

- A **channel** owns product behavior: ticket/message shape, required fields, default settings, card display, compose behavior, inbound processing, and outbound dispatch decisions.
- An **integration** owns one external system: Resend API calls, Resend webhook verification, Resend payload parsing, and provider-specific IDs.
- A **config file** binds one channel to one or more integrations using env-backed credentials.

This lets the OSS repo be programmable by adding folders and config, while keeping production behavior typed, reviewable, and easy to scan.

Target shape:

```text
config/
  ticqex.config.example.json
  ticqex.config.json

server/
  channels/
    index.ts
    types.ts
    email/
      channel.ts
      inbound.ts
      outbound.ts
      delivery-events.ts
      fields.ts
      card.ts
  integrations/
    index.ts
    types.ts
    resend/
      integration.ts
      email.ts
      webhooks.ts
```

Avoid this shape for now:

```text
plugins/
  arbitrary-runtime-code-from-users/
```

That would create security, deployment, bundling, and support problems before the product has enough integration diversity to justify it.

## Core Contracts

The migration should introduce only two durable contracts at first.

```ts
type ChannelDefinition = {
  key: string;
  label: string;
  conversation: {
    canSendPublicReplies: boolean;
    contactAddressLabel: string;
  };
  fields: ChannelFieldPolicy[];
  card: ChannelCardSurface;
  inbound?: ChannelInboundHandler;
  outbound?: ChannelOutboundHandler;
  deliveryEvents?: ChannelDeliveryEventHandler;
};

type IntegrationDefinition = {
  key: string;
  label: string;
  capabilities: IntegrationCapability[];
  configure(env: NodeJS.ProcessEnv, config: unknown): IntegrationRuntime;
};
```

Provider-specific words should not cross these contracts. For example, Resend webhook payloads become normalized channel events before reaching ticket services, and provider IDs travel as generic `providerRef` metadata.

## PR Slice 1: Folder Registry And Config Binding

**Owner:** `server/channels`, `server/integrations`, `config`, `scripts/ticqex.ts`.

**Boundary:** no behavior changes; the existing Resend code still sends and receives email.

1. Add `server/channels/types.ts` and `server/integrations/types.ts` with the minimal contracts above.
2. Add static registries in `server/channels/index.ts` and `server/integrations/index.ts`; use explicit imports, not dynamic folder loading.
3. Add `config/ticqex.config.example.json` and ignored `config/ticqex.config.json` that declare active channels and integration bindings.
4. Move env lookup for email provider settings behind the config binding, while preserving the existing env names.
5. Add a resolver such as `getChannelRuntime("email")` that returns the configured channel plus integration runtime.
6. Add `pnpm ticqex init` to create/update `.env.local` and `config/ticqex.config.json` interactively.
7. Add a config validation script, e.g. `pnpm config:check`, that verifies every configured channel and integration key exists and required env vars are present.
8. Update docs to say OSS configuration happens in `config/ticqex.config.json` plus `.env.local`.

Success criteria:

- Existing email behavior remains unchanged.
- No database migration is needed in this slice.
- `pnpm config:check` fails clearly when `RESEND_API_KEY`, webhook secrets, or support sender envs are missing.

## PR Slice 2: Move Email And Resend Into Canonical Folders

**Owner:** `server/channels/email`, `server/integrations/resend`.

**Boundary:** behavior-preserving module move plus type cleanup.

1. Keep Resend API and Svix verification code in `server/integrations/resend`.
2. Keep email channel background/outbound behavior in `server/channels/email`.
3. Keep general ticket, message, customer, attachment, and status services in `server/services`; do not duplicate those in the channel folder.
4. Use provider-neutral ref metadata such as `providerRef`.
5. Keep background enqueue functions under the email channel boundary.
6. Replace the current provider-specific webhook route ownership with the registry-backed dispatcher; do not preserve old route files for compatibility.

Success criteria:

- A reader can find product email behavior in `server/channels/email`.
- A reader can find Resend-specific behavior in `server/integrations/resend`.
- No service outside those folders imports Resend directly.

## PR Slice 3: Clean Provider References Schema

**Owner:** Supabase migrations plus message/email services.

**Boundary:** replace provider-specific persistence directly. No backfill, dual-write, or legacy-column compatibility path.

Code-judo distinction: keep RFC email fields on `messages` because they are channel data, not provider data. Move only provider IDs out of `messages`.

Keep:

- `messages.email_message_id`
- `messages.email_in_reply_to`
- `messages.email_from`
- `messages.email_to`
- `messages.email_cc`
- `messages.email_subject`
- `messages.email_body_html`
- `messages.email_delivery_status`

Steps:

1. Rewrite the relevant migrations so new installs create `message_external_refs` from the start.
2. Keep provider-specific columns out of the target `messages` schema.
3. Define `message_external_refs` with `message_id`, `provider`, `integration_key`, `direction`, `ref_type`, `external_id`, `metadata`, and timestamps.
4. Add a unique index on provider/integration/direction/ref type/external ID for dedupe and delivery lookups.
5. Update inbound dedupe to search `message_external_refs` by provider/inbound external ID, then fall back to RFC `email_message_id`.
6. Update outbound send completion to write provider refs only to `message_external_refs`.
7. Update delivery event lookup to use `message_external_refs`.
8. Run `pnpm db:reset` locally and treat existing local data loss as expected.

Success criteria:

- Searching the runtime code and target migrations finds no active provider-specific message columns.
- Resend delivery events still update `email_delivery_status`.
- Inbound webhook retries still dedupe.

## PR Slice 4: Channel Field Policies And Config Sync

**Owner:** `server/channels/email/fields.ts`, existing custom field services, config tooling.

**Boundary:** channel-specific required/visible field behavior without inventing a second custom-field system.

The existing `custom_field_definitions` table remains the storage layer. Folder config becomes the source of truth for channel-owned field definitions and field policies.

1. Add channel field policy support to `ChannelDefinition`: `requiredWhen`, `visibleWhen`, `lockedWhen`, `source`, and `cardPriority`.
2. Define email channel policies in `server/channels/email/fields.ts`.
3. Add `pnpm config:sync` to upsert configured custom field definitions into `custom_field_definitions`.
4. Add service-layer validation that checks channel-required fields on ticket create/update and inbound message creation.
5. Make integration-sourced fields locked from normal ticket edit flows unless the channel policy allows editing.
6. Keep global custom fields working as they do today; channel policies add applicability, not a parallel value store.
7. Document that OSS operators edit field definitions in channel/config files and run `pnpm config:sync`.

Success criteria:

- Required channel fields fail in API/service validation, not only in React.
- Existing custom field filters keep working.
- Email can declare its required fields without hardcoding those checks in unrelated ticket services.

## PR Slice 5: Config-Driven Card And Compose Surfaces

**Owner:** `server/channels/email/card.ts`, board API formatting, `src/components/board`.

**Boundary:** replace hardcoded card assumptions with channel surfaces.

Current cards hardcode an `Email` badge and show the first two custom fields. The migration should make cards read a prepared surface from the channel definition, not interpret arbitrary config in React.

1. Add a server-side card surface builder that returns badge labels, warning badges, preview text, and ordered custom field chips for a ticket.
2. Make the board API include `card_surface` on each ticket.
3. Update `TicketCard` to render `card_surface` instead of hardcoding `Email` and `Object.entries(custom_fields).slice(0, 2)`.
4. Define the email card surface in `server/channels/email/card.ts`.
5. Add delivery-failure and missing-required-field warning badges through the same surface.
6. Keep visual rendering generic; channel folders choose content, React chooses styling.

Success criteria:

- Adding a future `slack` channel should not require editing `TicketCard` for the label, warning, or primary field chips.
- Email cards look the same by default after the migration, except for any intentional warning badges.

## PR Slice 6: Generic Webhook Entrypoint

**Owner:** `src/app/api/webhooks`, integration registry.

**Boundary:** generic webhook dispatch with no provider-specific route compatibility layer.

1. Add a generic route such as `/api/webhooks/integrations/[integration]/[event]`.
2. Route generic webhook requests to the configured integration runtime.
3. Normalize provider webhooks into channel events before calling channel handlers.
4. Remove `/api/webhooks/resend/inbound` and `/api/webhooks/resend/events`.
5. Update docs and `.env.example` to document only the generic route.

Success criteria:

- New Resend webhook setup uses only the generic integration route.
- New integration webhook routes do not need provider-specific route files unless a provider truly requires a special transport.

## Rollout And Migration Strategy

This can ship as sequential PRs without feature flags because there is no production data or client compatibility obligation.

- Slices 1-2 are code movement and registry introduction; rollback is reverting code.
- Slice 3 is a clean schema replacement. Wipe local DBs with `pnpm db:reset`; do not spend work on backfills or old-column cleanup.
- Slices 4-5 are additive behavior through config-defined policies and surfaces.
- Slice 6 replaces webhook URLs. Reconfigure local/dev Resend webhooks to the generic route.

Do not preserve incidental Resend persistence just because it exists today. The canonical schema after this migration should look like the system we want new OSS installs to use.

## Verification Plan

Tie verification to the behavior this migration must preserve.

1. Run `pnpm ticqex --help` and `pnpm ticqex init --skip-db`.
2. Run `pnpm config:check` with valid and missing env vars.
3. Run `pnpm config:sync` and confirm configured custom fields are upserted idempotently.
4. Run `pnpm lint`.
5. Run `pnpm build`.
6. Wipe and reapply the local database with `pnpm db:reset`.
7. Run the existing message/read smoke tests.
8. Start the app and verify `/api/health`.
9. Exercise inbound Resend webhook locally through the new generic route.
10. Send an outbound public reply and confirm:
   - message is created immediately
   - background send stores RFC email message ID
   - provider ref is written to `message_external_refs`
   - delivery event updates `email_delivery_status`
11. Verify board cards still render email conversations, custom fields, tags, unread count, and any warning badges.

## Decisions Before Implementation

Resolved:

1. JSON remains the operator-facing activation layer.
2. `pnpm ticqex init` runs `config:sync` as part of local setup.
3. Defer installation IDs and installation keys. The OSS repo stays single-team/single-active-provider by config; hosted multi-installation routing belongs in the separate hosted repo.

Open: none.
