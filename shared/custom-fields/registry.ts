import type { FilterOperator } from "@shared/ticket-filter/schema";
import type { CustomFieldType } from "./types";

export type CustomFieldFilterValueMode =
  | "boolean"
  | "number"
  | "optionList"
  | "multiselect"
  | "text";

export type CustomFieldTypeMeta = {
  type: CustomFieldType;
  label: string;
  description: string;
  advanced?: boolean;
  supportsSelectOptions?: boolean;
  filterOperators: readonly FilterOperator[];
  filterValueMode: CustomFieldFilterValueMode;
};

export const CUSTOM_FIELD_TYPE_REGISTRY: Record<
  CustomFieldType,
  CustomFieldTypeMeta
> = {
  text: {
    type: "text",
    label: "Text",
    description: "Single-line text value.",
    filterOperators: ["eq", "neq", "contains", "not_contains", "empty", "not_empty"],
    filterValueMode: "text",
  },
  number: {
    type: "number",
    label: "Number",
    description: "Numeric value stored for filtering and reporting.",
    filterOperators: ["eq", "neq", "in", "nin", "empty", "not_empty"],
    filterValueMode: "number",
  },
  date: {
    type: "date",
    label: "Date",
    description: "Calendar date (YYYY-MM-DD).",
    filterOperators: ["eq", "neq", "empty", "not_empty"],
    filterValueMode: "text",
  },
  boolean: {
    type: "boolean",
    label: "True / False",
    description: "True or false flag.",
    filterOperators: ["eq", "neq", "empty", "not_empty"],
    filterValueMode: "boolean",
  },
  select: {
    type: "select",
    label: "Single select",
    description: "One value from a predefined list.",
    supportsSelectOptions: true,
    filterOperators: ["eq", "neq", "in", "nin", "empty", "not_empty"],
    filterValueMode: "optionList",
  },
  multiselect: {
    type: "multiselect",
    label: "Multi select",
    description: "Multiple values from a predefined list.",
    supportsSelectOptions: true,
    filterOperators: ["eq", "neq", "in", "nin", "empty", "not_empty"],
    filterValueMode: "multiselect",
  },
  url: {
    type: "url",
    label: "URL",
    description: "Web link validated as a URL.",
    filterOperators: ["eq", "neq", "contains", "not_contains", "empty", "not_empty"],
    filterValueMode: "text",
  },
  json: {
    type: "json",
    label: "JSON",
    description: "Structured JSON object for advanced integrations.",
    advanced: true,
    filterOperators: ["eq", "neq", "empty", "not_empty"],
    filterValueMode: "text",
  },
};

export const CUSTOM_FIELD_TYPE_LIST = Object.values(CUSTOM_FIELD_TYPE_REGISTRY);

export function getCustomFieldTypeMeta(
  type: string,
): CustomFieldTypeMeta | undefined {
  return CUSTOM_FIELD_TYPE_REGISTRY[type as CustomFieldType];
}

export function getCustomFieldTypeLabel(type: string): string {
  return getCustomFieldTypeMeta(type)?.label ?? type;
}
