# @ticqex/api-client

TypeScript client for the [Ticqex](https://github.com/rbouschery/ticqex) REST API (`/api/v1`).

## Install

```bash
pnpm add @ticqex/api-client
```

## Usage

```typescript
import { TicqexClient } from "@ticqex/api-client";

const client = new TicqexClient({
  baseUrl: "https://your-instance.example.com",
  apiKey: process.env.TICQEX_API_KEY!,
});

const ticket = await client.get<{ id: string }>("/tickets/550e8400-e29b-41d4-a716-446655440000");

const created = await client.post("/tickets", {
  subject: "Login issue",
  contact_email: "user@example.com",
});

const tickets = await client.get("/tickets", { page: 1, per_page: 25 });
```

## API

- `get(path, query?)`, `post(path, body?)`, `patch(path, body?)`, `put(path, body?)`, `delete(path, body?)`
- `request({ method, path, query?, body? })` for full control
- Paths are relative to `/api/v1` (e.g. `/tickets`, not `/api/v1/tickets`)
- `baseUrl` may include or omit a trailing slash and `/api/v1` suffix; both are normalized
- Errors throw `TicqexApiError` with `status`, `code`, and `message`

## Requirements

Node.js 20+ (uses native `fetch`).

## Development

```bash
pnpm build
pnpm test
```
