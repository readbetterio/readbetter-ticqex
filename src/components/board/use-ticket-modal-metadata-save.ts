"use client";

import { useCallback } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { Tag } from "@/components/tags/types";
import { apiFetch } from "@/lib/api-client";
import {
  ticketSummaryQueryKey,
} from "@/hooks/use-ticket-summary";
import { ticketTagsQueryKey } from "@/hooks/use-ticket-reference-data";
import { isTaskSummary, type TicketSummary } from "@/types/tickets";

export function useTicketModalMetadataSave({
  ticketId,
  summary,
  title,
  body,
  assigneeId,
  selectedTags,
  customFieldPatch,
  allTags,
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
    try {
      const tagNames = selectedTags
        .map((tag) => tag.name.trim())
        .filter(Boolean);
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
      await queryClient.invalidateQueries({
        queryKey: ticketSummaryQueryKey(ticketId),
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
      onBoardChange();
    } catch (e) {
      setCurrentError(e instanceof Error ? e.message : "Save failed");
    } finally {
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
    try {
      await apiFetch(`/api/v1/tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({ custom_fields: customFieldPatch }),
      });
      await queryClient.invalidateQueries({
        queryKey: ticketSummaryQueryKey(ticketId),
      });
      onCustomFieldsSaved();
      onBoardChange();
    } catch (e) {
      setCurrentError(e instanceof Error ? e.message : "Save failed");
    } finally {
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
