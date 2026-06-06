DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'global_settings'
      AND column_name = 'comment_order'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'global_settings'
      AND column_name = 'comment_thread_order'
  ) THEN
    ALTER TABLE public.global_settings
      RENAME COLUMN comment_order TO comment_thread_order;
  END IF;
END
$$;

ALTER TABLE public.global_settings
  ADD COLUMN IF NOT EXISTS comment_thread_order text NOT NULL DEFAULT 'oldest_first';

ALTER TABLE public.global_settings
  DROP CONSTRAINT IF EXISTS global_settings_comment_order_check;

ALTER TABLE public.global_settings
  DROP CONSTRAINT IF EXISTS global_settings_comment_thread_order_check;

ALTER TABLE public.global_settings
  ADD CONSTRAINT global_settings_comment_thread_order_check
  CHECK (comment_thread_order IN ('oldest_first', 'newest_first'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ticket_comments'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ticket_comments'
      AND policyname = 'ticket_comments_select_authenticated'
  ) THEN
    CREATE POLICY ticket_comments_select_authenticated ON public.ticket_comments
      FOR SELECT TO authenticated USING (true);
  END IF;
END
$$;
