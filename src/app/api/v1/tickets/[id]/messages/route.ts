import { NextRequest } from "next/server";
import { jsonData } from "@server/lib/response";
import { withAuth, parseJsonBody } from "@server/lib/route-handler";
import { messageInputSchema, parseBody } from "@server/lib/validation/schemas";
import {
  createAgentReply,
  listEnrichedMessages,
} from "@server/services/messages";
import { enqueueChannelOutbound } from "@server/channels/email/background";
import { isChannelOperational } from "@server/config/channel-gate";
import { ApiError } from "@server/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return withAuth(request, async (auth) => {
    const { id } = await params;
    return jsonData(await listEnrichedMessages(id, auth.userId));
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  return withAuth(request, async (auth) => {
    const { id } = await params;
    const body = parseBody(messageInputSchema, await parseJsonBody(request));
    const { message, shouldSendEmail } = await createAgentReply(
      id,
      {
        body: body.body,
        channel: body.channel ?? "admin",
        email: body.email,
      },
      auth,
    );

    if (shouldSendEmail) {
      if (!isChannelOperational("email")) {
        throw ApiError.serviceUnavailable(
          "Email channel is disabled or integration is not configured",
        );
      }
      enqueueChannelOutbound("email", message.id);
    }

    return jsonData(message, 201);
  });
}
