import { createAdminClient } from "@server/lib/supabase-admin";
import { ApiError } from "@server/lib/errors";
import { parsePagination } from "@server/lib/utils";
import {
  loadApiKeyActorSnapshots,
  loadStaffActorSnapshots,
} from "@server/domain/actor-snapshot";
import { loadTicketRow } from "@server/domain/ticket";
import { getSettings } from "@server/services/settings";
import { touchTicket } from "@server/services/ticket-touch";
import {
  recordCommentCreatedActivity,
  recordCommentDeletedActivity,
  recordCommentUpdatedActivity,
} from "@server/services/ticket-activity";
import type { AuthContext } from "@server/middleware/auth";
import type { CommentDbRow } from "@/types/database";

export type CommentOrder = "oldest_first" | "newest_first";

export const DELETED_API_KEY_AUTHOR_NAME = "Deleted API key";

export type EnrichedComment = {
  id: string;
  ticket_id: string;
  body: string;
  author_type: CommentDbRow["author_type"];
  author_id: string | null;
  api_key_id: string | null;
  author_label: string;
  created_at: string;
  can_manage: boolean;
};

function resolveAuthorFromAuth(auth: AuthContext): Pick<
  CommentDbRow,
  "author_type" | "author_id" | "api_key_id"
> {
  if (auth.type === "api_key") {
    if (!auth.apiKeyId) {
      throw ApiError.internal("API key context is missing apiKeyId");
    }
    return {
      author_type: "api_key",
      author_id: null,
      api_key_id: auth.apiKeyId,
    };
  }

  return {
    author_type: "agent",
    author_id: auth.userId,
    api_key_id: null,
  };
}

async function loadCommentOrder(): Promise<CommentOrder> {
  const settings = await getSettings();
  const order = settings.comment_thread_order as CommentOrder | undefined;
  return order === "newest_first" ? "newest_first" : "oldest_first";
}

type AgentAuthor = { username: string; email: string };

export function resolveCommentAuthorLabel(
  comment: Pick<CommentDbRow, "author_type" | "author_id" | "api_key_id">,
  agentAuthors: Map<string, AgentAuthor>,
  apiKeyNames: Map<string, { name: string; revoked_at: string | null }>,
): string {
  if (comment.author_type === "api_key") {
    if (!comment.api_key_id) return DELETED_API_KEY_AUTHOR_NAME;
    const key = apiKeyNames.get(comment.api_key_id);
    if (!key || key.revoked_at) return DELETED_API_KEY_AUTHOR_NAME;
    return key.name;
  }

  if (!comment.author_id) return "Agent";
  const agent = agentAuthors.get(comment.author_id);
  if (!agent) return "Agent";
  if (agent.username && agent.email) return `${agent.username} · ${agent.email}`;
  return agent.username || agent.email || "Agent";
}

export function canManageTicketComment(
  comment: Pick<CommentDbRow, "author_type" | "author_id" | "api_key_id">,
  auth: AuthContext,
): boolean {
  if (auth.type === "api_key") {
    return (
      comment.author_type === "api_key" && comment.api_key_id === auth.apiKeyId
    );
  }

  return comment.author_type === "agent" && comment.author_id === auth.userId;
}

function assertCanManageTicketComment(
  comment: CommentDbRow,
  auth: AuthContext,
) {
  if (!canManageTicketComment(comment, auth)) {
    throw ApiError.forbidden("You can only edit or delete your own comments");
  }
}

export async function enrichComments(
  rows: CommentDbRow[],
  auth?: AuthContext,
): Promise<EnrichedComment[]> {
  const agentIds = [
    ...new Set(
      rows
        .filter((row) => row.author_type === "agent" && row.author_id)
        .map((row) => row.author_id as string),
    ),
  ];
  const apiKeyIds = [
    ...new Set(
      rows
        .filter((row) => row.author_type === "api_key" && row.api_key_id)
        .map((row) => row.api_key_id as string),
    ),
  ];

  const [agentAuthors, apiKeyNames] = await Promise.all([
    loadStaffActorSnapshots(agentIds),
    loadApiKeyActorSnapshots(apiKeyIds),
  ]);

  return rows.map((row) => ({
    id: row.id,
    ticket_id: row.ticket_id,
    body: row.body,
    author_type: row.author_type,
    author_id: row.author_id,
    api_key_id: row.api_key_id,
    author_label: resolveCommentAuthorLabel(row, agentAuthors, apiKeyNames),
    created_at: row.created_at,
    can_manage: auth ? canManageTicketComment(row, auth) : false,
  }));
}

async function loadCommentForTicket(
  ticketId: string,
  commentId: string,
): Promise<CommentDbRow> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("ticket_comments")
    .select("*")
    .eq("id", commentId)
    .eq("ticket_id", ticketId)
    .maybeSingle();
  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound("Comment not found");
  return data;
}

export async function listTicketComments(
  ticketId: string,
  searchParams: URLSearchParams,
  auth?: AuthContext,
) {
  await loadTicketRow(ticketId);

  const { page, perPage, offset } = parsePagination(searchParams);
  const order = await loadCommentOrder();
  const ascending = order === "oldest_first";

  const db = createAdminClient();
  const { data, count, error } = await db
    .from("ticket_comments")
    .select("*", { count: "exact" })
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending })
    .order("id", { ascending })
    .range(offset, offset + perPage - 1);
  if (error) throw ApiError.internal(error.message);

  const comments = await enrichComments(data ?? [], auth);

  return {
    comments,
    total: count ?? 0,
    page,
    perPage,
    order,
  };
}

export async function createTicketComment(
  ticketId: string,
  input: { body: string },
  auth: AuthContext,
) {
  await loadTicketRow(ticketId);

  const db = createAdminClient();
  const { data, error } = await db
    .from("ticket_comments")
    .insert({
      ticket_id: ticketId,
      body: input.body,
      ...resolveAuthorFromAuth(auth),
    })
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);

  await touchTicket(ticketId);

  const [comment] = await enrichComments([data], auth);

  await recordCommentCreatedActivity({
    ticketId,
    commentId: comment.id,
    body: comment.body,
    auth,
  });

  return comment;
}

export async function updateTicketComment(
  ticketId: string,
  commentId: string,
  input: { body: string },
  auth: AuthContext,
) {
  const existing = await loadCommentForTicket(ticketId, commentId);
  assertCanManageTicketComment(existing, auth);
  const db = createAdminClient();
  const { data, error } = await db
    .from("ticket_comments")
    .update({ body: input.body })
    .eq("id", commentId)
    .eq("ticket_id", ticketId)
    .select()
    .single();
  if (error) throw ApiError.internal(error.message);

  await touchTicket(ticketId);

  const [comment] = await enrichComments([data], auth);

  await recordCommentUpdatedActivity({
    ticketId,
    commentId: comment.id,
    previousBody: existing.body,
    body: comment.body,
    auth,
  });

  return comment;
}

export async function deleteTicketComment(
  ticketId: string,
  commentId: string,
  auth: AuthContext,
) {
  const existing = await loadCommentForTicket(ticketId, commentId);
  assertCanManageTicketComment(existing, auth);

  const db = createAdminClient();
  const { error } = await db
    .from("ticket_comments")
    .delete()
    .eq("id", commentId)
    .eq("ticket_id", ticketId);
  if (error) throw ApiError.internal(error.message);

  await touchTicket(ticketId);

  await recordCommentDeletedActivity({
    ticketId,
    commentId,
    body: existing.body,
    auth,
  });

  return { deleted: true as const };
}
