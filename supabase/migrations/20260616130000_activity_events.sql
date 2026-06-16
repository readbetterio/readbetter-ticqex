-- Activity / audit event log

CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  outcome text NOT NULL,
  source text NOT NULL,
  target_type text,
  target_id uuid,
  ticket_id uuid,
  ticket_snapshot jsonb,
  actor_type text NOT NULL,
  actor_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  api_key_id uuid REFERENCES public.api_keys (id) ON DELETE SET NULL,
  actor_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id uuid,
  request_method text,
  request_path text,
  operation text,
  status_code int,
  summary text NOT NULL,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT activity_events_outcome_check CHECK (
    outcome IN ('succeeded', 'failed')
  ),
  CONSTRAINT activity_events_source_check CHECK (
    source IN ('ui', 'api', 'mcp', 'system', 'email')
  ),
  CONSTRAINT activity_events_actor_type_check CHECK (
    actor_type IN ('staff', 'api_key', 'contact', 'system', 'anonymous')
  ),
  CONSTRAINT activity_events_action_check CHECK (
    action IN (
      'api.request.succeeded',
      'api.request.failed',
      'mcp.tool.succeeded',
      'mcp.tool.failed',
      'ticket.created',
      'ticket.updated',
      'ticket.deleted',
      'ticket.status_changed',
      'comment.created',
      'comment.updated',
      'comment.deleted',
      'message.created',
      'message.draft_created',
      'message.draft_updated',
      'message.draft_deleted',
      'message.draft_sent',
      'message.inbound'
    )
  )
);

CREATE INDEX activity_events_occurred_at_idx
  ON public.activity_events (occurred_at DESC);

CREATE INDEX activity_events_ticket_id_occurred_at_idx
  ON public.activity_events (ticket_id, occurred_at DESC)
  WHERE ticket_id IS NOT NULL;

CREATE INDEX activity_events_actor_user_id_occurred_at_idx
  ON public.activity_events (actor_user_id, occurred_at DESC)
  WHERE actor_user_id IS NOT NULL;

CREATE INDEX activity_events_api_key_id_occurred_at_idx
  ON public.activity_events (api_key_id, occurred_at DESC)
  WHERE api_key_id IS NOT NULL;

CREATE INDEX activity_events_action_occurred_at_idx
  ON public.activity_events (action, occurred_at DESC);

CREATE INDEX activity_events_outcome_occurred_at_idx
  ON public.activity_events (outcome, occurred_at DESC);

CREATE INDEX activity_events_request_path_occurred_at_idx
  ON public.activity_events (request_path, occurred_at DESC)
  WHERE request_path IS NOT NULL;

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
