-- Provider-scoped external IDs (dedupe, delivery lookup). RFC email fields stay on messages.
CREATE TABLE public.message_external_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages (id) ON DELETE CASCADE,
  provider text NOT NULL,
  integration_key text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  ref_type text NOT NULL,
  external_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX message_external_refs_dedupe_key
  ON public.message_external_refs (
    provider,
    integration_key,
    direction,
    ref_type,
    external_id
  );

CREATE INDEX message_external_refs_message_id_idx
  ON public.message_external_refs (message_id);

CREATE TRIGGER message_external_refs_updated_at
  BEFORE UPDATE ON public.message_external_refs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.message_external_refs ENABLE ROW LEVEL SECURITY;

-- Inbound dedupe fallback: RFC Message-ID on messages (synthetic @inbound> IDs excluded)
CREATE UNIQUE INDEX messages_email_message_id_inbound_key
  ON public.messages (email_message_id)
  WHERE email_message_id IS NOT NULL
    AND email_message_id NOT LIKE '%@inbound>';
