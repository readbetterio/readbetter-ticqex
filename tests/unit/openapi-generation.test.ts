import { describe, expect, it } from "vitest";
import { OPERATION_CATALOG } from "@ticqex/api-spec";
import {
  buildOpenApiDocument,
  countOpenApiOperations,
} from "../../scripts/openapi/build-document.js";
import {
  REQUEST_BODY_BY_OPERATION,
  listOperationsWithRequestBodies,
} from "../../scripts/openapi/request-schemas.js";

describe("OpenAPI generation", () => {
  it("documents every catalog operation", () => {
    const document = buildOpenApiDocument();
    expect(countOpenApiOperations(document)).toBe(OPERATION_CATALOG.length);
  });

  it("includes bearer auth and shared error envelope", () => {
    const document = buildOpenApiDocument();
    expect(document.components.securitySchemes.bearerAuth).toBeDefined();
    expect(document.components.schemas.ApiError).toBeDefined();
  });

  it("maps mutating operations with JSON bodies to request schemas", () => {
    const jsonBodies = listOperationsWithRequestBodies().filter((name) => {
      const kind = REQUEST_BODY_BY_OPERATION[name]?.kind;
      return kind === "json" || kind === "optional-json";
    });

    const document = buildOpenApiDocument();
    for (const operationName of jsonBodies) {
      expect(
        document.components.schemas[`${operationName}Request`],
        operationName,
      ).toBeDefined();
    }
  });

  it("documents attachment upload as multipart form data", () => {
    const document = buildOpenApiDocument();
    const uploadPath = document.paths["/tickets/{ticket_id}/attachment-uploads"];
    expect(uploadPath?.post?.requestBody).toMatchObject({
      content: {
        "multipart/form-data": {
          schema: { $ref: "#/components/schemas/AttachmentUploadRequest" },
        },
      },
    });
  });
});
