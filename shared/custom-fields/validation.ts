import type { CustomFieldType } from "./types";

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function slugifyLabelToKey(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  if (!slug) return "";
  return KEY_PATTERN.test(slug) ? slug : slug.replace(/^[^a-z]+/, "");
}

export function isValidFieldKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

export function parseSelectOptions(
  options: Record<string, unknown> | null | undefined,
): string[] {
  if (!options || !Array.isArray(options.values)) return [];
  return options.values
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

export function normalizeSelectOptions(values: string[]): {
  values: string[];
} {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(value);
  }
  return { values: normalized };
}

export function validateDefinitionOptions(
  type: CustomFieldType,
  options: Record<string, unknown> | null | undefined,
): string | null {
  if (type === "select") {
    const values = parseSelectOptions(options);
    if (values.length === 0) {
      return "Select fields require at least one option value.";
    }
    return null;
  }
  if (options && Object.keys(options).length > 0 && type !== "json") {
    return `Options are not supported for ${type} fields.`;
  }
  return null;
}

function parseBooleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function parseNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseDateValue(value: unknown): string | null {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return value;
}

function parseUrlValue(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function parseJsonValue(value: unknown): Record<string, unknown> | null {
  if (value === null) return null;
  if (typeof value === "object" && !Array.isArray(value) && value !== null) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export type CoercedCustomFieldValue =
  | { kind: "clear" }
  | { kind: "value"; value: unknown };

/** Validates and coerces a payload value for storage. */
export function coerceCustomFieldValue(
  type: CustomFieldType,
  value: unknown,
  options: Record<string, unknown> | null | undefined,
): CoercedCustomFieldValue {
  if (value === null || value === undefined || value === "") {
    return { kind: "clear" };
  }

  switch (type) {
    case "number": {
      const parsed = parseNumberValue(value);
      if (parsed === null) {
        throw new Error("Invalid number value");
      }
      return { kind: "value", value: parsed };
    }
    case "date": {
      const parsed = parseDateValue(value);
      if (parsed === null) {
        throw new Error("Invalid date value (expected YYYY-MM-DD)");
      }
      return { kind: "value", value: parsed };
    }
    case "boolean": {
      const parsed = parseBooleanValue(value);
      if (parsed === null) {
        throw new Error("Invalid boolean value");
      }
      return { kind: "value", value: parsed };
    }
    case "select": {
      const str = String(value).trim();
      const allowed = parseSelectOptions(options);
      if (!allowed.includes(str)) {
        throw new Error("Value is not an allowed select option");
      }
      return { kind: "value", value: str };
    }
    case "url": {
      const parsed = parseUrlValue(value);
      if (parsed === null) {
        throw new Error("Invalid URL value");
      }
      return { kind: "value", value: parsed };
    }
    case "json": {
      const parsed = parseJsonValue(value);
      if (parsed === null) {
        throw new Error("Invalid JSON value (expected an object)");
      }
      return { kind: "value", value: parsed };
    }
    case "text":
    default:
      return { kind: "value", value: String(value) };
  }
}
