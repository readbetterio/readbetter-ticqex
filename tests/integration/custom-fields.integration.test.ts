import { afterEach, expect, it } from "vitest";
import { ApiError } from "@server/lib/errors";
import {
  createDefinition,
  deleteDefinition,
  setCustomFields,
  updateDefinition,
} from "@server/services/custom-fields";
import { resolveFilteredTicketIds } from "@server/services/ticket-filters";
import {
  adminDb,
  describeIntegration,
  insertMinimalTicket,
} from "../helpers/integration";

describeIntegration("custom field definitions", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    const db = adminDb();
    for (const id of createdIds) {
      await db.from("custom_field_definitions").delete().eq("id", id);
    }
    createdIds.length = 0;
  });

  it("rejects select fields without options and invalid values", async () => {
    const db = adminDb();

    await expect(
      createDefinition(db, {
        group: "ticket",
        key: `cf_select_${Date.now()}`,
        label: "Plan",
        type: "select",
      }),
    ).rejects.toMatchObject({ status: 400 });

    const field = await createDefinition(db, {
      group: "ticket",
      key: `cf_plan_${Date.now()}`,
      label: "Plan",
      type: "select",
      options: { values: ["starter", "pro"] },
    });
    createdIds.push(field.id as string);

    const ticket = await insertMinimalTicket({
      title: "Custom field integration ticket",
      kind: "task",
    });
    const ticketId = ticket.id;

    try {
      await expect(
        setCustomFields(db, "ticket", ticketId, { [field.key as string]: "enterprise" }),
      ).rejects.toMatchObject({ status: 400 });

      await setCustomFields(db, "ticket", ticketId, {
        [field.key as string]: "pro",
      });

      const { data: valueRow } = await db
        .from("custom_field_values")
        .select("value_text")
        .eq("field_id", field.id)
        .eq("entity_type", "ticket")
        .eq("entity_id", ticketId)
        .single();
      expect(valueRow?.value_text).toBe("pro");
    } finally {
      await db.from("tickets").delete().eq("id", ticketId);
    }
  });

  it("stores multiselect values as json arrays", async () => {
    const db = adminDb();

    const field = await createDefinition(db, {
      group: "ticket",
      key: `cf_multi_${Date.now()}`,
      label: "Features",
      type: "multiselect",
      options: { values: ["api", "sso", "audit"] },
    });
    createdIds.push(field.id as string);

    const ticket = await insertMinimalTicket({
      title: "Multiselect integration ticket",
      kind: "task",
    });
    const ticketId = ticket.id;

    try {
      await expect(
        setCustomFields(db, "ticket", ticketId, {
          [field.key as string]: ["api", "invalid"],
        }),
      ).rejects.toMatchObject({ status: 400 });

      await setCustomFields(db, "ticket", ticketId, {
        [field.key as string]: ["sso", "api"],
      });

      const { data: valueRow } = await db
        .from("custom_field_values")
        .select("value_json")
        .eq("field_id", field.id)
        .eq("entity_type", "ticket")
        .eq("entity_id", ticketId)
        .single();
      expect(valueRow?.value_json).toEqual(["sso", "api"]);
    } finally {
      await db.from("tickets").delete().eq("id", ticketId);
    }
  });

  it("filters multiselect custom fields with server semantics", async () => {
    const db = adminDb();

    const field = await createDefinition(db, {
      group: "ticket",
      key: `cf_multi_filter_${Date.now()}`,
      label: "Features",
      type: "multiselect",
      options: { values: ["api", "sso", "audit"] },
    });
    createdIds.push(field.id as string);

    const apiTicket = await insertMinimalTicket({
      title: "Multiselect API ticket",
      kind: "task",
    });
    const auditTicket = await insertMinimalTicket({
      title: "Multiselect audit ticket",
      kind: "task",
    });
    const emptyTicket = await insertMinimalTicket({
      title: "Multiselect empty ticket",
      kind: "task",
    });
    const ticketIds = [apiTicket.id, auditTicket.id, emptyTicket.id];

    async function expectFilter(
      filter: Parameters<typeof resolveFilteredTicketIds>[1],
      expected: string[],
      unexpected: string[] = [],
    ) {
      const ids = new Set((await resolveFilteredTicketIds(db, filter)) ?? []);
      for (const id of expected) expect(ids.has(id)).toBe(true);
      for (const id of unexpected) expect(ids.has(id)).toBe(false);
    }

    try {
      await setCustomFields(db, "ticket", apiTicket.id, {
        [field.key as string]: ["api", "sso"],
      });
      await setCustomFields(db, "ticket", auditTicket.id, {
        [field.key as string]: ["audit"],
      });

      await expectFilter(
        [{ field: "ticket_field", key: field.key as string, op: "eq", value: "api" }],
        [apiTicket.id],
        [auditTicket.id, emptyTicket.id],
      );
      await expectFilter(
        [{ field: "ticket_field", key: field.key as string, op: "neq", value: "api" }],
        [auditTicket.id, emptyTicket.id],
        [apiTicket.id],
      );
      await expectFilter(
        [
          {
            field: "ticket_field",
            key: field.key as string,
            op: "in",
            values: ["api", "audit"],
          },
        ],
        [apiTicket.id, auditTicket.id],
        [emptyTicket.id],
      );
      await expectFilter(
        [
          {
            field: "ticket_field",
            key: field.key as string,
            op: "nin",
            values: ["api", "audit"],
          },
        ],
        [emptyTicket.id],
        [apiTicket.id, auditTicket.id],
      );
      await expectFilter(
        [{ field: "ticket_field", key: field.key as string, op: "empty" }],
        [emptyTicket.id],
        [apiTicket.id, auditTicket.id],
      );
      await expectFilter(
        [{ field: "ticket_field", key: field.key as string, op: "not_empty" }],
        [apiTicket.id, auditTicket.id],
        [emptyTicket.id],
      );
    } finally {
      await db.from("tickets").delete().in("id", ticketIds);
    }
  });

  it("blocks type changes when values exist", async () => {
    const db = adminDb();
    const field = await createDefinition(db, {
      group: "ticket",
      key: `cf_bool_${Date.now()}`,
      label: "VIP",
      type: "boolean",
    });
    createdIds.push(field.id as string);

    const ticket = await insertMinimalTicket({
      title: "Custom field type change ticket",
      kind: "task",
    });
    const ticketId = ticket.id;

    try {
      await setCustomFields(db, "ticket", ticketId, {
        [field.key as string]: true,
      });

      await expect(
        updateDefinition(db, field.id as string, { type: "text" }),
      ).rejects.toSatisfy((err: unknown) => {
        return err instanceof ApiError && err.status === 409;
      });

      await deleteDefinition(db, field.id as string);
      createdIds.pop();
    } finally {
      await db.from("tickets").delete().eq("id", ticketId);
    }
  });
});
