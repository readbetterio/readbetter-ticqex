import { describe, expect, it } from "vitest";
import {
  getCustomFieldFilterOperators,
  usesMultiselectFilterSemantics,
  usesOptionListFilterValues,
} from "@shared/custom-fields";

describe("custom field filter behavior", () => {
  it("exposes multiselect semantics only for multiselect", () => {
    expect(usesMultiselectFilterSemantics("multiselect")).toBe(true);
    expect(usesMultiselectFilterSemantics("select")).toBe(false);
    expect(usesMultiselectFilterSemantics("text")).toBe(false);
  });

  it("treats select and multiselect as option-list filters", () => {
    expect(usesOptionListFilterValues("select")).toBe(true);
    expect(usesOptionListFilterValues("multiselect")).toBe(true);
    expect(usesOptionListFilterValues("text")).toBe(false);
  });

  it("returns registry-backed operators per type", () => {
    expect(getCustomFieldFilterOperators("boolean")).toEqual([
      "eq",
      "neq",
      "empty",
      "not_empty",
    ]);
    expect(getCustomFieldFilterOperators("text")).toContain("contains");
    expect(getCustomFieldFilterOperators("unknown")).toEqual([
      "eq",
      "neq",
      "empty",
      "not_empty",
    ]);
  });
});
