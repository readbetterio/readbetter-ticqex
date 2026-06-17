import { describe, expect, it } from "vitest";
import {
  deriveTicketUpdateDiffScope,
  diffTicketActivity,
  type TicketUpdateActivitySnapshot,
} from "@server/services/ticket-activity";

const baseSnapshot = (
  overrides: Partial<TicketUpdateActivitySnapshot> = {},
): TicketUpdateActivitySnapshot => ({
  title: "Original title",
  body: "Original body",
  bodyPreview: "Original body",
  statusId: "status-1",
  statusLabel: "Open",
  assigneeId: null,
  assigneeLabel: "Unassigned",
  tagNames: ["alpha"],
  customFields: { priority: "low" },
  ...overrides,
});

describe("deriveTicketUpdateDiffScope", () => {
  it("marks only fields present in the patch", () => {
    expect(
      deriveTicketUpdateDiffScope({
        title: "New title",
        custom_fields: { priority: "high", region: "eu" },
      }),
    ).toEqual({
      title: true,
      body: false,
      status: false,
      assignee: false,
      tags: false,
      customFieldKeys: ["priority", "region"],
    });
  });
});

describe("diffTicketActivity", () => {
  it("returns no changes when snapshots match within scope", () => {
    const snapshot = baseSnapshot();
    const scope = deriveTicketUpdateDiffScope({
      title: "Original title",
      body: "Original body",
      status_id: "status-1",
      assignee_id: null,
      tags: ["alpha"],
      custom_fields: { priority: "low" },
    });

    expect(diffTicketActivity(snapshot, snapshot, scope)).toEqual([]);
  });

  it("records title and body changes with description previews", () => {
    const before = baseSnapshot();
    const after = baseSnapshot({
      title: "Updated title",
      body: "Updated body with more detail",
      bodyPreview: "Updated body with more detail",
    });
    const scope = deriveTicketUpdateDiffScope({
      title: after.title,
      body: after.body,
    });

    expect(diffTicketActivity(before, after, scope)).toEqual([
      {
        field: "title",
        label: "Title",
        from: "Original title",
        to: "Updated title",
      },
      {
        field: "body",
        label: "Description",
        from: "Original body",
        to: "Updated body with more detail",
      },
    ]);
  });

  it("uses display labels for status and assignee changes", () => {
    const before = baseSnapshot();
    const after = baseSnapshot({
      statusId: "status-2",
      statusLabel: "Done",
      assigneeId: "user-1",
      assigneeLabel: "alex",
    });
    const scope = deriveTicketUpdateDiffScope({
      status_id: after.statusId,
      assignee_id: after.assigneeId,
    });

    expect(diffTicketActivity(before, after, scope)).toEqual([
      {
        field: "status_id",
        label: "Status",
        from: "Open",
        to: "Done",
      },
      {
        field: "assignee_id",
        label: "Assignee",
        from: "Unassigned",
        to: "alex",
      },
    ]);
  });

  it("records sorted tag names and scoped custom field changes", () => {
    const before = baseSnapshot({
      tagNames: ["alpha"],
      customFields: { priority: "low" },
    });
    const after = baseSnapshot({
      tagNames: ["alpha", "beta"],
      customFields: { priority: "high", region: "eu" },
    });
    const scope = deriveTicketUpdateDiffScope({
      tags: ["beta", "alpha"],
      custom_fields: { priority: "high", region: "eu" },
    });

    expect(diffTicketActivity(before, after, scope)).toEqual([
      {
        field: "tags",
        label: "Tags",
        from: ["alpha"],
        to: ["alpha", "beta"],
      },
      {
        field: "custom_fields.priority",
        label: "priority",
        from: "low",
        to: "high",
      },
      {
        field: "custom_fields.region",
        label: "region",
        from: null,
        to: "eu",
      },
    ]);
  });

  it("ignores out-of-scope fields even when snapshots differ", () => {
    const before = baseSnapshot();
    const after = baseSnapshot({ title: "Changed title" });
    const scope = deriveTicketUpdateDiffScope({ body: "Original body" });

    expect(diffTicketActivity(before, after, scope)).toEqual([]);
  });
});
