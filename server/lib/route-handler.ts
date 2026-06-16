import type { NextRequest } from "next/server";
import { ApiError } from "./errors";
import { handleRouteError, jsonError } from "./response";
import {
  authenticateRequest,
  requireAdmin,
  type AuthContext,
} from "@server/middleware/auth";
import {
  createActivityRequestStore,
  runWithActivityRequestContext,
} from "@server/lib/activity-request-context";
import { resolveOperation } from "@server/lib/resolve-operation";
import {
  createActivityRequestId,
  recordFailedAuthActivity,
  recordRequestActivity,
} from "@server/services/activity";
import { ACTIVITY_OUTCOMES } from "@shared/activity/actions";

type RouteOptions = {
  admin?: boolean;
};

function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
}

async function logUnhandledRequestFailure(input: {
  request: NextRequest;
  auth?: AuthContext;
  statusCode: number;
  message: string;
}) {
  await recordRequestActivity({
    outcome: ACTIVITY_OUTCOMES.FAILED,
    statusCode: input.statusCode,
    summary: input.message,
    auth: input.auth,
    metadata: { error_message: input.message },
  });
}

export async function withAuth(
  request: NextRequest,
  handler: (auth: AuthContext, request: NextRequest) => Promise<Response>,
  options: RouteOptions = {},
): Promise<Response> {
  const requestPath = request.nextUrl.pathname;
  const requestMethod = request.method;
  const operation = resolveOperation(requestMethod, requestPath);
  const requestId = createActivityRequestId();
  const hasBearer = Boolean(getBearerToken(request));
  const requestStore = createActivityRequestStore({
    requestId,
    requestMethod,
    requestPath,
    operation,
    source: "ui",
    auth: undefined,
  });
  const { recorder } = requestStore;

  let auth: AuthContext | undefined;

  try {
    auth = await authenticateRequest(request);
    requestStore.auth = auth;
    requestStore.source = hasBearer ? "api" : "ui";
    if (options.admin) requireAdmin(auth);

    return await runWithActivityRequestContext(requestStore, async () => {
      const response = await handler(auth!, request);

      if (!recorder.hasDomainActivity()) {
        await recordRequestActivity({
          outcome: ACTIVITY_OUTCOMES.SUCCEEDED,
          statusCode: response.status,
          summary: `${requestMethod} ${requestPath}`,
          auth,
        });
      }

      return response;
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const token = getBearerToken(request);
      const invalidKeyPrefix =
        token?.startsWith("tq_live_") && token.length >= 12
          ? token.slice(0, 12)
          : null;

      await recordFailedAuthActivity({
        requestMethod,
        requestPath,
        operation,
        statusCode: err.status,
        message: err.message,
        invalidKeyPrefix,
      });
      return jsonError(err);
    }

    if (err instanceof ApiError) {
      if (!recorder.hasDomainActivity()) {
        await logUnhandledRequestFailure({
          request,
          auth,
          statusCode: err.status,
          message: err.message,
        });
      }
      return jsonError(err);
    }

    if (!recorder.hasDomainActivity()) {
      await logUnhandledRequestFailure({
        request,
        auth,
        statusCode: 500,
        message: "Internal server error",
      });
    }
    return handleRouteError(err);
  }
}

export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw ApiError.badRequest("Invalid JSON body");
  }
}
