import { describe, expect, it } from "vitest";
import {
  optionMatchesSearch,
  optionValueKey,
  sortOptions,
  type OptionItem,
} from "@/components/option-list/types";

const OPTIONS: OptionItem[] = [
  { value: "alpha", label: "Alpha" },
  { value: "beta", label: "Beta" },
  { value: "gamma", label: "Gamma" },
];

describe("option-list utils", () => {
  it("normalizes option keys case-insensitively", () => {
    expect(optionValueKey("  Foo ")).toBe("foo");
  });

  it("matches search substrings case-insensitively", () => {
    expect(optionMatchesSearch("Enterprise", "prise")).toBe(true);
    expect(optionMatchesSearch("Enterprise", "xyz")).toBe(false);
  });

  it("sorts by recent rank then label", () => {
    const sorted = sortOptions(
      OPTIONS,
      ["gamma", "alpha"],
      "",
      new Set<string>(),
    );
    expect(sorted.map((option) => option.value)).toEqual([
      "gamma",
      "alpha",
      "beta",
    ]);
  });

  it("excludes selected options and filters by query", () => {
    const sorted = sortOptions(
      OPTIONS,
      [],
      "a",
      new Set([optionValueKey("alpha")]),
    );
    expect(sorted.map((option) => option.value)).toEqual(["beta", "gamma"]);
  });
});
