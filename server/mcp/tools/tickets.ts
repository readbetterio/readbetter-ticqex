import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { enqueueChannelOutbound } from "@server/channels/email/background";
import { isChannelOperational } from "@server/config/channel-gate";
import { ApiError } from "@server/lib/errors";
import {
  createTicketMcpInputSchema,
  createTicketSchema,
  messageInputSchema,
  parseBody,
  sendDraftSchema,
  toggleMessageReadSchema,
  updateTicketSchema,
} from "@server/lib/validation/schemas";
import { getAttachmentSignedUrl } from "@server/services/attachment-uploads";
import {
  createAgentDraft,
  createAgentReply,
  deleteAgentDraft,
  listEnrichedDrafts,
  listEnrichedMessages,
  sendAgentDraft,
  updateAgentDraft,
} from "@server/services/messages";
import {
  markTicketMessagesRead,
  setMessageReadState,
} from "@server/services/message-reads";
import { getTicketContext } from "@server/services/ticket-context";
import {
  createTicket,
  deleteTicket,
  getTicket,
  getTicketSummary,
  listTickets,
  updateTicket,
} from "@server/services/tickets";
import {
  paginationInput,
  paramsFrom,
  registerAuthedTool,
  toolResult,
  uuid,
} from "../core";

export function registerTicketTools(server: McpServer) {
  registerAuthedTool(
    server,
    "ticqex_list_tickets",
    {
      title: "List Tickets",
      description: "List tickets using the same filters as GET /api/v1/tickets.",
      inputSchema: {
        ...paginationInput,
        status_id: uuid.optional(),
        assignee_id: uuid.optional(),
        customer_id: uuid.optional(),
        origin: z.string().optional(),
        kind: z.string().optional(),
        channel: z.string().optional(),
        tag: z.string().optional(),
        custom_fields: z.record(z.string(), z.string()).optional(),
      },
    },
    async (input) => toolResult(await listTickets(paramsFrom(input), { filters: {} })),
  );

  registerAuthedTool(
    server,
    "ticqex_create_ticket",
    {
      title: "Create Ticket",
      description:
        "Create a task ticket or an API-originated conversation ticket.",
      inputSchema: createTicketMcpInputSchema.shape,
    },
    async (input, auth) => {
      const mcpInput = parseBody(createTicketMcpInputSchema, input);
      return toolResult(await createTicket(parseBody(createTicketSchema, mcpInput), auth));
    },
  );

  registerAuthedTool(
    server,
    "ticqex_get_ticket",
    {
      title: "Get Ticket",
      description: "Get a ticket with messages when the ticket has a message thread.",
      inputSchema: { id: uuid },
    },
    async ({ id }, auth) => toolResult(await getTicket(id, auth.userId)),
  );

  registerAuthedTool(
    server,
    "ticqex_get_ticket_summary",
    {
      title: "Get Ticket Summary",
      description: "Get a ticket summary without loading the full message thread.",
      inputSchema: { id: uuid },
    },
    async ({ id }, auth) => toolResult(await getTicketSummary(id, auth.userId)),
  );

  registerAuthedTool(
    server,
    "ticqex_get_ticket_context",
    {
      title: "Get Ticket Context",
      description: "Get a markdown context export for a ticket.",
      inputSchema: { id: uuid },
    },
    async ({ id }) => toolResult({ markdown: await getTicketContext(id) }),
  );

  registerAuthedTool(
    server,
    "ticqex_update_ticket",
    {
      title: "Update Ticket",
      description: "Update ticket fields, tags, and custom fields.",
      inputSchema: { id: uuid, patch: updateTicketSchema },
    },
    async ({ id, patch }, auth) =>
      toolResult(
        await updateTicket(id, parseBody(updateTicketSchema, patch), {
          userId: auth.userId,
        }),
      ),
  );

  registerAuthedTool(
    server,
    "ticqex_delete_ticket",
    {
      title: "Delete Ticket",
      description: "Delete a ticket.",
      inputSchema: { id: uuid },
    },
    async ({ id }) => {
      await deleteTicket(id);
      return toolResult({ deleted: true });
    },
  );

  registerAuthedTool(
    server,
    "ticqex_list_ticket_messages",
    {
      title: "List Ticket Messages",
      description: "List public messages for a ticket.",
      inputSchema: { ticket_id: uuid },
    },
    async ({ ticket_id }, auth) =>
      toolResult(await listEnrichedMessages(ticket_id, auth.userId)),
  );

  registerAuthedTool(
    server,
    "ticqex_create_ticket_message",
    {
      title: "Create Ticket Message",
      description: "Create an agent reply on a ticket and enqueue outbound email when applicable.",
      inputSchema: { ticket_id: uuid, message: messageInputSchema },
    },
    async ({ ticket_id, message }, auth) => {
      const body = parseBody(messageInputSchema, message);
      const { message: created, shouldSendEmail } = await createAgentReply(
        ticket_id,
        { body: body.body, channel: body.channel ?? "admin", email: body.email },
        auth,
      );
      if (shouldSendEmail) {
        if (!isChannelOperational("email")) {
          throw ApiError.serviceUnavailable(
            "Email channel is disabled or integration is not configured",
          );
        }
        enqueueChannelOutbound("email", created.id);
      }
      return toolResult(created);
    },
  );

  registerAuthedTool(
    server,
    "ticqex_create_ticket_draft",
    {
      title: "Create Ticket Draft",
      description:
        "Save an agent reply as a draft without sending email. Uses the same payload as create ticket message.",
      inputSchema: { ticket_id: uuid, message: messageInputSchema },
    },
    async ({ ticket_id, message }, auth) => {
      const body = parseBody(messageInputSchema, message);
      const { message: created } = await createAgentDraft(
        ticket_id,
        { body: body.body, channel: body.channel ?? "admin", email: body.email },
        auth,
      );
      return toolResult(created);
    },
  );

  registerAuthedTool(
    server,
    "ticqex_list_ticket_drafts",
    {
      title: "List Ticket Drafts",
      description: "List unsent email drafts for a ticket.",
      inputSchema: { ticket_id: uuid },
    },
    async ({ ticket_id }) => toolResult(await listEnrichedDrafts(ticket_id)),
  );

  registerAuthedTool(
    server,
    "ticqex_update_ticket_draft",
    {
      title: "Update Ticket Draft",
      description: "Update a saved draft reply on a ticket.",
      inputSchema: {
        ticket_id: uuid,
        message_id: uuid,
        message: messageInputSchema,
      },
    },
    async ({ ticket_id, message_id, message }, auth) => {
      const body = parseBody(messageInputSchema, message);
      const { message: updated } = await updateAgentDraft(
        ticket_id,
        message_id,
        { body: body.body, email: body.email },
        auth,
      );
      return toolResult(updated);
    },
  );

  registerAuthedTool(
    server,
    "ticqex_send_ticket_draft",
    {
      title: "Send Ticket Draft",
      description: "Send a saved draft and enqueue outbound email.",
      inputSchema: {
        ticket_id: uuid,
        message_id: uuid,
        options: sendDraftSchema.optional(),
      },
    },
    async ({ ticket_id, message_id, options }, auth) => {
      const body = parseBody(sendDraftSchema, options ?? {});
      const { message: sent, shouldSendEmail } = await sendAgentDraft(
        ticket_id,
        message_id,
        body,
        auth,
      );
      if (shouldSendEmail) {
        if (!isChannelOperational("email")) {
          throw ApiError.serviceUnavailable(
            "Email channel is disabled or integration is not configured",
          );
        }
        enqueueChannelOutbound("email", sent.id);
      }
      return toolResult(sent);
    },
  );

  registerAuthedTool(
    server,
    "ticqex_delete_ticket_draft",
    {
      title: "Delete Ticket Draft",
      description: "Delete a saved draft reply.",
      inputSchema: { ticket_id: uuid, message_id: uuid },
    },
    async ({ ticket_id, message_id }, auth) =>
      toolResult(await deleteAgentDraft(ticket_id, message_id, auth)),
  );

  registerAuthedTool(
    server,
    "ticqex_mark_ticket_read",
    {
      title: "Mark Ticket Read",
      description: "Mark customer messages on a ticket as read for the API-key user.",
      inputSchema: { ticket_id: uuid },
    },
    async ({ ticket_id }, auth) =>
      toolResult(await markTicketMessagesRead(ticket_id, auth.userId)),
  );

  registerAuthedTool(
    server,
    "ticqex_set_message_read",
    {
      title: "Set Message Read State",
      description: "Set a customer message read state for the API-key user.",
      inputSchema: { ticket_id: uuid, message_id: uuid, read: z.boolean().optional() },
    },
    async ({ ticket_id, message_id, read }, auth) => {
      const body = parseBody(toggleMessageReadSchema, { read });
      const result = await setMessageReadState(message_id, auth.userId, body.read);
      if (result.ticket_id !== ticket_id) throw ApiError.notFound("Message not found on this ticket");
      return toolResult(result);
    },
  );

  registerAuthedTool(
    server,
    "ticqex_get_attachment_url",
    {
      title: "Get Attachment URL",
      description: "Create a signed URL for a message attachment.",
      inputSchema: {
        message_id: uuid,
        attachment_id: uuid,
        force_download: z.boolean().optional(),
      },
    },
    async ({ message_id, attachment_id, force_download }) =>
      toolResult({
        url: await getAttachmentSignedUrl(message_id, attachment_id, {
          forceDownload: force_download,
        }),
      }),
  );
}
