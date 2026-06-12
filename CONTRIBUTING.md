# Contributing to Ticqex

Thanks for your interest in contributing! This guide covers how to set up the
project, the standards we follow, and how to submit changes.

## Getting started

Prerequisites: **Node.js 20+** (development pinned to Node 22 — see
[`.nvmrc`](./.nvmrc)), **pnpm**, and **Docker** (for local Supabase).

```bash
pnpm install
pnpm ticqex init     # interactive Supabase + env setup
pnpm dev             # http://localhost:3000
```

See the [README](./README.md) for the full setup and environment reference, and
[AGENTS.md](./AGENTS.md) for repository conventions.

## Development workflow

1. **Fork** the repo and create a branch from `main`:
   `git checkout -b feat/short-description`.
2. Make your change. Keep it focused — one logical change per PR.
3. Add or update tests under `tests/unit/` or `tests/integration/`.
4. Run the checks below locally.
5. Open a pull request describing **what** changed and **why**.

## Checks before opening a PR

```bash
pnpm lint            # ESLint
pnpm build           # production build
pnpm test:unit       # fast, no database

# DB-backed behavior (requires local Supabase running):
pnpm db:start && pnpm db:env && pnpm db:seed-admin
pnpm test:integration
```

PRs must pass lint, build, and unit tests in CI before review.

## Database changes

- Schema is defined in `supabase/migrations/` and is the source of truth.
- Until the first public release, maintainers may squash local migration history
  into a clean baseline for distribution.
- After the first public release, add a new migration file; **never** edit applied
  migrations in place.
- Apply locally with `pnpm db:reset` (clean) or `pnpm db:start` (pending).
- **Never** run migrations against a remote or production database.

## Coding standards

- **TypeScript** throughout; no `any` escape hatches without justification.
- Business logic belongs in `server/services/`; keep route handlers thin.
- Validate input with Zod schemas (`server/lib/validation/`).
- Shared client/server code goes in `shared/` and must stay free of
  server-only dependencies.
- Comments explain *why*, not *what*.
- Use **pnpm** only — do not commit `npm`/`yarn` lockfiles.

## Commit & PR conventions

- Write clear, imperative commit messages (e.g. `fix: dedupe inbound emails`).
- Reference related issues (`Closes #123`) where applicable.
- Keep PRs reviewable; split large work into smaller PRs when possible.

## Reporting bugs & requesting features

Use GitHub Issues with the provided templates. For **security** issues, follow
[SECURITY.md](./SECURITY.md) instead of opening a public issue.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](./LICENSE).
