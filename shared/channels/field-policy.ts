import type { ChannelFieldPolicy } from "./types";

export type FieldPolicyWhen =
  | "on_create"
  | "on_update"
  | "on_send"
  | "always";

export type FieldValueContext = {
  contact_address?: string | null;
  custom_fields?: Record<string, unknown>;
};

export function policyAppliesWhen(
  expression: string | undefined,
  when: FieldPolicyWhen,
): boolean {
  if (!expression || expression === "always") return true;
  return expression === when;
}

export function resolvePolicyFieldValue(
  key: string,
  context: FieldValueContext,
): unknown {
  if (key === "contact_address") {
    return context.contact_address ?? null;
  }

  return context.custom_fields?.[key] ?? null;
}

export function isFieldValuePresent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function findMissingRequiredFields(
  policies: ChannelFieldPolicy[],
  context: FieldValueContext,
  when: FieldPolicyWhen,
): { key: string; label: string }[] {
  return policies
    .filter((policy) => policyAppliesWhen(policy.requiredWhen, when))
    .filter(
      (policy) =>
        !isFieldValuePresent(resolvePolicyFieldValue(policy.key, context)),
    )
    .map((policy) => ({ key: policy.key, label: policy.label }));
}

export function isFieldLocked(
  policy: ChannelFieldPolicy,
  when: FieldPolicyWhen,
): boolean {
  return policyAppliesWhen(policy.lockedWhen, when);
}

export function isFieldVisible(
  policy: ChannelFieldPolicy,
  when: FieldPolicyWhen,
): boolean {
  return policyAppliesWhen(policy.visibleWhen, when);
}

export function sortPoliciesByCardPriority(
  policies: ChannelFieldPolicy[],
): ChannelFieldPolicy[] {
  return [...policies].sort(
    (a, b) => (a.cardPriority ?? 99) - (b.cardPriority ?? 99),
  );
}
