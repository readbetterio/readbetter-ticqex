import { emailCardSurface } from "./email/card";
import type {
  ChannelCardSurfaceBuilder,
  ChannelCardTicketContext,
  TicketCardSurface,
} from "./types";

const channelCardBuilders: Record<string, ChannelCardSurfaceBuilder> = {
  email: emailCardSurface,
};

function buildCustomFieldChips(
  customFields: ChannelCardTicketContext["custom_fields"],
): TicketCardSurface["chips"] {
  return Object.entries(customFields)
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => ({
      sourceKey: key,
      label: key,
      value: String(value),
    }));
}

function appendCustomFieldChips(
  surface: TicketCardSurface,
  context: ChannelCardTicketContext,
): TicketCardSurface {
  const claimedSourceKeys = new Set(
    surface.chips.flatMap((chip) =>
      chip.sourceKey === undefined ? [] : [chip.sourceKey],
    ),
  );
  const chips = buildCustomFieldChips(context.custom_fields).filter(
    (chip) => !claimedSourceKeys.has(chip.sourceKey ?? ""),
  );

  return {
    ...surface,
    chips: [...surface.chips, ...chips],
  };
}

function buildDefaultCardSurface(
  context: ChannelCardTicketContext,
): TicketCardSurface {
  return {
    badges: [],
    warning_badges: [],
    preview: context.preview ?? "",
    chips: buildCustomFieldChips(context.custom_fields),
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

  return appendCustomFieldChips(builder.build(context), context);
}
