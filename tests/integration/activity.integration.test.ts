import { afterEach, expect } from "vitest";
import { NextRequest } from "next/server";
import { createApiKey } from "@server/services/api-keys";
import {
  createActivityRequestId,
  listActivityEvents,
  recordActivity,
  recordFailedAuthActivity,
} from "@server/services/activity";
import { createTicketComment } from "@server/services/comments";
import { updateTicket } from "@server/services/tickets";
import {
  createActivityRequestStore,
  runWithActivityRequestContext,
} from "@server/lib/activity-request-context";
import { GET as listTicketsRoute } from "@/app/api/v1/tickets/route";
import { GET as listActivityRoute } from "@/app/api/v1/activity/route";
import { PATCH as patchTicketRoute } from "@/app/api/v1/tickets/[id]/route";
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_OUTCOMES,
  ACTIVITY_SOURCES,
} from "@shared/activity/actions";
import {
  adminDb,
  describeIntegration,
  insertMinimalTicket,
  resolveLocalAppUrl,
  staffAuth,
  signInAsSeedAdmin,
} from "../helpers/integration";

const INVALID_API_KEY = "tq_live_invalidkey";

function bearerRequest(
  path: string,
  token: string,
  init: RequestInit = {},
): NextRequest {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return new NextRequest(new URL(path, resolveLocalAppUrl()), {
    ...init,
    headers,
  });
}

async function findLatestFailedEvent(filters: {
  action?: string;
  request_path?: string;
  actor_user_id?: string;
  source?: string;
  operation?: string;
  status_code?: number;
}) {
  const result = await listActivityEvents(
    new URLSearchParams({
      page: "1",
      per_page: "25",
      outcome: "failed",
      hide_self_referential: "false",
      ...(filters.status_code !== undefined
        ? { status_code: String(filters.status_code) }
        : {}),
    }),
    { outcome: "failed", hide_self_referential: false, ...filters },
  );

  return result.events.find((event) => {
    if (filters.action && event.action !== filters.action) return false;
    if (
      filters.request_path !== undefined &&
      event.request_path !== filters.request_path
    ) {
      return false;
    }
    if (filters.actor_user_id && event.actor_user_id !== filters.actor_user_id) {
      return false;
    }
    if (filters.source && event.source !== filters.source) return false;
    if (filters.operation && event.operation !== filters.operation) return false;
    if (
      filters.status_code !== undefined &&
      event.status_code !== filters.status_code
    ) {
      return false;
    }
    return true;
  });
}

