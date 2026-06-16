import type {
  ActivityAction,
  ActivityActorType,
  ActivityOutcome,
  ActivitySource,
} from "./actions";

/** JSON-compatible value stored in activity_events jsonb columns. */
export type ActivityJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: ActivityJson | undefined }
  | ActivityJson[];

export type ActivityChange = {
  field: string;
  label?: string;
  from: unknown;
  to: unknown;
};

export type TicketActivitySnapshot = {
  id: string;
  title: string;
  kind?: string;
};

export type ActivityActorSnapshot = {
  label: string;
  username?: string | null;
  email?: string | null;
  api_key_name?: string | null;
  invalid_key_prefix?: string | null;
};

/** Domain-facing activity event returned by APIs and consumed by UI. */
export type ActivityEvent = {
  id: string;
  occurred_at: string;
  action: ActivityAction;
  outcome: ActivityOutcome;
  source: ActivitySource;
  target_type: string | null;
  target_id: string | null;
  ticket_id: string | null;
  ticket_snapshot: TicketActivitySnapshot | null;
  actor_type: ActivityActorType;
  actor_user_id: string | null;
  api_key_id: string | null;
  actor_snapshot: ActivityActorSnapshot;
  request_id: string | null;
  request_method: string | null;
  request_path: string | null;
  operation: string | null;
  status_code: number | null;
  summary: string;
  changes: ActivityChange[];
  metadata: Record<string, unknown>;
};

export type ActivityListResponse = {
  events: ActivityEvent[];
  total: number;
  page: number;
  perPage: number;
};

export type ActivityListFilters = {
  ticket_id?: string;
  actor_user_id?: string;
  api_key_id?: string;
  source?: ActivitySource;
  action?: ActivityAction;
  outcome?: ActivityOutcome;
  target_type?: string;
  operation?: string;
  request_method?: string;
  request_path?: string;
  status_code?: number;
  occurred_after?: string;
  occurred_before?: string;
  hide_self_referential?: boolean;
};

/** Raw activity_events table row as returned by Supabase. */
export type ActivityDbRow = {
  id: string;
  occurred_at: string;
  action: string;
  outcome: string;
  source: string;
  target_type: string | null;
  target_id: string | null;
  ticket_id: string | null;
  ticket_snapshot: ActivityJson | null;
  actor_type: string;
  actor_user_id: string | null;
  api_key_id: string | null;
  actor_snapshot: ActivityJson;
  request_id: string | null;
  request_method: string | null;
  request_path: string | null;
  operation: string | null;
  status_code: number | null;
  summary: string;
  changes: ActivityJson;
  metadata: ActivityJson;
};

/**
 * Core activity write contract. Server callers extend this with request auth context.
 * Vocabulary fields use canonical unions; action values outside ACTIVITY_ACTIONS require
 * extending shared/activity/actions.ts and the activity_events.action check constraint.
 */
export type ActivityRecordInput = {
  action: ActivityAction;
  outcome?: ActivityOutcome;
  source?: ActivitySource;
  summary: string;
  target_type?: string;
  target_id?: string;
  ticket_id?: string;
  ticket_snapshot?: TicketActivitySnapshot | null;
  actor_type?: ActivityActorType;
  actor_user_id?: string | null;
  api_key_id?: string | null;
  actor_snapshot?: ActivityActorSnapshot;
  request_id?: string | null;
  request_method?: string | null;
  request_path?: string | null;
  operation?: string | null;
  status_code?: number | null;
  changes?: ActivityChange[];
  metadata?: Record<string, unknown>;
};
