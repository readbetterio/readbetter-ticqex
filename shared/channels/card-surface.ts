import { emailCardSurface } from "./email/card";
import type {
  ChannelCardSurfaceBuilder,
  ChannelCardTicketContext,
  TicketCardSurface,
} from "./types";

const MAX_CARD_CHIPS = 2;

const channelCardBuilders: Record<string, ChannelCardSurfaceBuilder> = {
  email: emailCardSurface,
};

function buildDefaultCardSurface(
  context: ChannelCardTicketContext,
): TicketCardSurface {
  const chips = Object.entries(context.custom_fields)
    .filter(([, value]) => value != null && value !== "")
    .slice(0, MAX_CARD_CHIPS)
    .map(([key, value]) => ({ label: key, value: String(value) }));

  return {
    badges: [],
    warning_badges: [],
    preview: context.preview ?? "",
    chips,
  };
}

export function buildTicketCardSurface(
  context: ChannelCardTicketContext,
): TicketCardSurface {
  if (!context.channel) {
    return buildDefaultCardSurface(context);
  }

  const builder = channelCardBuilders[context.channel];
  if (!builder) {
    return buildDefaultCardSurface(context);
  }

  return builder.build(context);
}
