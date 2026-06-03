import { describe, expect, it } from "vitest";
import { matchesCustomField } from "@shared/ticket-filter/evaluate";

describe("matchesCustomField multiselect", () => {
  const values = ["api", "sso"];

  it("matches membership operators", () => {
    expect(matchesCustomField(values, "eq", "api")).toBe(true);
    expect(matchesCustomField(values, "eq", "audit")).toBe(false);
    expect(matchesCustomField(values, "in", undefined, ["audit", "sso"])).toBe(true);
    expect(matchesCustomField(values, "nin", undefined, ["audit", "billing"])).toBe(true);
    expect(matchesCustomField(values, "neq", "api")).toBe(false);
  });

  it("matches empty operators", () => {
    expect(matchesCustomField([], "empty")).toBe(true);
    expect(matchesCustomField([], "not_empty")).toBe(false);
    expect(matchesCustomField(values, "not_empty")).toBe(true);
  });
});
