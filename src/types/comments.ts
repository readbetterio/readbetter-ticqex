export type CommentThreadOrder = "oldest_first" | "newest_first";

export type TicketCommentAuthorType = "agent" | "api_key";

export type TicketComment = {
  id: string;
  ticket_id: string;
  body: string;
  author_type: TicketCommentAuthorType;
  author_id: string | null;
  api_key_id: string | null;
  author_label: string;
  created_at: string;
  can_manage: boolean;
};

export type TicketCommentsListMeta = {
  total: number;
  page: number;
  per_page: number;
};

export type TicketCommentsListResponse = {
  data: TicketComment[];
  meta: TicketCommentsListMeta;
};
