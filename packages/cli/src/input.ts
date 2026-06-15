import type { QueryParams } from "@ticqex/api-client";
import type { OperationDefinition } from "./command-catalog.js";
import { CliUsageError } from "./output.js";

const RESERVED_OPTION_KEYS = new Set([
  "instance",
  "apiKey",
  "api-key",
  "json",
  "input",
]);

export type ParsedInput = Record<string, unknown>;

export function parseInputJson(inputJson: string | undefined): ParsedInput {
  if (!inputJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(inputJson) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new CliUsageError("--input must be a JSON object");
    }
    return parsed as ParsedInput;
  } catch (error) {
    if (error instanceof CliUsageError) {
      throw error;
    }
    throw new CliUsageError("Invalid JSON passed to --input");
  }
}

function kebabToCamel(key: string): string {
  return key.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function normalizeFlagKey(key: string): string {
  return camelToSnake(kebabToCamel(key));
}

export function mergeInput(
  inputJson: string | undefined,
  flags: Record<string, unknown>,
): ParsedInput {
  const base = parseInputJson(inputJson);
  const merged: ParsedInput = { ...base };

  for (const [rawKey, value] of Object.entries(flags)) {
    if (value === undefined) {
      continue;
    }
    const key = normalizeFlagKey(rawKey);
    if (RESERVED_OPTION_KEYS.has(rawKey) || RESERVED_OPTION_KEYS.has(key)) {
      continue;
    }
    merged[key] = value;
  }

  return merged;
}

function flattenCustomFieldQuery(
  input: ParsedInput,
  query: QueryParams,
): void {
  const customFields = input.custom_fields;
  if (
    typeof customFields !== "object" ||
    customFields === null ||
    Array.isArray(customFields)
  ) {
    return;
  }

  for (const [fieldKey, fieldValue] of Object.entries(customFields)) {
    if (fieldValue !== undefined && fieldValue !== null) {
      query[`custom_fields.${fieldKey}`] = String(fieldValue);
    }
  }
}

function omitKeys(
  input: ParsedInput,
  keys: Iterable<string>,
): Record<string, unknown> {
  const omitted = new Set(keys);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!omitted.has(key)) {
      result[key] = value;
    }
  }
  return result;
}

export type BuiltRequest = {
  path: string;
  query?: QueryParams;
  body?: unknown;
};

export function buildRequest(
  operation: OperationDefinition,
  input: ParsedInput,
): BuiltRequest {
  const path = operation.pathTemplate.replace(
    /:([a-z_]+)/g,
    (_match, paramName: string) => {
      const value = input[paramName];
      if (value === undefined || value === null || value === "") {
        throw new CliUsageError(`Missing required path parameter: ${paramName}`);
      }
      return encodeURIComponent(String(value));
    },
  );

  const query: QueryParams = {};
  for (const queryParam of operation.queryParams) {
    const value = input[queryParam];
    if (value !== undefined && value !== null && value !== "") {
      query[queryParam] = value as string | number | boolean;
    }
  }

  if (operation.name === "ticqex_list_tickets") {
    flattenCustomFieldQuery(input, query);
  }

  let body: unknown;
  if (operation.method === "GET" || operation.method === "DELETE") {
    if (operation.bodyKey === undefined) {
      body = undefined;
    } else if (operation.bodyKey === null) {
      const remainder = omitKeys(input, [...operation.pathParams, ...operation.queryParams, "custom_fields"]);
      body = Object.keys(remainder).length > 0 ? remainder : undefined;
    } else {
      body = input[operation.bodyKey];
    }
  } else {
    if (operation.bodyKey === null) {
      body = omitKeys(input, [...operation.pathParams, ...operation.queryParams, "custom_fields"]);
    } else if (operation.bodyKey) {
      body = input[operation.bodyKey];
    } else {
      body = undefined;
    }
  }

  const hasQuery = Object.keys(query).length > 0;
  return {
    path,
    query: hasQuery ? query : undefined,
    body,
  };
}
