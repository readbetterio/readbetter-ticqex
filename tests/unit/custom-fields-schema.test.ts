import { describe, expect, it } from "vitest";
import {
  createCustomFieldSchema,
  updateCustomFieldSchema,
} from "@server/lib/validation/schemas";

describe("custom field API schemas", () => {
  it("accepts valid select definitions", () => {
    const parsed = createCustomFieldSchema.parse({
      group: "ticket",
      key: "plan",
      label: "Plan",
      type: "select",
      options: { values: ["starter", "pro"] },
    });
    expect(parsed.type).toBe("select");
  });

  it("rejects select definitions without options", () => {
    const result = createCustomFieldSchema.safeParse({
      group: "ticket",
      key: "plan",
      label: "Plan",
      type: "select",
    });
    expect(result.success).toBe(false);
  });

  it("rejects options on text fields", () => {
    const result = createCustomFieldSchema.safeParse({
      group: "contact",
      key: "notes",
      label: "Notes",
      type: "text",
      options: { values: ["x"] },
    });
    expect(result.success).toBe(false);
  });

  it("allows partial updates", () => {
    const parsed = updateCustomFieldSchema.parse({
      label: "Updated label",
      required: true,
    });
    expect(parsed.label).toBe("Updated label");
  });
});
