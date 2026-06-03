"use client";

import { useCallback, useMemo, useState } from "react";
import {
  getCustomFieldOperators,
  getScalarOperators,
  getTagOperators,
  getUnreadOperators,
  upsertFilterCondition,
  type FilterOperator,
  type TicketFilter,
} from "@shared/ticket-filter";
import { buildConditionFromDraft } from "./filter-condition-draft";
import type { FilterField } from "./filter-types";
import { useBoardFilterOptions } from "./use-board-filter-options";

export function useFilterDraft(
  filter: TicketFilter,
  onFilterChange: (filter: TicketFilter) => void,
  onApplied: () => void,
) {
  const [field, setField] = useState<FilterField | "">("");
  const [operator, setOperator] = useState<FilterOperator | "">("");
  const [customFieldKey, setCustomFieldKey] = useState("");
  const [singleValue, setSingleValue] = useState("");
  const [multiValues, setMultiValues] = useState<string[]>([]);
  const [customValue, setCustomValue] = useState("");
  const [customMultiValues, setCustomMultiValues] = useState<string[]>([]);
  const [unreadValue, setUnreadValue] = useState(true);

  // Fetch options eagerly when a filter is already active (so chips resolve
  // names), and on demand once the filter UI is opened.
  const [requested, setRequested] = useState(false);
  const { contacts, assignees, tags, customFields } = useBoardFilterOptions(
    requested || filter.length > 0,
  );

  const loadOptions = useCallback(async () => {
    setRequested(true);
  }, []);

  const selectedCustomField = customFields.find((f) => f.key === customFieldKey);

  const availableOperators = useMemo(() => {
    if (!field) return [];
    if (field === "tag") return getTagOperators();
    if (field === "unread") return getUnreadOperators();
    if (field === "ticket_field") {
      return selectedCustomField
        ? getCustomFieldOperators(selectedCustomField.type)
        : [];
    }
    return getScalarOperators(field);
  }, [field, selectedCustomField]);

  const effectiveOperator =
    operator && availableOperators.includes(operator)
      ? operator
      : (availableOperators[0] ?? "");

  const userLabels = new Map(assignees.map((u) => [u.id, u.username]));
  const contactLabels = new Map(contacts.map((c) => [c.id, c.username]));
  const customFieldLabels = new Map(customFields.map((f) => [f.key, f.label]));

  function resetDraft() {
    setField("");
    setOperator("");
    setCustomFieldKey("");
    setSingleValue("");
    setMultiValues([]);
    setCustomValue("");
    setCustomMultiValues([]);
    setUnreadValue(true);
  }

  function handleFieldChange(nextField: FilterField) {
    setField(nextField);
    setOperator("");
    setCustomFieldKey("");
    setSingleValue("");
    setMultiValues([]);
    setCustomValue("");
    setCustomMultiValues([]);
  }

  function handleOperatorChange(nextOperator: FilterOperator) {
    setOperator(nextOperator);
    setSingleValue("");
    setMultiValues([]);
    setCustomValue("");
    setCustomMultiValues([]);
  }

  function toggleMultiValue(
    value: string,
    selected: string[],
    setSelected: (v: string[]) => void,
  ) {
    setSelected(
      selected.includes(value)
        ? selected.filter((entry) => entry !== value)
        : [...selected, value],
    );
  }

  function handleApply() {
    const condition = buildConditionFromDraft({
      field,
      operator: effectiveOperator,
      customFieldKey,
      selectedCustomField,
      singleValue,
      multiValues,
      customValue,
      customMultiValues,
      unreadValue,
    });
    if (!condition) return;
    onFilterChange(upsertFilterCondition(filter, condition));
    resetDraft();
    onApplied();
  }

  const showOperator = Boolean(field && (field !== "ticket_field" || customFieldKey));

  return {
    loadOptions,
    userLabels,
    contactLabels,
    customFieldLabels,
    field,
    operator: effectiveOperator,
    customFieldKey,
    setCustomFieldKey,
    customFields,
    selectedCustomField,
    showOperator,
    availableOperators,
    assignees,
    contacts,
    tags,
    singleValue,
    setSingleValue,
    multiValues,
    setMultiValues,
    customValue,
    setCustomValue,
    customMultiValues,
    setCustomMultiValues,
    unreadValue,
    setUnreadValue,
    resetDraft,
    handleFieldChange,
    handleOperatorChange,
    toggleMultiValue,
    handleApply,
  };
}
