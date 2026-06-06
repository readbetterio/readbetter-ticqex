import { describe, expect, it } from "vitest";
import {
  commentInputSchema,
  commentUpdateSchema,
  parseBody,
} from "@server/lib/validation/schemas";

describe("commentInputSchema", () => {
  it("accepts non-empty markdown bodies", () => {
    const body = parseBody(commentInputSchema, {
      body: "# Heading\n\nSome **markdown**.",
    });
    expect(body.body).toContain("markdown");
  });

  it("rejects empty bodies", () => {
    expect(() => parseBody(commentInputSchema, { body: "" })).toThrow();
  });

  it("rejects whitespace-only bodies", () => {
    expect(() => parseBody(commentInputSchema, { body: "   \n  " })).toThrow();
  });

  it("trims surrounding whitespace from bodies", () => {
    const body = parseBody(commentInputSchema, { body: "  hello  " });
    expect(body.body).toBe("hello");
  });
});

describe("commentUpdateSchema", () => {
  it("requires a non-empty body on update", () => {
    expect(() => parseBody(commentUpdateSchema, { body: "" })).toThrow();
  });

  it("rejects whitespace-only bodies on update", () => {
    expect(() => parseBody(commentUpdateSchema, { body: "   \n  " })).toThrow();
  });

  it("trims surrounding whitespace from update bodies", () => {
    const body = parseBody(commentUpdateSchema, { body: "  hello  " });
    expect(body.body).toBe("hello");
  });
});
