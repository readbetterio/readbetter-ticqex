import { randomUUID } from "node:crypto";
import { createAdminClient } from "@server/lib/supabase-admin";
import { ApiError } from "@server/lib/errors";
import { parsePagination } from "@server/lib/utils";
import {
  getActivityRecorder,
  getActivityRequestContext,
} from "@server/lib/activity-request-context";
import {
  loadApiKeyActorSnapshot,
  loadStaffActorSnapshot,
} from "@server/domain/actor-snapshot";
import type { AuthContext } from "@server/middleware/auth";
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_ACTOR_TYPES,
  ACTIVITY_OUTCOMES,
  ACTIVITY_SOURCES,
  SELF_REFERENTIAL_ACTIVITY_OPERATIONS,
  type ActivityActorType,
  type ActivityOutcome,
  type ActivitySource,
} from "@shared/activity/actions";
import {
  formatActivityEvent,
  parseActivityDbRow,
} from "@shared/activity/parse";
import type {
  ActivityActorSnapshot,
  ActivityEvent,
  ActivityListFilters,
  ActivityRecordInput,
  TicketActivitySnapshot,
} from "@shared/activity/types";

export type RecordActivityInput = ActivityRecordInput & {
  auth?: AuthContext | null;
};

function contextSourceToActivitySource(
  source: "ui" | "api" | "mcp",
): ActivitySource {
  switch (source) {
    case "ui":
      return ACTIVITY_SOURCES.UI;
    case "api":
      return ACTIVITY_SOURCES.API;
    case "mcp":
      return ACTIVITY_SOURCES.MCP;
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

export function resolveActivitySource(auth?: AuthContext | null): ActivitySource {
  const context = getActivityRequestContext();
  if (context?.source) {
    return contextSourceToActivitySource(context.source);
  }
  if (!auth) return ACTIVITY_SOURCES.SYSTEM;
  if (auth.type === "api_key") return ACTIVITY_SOURCES.API;
  return ACTIVITY_SOURCES.UI;
}

export async function resolveActorSnapshot(input: {
  auth?: AuthContext | null;
  actor_type?: ActivityActorType;
  actor_user_id?: string | null;
  api_key_id?: string | null;
  actor_snapshot?: ActivityActorSnapshot;
  invalidKeyPrefix?: string | null;
}): Promise<{
  actor_type: ActivityActorType;
  actor_user_id: string | null;
  api_key_id: string | null;
  actor_snapshot: ActivityActorSnapshot;
}> {
  if (input.actor_snapshot) {
    return {
      actor_type: input.actor_type ?? ACTIVITY_ACTOR_TYPES.SYSTEM,
      actor_user_id: input.actor_user_id ?? null,
      api_key_id: input.api_key_id ?? null,
      actor_snapshot: input.actor_snapshot,
    };
  }

  if (input.invalidKeyPrefix) {
    return {
      actor_type: ACTIVITY_ACTOR_TYPES.ANONYMOUS,
      actor_user_id: null,
      api_key_id: null,
      actor_snapshot: {
        label: "Invalid API key",
        invalid_key_prefix: input.invalidKeyPrefix,
      },
    };
  }

  const auth = input.auth;
  if (auth?.type === "api_key") {
    const snapshot = auth.apiKeyId
      ? await loadApiKeyActorSnapshot(auth.apiKeyId)
      : { label: "API key" };
    return {
      actor_type: ACTIVITY_ACTOR_TYPES.API_KEY,
      actor_user_id: auth.userId,
      api_key_id: auth.apiKeyId ?? null,
      actor_snapshot: snapshot,
    };
  }

  if (auth?.type === "staff") {
    const snapshot = await loadStaffActorSnapshot(auth.userId);
    return {
      actor_type: ACTIVITY_ACTOR_TYPES.STAFF,
      actor_user_id: auth.userId,
      api_key_id: null,
      actor_snapshot: snapshot,
    };
  }

  if (input.actor_type === ACTIVITY_ACTOR_TYPES.CONTACT) {
    return {
      actor_type: ACTIVITY_ACTOR_TYPES.CONTACT,
      actor_user_id: input.actor_user_id ?? null,
      api_key_id: null,
      actor_snapshot: input.actor_snapshot ?? { label: "Contact" },
    };
  }

  return {
    actor_type: input.actor_type ?? ACTIVITY_ACTOR_TYPES.SYSTEM,
    actor_user_id: input.actor_user_id ?? null,
    api_key_id: input.api_key_id ?? null,
    actor_snapshot: { label: "System" },
  };
}

function mergeRequestContext(input: RecordActivityInput) {
  const context = getActivityRequestContext();
  return {
    request_id: input.request_id ?? context?.requestId ?? null,
    request_method: input.request_method ?? context?.requestMethod ?? null,
    request_path: input.request_path ?? context?.requestPath ?? null,
    operation: input.operation ?? context?.operation ?? null,
    source: input.source ?? resolveActivitySource(input.auth ?? context?.auth),
    auth: input.auth ?? context?.auth ?? null,
  };
}

export async function recordActivity(
  input: RecordActivityInput,
): Promise<ActivityEvent | null> {
  try {
    const merged = mergeRequestContext(input);
    const actor = await resolveActorSnapshot({
      auth: merged.auth,
      actor_type: input.actor_type,
      actor_user_id: input.actor_user_id,
      api_key_id: input.api_key_id,
      actor_snapshot: input.actor_snapshot,
    });

    const row = {
      action: input.action,
      outcome: input.outcome ?? ACTIVITY_OUTCOMES.SUCCEEDED,
      source: merged.source,
      target_type: input.target_type ?? null,
      target_id: input.target_id ?? null,
      ticket_id: input.ticket_id ?? null,
      ticket_snapshot: input.ticket_snapshot ?? null,
      actor_type: actor.actor_type,
      actor_user_id: actor.actor_user_id,
      api_key_id: actor.api_key_id,
      actor_snapshot: actor.actor_snapshot,
      request_id: merged.request_id,
      request_method: merged.request_method,
      request_path: merged.request_path,
      operation: merged.operation,
      status_code: input.status_code ?? null,
      summary: input.summary,
      changes: input.changes ?? [],
      metadata: input.metadata ?? {},
    };

    const db = createAdminClient();
    const { data, error } = await db
      .from("activity_events")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      console.error({
        event: "activity.record_failed",
        action: input.action,
        request_path: merged.request_path,
        request_method: merged.request_method,
        error: error.message,
      });
      return null;
    }

    const dbRow = parseActivityDbRow(data);
    if (!dbRow) return null;
    return formatActivityEvent(dbRow);
  } catch (error) {
    const merged = mergeRequestContext(input);
    console.error({
      event: "activity.record_failed",
      action: input.action,
      request_path: merged.request_path,
      request_method: merged.request_method,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function recordDomainActivity(
  input: RecordActivityInput,
): Promise<ActivityEvent | null> {
  const event = await recordActivity(input);
  if (event) {
    getActivityRecorder()?.markDomainActivity();
  }
  return event;
}

export async function recordMcpToolActivity(input: {
  name: string;
  outcome: ActivityOutcome;
  auth: AuthContext;
  statusCode: number;
  errorMessage?: string;
}) {
  if (getActivityRecorder()?.hasDomainActivity()) return;

  const action =
    input.outcome === ACTIVITY_OUTCOMES.FAILED
      ? ACTIVITY_ACTIONS.MCP_TOOL_FAILED
      : ACTIVITY_ACTIONS.MCP_TOOL_SUCCEEDED;

  await recordActivity({
    action,
    outcome: input.outcome,
    source: ACTIVITY_SOURCES.MCP,
    summary:
      input.outcome === ACTIVITY_OUTCOMES.FAILED
        ? `MCP tool ${input.name} failed`
        : `MCP tool ${input.name}`,
    auth: input.auth,
    operation: input.name,
    status_code: input.statusCode,
    metadata: input.errorMessage
      ? { error_message: input.errorMessage }
      : undefined,
  });
}

export async function recordFailedAuthActivity(input: {
  requestMethod: string;
  requestPath: string;
  operation: string | null;
  statusCode: number;
  message: string;
  invalidKeyPrefix?: string | null;
}) {
  await recordActivity({
    action: ACTIVITY_ACTIONS.API_REQUEST_FAILED,
    outcome: ACTIVITY_OUTCOMES.FAILED,
    source: ACTIVITY_SOURCES.API,
    summary: input.message,
    request_method: input.requestMethod,
    request_path: input.requestPath,
    operation: input.operation,
    status_code: input.statusCode,
    actor_type: ACTIVITY_ACTOR_TYPES.ANONYMOUS,
    actor_snapshot: input.invalidKeyPrefix
      ? {
          label: "Invalid API key",
          invalid_key_prefix: input.invalidKeyPrefix,
        }
      : { label: "Anonymous" },
    metadata: { error_message: input.message },
  });
}

export async function recordRequestActivity(input: {
  outcome: ActivityOutcome;
  statusCode: number;
  summary: string;
  auth?: AuthContext | null;
  metadata?: Record<string, unknown>;
}) {
  if (getActivityRecorder()?.hasDomainActivity()) return;

  const action =
    input.outcome === ACTIVITY_OUTCOMES.FAILED
      ? ACTIVITY_ACTIONS.API_REQUEST_FAILED
      : ACTIVITY_ACTIONS.API_REQUEST_SUCCEEDED;

  await recordActivity({
    action,
    outcome: input.outcome,
    summary: input.summary,
    auth: input.auth,
    status_code: input.statusCode,
    metadata: input.metadata,
  });
}

export async function listActivityEvents(
  searchParams: URLSearchParams,
  filters: ActivityListFilters = {},
) {
  const db = createAdminClient();
  const { page, perPage, offset } = parsePagination(searchParams);

  let query = db
    .from("activity_events")
    .select("*", { count: "exact" })
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false });

  if (filters.ticket_id) query = query.eq("ticket_id", filters.ticket_id);
  if (filters.actor_user_id) {
    query = query.eq("actor_user_id", filters.actor_user_id);
  }
  if (filters.api_key_id) query = query.eq("api_key_id", filters.api_key_id);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.outcome) query = query.eq("outcome", filters.outcome);
  if (filters.target_type) query = query.eq("target_type", filters.target_type);
  if (filters.operation) query = query.eq("operation", filters.operation);
  if (filters.request_method) {
    query = query.eq("request_method", filters.request_method.toUpperCase());
  }
  if (filters.request_path) {
    query = query.ilike("request_path", `%${filters.request_path}%`);
  }
  if (filters.status_code !== undefined) {
    query = query.eq("status_code", filters.status_code);
  }
  if (filters.occurred_after) {
    query = query.gte("occurred_at", filters.occurred_after);
  }
  if (filters.occurred_before) {
    query = query.lte("occurred_at", filters.occurred_before);
  }

  const hideSelfReferential =
    filters.hide_self_referential ??
    searchParams.get("hide_self_referential") !== "false";

  if (hideSelfReferential) {
    const operations = [...SELF_REFERENTIAL_ACTIVITY_OPERATIONS];
    if (operations.length) {
      query = query.not(
        "operation",
        "in",
        `(${operations.map((operation) => `"${operation}"`).join(",")})`,
      );
    }
  }

  const { data, count, error } = await query.range(offset, offset + perPage - 1);
  if (error) throw ApiError.internal(error.message);

  return {
    events: (data ?? []).flatMap((row) => {
      const dbRow = parseActivityDbRow(row);
      return dbRow ? [formatActivityEvent(dbRow)] : [];
    }),
    total: count ?? 0,
    page,
    perPage,
  };
}

export function createActivityRequestId(): string {
  return randomUUID();
}

export function buildTicketSnapshot(input: {
  id: string;
  title: string;
  kind?: string;
}): TicketActivitySnapshot {
  return {
    id: input.id,
    title: input.title,
    kind: input.kind,
  };
}

export { formatActivityEvent } from "@shared/activity/parse";
