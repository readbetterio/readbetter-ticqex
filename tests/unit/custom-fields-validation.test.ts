import { describe, expect, it } from "vitest";
import {
  coerceCustomFieldValue,
  isValidFieldKey,
  normalizeSelectOptions,
  slugifyLabelToKey,
  validateDefinitionOptions,
} from "@shared/custom-fields";

describe("custom field validation", () => {
  it("slugifies labels into valid keys", () => {
    expect(slugifyLabelToKey("Plan Tier")).toBe("plan_tier");
    expect(isValidFieldKey(slugifyLabelToKey("Plan Tier"))).toBe(true);
  });

  it("requires select options", () => {
    expect(validateDefinitionOptions("select", null)).toMatch(/at least one/i);
    expect(
      validateDefinitionOptions("select", { values: ["pro", "pro"] }),
    ).toBeNull();
    expect(normalizeSelectOptions(["pro", " Pro ", ""])).toEqual({
      values: ["pro"],
    });
  });

  it("coerces scalar types strictly", () => {
    expect(coerceCustomFieldValue("number", "42", null)).toEqual({
      kind: "value",
      value: 42,
    });
    expect(() => coerceCustomFieldValue("number", "not-a-number", null)).toThrow(
      /invalid number/i,
    );
    expect(coerceCustomFieldValue("boolean", false, null)).toEqual({
      kind: "value",
      value: false,
    });
    expect(() => coerceCustomFieldValue("boolean", "maybe", null)).toThrow(
      /invalid boolean/i,
    );
    expect(coerceCustomFieldValue("date", "2026-06-02", null)).toEqual({
      kind: "value",
      value: "2026-06-02",
    });
    expect(() => coerceCustomFieldValue("date", "02/06/2026", null)).toThrow(
      /invalid date/i,
    );
  });

  it("validates select membership and urls", () => {
    const options = { values: ["starter", "pro"] };
    expect(coerceCustomFieldValue("select", "pro", options)).toEqual({
      kind: "value",
      value: "pro",
    });
    expect(() => coerceCustomFieldValue("select", "enterprise", options)).toThrow(
      /allowed select/i,
    );
    expect(
      coerceCustomFieldValue("url", "https://example.com/docs", null),
    ).toEqual({
      kind: "value",
      value: "https://example.com/docs",
    });
    expect(() => coerceCustomFieldValue("url", "not-a-url", null)).toThrow(
      /invalid url/i,
    );
  });

  it("coerces multiselect values", () => {
    const options = { values: ["starter", "pro", "enterprise"] };
    expect(coerceCustomFieldValue("multiselect", ["pro", "starter"], options)).toEqual({
      kind: "value",
      value: ["pro", "starter"],
    });
    expect(coerceCustomFieldValue("multiselect", "pro", options)).toEqual({
      kind: "value",
      value: ["pro"],
    });
    expect(coerceCustomFieldValue("multiselect", [], options)).toEqual({
      kind: "clear",
    });
    expect(() =>
      coerceCustomFieldValue("multiselect", ["pro", "invalid"], options),
    ).toThrow(/allowed select/i);
    expect(validateDefinitionOptions("multiselect", null)).toMatch(/at least one/i);
  });

  it("parses json objects and allows clear", () => {
    expect(coerceCustomFieldValue("json", { tier: "pro" }, null)).toEqual({
      kind: "value",
      value: { tier: "pro" },
    });
    expect(coerceCustomFieldValue("text", "", null)).toEqual({ kind: "clear" });
  });
});
