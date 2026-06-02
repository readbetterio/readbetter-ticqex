# AGENTS.md

Guidance for AI agents and contributors working in this repository. Keep changes
small, typed, and tested. Human-facing setup lives in [README.md](./README.md);
contribution process lives in [CONTRIBUTING.md](./CONTRIBUTING.md).

## What this project is

Ticqex is an agent-first support platform: every ticket action is exposed over a
typed REST API (`/api/v1/*`) and an MCP server, so AI agents are first-class
operators alongside humans, who supervise on a realtime Kanban admin. A
composable, registry-based channel/integration layer adapts the platform to each
deployment; email parsing ships onboard (inbound → tickets, outbound via Resend).
Built on Supabase (Postgres, Auth, Realtime) and Next.js (App Router), async
email work runs in-process via Next.js `after()` — there is no external job
runner.

## Tech stack

- **Next.js 16** (App Router) + **React 19**, TypeScript everywhere
- **Supabase** (Postgres, Auth, RLS) — local stack via Docker
- **Resend** for inbound/outbound email (Svix-signed webhooks)
- **Tailwind v4** + shadcn/ui + Radix for the admin UI
- **Vitest** for unit + integration tests
- **pnpm** is the only supported package manager

## Repository layout

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router — admin UI, API routes (`/api/v1/*`), webhooks, MCP |
| `src/components/` | React components (board, settings, account) |
| `server/services/` | Business logic (tickets, board, messages, contacts, …) |
| `server/channels/` | Product channel behavior (email today) |
| `server/integrations/` | External providers (Resend) |
| `server/lib/`, `server/middleware/` | Route handlers, auth, validation, errors |
| `shared/` | Code shared between client and server (config, registries, schemas) |
| `supabase/migrations/` | Database schema (source of truth) |
| `scripts/` | Setup/seed/verify CLIs (`pnpm ticqex`, `db:*`, `config:*`) |
| `config/` | Activation config (`ticqex.config.json`, committed) |
| `tests/unit`, `tests/integration` | Vitest suites (helpers in `tests/helpers/`) |

## Local development

Prerequisites: Node 20+ (dev pinned to Node 22 in `.nvmrc`), pnpm, Docker (for
local Supabase).

```bash
pnpm install
pnpm ticqex init        # interactive: Supabase + channels + env
pnpm dev                # http://localhost:3000
```

Manual equivalent:

```bash
pnpm db:start           # local Supabase (Docker)
pnpm db:env             # write Supabase keys → .env.local
pnpm db:bootstrap       # required statuses + settings
pnpm db:seed-admin      # optional local admin user
pnpm dev
```

Open `http://localhost:3000` (not `127.0.0.1` — Next.js dev treats them as
different origins). Health check: `http://localhost:3000/api/health` should
return `{"status":"ok","checks":{"app":"ok","database":"ok"}}`.

## Standard commands

`pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:unit`,
`pnpm test:integration`, `pnpm db:start`, `pnpm db:stop`, `pnpm db:reset`,
`pnpm db:env`, `pnpm db:bootstrap`, `pnpm db:seed-admin`, `pnpm config:check`,
`pnpm env:verify`.

## Working agreement for agents

- **Always use `pnpm`.** Never introduce `npm`/`yarn` lockfiles.
- **Migrations are local-only.** After editing `supabase/migrations/`, apply with
  `pnpm db:reset` (clean) or `pnpm db:start` (pending) against the **local** DB
  only. Never run migrations against a remote/production Supabase project.
- **Restart the dev server yourself** after server/API/config changes or when
  Turbopack shows stale errors. Only one `pnpm dev` at a time.
- **Test your change** before finishing: `pnpm test:unit` for fast checks;
  `pnpm test:integration` after `pnpm db:env` + `pnpm db:seed-admin` for
  DB-backed behavior. Add tests under `tests/unit/` or `tests/integration/`.
- **Validate input** with Zod schemas in `server/lib/validation/`; return errors
  via the helpers in `server/lib/errors.ts` / `response.ts`.
- **Never commit secrets.** `.env.local` and credentials stay out of git
  (`.env.example` is the committed template).

## Conventions

- Business logic lives in `server/services/`; route handlers stay thin.
- Shared client/server code goes in `shared/`; keep it free of server-only deps.
- Prefer the registry pattern (`shared/registry/`) for channels/integrations.
- Comments explain *why*, not *what*. Avoid narrating obvious code.

## Gotchas

- **Supabase keys:** use publishable + secret keys from `pnpm db:env`
  (`PUBLISHABLE_KEY` / `SECRET_KEY`), not legacy JWT anon/service-role keys.
- **Stale Supabase state:** `supabase start` may report "already running" while
  the DB container exited → `pnpm db:stop && pnpm db:start`.
- **Webhook verification** uses Svix headers (`svix-id/-timestamp/-signature`),
  not a plain HMAC of the body. Verify against the raw request body string.
- **Inbound `email.received` payloads omit the body** — it is fetched via the
  Resend API in `resolveInbound()` before the ticket message is created.

