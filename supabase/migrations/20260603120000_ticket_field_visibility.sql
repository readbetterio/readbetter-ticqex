ALTER TABLE public.global_settings
  ADD COLUMN IF NOT EXISTS ticket_field_visibility jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.global_settings AS settings
SET ticket_field_visibility =
  jsonb_build_object(
    'title', jsonb_build_object('showOnCard', true, 'showInTicket', true),
    'contact', jsonb_build_object('showOnCard', true, 'showInTicket', settings.show_contact_on_ticket),
    'assignee', jsonb_build_object('showOnCard', true, 'showInTicket', settings.show_assignee_on_ticket),
    'tags', jsonb_build_object('showOnCard', true, 'showInTicket', true),
    'description', jsonb_build_object('showOnCard', false, 'showInTicket', settings.show_body_on_ticket),
    'preview', jsonb_build_object('showOnCard', true, 'showInTicket', false),
    'contact_address', jsonb_build_object('showOnCard', false, 'showInTicket', true)
  )
  || COALESCE(
    (
      SELECT jsonb_object_agg(
        'custom:' || fields.id::text,
        jsonb_build_object(
          'showOnCard', true,
          'showInTicket', fields.id = ANY(settings.visible_ticket_field_ids)
        )
      )
      FROM public.custom_field_definitions AS fields
      WHERE fields."group" = 'ticket'
    ),
    '{}'::jsonb
  )
WHERE settings.ticket_field_visibility = '{}'::jsonb;
