export type TicketFieldVisibilityEntry = {
  showOnCard: boolean;
  showInTicket: boolean;
};

/** Saved visibility overrides keyed by field id (`title`, `contact`, `custom:<uuid>`, …). */
export type TicketFieldVisibility = Record<string, TicketFieldVisibilityEntry>;

export type TicketFieldCatalogEntry = {
  id: string;
  label: string;
  kind: "core" | "custom";
  key?: string;
  type?: string;
  position?: number;
  required?: boolean;
  /** When true, visibility toggles are disabled (title). */
  locked?: boolean;
  showOnCard: boolean;
  showInTicket: boolean;
};

export type ResolvedTicketFieldLayout = {
  catalog: TicketFieldCatalogEntry[];
  visibility: TicketFieldVisibility;
};

export type TicketFieldVisibilitySettings = {
  ticket_field_visibility?: TicketFieldVisibility | Record<string, unknown> | null;
};

export type TicketCustomFieldDefinition = {
  id: string;
  key: string;
  label: string;
  type: string;
  position: number;
  required?: boolean;
};
