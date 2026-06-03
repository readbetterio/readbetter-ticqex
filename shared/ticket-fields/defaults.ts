import { CORE_TICKET_FIELD_IDS } from "./ids";
import type { TicketFieldVisibility, TicketFieldVisibilityEntry } from "./types";

export const DEFAULT_CORE_VISIBILITY: TicketFieldVisibility = {
  [CORE_TICKET_FIELD_IDS.title]: { showOnCard: true, showInTicket: true },
  [CORE_TICKET_FIELD_IDS.contact]: { showOnCard: true, showInTicket: true },
  [CORE_TICKET_FIELD_IDS.assignee]: { showOnCard: true, showInTicket: true },
  [CORE_TICKET_FIELD_IDS.tags]: { showOnCard: true, showInTicket: true },
  [CORE_TICKET_FIELD_IDS.description]: { showOnCard: false, showInTicket: true },
  [CORE_TICKET_FIELD_IDS.preview]: { showOnCard: true, showInTicket: false },
  [CORE_TICKET_FIELD_IDS.contact_address]: {
    showOnCard: false,
    showInTicket: true,
  },
};

export const CORE_TICKET_FIELD_LABELS: Record<string, string> = {
  [CORE_TICKET_FIELD_IDS.title]: "Title",
  [CORE_TICKET_FIELD_IDS.contact]: "Contact",
  [CORE_TICKET_FIELD_IDS.assignee]: "Assignee",
  [CORE_TICKET_FIELD_IDS.tags]: "Tags",
  [CORE_TICKET_FIELD_IDS.description]: "Description",
  [CORE_TICKET_FIELD_IDS.preview]: "Preview",
  [CORE_TICKET_FIELD_IDS.contact_address]: "Email address",
};

export const DEFAULT_CUSTOM_FIELD_VISIBILITY: TicketFieldVisibilityEntry = {
  showOnCard: true,
  showInTicket: true,
};
