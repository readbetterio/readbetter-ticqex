import { createAdminClient } from "@server/lib/supabase-admin";
import { ApiError } from "@server/lib/errors";
import { messagePreview } from "@server/lib/utils";
import { loadCustomFieldsMap } from "@server/services/custom-fields";
import { loadTagsForTickets } from "@server/services/tags";
import {
  buildTicketSnapshot,
  recordDomainActivity,
} from "@server/services/activity";
import type { AuthContext } from "@server/middleware/auth";
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_ACTOR_TYPES,
  ACTIVITY_SOURCES,
  type ActivityAction,
} from "@shared/activity/actions";
import type { ActivityChange } from "@shared/activity/types";
import type { TicketRow } from "@server/domain/ticket";

async function loadStatusLabel(statusId: string | null): Promise<string | null> {
  if (!statusId) return null;
  const db = createAdminClient();
  const { data } = await db
    .from("status_types")
    .select("name")
    .eq("id", statusId)
    .maybeSingle();
  return data?.name ?? statusId;
}

async function loadAssigneeLabel(
  assigneeId: string | null,
): Promise<string | null> {
  if (!assigneeId) return "Unassigned";
  const db = createAdminClient();
  const { data } = await db
    .from("users")
    .select("username, email")
    .eq("id", assigneeId)
    .maybeSingle();
  if (!data) return assigneeId;
  return data.username || data.email || assigneeId;
}

function sortedTagNames(
  tags: { id: string; name: string; color: string }[] | undefined,
): string[] {
  return (tags ?? []).map((tag) => tag.name).sort();
}

export type TicketUpdateActivitySnapshot = {
  title: string;
  body: string | null;
  bodyPreview: string | null;
  statusId: string;
  statusLabel: string | null;
  assigneeId: string | null;
  assigneeLabel: string | null;
  tagNames: string[];
  customFields: Record<string, unknown>;
};

export type TicketUpdateDiffScope = {
  title: boolean;
  body: boolean;
  status: boolean;
  assignee: boolean;
  tags: boolean;
  customFieldKeys: string[];
};

export type TicketUpdateInput = {
  title?: string;
  body?: string | null;
  status_id?: string;
  assignee_id?: string | null;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
};

export function deriveTicketUpdateDiffScope(
  input: TicketUpdateInput,
): TicketUpdateDiffScope {
  return {
    title: input.title !== undefined,
    body: input.body !== undefined,
    status: input.status_id !== undefined,
    assignee: input.assignee_id !== undefined,
    tags: input.tags !== undefined,
    customFieldKeys:
      input.custom_fields !== undefined ? Object.keys(input.custom_fields) : [],
  };
}

export function diffTicketActivity(
  before: TicketUpdateActivitySnapshot,
  after: TicketUpdateActivitySnapshot,
  scope: TicketUpdateDiffScope,
): ActivityChange[] {
  const changes: ActivityChange[] = [];

  if (scope.title && before.title !== after.title) {
    changes.push({
      field: "title",
      label: "Title",
      from: before.title,
      to: after.title,
    });
  }

  if (scope.body && before.body !== after.body) {
    changes.push({
      field: "body",
      label: "Description",
      from: before.bodyPreview,
      to: after.bodyPreview,
    });
  }

  if (scope.status && before.statusId !== after.statusId) {
    changes.push({
      field: "status_id",
      label: "Status",
      from: before.statusLabel,
      to: after.statusLabel,
    });
  }

  if (scope.assignee && before.assigneeId !== after.assigneeId) {
    changes.push({
      field: "assignee_id",
      label: "Assignee",
      from: before.assigneeLabel,
      to: after.assigneeLabel,
    });
  }

  if (
    scope.tags &&
    JSON.stringify(before.tagNames) !== JSON.stringify(after.tagNames)
  ) {
    changes.push({
      field: "tags",
      label: "Tags",
      from: before.tagNames,
      to: after.tagNames,
    });
  }

  for (const key of scope.customFieldKeys) {
    const from = before.customFields[key] ?? null;
    const to = after.customFields[key] ?? null;
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push({
        field: `custom_fields.${key}`,
        label: key,
        from,
        to,
      });
    }
  }

  return changes;
}

