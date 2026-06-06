-- Internal ticket comments (separate from customer-facing messages)

CREATE TYPE public.comment_author_type AS ENUM ('agent', 'api_key');

CREATE TABLE public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets (id) ON DELETE CASCADE,
  body text NOT NULL,
  author_type public.comment_author_type NOT NULL,
  author_id uuid REFERENCES public.users (id) ON DELETE RESTRICT,
  api_key_id uuid REFERENCES public.api_keys (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_comments_author_shape_check CHECK (
    (author_type = 'agent' AND author_id IS NOT NULL AND api_key_id IS NULL)
    OR (author_type = 'api_key' AND author_id IS NULL AND api_key_id IS NOT NULL)
  )
);

CREATE INDEX ticket_comments_ticket_id_created_at_idx
  ON public.ticket_comments (ticket_id, created_at, id);

ALTER TABLE public.global_settings
  ADD COLUMN IF NOT EXISTS comment_thread_order text NOT NULL DEFAULT 'oldest_first'
  CHECK (comment_thread_order IN ('oldest_first', 'newest_first'));

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY ticket_comments_select_authenticated ON public.ticket_comments
  FOR SELECT TO authenticated USING (true);
