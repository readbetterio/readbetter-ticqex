import type { FilterOperator } from "@shared/ticket-filter/schema";
import { getCustomFieldTypeMeta } from "./registry";

const DEFAULT_FILTER_OPERATORS: FilterOperator[] = [
  "eq",
  "neq",
  "empty",
  "not_empty",
];

export function getCustomFieldFilterOperators(type: string): FilterOperator[] {
  const operators = getCustomFieldTypeMeta(type)?.filterOperators;
  return operators ? [...operators] : DEFAULT_FILTER_OPERATORS;
}

export function usesMultiselectFilterSemantics(type: string): boolean {
  return getCustomFieldTypeMeta(type)?.filterValueMode === "multiselect";
}

export function usesOptionListFilterValues(type: string): boolean {
  const mode = getCustomFieldTypeMeta(type)?.filterValueMode;
  return mode === "optionList" || mode === "multiselect";
}
