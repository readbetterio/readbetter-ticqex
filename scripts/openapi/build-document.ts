import { z } from "zod";
import {
  OPERATION_CATALOG,
  inferOperationTag,
  operationSummary,
  toOpenApiPath,
  type OperationDefinition,
} from "@ticqex/api-spec";
import {
  REQUEST_BODY_BY_OPERATION,
} from "./request-schemas.js";

type JsonSchema = Record<string, unknown>;

type OpenApiParameter = {
  name: string;
  in: "path" | "query";
  required?: boolean;
  description?: string;
  schema: JsonSchema;
};

type OpenApiOperation = {
  operationId: string;
  summary: string;
  description?: string;
  tags: string[];
  parameters?: OpenApiParameter[];
  requestBody?: Record<string, unknown>;
  responses: Record<string, unknown>;
  security: [{ bearerAuth: [] }];
};

type OpenApiDocument = {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{ url: string; description: string }>;
  tags: Array<{ name: string }>;
  paths: Record<string, Record<string, OpenApiOperation>>;
  components: {
    schemas: Record<string, JsonSchema>;
    securitySchemes: Record<string, unknown>;
  };
  security: [{ bearerAuth: [] }];
};

const INTEGER_QUERY_PARAMS = new Set([
  "page",
  "per_page",
  "offset",
  "limit",
]);

const BOOLEAN_QUERY_PARAMS = new Set(["force_download"]);

function zodToOpenApiSchema(schema: z.ZodType): JsonSchema {
  return z.toJSONSchema(schema, { unrepresentable: "any" }) as JsonSchema;
}

function buildSharedSchemas(): Record<string, JsonSchema> {
  const schemas: Record<string, JsonSchema> = {
    ApiError: {
      type: "object",
      required: ["error"],
      properties: {
        error: {
          type: "object",
          required: ["code", "message"],
          properties: {
            code: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    },
    DataEnvelope: {
      type: "object",
      required: ["data"],
      properties: {
        data: {},
      },
    },
    ListEnvelope: {
      type: "object",
      required: ["data"],
      properties: {
        data: {
          type: "array",
          items: { type: "object" },
        },
        meta: {
          type: "object",
          additionalProperties: true,
        },
      },
    },
    AttachmentUploadRequest: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  };

  for (const [operationName, bodyKind] of Object.entries(
    REQUEST_BODY_BY_OPERATION,
  )) {
    if (bodyKind.kind === "json" || bodyKind.kind === "optional-json") {
      const componentName = `${operationName}Request`;
      schemas[componentName] = zodToOpenApiSchema(bodyKind.schema);
    }
  }

  return schemas;
}

function queryParamSchema(name: string): JsonSchema {
  if (INTEGER_QUERY_PARAMS.has(name)) {
    return { type: "integer" };
  }
  if (BOOLEAN_QUERY_PARAMS.has(name)) {
    return { type: "boolean" };
  }
  return { type: "string" };
}

function buildParameters(operation: OperationDefinition): OpenApiParameter[] {
  const parameters: OpenApiParameter[] = [];

  for (const paramName of operation.pathParams) {
    parameters.push({
      name: paramName,
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
    });
  }

  for (const queryName of operation.queryParams) {
    parameters.push({
      name: queryName,
      in: "query",
      required: false,
      schema: queryParamSchema(queryName),
    });
  }

  if (operation.name === "ticqex_list_tickets") {
    parameters.push({
      name: "custom_fields.{key}",
      in: "query",
      required: false,
      description:
        "Filter by custom field value. Use query keys like custom_fields.my_field=value.",
      schema: { type: "string" },
    });
  }

  return parameters;
}

function successResponse(operation: OperationDefinition): Record<string, unknown> {
  const isList =
    operation.method === "GET" &&
    (operation.name.startsWith("ticqex_list_") ||
      operation.name === "ticqex_get_board_lane_tickets");

  const isDelete = operation.method === "DELETE";

  if (isDelete) {
    return {
      "200": {
        description: "Resource deleted",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/DataEnvelope" },
          },
        },
      },
    };
  }

  if (isList) {
    return {
      "200": {
        description: "Success",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ListEnvelope" },
          },
        },
      },
    };
  }

  const status = operation.method === "POST" ? "201" : "200";
  return {
    [status]: {
      description: "Success",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/DataEnvelope" },
        },
      },
    },
  };
}

function buildRequestBody(
  operation: OperationDefinition,
): Record<string, unknown> | undefined {
  const bodyKind = REQUEST_BODY_BY_OPERATION[operation.name];
  if (!bodyKind) {
    return undefined;
  }

  if (bodyKind.kind === "multipart") {
    return {
      required: true,
      content: {
        "multipart/form-data": {
          schema: { $ref: "#/components/schemas/AttachmentUploadRequest" },
        },
      },
    };
  }

  const componentName = `${operation.name}Request`;
  return {
    required: bodyKind.kind === "json",
    content: {
      "application/json": {
        schema: { $ref: `#/components/schemas/${componentName}` },
      },
    },
  };
}

function buildOperation(operation: OperationDefinition): OpenApiOperation {
  const tag = inferOperationTag(operation.pathTemplate);
  const descriptionParts: string[] = [];
  if (operation.admin) {
    descriptionParts.push("Requires admin role.");
  }
  descriptionParts.push(`MCP tool: \`${operation.name}\`.`);

  const parameters = buildParameters(operation);
  const requestBody = buildRequestBody(operation);

  const op: OpenApiOperation = {
    operationId: operation.name,
    summary: operationSummary(operation.name),
    description: descriptionParts.join(" "),
    tags: [tag],
    responses: {
      ...successResponse(operation),
      "400": {
        description: "Bad request",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      },
      "401": {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      },
      "403": {
        description: "Forbidden",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      },
      "404": {
        description: "Not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  };

  if (parameters.length > 0) {
    op.parameters = parameters;
  }
  if (requestBody) {
    op.requestBody = requestBody;
  }

  return op;
}

export function buildOpenApiDocument(): OpenApiDocument {
  const paths: Record<string, Record<string, OpenApiOperation>> = {};
  const tagNames = new Set<string>();

  for (const operation of OPERATION_CATALOG) {
    const openApiPath = toOpenApiPath(operation.pathTemplate);
    const method = operation.method.toLowerCase();
    tagNames.add(inferOperationTag(operation.pathTemplate));

    paths[openApiPath] ??= {};
    paths[openApiPath][method] = buildOperation(operation);
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Ticqex API",
      version: "0.1.0",
      description:
        "REST JSON API for Ticqex at /api/v1. Authenticate with Authorization: Bearer tq_live_* (API key) or a staff Supabase JWT.",
    },
    servers: [
      {
        url: "https://your-instance.com/api/v1",
        description: "Replace with your Ticqex deployment host.",
      },
    ],
    tags: [...tagNames]
      .sort()
      .map((name) => ({ name })),
    paths,
    components: {
      schemas: buildSharedSchemas(),
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description:
            "API key (tq_live_...) or staff Supabase JWT from browser login.",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  };
}

export function countOpenApiOperations(document: OpenApiDocument): number {
  let count = 0;
  for (const pathItem of Object.values(document.paths)) {
    count += Object.keys(pathItem).length;
  }
  return count;
}
