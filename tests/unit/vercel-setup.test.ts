import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultVercelProjectName } from "../../scripts/lib/vercel-setup";

describe("defaultVercelProjectName", () => {
  it("reads the package name", () => {
    expect(defaultVercelProjectName()).toBe("ticqex");
  });
});