export async function loadTicketUpdateActivitySnapshot(
  ticketId: string,
): Promise<TicketUpdateActivitySnapshot> {
  const db = createAdminClient();
  const { data: ticket, error } = await db
    .from("tickets")
    .select("title, body, status_id, assignee_id")
    .eq("id", ticketId)
    .single();
  if (error || !ticket) {
    throw ApiError.notFound("Ticket not found");
  }

  const [statusLabel, assigneeLabel, tagsMap, fieldsMap] = await Promise.all([
    loadStatusLabel(ticket.status_id),
    loadAssigneeLabel(ticket.assignee_id),
    loadTagsForTickets([ticketId]),
    loadCustomFieldsMap(db, "ticket", [ticketId]),
  ]);

  const body = ticket.body;
  return {
    title: ticket.title,
    body,
    bodyPreview: body ? messagePreview(body, 120) : null,
    statusId: ticket.status_id,
    statusLabel,
    assigneeId: ticket.assignee_id,
    assigneeLabel,
    tagNames: sortedTagNames(tagsMap.get(ticketId)),
    customFields: fieldsMap.get(ticketId) ?? {},
  };
}

async function recordTicketScopedActivity(input: {
  action: ActivityAction;
  summary: string;
  ticketId: string;
  targetType: "message" | "comment";
  targetId: string;
  auth: AuthContext;
  body?: string | null;
  changes?: ActivityChange[];
  metadata?: Record<string, unknown>;
}) {
  await recordDomainActivity({
    action: input.action,
    summary: input.summary,
    target_type: input.targetType,
    target_id: input.targetId,
    ticket_id: input.ticketId,
    auth: input.auth,
    changes: input.changes,
    metadata: {
      ...input.metadata,
      ...(input.body !== undefined
        ? { body_preview: messagePreview(input.body ?? "", 120) }
        : {}),
    },
  });
}

export async function recordTicketCreatedActivity(
  ticket: { id: string; title: string; kind: string },
  auth: AuthContext,
) {
  await recordDomainActivity({
    action: ACTIVITY_ACTIONS.TICKET_CREATED,
    summary: `Created ticket "${ticket.title}"`,
    target_type: "ticket",
    target_id: ticket.id,
    ticket_id: ticket.id,
    ticket_snapshot: buildTicketSnapshot(ticket),
    auth,
    metadata: { kind: ticket.kind },
  });
}

export async function recordTicketUpdatedActivity(
  ticket: TicketRow,
  changes: ActivityChange[],
  auth: AuthContext,
) {
  if (!changes.length) return;

  await recordDomainActivity({
    action: ACTIVITY_ACTIONS.TICKET_UPDATED,
    summary: `Updated ticket "${ticket.title}"`,
    target_type: "ticket",
    target_id: ticket.id,
    ticket_id: ticket.id,
    ticket_snapshot: buildTicketSnapshot({
      id: ticket.id,
      title: ticket.title,
      kind: ticket.kind,
    }),
    auth,
    changes,
  });
}

export async function recordTicketDeletedActivity(
  ticket: TicketRow,
  auth?: AuthContext | null,
) {
  await recordDomainActivity({
    action: ACTIVITY_ACTIONS.TICKET_DELETED,
    summary: `Deleted ticket "${ticket.title}"`,
    target_type: "ticket",
    target_id: ticket.id,
    ticket_id: ticket.id,
    ticket_snapshot: buildTicketSnapshot({
      id: ticket.id,
      title: ticket.title,
      kind: ticket.kind,
    }),
    auth,
  });
}

export async function recordTicketStatusChangedActivity(input: {
  ticket: Pick<TicketRow, "id" | "title" | "kind">;
  fromStatusId: string;
  toStatusId: string;
  auth: AuthContext;
}) {
  const [fromLabel, toLabel] = await Promise.all([
    loadStatusLabel(input.fromStatusId),
    loadStatusLabel(input.toStatusId),
  ]);

  await recordDomainActivity({
    action: ACTIVITY_ACTIONS.TICKET_STATUS_CHANGED,
    summary: `Moved ticket "${input.ticket.title}" from ${fromLabel} to ${toLabel}`,
    target_type: "ticket",
    target_id: input.ticket.id,
    ticket_id: input.ticket.id,
    ticket_snapshot: buildTicketSnapshot(input.ticket),
    auth: input.auth,
    changes: [
      {
        field: "status_id",
        label: "Status",
        from: fromLabel,
        to: toLabel,
      },
    ],
  });
}

export async function recordCommentCreatedActivity(input: {
  ticketId: string;
  commentId: string;
  body: string;
  auth: AuthContext;
}) {
  await recordTicketScopedActivity({
    action: ACTIVITY_ACTIONS.COMMENT_CREATED,
    summary: "Added comment on ticket",
    ticketId: input.ticketId,
    targetType: "comment",
    targetId: input.commentId,
    auth: input.auth,
    body: input.body,
  });
}

