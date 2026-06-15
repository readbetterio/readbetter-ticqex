import type { z } from "zod";
import {
  boardLaneOrderSchema,
  boardMoveTicketSchema,
  commentInputSchema,
  commentUpdateSchema,
  createApiKeySchema,
  createContactSchema,
  createCustomFieldSchema,
  createEmailSnippetSchema,
  createStatusSchema,
  createTagSchema,
  createTicketSchema,
  deleteStatusSchema,
  messageInputSchema,
  patchSettingsSchema,
  reorderCustomFieldsSchema,
  reorderStatusesSchema,
  seedManualLaneOrdersSchema,
  sendDraftSchema,
  toggleMessageReadSchema,
  updateContactSchema,
  updateCustomFieldSchema,
  updateStatusSchema,
  updateTagSchema,
  updateTicketSchema,
} from "@server/lib/validation/schemas";

export type RequestBodyKind =
  | { kind: "json"; schema: z.ZodType }
  | { kind: "multipart" }
  | { kind: "optional-json"; schema: z.ZodType };

/** REST request bodies keyed by operation name. */
export const REQUEST_BODY_BY_OPERATION: Record<string, RequestBodyKind> = {
  ticqex_create_ticket: { kind: "json", schema: createTicketSchema },
  ticqex_update_ticket: { kind: "json", schema: updateTicketSchema },
  ticqex_create_ticket_message: { kind: "json", schema: messageInputSchema },
  ticqex_create_ticket_comment: { kind: "json", schema: commentInputSchema },
  ticqex_update_ticket_comment: { kind: "json", schema: commentUpdateSchema },
  ticqex_create_ticket_draft: { kind: "json", schema: messageInputSchema },
  ticqex_update_ticket_draft: { kind: "json", schema: messageInputSchema },
  ticqex_send_ticket_draft: { kind: "json", schema: sendDraftSchema },
  ticqex_set_message_read: { kind: "json", schema: toggleMessageReadSchema },
  ticqex_stage_ticket_attachment_upload: { kind: "multipart" },
  ticqex_set_board_lane_order: { kind: "json", schema: boardLaneOrderSchema },
  ticqex_seed_manual_board_orders: {
    kind: "json",
    schema: seedManualLaneOrdersSchema,
  },
  ticqex_move_ticket_on_board: { kind: "json", schema: boardMoveTicketSchema },
  ticqex_create_contact: { kind: "json", schema: createContactSchema },
  ticqex_update_contact: { kind: "json", schema: updateContactSchema },
  ticqex_create_tag: { kind: "json", schema: createTagSchema },
  ticqex_update_tag: { kind: "json", schema: updateTagSchema },
  ticqex_create_status: { kind: "json", schema: createStatusSchema },
  ticqex_update_status: { kind: "json", schema: updateStatusSchema },
  ticqex_delete_status: { kind: "optional-json", schema: deleteStatusSchema },
  ticqex_reorder_statuses: { kind: "json", schema: reorderStatusesSchema },
  ticqex_create_custom_field: { kind: "json", schema: createCustomFieldSchema },
  ticqex_update_custom_field: { kind: "json", schema: updateCustomFieldSchema },
  ticqex_reorder_custom_fields: {
    kind: "json",
    schema: reorderCustomFieldsSchema,
  },
  ticqex_patch_settings: { kind: "json", schema: patchSettingsSchema },
  ticqex_create_email_snippet: { kind: "json", schema: createEmailSnippetSchema },
  ticqex_create_api_key: { kind: "json", schema: createApiKeySchema },
};

export function listOperationsWithRequestBodies(): string[] {
  return Object.keys(REQUEST_BODY_BY_OPERATION);
}
