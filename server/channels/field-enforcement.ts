import { ApiError } from "@server/lib/errors";
import { getChannelDefinition } from "@server/channels";
import {
  findMissingRequiredFields,
  isFieldLocked,
  isFieldValuePresent,
  resolvePolicyFieldValue,
  type FieldPolicyWhen,
  type FieldValueContext,
} from "@shared/channels/field-policy";

function formatMissingFields(
  missing: { key: string; label: string }[],
): string {
  return missing.map((field) => field.label).join(", ");
}

export function getMissingChannelFields(
  channelKey: string,
  when: FieldPolicyWhen,
  context: FieldValueContext,
): { key: string; label: string }[] {
  const channel = getChannelDefinition(channelKey);
  if (!channel) return [];

  return findMissingRequiredFields(channel.fields, context, when);
}

export function assertChannelFields(
  channelKey: string,
  when: FieldPolicyWhen,
  context: FieldValueContext,
): void {
  const missing = getMissingChannelFields(channelKey, when, context);
  if (missing.length === 0) return;

  throw ApiError.badRequest(
    `Missing required field(s): ${formatMissingFields(missing)}`,
  );
}

/** Locked fields must be present before an outbound channel send. */
export function assertChannelReadyToSend(
  channelKey: string,
  context: FieldValueContext,
): void {
  const channel = getChannelDefinition(channelKey);
  if (!channel) return;

  assertChannelFields(channelKey, "on_send", context);

  for (const policy of channel.fields) {
    if (!isFieldLocked(policy, "on_send")) continue;

    const value = resolvePolicyFieldValue(policy.key, context);
    if (!isFieldValuePresent(value)) {
      throw ApiError.badRequest(
        `Cannot send: ${policy.label} is missing`,
      );
    }
  }
}

export function assertSendRecipientMatchesLockedFields(
  channelKey: string,
  context: FieldValueContext,
  recipients: string[],
): void {
  const channel = getChannelDefinition(channelKey);
  if (!channel) return;

  const primaryRecipient = recipients[0]?.trim().toLowerCase();
  if (!primaryRecipient) {
    throw ApiError.badRequest("Cannot send: recipient is missing");
  }

  for (const policy of channel.fields) {
    if (policy.key !== "contact_address" || !isFieldLocked(policy, "on_send")) {
      continue;
    }

    const contactAddress = String(
      resolvePolicyFieldValue(policy.key, context) ?? "",
    )
      .trim()
      .toLowerCase();

    if (contactAddress && primaryRecipient !== contactAddress) {
      throw ApiError.badRequest(
        `${policy.label} is locked and must match the outbound recipient`,
      );
    }
  }
}

export function assertChannelFieldUpdatesAllowed(
  channelKey: string,
  when: FieldPolicyWhen,
  current: FieldValueContext,
  next: FieldValueContext,
): void {
  const channel = getChannelDefinition(channelKey);
  if (!channel) return;

  for (const policy of channel.fields) {
    if (!isFieldLocked(policy, when)) continue;

    const currentValue = resolvePolicyFieldValue(policy.key, current);
    const nextValue = resolvePolicyFieldValue(policy.key, next);

    if (String(currentValue ?? "") !== String(nextValue ?? "")) {
      throw ApiError.badRequest(`${policy.label} cannot be changed`);
    }
  }
}
