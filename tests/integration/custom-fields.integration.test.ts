import { afterEach, expect } from "vitest";
import { ApiError } from "@server/lib/errors";
import {
  createDefinition,
  deleteDefinition,
  setCustomFields,
  updateDefinition,
} from "@server/services/custom-fields";
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
