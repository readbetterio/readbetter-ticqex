import { describe, expect, it } from "vitest";
import {
  DELETED_API_KEY_AUTHOR_NAME,
  canManageTicketComment,
  resolveCommentAuthorLabel,
} from "@server/services/comments";

describe("resolveCommentAuthorLabel", () => {
  it("uses the agent username and email when available", () => {
    const name = resolveCommentAuthorLabel(
      {
        author_type: "agent",
        author_id: "user-1",
        api_key_id: null,
      },
      new Map([["user-1", { username: "alice", email: "alice@example.com" }]]),
      new Map(),
    );

    expect(name).toBe("alice · alice@example.com");
  });

  it("uses the current API key name for active keys", () => {
    const name = resolveCommentAuthorLabel(
      {
        author_type: "api_key",
        author_id: null,
        api_key_id: "key-1",
      },
      new Map(),
      new Map([["key-1", { name: "Automation bot", revoked_at: null }]]),
    );

    expect(name).toBe("Automation bot");
  });

  it("falls back to Deleted API key when the key is revoked or missing", () => {
    const revoked = resolveCommentAuthorLabel(
      {
        author_type: "api_key",
        author_id: null,
        api_key_id: "key-1",
      },
      new Map(),
      new Map([["key-1", { name: "Old bot", revoked_at: "2026-01-01T00:00:00.000Z" }]]),
    );
    const missing = resolveCommentAuthorLabel(
      {
        author_type: "api_key",
        author_id: null,
        api_key_id: "key-2",
      },
      new Map(),
      new Map(),
    );
    const deleted = resolveCommentAuthorLabel(
      {
        author_type: "api_key",
        author_id: null,
        api_key_id: null,
      },
      new Map(),
      new Map(),
    );

    expect(revoked).toBe(DELETED_API_KEY_AUTHOR_NAME);
    expect(missing).toBe(DELETED_API_KEY_AUTHOR_NAME);
    expect(deleted).toBe(DELETED_API_KEY_AUTHOR_NAME);
  });
});

describe("canManageTicketComment", () => {
  it("allows authors to manage only their own comments", () => {
    const staffAuth = {
      type: "staff" as const,
      userId: "user-1",
      role: "admin" as const,
    };
    const apiAuth = {
      type: "api_key" as const,
      userId: "user-1",
      role: "admin" as const,
      apiKeyId: "key-1",
    };

    expect(
      canManageTicketComment(
        { author_type: "agent", author_id: "user-1", api_key_id: null },
        staffAuth,
      ),
    ).toBe(true);
    expect(
      canManageTicketComment(
        { author_type: "agent", author_id: "user-2", api_key_id: null },
        staffAuth,
      ),
    ).toBe(false);
    expect(
      canManageTicketComment(
        { author_type: "api_key", author_id: null, api_key_id: "key-1" },
        staffAuth,
      ),
    ).toBe(false);
    expect(
      canManageTicketComment(
        { author_type: "api_key", author_id: null, api_key_id: "key-1" },
        apiAuth,
      ),
    ).toBe(true);
  });
});
