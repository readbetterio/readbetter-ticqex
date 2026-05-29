import { after } from "next/server";
import { getChannelDefinition } from "@server/channels";
import { isChannelOperational } from "@server/config/channel-gate";
import type { ChannelKey } from "@server/channels/types";
import type { ParsedEmail } from "@server/channels/email/types";

type EmailInboundResolver = ParsedEmail | (() => ParsedEmail | Promise<ParsedEmail>);

function logChannelSkipped(channelKey: ChannelKey, reason: string): void {
  console.warn(`Channel "${channelKey}" skipped: ${reason}`);
}

export function enqueueChannelInbound(
  channelKey: ChannelKey,
  input: EmailInboundResolver,
): void {
  after(async () => {
    if (!isChannelOperational(channelKey)) {
      logChannelSkipped(channelKey, "channel disabled or integration not configured");
      return;
    }

    const channel = getChannelDefinition(channelKey);
    if (!channel) {
      logChannelSkipped(channelKey, "unknown channel");
      return;
    }

    try {
      const payload = typeof input === "function" ? await input() : input;
      await channel.inbound.handle({ payload });
    } catch (error) {
      console.error(`Inbound processing failed for channel ${channelKey}:`, error);
    }
  });
}

export function enqueueChannelOutbound(
  channelKey: ChannelKey,
  messageId: string,
): void {
  after(async () => {
    if (!isChannelOperational(channelKey)) {
      logChannelSkipped(channelKey, "channel disabled or integration not configured");
      return;
    }

    const channel = getChannelDefinition(channelKey);
    if (!channel) {
      logChannelSkipped(channelKey, "unknown channel");
      return;
    }

    try {
      await channel.outbound.send({ messageId });
    } catch (error) {
      console.error(
        `Outbound processing failed for channel ${channelKey}, message ${messageId}:`,
        error,
      );
    }
  });
}

/** @deprecated Use enqueueChannelInbound("email", parsed) */
export function enqueueInboundEmail(parsed: ParsedEmail): void {
  enqueueChannelInbound("email", parsed);
}

/** @deprecated Use enqueueChannelOutbound("email", messageId) */
export function enqueueOutboundEmail(messageId: string): void {
  enqueueChannelOutbound("email", messageId);
}
