ALTER TABLE public.global_settings
  DROP COLUMN IF EXISTS show_contact_on_ticket,
  DROP COLUMN IF EXISTS show_assignee_on_ticket,
  DROP COLUMN IF EXISTS show_body_on_ticket,
  DROP COLUMN IF EXISTS visible_ticket_field_ids,
  DROP COLUMN IF EXISTS visible_contact_field_ids;
