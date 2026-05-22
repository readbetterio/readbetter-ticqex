-- Default status for new inbound email tickets

ALTER TABLE public.global_settings
  ADD COLUMN default_inbound_status_id uuid REFERENCES public.status_types (id) ON DELETE SET NULL;

UPDATE public.global_settings gs
SET default_inbound_status_id = (
  SELECT id FROM public.status_types ORDER BY position ASC LIMIT 1
)
WHERE gs.id = 1;
