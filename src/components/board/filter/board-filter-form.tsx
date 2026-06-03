"use client";

import { FilterPopoverForm } from "./filter-popover-form";
import type { useFilterDraft } from "./use-filter-draft";

type FilterDraft = ReturnType<typeof useFilterDraft>;

export function BoardFilterForm({ draft }: { draft: FilterDraft }) {
  return (
    <FilterPopoverForm
      field={draft.field}
      onFieldChange={draft.handleFieldChange}
      customFieldKey={draft.customFieldKey}
      onCustomFieldKeyChange={draft.setCustomFieldKey}
      customFields={draft.customFields}
      selectedCustomField={draft.selectedCustomField}
      showOperator={draft.showOperator}
      operator={draft.operator}
      onOperatorChange={draft.handleOperatorChange}
      availableOperators={draft.availableOperators}
      assignees={draft.assignees}
      contacts={draft.contacts}
      tags={draft.tags}
      singleValue={draft.singleValue}
      onSingleValueChange={draft.setSingleValue}
      multiValues={draft.multiValues}
      onMultiValuesChange={draft.setMultiValues}
      onToggleMultiValue={(value) =>
        draft.toggleMultiValue(value, draft.multiValues, draft.setMultiValues)
      }
      customValue={draft.customValue}
      onCustomValueChange={draft.setCustomValue}
      customMultiValues={draft.customMultiValues}
      onCustomMultiValuesChange={draft.setCustomMultiValues}
      onToggleCustomMultiValue={(value) =>
        draft.toggleMultiValue(
          value,
          draft.customMultiValues,
          draft.setCustomMultiValues,
        )
      }
      unreadValue={draft.unreadValue}
      onUnreadValueChange={draft.setUnreadValue}
      onReset={draft.resetDraft}
      onApply={draft.handleApply}
    />
  );
}
