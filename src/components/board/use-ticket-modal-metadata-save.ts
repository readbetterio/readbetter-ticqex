"use client";

import { useCallback } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { Tag } from "@/components/tags/types";
import { apiFetch } from "@/lib/api-client";
import {
  ticketSummaryQueryKey,
} from "@/hooks/use-ticket-summary";
import { invalidateTicketActivity } from "@/hooks/use-activity";
import { ticketTagsQueryKey } from "@/hooks/use-ticket-reference-data";
import { isTaskSummary, type TicketSummary } from "@/types/tickets";

type StaffUser = { id: string; username: string };

function resolveOptimisticAssignee(
  assigneeId: string,
  users: StaffUser[],
  previous: TicketSummary | undefined,
): { id: string; username: string } | null {
  if (!assigneeId) return null;
  const user = users.find((u) => u.id === assigneeId);
  if (user) return { id: user.id, username: user.username };
  if (previous?.assignee?.id === assigneeId) return previous.assignee;
  return null;
}

function buildOptimisticSummary(
  source: TicketSummary,
  {
    title,
    body,
    assigneeId,
    selectedTags,
    users,
  }: {
    title: string;
    body: string;
    assigneeId: string;
    selectedTags: Tag[];
    users: StaffUser[];
  },
): TicketSummary {
  const base = {
    ...source,
    title,
    assignee_id: assigneeId || null,
    assignee: resolveOptimisticAssignee(assigneeId, users, source),
    tags: selectedTags,
  };
  if (isTaskSummary(source)) {
    return { ...base, body };
  }
  return base;
}

export function useTicketModalMetadataSave({
  ticketId,
  summary,
  title,
  body,
  assigneeId,
  selectedTags,
  customFieldPatch,
  allTags,
  users,
  queryClient,
  setSaving,
  setCurrentError,
  onBoardChange,
  touchRecentTags,
  onCustomFieldsSaved,
}: {
  ticketId: string;
  summary: TicketSummary | undefined;
  title: string;
  body: string;
  assigneeId: string;
  selectedTags: Tag[];
  customFieldPatch: Record<string, unknown> | undefined;
  allTags: Tag[];
  users: StaffUser[];
  queryClient: QueryClient;
  setSaving: (saving: boolean) => void;
  setCurrentError: (message: string | null) => void;
  onBoardChange: () => void;
  touchRecentTags: (names: string[]) => void;
  onCustomFieldsSaved: () => void;
}) {
  const saveMeta = useCallback(async () => {
    const source = summary;
    if (!source) return;
    setSaving(true);
    setCurrentError(null);

    const summaryKey = ticketSummaryQueryKey(ticketId);
    const tagNames = selectedTags
      .map((tag) => tag.name.trim())
      .filter(Boolean);

    await queryClient.cancelQueries({ queryKey: summaryKey });
    const previousSummary = queryClient.getQueryData<TicketSummary>(summaryKey);
    queryClient.setQueryData<TicketSummary>(
      summaryKey,
      buildOptimisticSummary(source, {
        title,
        body,
        assigneeId,
        selectedTags,
        users,
      }),
    );

    try {
      const payload: Record<string, unknown> = {
        title,
        assignee_id: assigneeId || null,
        tags: tagNames,
      };
      if (isTaskSummary(source)) {
        payload.body = body;
      }
      await apiFetch(`/api/v1/tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const existingKeys = new Set(
        allTags.map((t) => t.name.trim().toLowerCase()),
      );
      const hasNewTag = tagNames.some(
        (n) => !existingKeys.has(n.trim().toLowerCase()),
      );
      if (hasNewTag) {
        await queryClient.invalidateQueries({ queryKey: ticketTagsQueryKey });
      }
      touchRecentTags(tagNames);
      await invalidateTicketActivity(queryClient, ticketId);
      onBoardChange();
    } catch (e) {
      if (previousSummary !== undefined) {
        queryClient.setQueryData(summaryKey, previousSummary);
      }
      setCurrentError(e instanceof Error ? e.message : "Save failed");
    } finally {
      void queryClient.invalidateQueries({ queryKey: summaryKey });
      setSaving(false);
    }
  }, [
    summary,
    ticketId,
    title,
    body,
    assigneeId,
    selectedTags,
    allTags,
    users,
    queryClient,
    setSaving,
    setCurrentError,
    onBoardChange,
    touchRecentTags,
  ]);

  const saveCustomFields = useCallback(async () => {
    if (!customFieldPatch || Object.keys(customFieldPatch).length === 0) {
      return;
    }
    setSaving(true);
    setCurrentError(null);

    const summaryKey = ticketSummaryQueryKey(ticketId);
    await queryClient.cancelQueries({ queryKey: summaryKey });
    const previousSummary = queryClient.getQueryData<TicketSummary>(summaryKey);
    queryClient.setQueryData<TicketSummary>(summaryKey, (current) =>
      current
        ? {
            ...current,
            custom_fields: { ...current.custom_fields, ...customFieldPatch },
          }
        : current,
    );

    try {
      await apiFetch(`/api/v1/tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({ custom_fields: customFieldPatch }),
      });
      onCustomFieldsSaved();
      await invalidateTicketActivity(queryClient, ticketId);
      onBoardChange();
    } catch (e) {
      if (previousSummary !== undefined) {
        queryClient.setQueryData(summaryKey, previousSummary);
      }
      setCurrentError(e instanceof Error ? e.message : "Save failed");
    } finally {
      void queryClient.invalidateQueries({ queryKey: summaryKey });
      setSaving(false);
    }
  }, [
    customFieldPatch,
    ticketId,
    queryClient,
    setSaving,
    setCurrentError,
    onCustomFieldsSaved,
    onBoardChange,
  ]);

  return { saveMeta, saveCustomFields };
}