export async function recordCommentUpdatedActivity(input: {
  ticketId: string;
  commentId: string;
  previousBody: string;
  body: string;
  auth: AuthContext;
}) {
  await recordTicketScopedActivity({
    action: ACTIVITY_ACTIONS.COMMENT_UPDATED,
    summary: "Updated comment on ticket",
    ticketId: input.ticketId,
    targetType: "comment",
    targetId: input.commentId,
    auth: input.auth,
    changes: [
      {
        field: "body",
        label: "Comment",
        from: messagePreview(input.previousBody),
        to: messagePreview(input.body),
      },
    ],
  });
}

export async function recordCommentDeletedActivity(input: {
  ticketId: string;
  commentId: string;
  body: string;
  auth: AuthContext;
}) {
  await recordTicketScopedActivity({
    action: ACTIVITY_ACTIONS.COMMENT_DELETED,
    summary: "Deleted comment on ticket",
    ticketId: input.ticketId,
    targetType: "comment",
    targetId: input.commentId,
    auth: input.auth,
    body: input.body,
  });
}

export async function recordAgentReplyActivity(input: {
  ticketId: string;
  messageId: string;
  body: string;
  channel: string;
  auth: AuthContext;
}) {
  await recordTicketScopedActivity({
    action: ACTIVITY_ACTIONS.MESSAGE_CREATED,
    summary: "Sent agent reply",
    ticketId: input.ticketId,
    targetType: "message",
    targetId: input.messageId,
    auth: input.auth,
    body: input.body,
    metadata: { channel: input.channel },
  });
}

export async function recordMessageDraftCreatedActivity(input: {
  ticketId: string;
  messageId: string;
  body: string;
  auth: AuthContext;
}) {
  await recordTicketScopedActivity({
    action: ACTIVITY_ACTIONS.MESSAGE_DRAFT_CREATED,
    summary: "Created message draft",
    ticketId: input.ticketId,
    targetType: "message",
    targetId: input.messageId,
    auth: input.auth,
    body: input.body,
  });
}

export async function recordMessageDraftUpdatedActivity(input: {
  ticketId: string;
  messageId: string;
  previousBody: string;
  body: string;
  auth: AuthContext;
}) {
  await recordTicketScopedActivity({
    action: ACTIVITY_ACTIONS.MESSAGE_DRAFT_UPDATED,
    summary: "Updated message draft",
    ticketId: input.ticketId,
    targetType: "message",
    targetId: input.messageId,
    auth: input.auth,
    changes: [
      {
        field: "body",
        label: "Draft",
        from: messagePreview(input.previousBody),
        to: messagePreview(input.body),
      },
    ],
  });
}

export async function recordMessageDraftDeletedActivity(input: {
  ticketId: string;
  messageId: string;
  body: string;
  auth: AuthContext;
}) {
  await recordTicketScopedActivity({
    action: ACTIVITY_ACTIONS.MESSAGE_DRAFT_DELETED,
    summary: "Deleted message draft",
    ticketId: input.ticketId,
    targetType: "message",
    targetId: input.messageId,
    auth: input.auth,
    body: input.body,
  });
}

export async function recordMessageDraftSentActivity(input: {
  ticketId: string;
  messageId: string;
  body: string;
  emailSubject: string | null;
  auth: AuthContext;
}) {
  await recordTicketScopedActivity({
    action: ACTIVITY_ACTIONS.MESSAGE_DRAFT_SENT,
    summary: "Sent message draft",
    ticketId: input.ticketId,
    targetType: "message",
    targetId: input.messageId,
    auth: input.auth,
    body: input.body,
    metadata: { email_subject: input.emailSubject },
  });
}

export async function recordInboundMessageActivity(input: {
  ticketId: string;
  messageId: string;
  body: string;
  authorId: string;
  channel: "email" | "api";
  emailFrom?: string | null;
  emailSubject?: string | null;
}) {
  await recordDomainActivity({
    action: ACTIVITY_ACTIONS.MESSAGE_INBOUND,
    summary: "Received inbound message",
    source:
      input.channel === "email" ? ACTIVITY_SOURCES.EMAIL : ACTIVITY_SOURCES.API,
    target_type: "message",
    target_id: input.messageId,
    ticket_id: input.ticketId,
    actor_type: ACTIVITY_ACTOR_TYPES.CONTACT,
    actor_user_id: input.authorId,
    metadata: {
      body_preview: messagePreview(input.body),
      email_from: input.emailFrom,
      email_subject: input.emailSubject,
    },
  });
}
