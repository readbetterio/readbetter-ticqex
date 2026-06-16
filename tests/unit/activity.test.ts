import { describe, expect, it } from "vitest";
import { resolveOperation } from "@server/lib/resolve-operation";
import { messagePreview } from "@server/lib/utils";
import { resolveActorSnapshot } from "@server/services/activity";

describe("resolveOperation", () => {
  it("matches ticket routes with dynamic ids", () => {
    expect(
      resolveOperation(
        "PATCH",
        "/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000",
      ),
    ).toBe("ticqex_update_ticket");
  });

  it("matches nested ticket comment routes", () => {
    expect(
      resolveOperation(
        "GET",
        "/api/v1/tickets/550e8400-e29b-41d4-a716-446655440000/comments",
      ),
    ).toBe("ticqex_list_ticket_comments");
  });

  it("returns null for unknown routes", () => {
    expect(resolveOperation("GET", "/api/v1/unknown")).toBeNull();
  });
});

describe("activity helpers", () => {
  it("truncates body previews", () => {
    const longBody = "word ".repeat(40).trim();
    const preview = messagePreview(longBody, 40);
    expect(preview.length).toBeLessThanOrEqual(40);
    expect(preview.endsWith("…")).toBe(true);
  });

  it("formats invalid API key actor snapshots without storing full tokens", async () => {
    const actor = await resolveActorSnapshot({
      invalidKeyPrefix: "tq_live_abcd",
    });
    expect(actor.actor_type).toBe("anonymous");
    expect(actor.actor_snapshot.invalid_key_prefix).toBe("tq_live_abcd");
    expect(actor.actor_snapshot.label).toBe("Invalid API key");
  });
});
