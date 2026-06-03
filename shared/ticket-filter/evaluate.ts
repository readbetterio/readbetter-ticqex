import { parseMultiselectValue } from "@shared/custom-fields";
import {
  normalizeCondition,
  type FilterOperator,
  type TicketFilter,
  type TicketFilterCondition,
} from "./schema";

export type TicketFilterMatchTicket = {
  kind: string;
  channel: string | null;
  origin?: string | null;
  assignee_id: string | null;
  contact_id: string | null;
  custom_fields: Record<string, unknown>;
  tags: { name: string }[];
  unread_count: number;
};

export function customFieldCandidateValues(
  op: FilterOperator,
  value?: string | boolean | number,
  values?: (string | number)[],
): string[] {
  if (op === "in" || op === "nin") return (values ?? []).map(String);
  if (value === undefined) return [];
  return [String(value)];
}

export function matchesMultiselectCustomField(
  actual: unknown,
  op: FilterOperator,
  value?: string | boolean | number,
  values?: (string | number)[],
): boolean {
  const selected = parseMultiselectValue(actual);
  const candidates = customFieldCandidateValues(op, value, values);

  switch (op) {
    case "empty":
      return selected.length === 0;
    case "not_empty":
      return selected.length > 0;
    case "eq":
    case "in":
      return candidates.some((candidate) => selected.includes(candidate));
    case "neq":
    case "nin":
      return !candidates.some((candidate) => selected.includes(candidate));
    default:
      return false;
  }
}

export function matchesScalar(
  actual: string | null | undefined,
  op: FilterOperator,
  value?: string,
  values?: string[],
): boolean {
  switch (op) {
    case "empty":
      return actual == null || actual === "";
    case "not_empty":
      return actual != null && actual !== "";
    case "eq":
      return actual === value;
    case "neq":
      return actual !== value;
    case "in":
      return values?.includes(actual ?? "") ?? false;
    case "nin":
      return !values?.includes(actual ?? "");
    default:
      return false;
  }
}

export function matchesCustomField(
  actual: unknown,
  op: FilterOperator,
  value?: string | boolean | number,
  values?: (string | number)[],
): boolean {
  if (Array.isArray(actual)) {
    return matchesMultiselectCustomField(actual, op, value, values);
  }

  const text = actual == null ? "" : String(actual);

  switch (op) {
    case "empty":
      return actual == null || text === "";
    case "not_empty":
      return actual != null && text !== "";
    case "eq":
      if (typeof value === "boolean") return actual === value;
      if (typeof value === "number") return Number(actual) === value;
      return text === String(value);
    case "neq":
      if (typeof value === "boolean") return actual !== value;
      if (typeof value === "number") return Number(actual) !== value;
      return text !== String(value);
    case "in":
      return values?.some((candidate) => String(candidate) === text) ?? false;
    case "nin":
      return !(values?.some((candidate) => String(candidate) === text) ?? false);
    case "contains":
      return text.toLowerCase().includes(String(value).toLowerCase());
    case "not_contains":
      return !text.toLowerCase().includes(String(value).toLowerCase());
    default:
      return false;
  }
}

export function evaluateCondition(
  ticket: TicketFilterMatchTicket,
  condition: TicketFilterCondition,
): boolean {
  const normalized = normalizeCondition(condition);

  switch (normalized.field) {
    case "assignee_id":
      if (normalized.op === "empty") return ticket.assignee_id == null;
      if (normalized.op === "not_empty") return ticket.assignee_id != null;
      return matchesScalar(
        ticket.assignee_id,
        normalized.op,
        normalized.value,
        normalized.values,
      );
    case "contact_id":
      return matchesScalar(
        ticket.contact_id,
        normalized.op,
        normalized.value,
        normalized.values,
      );
    case "kind":
      return matchesScalar(ticket.kind, normalized.op, normalized.value, normalized.values);
    case "channel":
      return matchesScalar(ticket.channel, normalized.op, normalized.value, normalized.values);
    case "origin":
      return matchesScalar(
        ticket.origin ?? null,
        normalized.op,
        normalized.value,
        normalized.values,
      );
    case "tag": {
      const names = new Set(ticket.tags.map((t) => t.name));
      if (normalized.op === "nin") {
        return !normalized.values.some((name) => names.has(name));
      }
      return normalized.values.some((name) => names.has(name));
    }
    case "unread": {
      const hasUnread = ticket.unread_count > 0;
      return normalized.op === "eq"
        ? hasUnread === normalized.value
        : hasUnread !== normalized.value;
    }
    case "ticket_field":
      return matchesCustomField(
        ticket.custom_fields[normalized.key],
        normalized.op,
        normalized.value,
        normalized.values,
      );
    default:
      return false;
  }
}

export function ticketMatchesFilter(
  ticket: TicketFilterMatchTicket,
  filter: TicketFilter,
): boolean {
  if (filter.length === 0) return true;
  return filter.every((condition) => evaluateCondition(ticket, condition));
}
