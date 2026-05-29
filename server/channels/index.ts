import type { ChannelDefinition, ChannelKey } from "@server/channels/types";
import { emailChannel } from "@server/channels/email/channel";
import { createRegistry } from "@shared/registry";

export type {
  ChannelDefinition,
  ChannelKey,
  TicketCardSurface,
} from "@server/channels/types";
export type { IntegrationKey } from "@shared/ticqex-keys";
export { buildTicketCardSurface } from "@shared/channels/card-surface";
export {
  findMissingRequiredFields,
  isFieldLocked,
  isFieldVisible,
  policyAppliesWhen,
} from "@shared/channels/field-policy";
export {
  assertChannelFields,
  assertChannelFieldUpdatesAllowed,
  assertChannelReadyToSend,
  assertSendRecipientMatchesLockedFields,
  getMissingChannelFields,
} from "@server/channels/field-enforcement";
export {
  getChannelIntegrationEmail,
} from "@server/channels/runtime";
export { emailChannel } from "@server/channels/email/channel";

const channels = createRegistry<ChannelKey, ChannelDefinition>({
  email: emailChannel as ChannelDefinition,
});

export const channelRegistry = channels.registry;
export const channelKeys = channels.keys;

export const listChannelKeys = channels.listKeys;
export const getChannelDefinition = channels.get;
export const listChannelDefinitions = channels.list;
