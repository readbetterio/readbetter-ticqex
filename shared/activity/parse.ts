import {
  ACTIVITY_ACTIONS,
  ACTIVITY_ACTOR_TYPES,
  ACTIVITY_OUTCOMES,
  ACTIVITY_SOURCES,
  type ActivityAction,
  type ActivityActorType,
  type ActivityOutcome,
  type ActivitySource,
} from "@shared/activity/actions";
import type {
  ActivityActorSnapshot,
  ActivityChange,
  ActivityDbRow,
  ActivityEvent,
  ActivityJson,
  TicketActivitySnapshot,
} from "@shared/activity/types";

const ACTIVITY_ACTION_VALUES = new Set<string>(Object.values(ACTIVITY_ACTIONS));
const ACTIVITY_OUTCOME_VALUES = new Set<string>(Object.values(ACTIVITY_OUTCOMES));
const ACTIVITY_SOURCE_VALUES = new Set<string>(Object.values(ACTIVITY_SOURCES));
const ACTIVITY_ACTOR_TYPE_VALUES = new Set<string>(
  Object.values(ACTIVITY_ACTOR_TYPES),
);

function asRecord(value: ActivityJson | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function tryParseActivityAction(
  value: string | null | undefined,
): ActivityAction | undefined {
  if (!value || !ACTIVITY_ACTION_VALUES.has(value)) return undefined;
  return value as ActivityAction;
}

export function tryParseActivityOutcome(
  value: string | null | undefined,
): ActivityOutcome | undefined {
  if (!value || !ACTIVITY_OUTCOME_VALUES.has(value)) return undefined;
  return value as ActivityOutcome;
}

export function tryParseActivitySource(
  value: string | null | undefined,
): ActivitySource | undefined {
  if (!value || !ACTIVITY_SOURCE_VALUES.has(value)) return undefined;
  return value as ActivitySource;
}

function parseVocabularyValue<T extends string>(
  value: string,
  allowed: Set<string>,
  field: string,
): T {
  if (allowed.has(value)) {
    return value as T;
  }
  throw new Error(`Invalid activity ${field}: ${value}`);
}

export function parseActivityAction(value: string): ActivityAction {
  return parseVocabularyValue(value, ACTIVITY_ACTION_VALUES, "action");
}

export function parseActivityOutcome(value: string): ActivityOutcome {
  return parseVocabularyValue(value, ACTIVITY_OUTCOME_VALUES, "outcome");
}

export function parseActivitySource(value: string): ActivitySource {
  return parseVocabularyValue(value, ACTIVITY_SOURCE_VALUES, "source");
}

export function parseActivityActorType(value: string): ActivityActorType {
  return parseVocabularyValue(value, ACTIVITY_ACTOR_TYPE_VALUES, "actor_type");
}

export function parseActivityChanges(
  value: ActivityJson | null | undefined,
): ActivityChange[] {
  if (!Array.isArray(value)) return [];
  const changes: ActivityChange[] = [];
  for (const entry of value) {
    if (
      entry &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      typeof (entry as Record<string, unknown>).field === "string"
    ) {
      const change = entry as Record<string, unknown>;
      changes.push({
        field: change.field as string,
        label: typeof change.label === "string" ? change.label : undefined,
        from: change.from,
        to: change.to,
      });
    }
  }
  return changes;
}

export function parseTicketActivitySnapshot(
  value: ActivityJson | null | undefined,
): TicketActivitySnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as Record<string, unknown>;
  if (typeof snapshot.id !== "string" || typeof snapshot.title !== "string") {
    return null;
  }
  return {
    id: snapshot.id,
    title: snapshot.title,
    kind: typeof snapshot.kind === "string" ? snapshot.kind : undefined,
  };
}

function optionalString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return value;
  return typeof value === "string" ? value : undefined;
}

export function parseActivityActorSnapshot(
  value: ActivityJson | null | undefined,
): ActivityActorSnapshot {
  const record = asRecord(value);
  return {
    label: typeof record.label === "string" ? record.label : "Unknown",
    username: optionalString(record.username),
    email: optionalString(record.email),
    api_key_name: optionalString(record.api_key_name),
    invalid_key_prefix: optionalString(record.invalid_key_prefix),
  };
}

export function parseActivityMetadata(
  value: ActivityJson | null | undefined,
): Record<string, unknown> {
  return asRecord(value);
}

function isActivityDbRow(value: unknown): value is ActivityDbRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.occurred_at === "string" &&
    typeof row.action === "string" &&
    typeof row.outcome === "string" &&
    typeof row.source === "string" &&
    typeof row.actor_type === "string" &&
    typeof row.summary === "string"
  );
}

export function parseActivityDbRow(value: unknown): ActivityDbRow | null {
  if (!isActivityDbRow(value)) return null;
  return value;
}

export function formatActivityEvent(row: ActivityDbRow): ActivityEvent {
  return {
    id: row.id,
    occurred_at: row.occurred_at,
    action: parseActivityAction(row.action),
    outcome: parseActivityOutcome(row.outcome),
    source: parseActivitySource(row.source),
    target_type: row.target_type,
    target_id: row.target_id,
    ticket_id: row.ticket_id,
    ticket_snapshot: parseTicketActivitySnapshot(row.ticket_snapshot),
    actor_type: parseActivityActorType(row.actor_type),
    actor_user_id: row.actor_user_id,
    api_key_id: row.api_key_id,
    actor_snapshot: parseActivityActorSnapshot(row.actor_snapshot),
    request_id: row.request_id,
    request_method: row.request_method,
    request_path: row.request_path,
    operation: row.operation,
    status_code: row.status_code,
    summary: row.summary,
    changes: parseActivityChanges(row.changes),
    metadata: parseActivityMetadata(row.metadata),
  };
}
