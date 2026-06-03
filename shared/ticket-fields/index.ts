export {
  CORE_TICKET_FIELD_IDS,
  CORE_TICKET_FIELD_ID_SET,
  customFieldId,
  isCoreTicketFieldId,
  isCustomFieldId,
  parseCustomFieldId,
  type CoreTicketFieldId,
} from "./ids";

export {
  CORE_TICKET_FIELD_LABELS,
  DEFAULT_CORE_VISIBILITY,
  DEFAULT_CUSTOM_FIELD_VISIBILITY,
} from "./defaults";

export {
  buildTicketFieldVisibilityFromLegacy,
  type LegacyGlobalSettingsVisibility,
  type LegacyTicketCustomFieldRef,
} from "./legacy-visibility";

export {
  buildVisibilityPatch,
  enforceTitleInvariant,
  isFieldVisibleInTicket,
  isFieldVisibleOnCard,
  isTicketFieldVisible,
  mergeTicketFieldVisibilityPatch,
  normalizeVisibilityPatch,
  parseTicketFieldVisibility,
  resolveCoreTicketFieldVisibility,
  resolveTicketFieldLayout,
  resolveVisibleTicketCustomFields,
  type TicketFieldSurface,
} from "./resolve";

export { filterTicketCardSurface } from "./filter-card-surface";

export type {
  TicketFieldVisibilitySettings,
  ResolvedTicketFieldLayout,
  TicketCustomFieldDefinition,
  TicketFieldCatalogEntry,
  TicketFieldVisibility,
  TicketFieldVisibilityEntry,
} from "./types";
