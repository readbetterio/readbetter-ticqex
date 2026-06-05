import { describe, expect, it } from "vitest";
import { createApiKeySchema, parseBody } from "@server/lib/validation/schemas";

describe("createApiKeySchema", () => {
  it("trims API key names", () => {
    const body = parseBody(createApiKeySchema, { name: "  Internal tools  " });

    expect(body.name).toBe("Internal tools");
  });

  it("rejects blank API key names with a readable message", () => {
    expect(() => parseBody(createApiKeySchema, { name: "   " })).toThrow(
      "Key name is required",
    );
  });
});
