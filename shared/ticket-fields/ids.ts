export const CORE_TICKET_FIELD_IDS = {
  title: "title",
  contact: "contact",
  assignee: "assignee",
  tags: "tags",
  description: "description",
  preview: "preview",
  contact_address: "contact_address",
} as const;

export type CoreTicketFieldId =
  (typeof CORE_TICKET_FIELD_IDS)[keyof typeof CORE_TICKET_FIELD_IDS];

export const CORE_TICKET_FIELD_ID_SET = new Set<string>(
  Object.values(CORE_TICKET_FIELD_IDS),
);

export function customFieldId(uuid: string): string {
  return `custom:${uuid}`;
}

export function isCustomFieldId(id: string): boolean {
  return id.startsWith("custom:");
}

export function parseCustomFieldId(id: string): string | null {
  if (!isCustomFieldId(id)) return null;
  return id.slice("custom:".length);
}

export function isCoreTicketFieldId(id: string): id is CoreTicketFieldId {
  return CORE_TICKET_FIELD_ID_SET.has(id);
}