describeIntegration("activity log", () => {
  let ticketId: string | undefined;
  let apiKeyId: string | undefined;
  let activityEventIds: string[] = [];
  let restoredAdminRoleFor: string | undefined;

  afterEach(async () => {
    if (activityEventIds.length) {
      await adminDb().from("activity_events").delete().in("id", activityEventIds);
      activityEventIds = [];
    }
    if (ticketId) {
      await adminDb().from("activity_events").delete().eq("ticket_id", ticketId);
      await adminDb().from("tickets").delete().eq("id", ticketId);
      ticketId = undefined;
    }
    if (apiKeyId) {
      await adminDb().from("api_keys").delete().eq("id", apiKeyId);
      apiKeyId = undefined;
    }
    if (restoredAdminRoleFor) {
      await adminDb()
        .from("users")
        .update({ role: "admin" })
        .eq("id", restoredAdminRoleFor);
      restoredAdminRoleFor = undefined;
    }
  });

  it("records ticket updates and ticket-scoped activity queries", async () => {
    const { userId } = await signInAsSeedAdmin();
    const auth = staffAuth(userId);
    const ticket = await insertMinimalTicket({
      title: `activity-${Date.now()}`,
      kind: "task",
      body: "Initial body",
    });
    ticketId = ticket.id;

    await updateTicket(
      ticketId,
      { title: "Updated activity title", body: "Updated body" },
      { auth },
    );

    await createTicketComment(
      ticketId,
      { body: "Activity test comment" },
      auth,
    );

    const ticketActivity = await listActivityEvents(
      new URLSearchParams({ page: "1", per_page: "25" }),
      { ticket_id: ticketId, hide_self_referential: false },
    );

    expect(ticketActivity.total).toBeGreaterThanOrEqual(2);
    expect(
      ticketActivity.events.some(
        (event) => event.action === ACTIVITY_ACTIONS.TICKET_UPDATED,
      ),
    ).toBe(true);
    expect(
      ticketActivity.events.some(
        (event) => event.action === ACTIVITY_ACTIONS.COMMENT_CREATED,
      ),
    ).toBe(true);

    const createdKey = await createApiKey("Activity integration key", userId);
    apiKeyId = createdKey.id;
    const apiAuth = {
      type: "api_key" as const,
      userId,
      role: "admin" as const,
      apiKeyId: createdKey.id,
    };

    await updateTicket(ticketId, { title: "API updated title" }, { auth: apiAuth });

    const latest = await listActivityEvents(
      new URLSearchParams({ page: "1", per_page: "25" }),
      { ticket_id: ticketId, hide_self_referential: false },
    );
    const apiEvent = latest.events.find(
      (event) =>
        event.action === ACTIVITY_ACTIONS.TICKET_UPDATED &&
        event.actor_type === "api_key",
    );
    expect(apiEvent?.api_key_id).toBe(createdKey.id);
    expect(apiEvent?.actor_snapshot.api_key_name).toBe("Activity integration key");
  });

  it("records failed auth activity for invalid API keys", async () => {
    const response = await listTicketsRoute(
      bearerRequest("/api/v1/tickets", INVALID_API_KEY),
    );
    expect(response.status).toBe(401);

    const failedEvent = await findLatestFailedEvent({
      action: ACTIVITY_ACTIONS.API_REQUEST_FAILED,
      request_path: "/api/v1/tickets",
    });

    expect(failedEvent).toBeDefined();
    expect(failedEvent?.actor_type).toBe("anonymous");
    expect(failedEvent?.actor_snapshot.invalid_key_prefix).toBe("tq_live_inva");
    expect(failedEvent?.status_code).toBe(401);
    if (failedEvent) activityEventIds.push(failedEvent.id);
  });

  it("records failed activity when non-admin staff access admin routes", async () => {
    const { token, userId } = await signInAsSeedAdmin();
    await adminDb().from("users").update({ role: "agent" }).eq("id", userId);
    restoredAdminRoleFor = userId;

    const response = await listActivityRoute(
      bearerRequest("/api/v1/activity?page=1&per_page=25", token),
    );
    expect(response.status).toBe(403);

    const failedEvent = await findLatestFailedEvent({
      action: ACTIVITY_ACTIONS.API_REQUEST_FAILED,
      actor_user_id: userId,
      status_code: 403,
    });

    expect(failedEvent).toBeDefined();
    expect(failedEvent?.status_code).toBe(403);
    expect(failedEvent?.source).toBe("ui");
    expect(failedEvent?.summary).toContain("Admin role required");
    if (failedEvent) activityEventIds.push(failedEvent.id);
  });

  it("records failed activity for validation errors on ticket updates", async () => {
    const { token, userId } = await signInAsSeedAdmin();
    const ticket = await insertMinimalTicket({
      title: `activity-validation-${Date.now()}`,
      kind: "task",
    });
    ticketId = ticket.id;

    const response = await patchTicketRoute(
      bearerRequest(`/api/v1/tickets/${ticketId}`, token, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_id: "not-a-valid-uuid" }),
      }),
      { params: Promise.resolve({ id: ticketId }) },
    );
    expect(response.status).toBe(400);

    const failedEvent = await findLatestFailedEvent({
      action: ACTIVITY_ACTIONS.API_REQUEST_FAILED,
      actor_user_id: userId,
      status_code: 400,
    });

    expect(failedEvent).toBeDefined();
    expect(failedEvent?.status_code).toBe(400);
    expect(failedEvent?.summary).toMatch(/invalid/i);
    if (failedEvent) activityEventIds.push(failedEvent.id);
  });

  it("attributes MCP tool success activity to the mcp source", async () => {
    const { userId } = await signInAsSeedAdmin();
    const auth = staffAuth(userId);
    const operation = "ticqex_list_tickets";
    const requestId = createActivityRequestId();

    const recorded = await runWithActivityRequestContext(
      createActivityRequestStore({
        requestId,
        requestMethod: "MCP",
        requestPath: `/api/mcp/tools/${operation}`,
        operation,
        source: "mcp",
        auth,
      }),
      async () =>
        recordActivity({
          action: ACTIVITY_ACTIONS.MCP_TOOL_SUCCEEDED,
          outcome: ACTIVITY_OUTCOMES.SUCCEEDED,
          source: ACTIVITY_SOURCES.MCP,
          summary: `MCP tool ${operation}`,
          auth,
          operation,
          status_code: 200,
        }),
    );

    expect(recorded?.source).toBe("mcp");
    expect(recorded?.request_method).toBe("MCP");
    expect(recorded?.operation).toBe(operation);

    const listed = await listActivityEvents(
      new URLSearchParams({
        page: "1",
        per_page: "10",
        source: "mcp",
        operation,
        hide_self_referential: "false",
      }),
      { source: "mcp", operation, hide_self_referential: false },
    );

    expect(
      listed.events.some(
        (event) =>
          event.id === recorded?.id &&
          event.source === "mcp" &&
          event.action === ACTIVITY_ACTIONS.MCP_TOOL_SUCCEEDED,
      ),
    ).toBe(true);
    if (recorded) activityEventIds.push(recorded.id);
  });

  it("records failed auth activity via recordFailedAuthActivity", async () => {
    await recordFailedAuthActivity({
      requestMethod: "GET",
      requestPath: "/api/v1/tickets",
      operation: "ticqex_list_tickets",
      statusCode: 401,
      message: "Unauthorized",
      invalidKeyPrefix: "tq_live_inva",
    });

    const failedEvent = await findLatestFailedEvent({
      action: ACTIVITY_ACTIONS.API_REQUEST_FAILED,
      request_path: "/api/v1/tickets",
    });

    expect(failedEvent?.actor_snapshot.invalid_key_prefix).toBe("tq_live_inva");
    if (failedEvent) activityEventIds.push(failedEvent.id);
  });
});
