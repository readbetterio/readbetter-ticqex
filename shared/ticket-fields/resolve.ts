import {
  CORE_TICKET_FIELD_IDS,
  CORE_TICKET_FIELD_ID_SET,
  customFieldId,
  isCustomFieldId,
  parseCustomFieldId,
  type CoreTicketFieldId,
} from "./ids";
import {
  CORE_TICKET_FIELD_LABELS,
  DEFAULT_CORE_VISIBILITY,
  DEFAULT_CUSTOM_FIELD_VISIBILITY,
} from "./defaults";
import type {
  ResolvedTicketFieldLayout,
  TicketCustomFieldDefinition,
  TicketFieldCatalogEntry,
  TicketFieldVisibility,
  TicketFieldVisibilityEntry,
  TicketFieldVisibilitySettings,
} from "./types";

function isVisibilityEntry(value: unknown): value is TicketFieldVisibilityEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.showOnCard === "boolean" &&
    typeof entry.showInTicket === "boolean"
  );
}

export function parseTicketFieldVisibility(
  raw: unknown,
): TicketFieldVisibility {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const parsed: TicketFieldVisibility = {};
  for (const [id, entry] of Object.entries(raw)) {
    if (!isVisibilityEntry(entry)) continue;
    parsed[id] = { ...entry };
  }
  return parsed;
}

export function enforceTitleInvariant(
  visibility: TicketFieldVisibility,
): TicketFieldVisibility {
  return {
    ...visibility,
    [CORE_TICKET_FIELD_IDS.title]: { showOnCard: true, showInTicket: true },
  };
}

function mergeVisibility(
  base: TicketFieldVisibility,
  overrides: TicketFieldVisibility,
): TicketFieldVisibility {
  const merged = { ...base };
  for (const [id, entry] of Object.entries(overrides)) {
    merged[id] = { ...entry };
  }
  return merged;
}

export function resolveTicketFieldLayout(input: {
  settings: TicketFieldVisibilitySettings;
  customFields: TicketCustomFieldDefinition[];
}): ResolvedTicketFieldLayout {
  const saved = parseTicketFieldVisibility(input.settings.ticket_field_visibility);
  const base = mergeVisibility(DEFAULT_CORE_VISIBILITY, saved);

  for (const field of input.customFields) {
    const id = customFieldId(field.id);
    if (!base[id]) {
      base[id] = { ...DEFAULT_CUSTOM_FIELD_VISIBILITY };
    }
  }

  const visibility = enforceTitleInvariant(base);

  const coreCatalog: TicketFieldCatalogEntry[] = Object.values(
    CORE_TICKET_FIELD_IDS,
  ).map((id) => ({
    id,
    label: CORE_TICKET_FIELD_LABELS[id] ?? id,
    kind: "core" as const,
    locked: id === CORE_TICKET_FIELD_IDS.title,
    showOnCard: visibility[id]?.showOnCard ?? false,
    showInTicket: visibility[id]?.showInTicket ?? false,
  }));

  const customCatalog: TicketFieldCatalogEntry[] = [...input.customFields]
    .sort((a, b) => a.position - b.position)
    .map((field) => {
      const id = customFieldId(field.id);
      const entry = visibility[id] ?? DEFAULT_CUSTOM_FIELD_VISIBILITY;
      return {
        id,
        label: field.label,
        kind: "custom" as const,
        key: field.key,
        type: field.type,
        position: field.position,
        required: field.required,
        showOnCard: entry.showOnCard,
        showInTicket: entry.showInTicket,
      };
    });

  return {
    catalog: [...coreCatalog, ...customCatalog],
    visibility,
  };
}

export function isFieldVisibleOnCard(
  layout: ResolvedTicketFieldLayout,
  fieldId: string,
): boolean {
  return layout.visibility[fieldId]?.showOnCard ?? false;
}

export function isFieldVisibleInTicket(
  layout: ResolvedTicketFieldLayout,
  fieldId: string,
): boolean {
  return layout.visibility[fieldId]?.showInTicket ?? false;
}

export type TicketFieldSurface = "card" | "ticket";

export function isTicketFieldVisible(
  layout: ResolvedTicketFieldLayout | null | undefined,
  fieldId: string,
  surface: TicketFieldSurface,
  fallback = true,
): boolean {
  if (!layout) return fallback;
  return surface === "card"
    ? isFieldVisibleOnCard(layout, fieldId)
    : isFieldVisibleInTicket(layout, fieldId);
}

export function resolveCoreTicketFieldVisibility(
  layout: ResolvedTicketFieldLayout | null | undefined,
  surface: TicketFieldSurface,
): Record<CoreTicketFieldId, boolean> {
  return Object.fromEntries(
    Object.values(CORE_TICKET_FIELD_IDS).map((id) => [
      id,
      isTicketFieldVisible(layout, id, surface),
    ]),
  ) as Record<CoreTicketFieldId, boolean>;
}

export function resolveVisibleTicketCustomFields(
  layout: ResolvedTicketFieldLayout | null | undefined,
  surface: TicketFieldSurface,
): TicketCustomFieldDefinition[] {
  if (!layout) return [];

  return layout.catalog.flatMap((entry) => {
    if (entry.kind !== "custom" || !entry.key || !entry.type) return [];
    if (!isTicketFieldVisible(layout, entry.id, surface, false)) return [];

    const id = parseCustomFieldId(entry.id);
    if (!id) return [];

    return [
      {
        id,
        key: entry.key,
        label: entry.label,
        type: entry.type,
        position: entry.position ?? 0,
        required: entry.required,
      },
    ];
  });
}

export function buildVisibilityPatch(
  catalog: TicketFieldCatalogEntry[],
): TicketFieldVisibility {
  const patch: TicketFieldVisibility = {};
  for (const entry of catalog) {
    patch[entry.id] = {
      showOnCard: entry.showOnCard,
      showInTicket: entry.showInTicket,
    };
  }
  return enforceTitleInvariant(patch);
}

export function normalizeVisibilityPatch(
  patch: TicketFieldVisibility,
): TicketFieldVisibility {
  const normalized: TicketFieldVisibility = {};
  for (const [id, entry] of Object.entries(patch)) {
    if (!isVisibilityEntry(entry)) continue;
    if (!CORE_TICKET_FIELD_ID_SET.has(id) && !isCustomFieldId(id)) continue;
    normalized[id] = { ...entry };
  }
  return enforceTitleInvariant(normalized);
}

export function mergeTicketFieldVisibilityPatch(
  saved: unknown,
  patch: TicketFieldVisibility,
): TicketFieldVisibility {
  return enforceTitleInvariant(
    mergeVisibility(
      parseTicketFieldVisibility(saved),
      normalizeVisibilityPatch(patch),
    ),
  );
}
