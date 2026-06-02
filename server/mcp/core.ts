import { z } from "zod";
import type { AuthContext } from "@server/middleware/auth";
import { requireAdmin } from "@server/middleware/auth";
import { ApiError } from "@server/lib/errors";
import type { McpServer, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  ShapeOutput,
  ZodRawShapeCompat,
} from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

export type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

type AuthedToolMetadata<Schema extends ZodRawShapeCompat> = {
  title: string;
  description: string;
  inputSchema: Schema;
  admin?: boolean;
};

type AuthedToolHandler<Schema extends ZodRawShapeCompat> = (
  input: ShapeOutput<Schema>,
  auth: AuthContext,
  extra: ToolExtra,
) => CallToolResult | Promise<CallToolResult>;

export const uuid = z.string().uuid();

export const paginationInput = {
  page: z.number().int().min(1).optional(),
  per_page: z.number().int().min(1).max(100).optional(),
};

function authFromExtra(extra: ToolExtra): AuthContext {
  const auth = extra.authInfo?.extra as Partial<AuthContext> | undefined;
  if (
    auth?.type !== "api_key" ||
    !auth.userId ||
    (auth.role !== "admin" && auth.role !== "agent")
  ) {
    throw ApiError.unauthorized();
  }
  return {
    type: "api_key",
    userId: auth.userId,
    role: auth.role,
    apiKeyId: typeof auth.apiKeyId === "string" ? auth.apiKeyId : undefined,
  };
}

export function toolResult(data: unknown): CallToolResult {
  const structuredContent =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : { result: data };

  return {
    structuredContent,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function registerAuthedTool<Schema extends ZodRawShapeCompat>(
  server: McpServer,
  name: string,
  metadata: AuthedToolMetadata<Schema>,
  handler: AuthedToolHandler<Schema>,
) {
  const { admin, ...toolMetadata } = metadata;

  const callback = (async (input: ShapeOutput<Schema>, extra: ToolExtra) => {
    const auth = authFromExtra(extra);
    if (admin) requireAdmin(auth);
    return handler(input, auth, extra);
  }) as ToolCallback<Schema>;

  server.registerTool(name, toolMetadata, callback);
}

export function paramsFrom(input: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "custom_fields" && typeof value === "object" && !Array.isArray(value)) {
      for (const [fieldKey, fieldValue] of Object.entries(value)) {
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== "") {
          params.set(`custom_fields.${fieldKey}`, String(fieldValue));
        }
      }
      continue;
    }
    params.set(key, String(value));
  }
  return params;
}
