-- Board column visibility on status_types (replaces global_settings.visible_status_ids for board filtering)

ALTER TABLE public.status_types
  ADD COLUMN is_visible boolean NOT NULL DEFAULT true;

UPDATE public.status_types st
SET is_visible = st.id = ANY(gs.visible_status_ids)
FROM public.global_settings gs
WHERE gs.id = 1
  AND array_length(gs.visible_status_ids, 1) > 0;
