export type UserRole = "admin" | "agent";

export type TicketKind = "task" | "conversation";

export type TicketChannel = "email";

export type CommentAuthorType = "agent" | "api_key";

export type CommentDbRow = {
  id: string;
  ticket_id: string;
  body: string;
  author_type: CommentAuthorType;
  author_id: string | null;
  api_key_id: string | null;
  created_at: string;
};

export type MessageDbRow = {
  id: string;
  ticket_id: string;
  body: string;
  visibility: "public" | "internal";
  author_type: "contact" | "agent" | "system";
  author_id: string | null;
  channel: "email" | "api" | "admin";
  email_message_id: string | null;
  email_in_reply_to: string | null;
  created_at: string;
  email_from: string | null;
  email_to: string[];
  email_cc: string[];
  email_subject: string | null;
  email_body_html: string | null;
  email_delivery_status: string | null;
};

export type MessageExternalRefDbRow = {
  id: string;
  message_id: string;
  provider: string;
  integration_key: string;
  direction: "inbound" | "outbound";
  ref_type: string;
  external_id: string;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type { ActivityDbRow as ActivityEventDbRow } from "@shared/activity/types";
