import { describe, expect, it } from "vitest";
import {
  OPERATION_CATALOG,
  inferOperationTag,
  toOpenApiPath,
} from "../src/operations.js";

describe("@ticqex/api-spec operations", () => {
  it("uses unique operation names", () => {
    const names = OPERATION_CATALOG.map((op) => op.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("converts path templates to OpenAPI paths", () => {
    expect(toOpenApiPath("/tickets/:id/comments/:comment_id")).toBe(
      "/tickets/{id}/comments/{comment_id}",
    );
  });

  it("infers tags from the first path segment", () => {
    expect(inferOperationTag("/board/lanes/:status_id/tickets")).toBe("board");
    expect(inferOperationTag("/email-snippets/:id")).toBe("email_snippets");
  });
});
