import { CORE_TICKET_FIELD_IDS, customFieldId } from "./ids";
import type { TicketFieldVisibility } from "./types";

/**
 * Shape of global_settings visibility columns before
 * `20260603120000_ticket_field_visibility.sql` / drop in `20260603130000_*`.
 * Kept in shared code so unit tests can assert the same contract as the migration
 * without a SQL migration harness.
 */
export type LegacyGlobalSettingsVisibility = {
  show_contact_on_ticket: boolean;
  show_assignee_on_ticket: boolean;
  show_body_on_ticket: boolean;
  visible_ticket_field_ids: readonly string[];
};

export type LegacyTicketCustomFieldRef = {
  id: string;
};

/**
 * Mirrors the UPDATE in `supabase/migrations/20260603120000_ticket_field_visibility.sql`
 * (core keys + per-ticket custom_field_definitions with showInTicket from visible_ticket_field_ids).
 */
export function buildTicketFieldVisibilityFromLegacy(
  settings: LegacyGlobalSettingsVisibility,
  ticketCustomFields: readonly LegacyTicketCustomFieldRef[],
): TicketFieldVisibility {
  const visibleIds = new Set(settings.visible_ticket_field_ids);

  const visibility: TicketFieldVisibility = {
    [CORE_TICKET_FIELD_IDS.title]: { showOnCard: true, showInTicket: true },
    [CORE_TICKET_FIELD_IDS.contact]: {
      showOnCard: true,
      showInTicket: settings.show_contact_on_ticket,
    },
    [CORE_TICKET_FIELD_IDS.assignee]: {
      showOnCard: true,
      showInTicket: settings.show_assignee_on_ticket,
    },
    [CORE_TICKET_FIELD_IDS.tags]: { showOnCard: true, showInTicket: true },
    [CORE_TICKET_FIELD_IDS.description]: {
      showOnCard: false,
      showInTicket: settings.show_body_on_ticket,
    },
    [CORE_TICKET_FIELD_IDS.preview]: { showOnCard: true, showInTicket: false },
    [CORE_TICKET_FIELD_IDS.contact_address]: {
      showOnCard: false,
      showInTicket: true,
    },
  };

  for (const field of ticketCustomFields) {
    visibility[customFieldId(field.id)] = {
      showOnCard: true,
      showInTicket: visibleIds.has(field.id),
    };
  }

  return visibility;
}
