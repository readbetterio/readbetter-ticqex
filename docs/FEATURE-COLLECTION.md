# Feature Collection

Parking lot for ideas to explore later — not committed to any phase or timeline.

Add items as they come up. When an idea is ready to build, move it into [PHASES.md](./PHASES.md) or a dedicated spec and remove or mark it done here.

## Format

| Field | Notes |
|-------|--------|
| **Status** | `idea` · `exploring` · `planned` · `done` · `dropped` |
| **Summary** | One line on what it is |
| **Notes** | Optional context, constraints, links |

---

## Ideas

### Lite email WYSIWYG editor

| | |
|---|---|
| **Status** | idea |
| **Summary** | Minimal rich-text editor for composing public email replies in the admin UI. |
| **Notes** | Keep formatting options light (e.g. bold, italic, links, lists) — email-safe output, not a full document editor. Consider HTML → plain-text fallback for clients that need it. |

### Multi-board views

| | |
|---|---|
| **Status** | idea |
| **Summary** | A default home board plus user-created boards — each board is a saved view over the same ticket pool, not a separate ticket set. |
| **Notes** | Boards are views, not containers: all tickets live in one global set. Custom boards can define pre-configured lanes (column layout) and/or pinned global filters that cannot be cleared in that view. Home board is always present and non-deletable. |

### Customer management

| | |
|---|---|
| **Status** | idea |
| **Summary** | Admin UI to browse and inspect customers, including their admin-defined custom field values. |
| **Notes** | Customers and custom fields already exist in the data model/API. Dedicated surface: list/search customers, profile/detail view, ticket history, **editing** customer data and custom field values. Editing does **not** belong in the ticket modal — that needs proper type-aware field components (text, number, date, boolean, select, url, json), validation, and clear-value semantics. Ticket modal customer card stays read-only (peek + “show all fields”). |

### Audit log for mutating actions

| | |
|---|---|
| **Status** | idea |
| **Summary** | Append-only audit trail for every action that changes data — who did it, how they authenticated, what changed — with per-ticket and global views. |
| **Notes** | **Logging:** covers all write paths — tickets (create/update/delete, status changes via API or board drag), messages, customers, settings, status columns, custom fields, lane order, API key lifecycle, etc. Each event records **actor type** (`staff` session vs `api_key`) separately — not just a user id. Staff actions: `user_id`. API key actions: `api_key_id` plus the owning `user_id` (key creator). Store action kind, target entity (ticket, setting, lane, …), before/after snapshot or field-level diff, and timestamp. Aligns with planned `audit_events` table in [DATA-MODEL.md](./DATA-MODEL.md). `AuthContext` already exposes `type`, `userId`, and `apiKeyId` — wire logging at the service layer or a shared middleware wrapper around mutating routes. Read/unread and other non-mutating reads are out of scope. **Viewing:** two surfaces — (1) **per ticket**, e.g. activity/history tab in the ticket modal, filtered to that ticket only; (2) **global audit log**, browsable across the whole system with filters (actor, action type, entity type, date range, API key vs staff). Settings, lane, and board changes appear in the global log; ticket-scoped events also show on the ticket view. |
