import type { CustomFieldType } from "./types";

export type CustomFieldTypeMeta = {
  type: CustomFieldType;
  label: string;
  description: string;
  advanced?: boolean;
  supportsSelectOptions?: boolean;
};

export const CUSTOM_FIELD_TYPE_REGISTRY: Record<
  CustomFieldType,
  CustomFieldTypeMeta
> = {
  text: {
    type: "text",
    label: "Text",
    description: "Single-line text value.",
  },
  number: {
    type: "number",
    label: "Number",
    description: "Numeric value stored for filtering and reporting.",
  },
  date: {
    type: "date",
    label: "Date",
    description: "Calendar date (YYYY-MM-DD).",
  },
  boolean: {
    type: "boolean",
    label: "True / False",
    description: "True or false flag.",
  },
  select: {
    type: "select",
    label: "Single select",
    description: "One value from a predefined list.",
    supportsSelectOptions: true,
  },
  url: {
    type: "url",
    label: "URL",
    description: "Web link validated as a URL.",
  },
  json: {
    type: "json",
    label: "JSON",
    description: "Structured JSON object for advanced integrations.",
    advanced: true,
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
