export const CUSTOM_FIELD_TYPES = [
  "text",
  "number",
  "date",
  "boolean",
  "select",
  "url",
  "json",
] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export type CustomFieldGroup = "ticket" | "contact";

export type SelectFieldOptions = {
  values: string[];
};

export type CustomFieldDefinitionOptions = SelectFieldOptions | null;

export type CustomFieldDefinition = {
  id: string;
  group: CustomFieldGroup;
  key: string;
  label: string;
  type: CustomFieldType;
  options: Record<string, unknown> | null;
  required: boolean;
  position: number;
  created_at?: string;
};
