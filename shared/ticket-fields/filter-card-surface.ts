import type { TicketCardSurface } from "@shared/channels";
import { CORE_TICKET_FIELD_IDS, customFieldId } from "./ids";
import { isFieldVisibleOnCard } from "./resolve";
import type {
  ResolvedTicketFieldLayout,
  TicketCustomFieldDefinition,
} from "./types";

const MAX_CARD_CHIPS = 2;

function chipFieldId(
  chip: TicketCardSurface["chips"][number],
  customFields: TicketCustomFieldDefinition[],
): string | null {
  if (chip.fieldId) return chip.fieldId;
  if (!chip.sourceKey) return null;

  const customField = customFields.find((field) => field.key === chip.sourceKey);
  if (customField) return customFieldId(customField.id);

  return null;
}

export function filterTicketCardSurface(
  surface: TicketCardSurface,
  layout: ResolvedTicketFieldLayout,
  customFields: TicketCustomFieldDefinition[],
): TicketCardSurface {
  const showPreview = isFieldVisibleOnCard(
    layout,
    CORE_TICKET_FIELD_IDS.preview,
  );

  const chips = surface.chips
    .filter((chip) => {
      const fieldId = chipFieldId(chip, customFields);
      if (!fieldId) return true;
      return isFieldVisibleOnCard(layout, fieldId);
    })
    .slice(0, MAX_CARD_CHIPS);

  return {
    ...surface,
    preview: showPreview ? surface.preview : "",
    chips,
  };
}
