# Ticqex — Planning Docs

Interlinked specifications for an API-first, open-core support/ticketing platform.

## Documents

| Doc | Purpose |
|-----|---------|
| [VISION.md](./VISION.md) | Product vision, principles, open-core strategy, license |
| [NAMING.md](./NAMING.md) | Brand name decision and assets |
| [DATA-MODEL.md](./DATA-MODEL.md) | Entities, relationships, custom fields |
| [API.md](./API.md) | REST API design, auth, filtering, conventions |
| [PHASES.md](./PHASES.md) | Phased build plan with dependencies |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Email, background processing, Realtime, channel/integration contracts |
| [SENDGRID-INTEGRATION-GUIDE.md](./SENDGRID-INTEGRATION-GUIDE.md) | Hypothetical guide for adding SendGrid as an email provider |
| [CHANNEL-INTEGRATION-THERMO-NUCLEAR-PLAN.md](./CHANNEL-INTEGRATION-THERMO-NUCLEAR-PLAN.md) | Plan to move email onto folder-managed channels and integrations |
| [FEATURE-COLLECTION.md](./FEATURE-COLLECTION.md) | Backlog of unprioritized feature ideas |

## How to read these

```
VISION ──► PHASES ──► (implementation)
   │           │
   ├── DATA-MODEL ◄──► API
   │           │
   └── INTEGRATIONS
```

Start with **VISION** for the "why", then **PHASES** for the "when", and use **DATA-MODEL** + **API** as the build reference.

## Decisions log

| Decision | Choice |
|----------|--------|
| **Product name** | Ticqex |
| License (core) | MIT — open core |
| Tenancy (v1) | Single instance = one team |
| Admin data access | API only (no Supabase client in browser) |
| Realtime | Supabase Realtime for admin Kanban |
| DB | All-in on Supabase |
| Deploy | Vercel + Supabase Cloud |
| API surface | Next.js Route Handlers + service layer |
| Async jobs | Next.js `after()` on Vercel (email; cron TBD) |
| Email | Resend integration |
| OSS config | `config/ticqex.config.json` + `.env.local` via `pnpm ticqex init` |
| Webhooks | Deferred post-v1 |
