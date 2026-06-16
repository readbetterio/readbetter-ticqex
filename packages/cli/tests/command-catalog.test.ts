import { describe, expect, it } from "vitest";
import {
  MCP_TOOL_NAMES,
  OPERATION_CATALOG,
  REST_ONLY_ADMIN_OPERATIONS,
  getOperation,
  listOperationNames,
} from "../src/command-catalog.js";

const VALID_METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);

describe("command catalog", () => {
  it("exports MCP_TOOL_NAMES for non-admin operations", () => {
    expect(MCP_TOOL_NAMES.length).toBeGreaterThan(0);
    for (const name of MCP_TOOL_NAMES) {
      expect(name.startsWith("ticqex_")).toBe(true);
      expect(REST_ONLY_ADMIN_OPERATIONS).not.toContain(name);
    }
  });

  it("lists REST-only admin operations separately", () => {
    expect(REST_ONLY_ADMIN_OPERATIONS).toEqual([
      "ticqex_list_api_keys",
      "ticqex_create_api_key",
      "ticqex_revoke_api_key",
      "ticqex_list_activity",
    ]);
  });

  it("every catalog entry has a valid HTTP method and path", () => {
    for (const operation of OPERATION_CATALOG) {
      expect(VALID_METHODS.has(operation.method), operation.name).toBe(true);
      expect(operation.pathTemplate.startsWith("/"), operation.name).toBe(true);

      for (const param of operation.pathParams) {
        expect(operation.pathTemplate).toContain(`:${param}`);
      }
    }
  });

  it("resolves operations by name", () => {
    for (const name of listOperationNames()) {
      expect(getOperation(name)?.name).toBe(name);
    }
  });

  it("has unique operation names", () => {
    const names = listOperationNames();
    expect(new Set(names).size).toBe(names.length);
  });
});
