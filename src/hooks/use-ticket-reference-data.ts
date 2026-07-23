"use client";

import { useQuery } from "@tanstack/react-query";
import type { Tag } from "@/components/tags/types";
import type { EmailThreadOrder } from "@/components/board/email-conversation-panel";
import type { CommentThreadOrder } from "@/types/comments";
import { apiFetch } from "@/lib/api-client";
import {
  resolveCopyContextSettings,
  type CopyContextSettings,
} from "@shared/copy-context";

type StaffUser = { id: string; username: string };

const REFERENCE_STALE_MS = 5 * 60_000;

export const ticketUsersQueryKey = ["ticket-reference", "users"] as const;
export const ticketTagsQueryKey = ["ticket-reference", "tags"] as const;
export const ticketBoardSettingsQueryKey = [
  "ticket-reference",
  "board-settings",
] as const;

/** @deprecated Use ticketBoardSettingsQueryKey */
export const ticketThreadOrderQueryKey = ticketBoardSettingsQueryKey;
/** @deprecated Use ticketBoardSettingsQueryKey */
export const ticketCommentThreadOrderQueryKey = ticketBoardSettingsQueryKey;
/** @deprecated Use ticketBoardSettingsQueryKey */
export const copyContextSettingsQueryKey = ticketBoardSettingsQueryKey;

export type TicketBoardSettings = {
  emailThreadOrder: EmailThreadOrder;
  commentThreadOrder: CommentThreadOrder;
  copyContext: CopyContextSettings;
  emailChannelEnabled: boolean;
};

async function fetchTicketBoardSettings(): Promise<TicketBoardSettings> {
  const settings = await apiFetch<{
    email_thread_order?: EmailThreadOrder;
    comment_thread_order?: CommentThreadOrder;
    copy_context?: unknown;
    channels?: {
      email?: {
        enabled?: boolean;
      };
    };
  }>("/api/v1/settings");

  return {
    emailThreadOrder: settings.email_thread_order ?? "oldest_first",
    commentThreadOrder: settings.comment_thread_order ?? "oldest_first",
    copyContext: resolveCopyContextSettings(settings.copy_context),
    emailChannelEnabled: Boolean(settings.channels?.email?.enabled),
  };
}

export function useTicketBoardSettings<T = TicketBoardSettings>(options?: {
  select?: (data: TicketBoardSettings) => T;
}) {
  return useQuery({
    queryKey: ticketBoardSettingsQueryKey,
    queryFn: fetchTicketBoardSettings,
    staleTime: REFERENCE_STALE_MS,
    ...options,
  });
}

export function useTicketUsers() {
  return useQuery({
    queryKey: ticketUsersQueryKey,
    queryFn: () => apiFetch<StaffUser[]>("/api/v1/users"),
    staleTime: REFERENCE_STALE_MS,
  });
}

export function useTicketTags() {
  return useQuery({
    queryKey: ticketTagsQueryKey,
    queryFn: () => apiFetch<Tag[]>("/api/v1/tags"),
    staleTime: REFERENCE_STALE_MS,
  });
}

export function useTicketThreadOrder() {
  return useTicketBoardSettings({
    select: (data) => data.emailThreadOrder,
  });
}

export function useTicketCommentThreadOrder() {
  return useTicketBoardSettings({
    select: (data) => data.commentThreadOrder,
  });
}

export function useCopyContextSettings() {
  return useTicketBoardSettings({
    select: (data) => data.copyContext,
  });
}

export function prefetchTicketReferenceData(
  queryClient: ReturnType<
    typeof import("@tanstack/react-query").useQueryClient
  >,
) {
  void queryClient.prefetchQuery({
    queryKey: ticketUsersQueryKey,
    queryFn: () => apiFetch<StaffUser[]>("/api/v1/users"),
    staleTime: REFERENCE_STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: ticketTagsQueryKey,
    queryFn: () => apiFetch<Tag[]>("/api/v1/tags"),
    staleTime: REFERENCE_STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: ticketBoardSettingsQueryKey,
    queryFn: fetchTicketBoardSettings,
    staleTime: REFERENCE_STALE_MS,
  });
}
