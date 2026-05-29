import { handleEmailDeliveryEvent } from "@server/services/email-delivery";
import type { ChannelDeliveryEvent } from "@server/channels/types";
import type {
  EmailDeliveryEvent,
  EmailDeliveryEventResult,
} from "@server/channels/email/types";

export const emailDeliveryHandler = {
  async handle(
    event: ChannelDeliveryEvent<EmailDeliveryEvent>,
  ): Promise<EmailDeliveryEventResult> {
    return handleEmailDeliveryEvent(event.payload);
  },
};
