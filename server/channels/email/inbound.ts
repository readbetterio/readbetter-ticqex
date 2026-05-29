import type { ChannelInboundEvent } from "@server/channels/types";
import type { ParsedEmail } from "@server/channels/email/types";
import { processInboundEmail } from "@server/services/email-inbound";

export const emailInboundHandler = {
  async handle(
    event: ChannelInboundEvent<ParsedEmail>,
  ): Promise<void> {
    await processInboundEmail(event.payload);
  },
};
