"use client";

import { useCallback, useMemo, useState } from "react";
import { isTaskSummary, type TicketSummary } from "@/types/tickets";
import type { Tag } from "@/components/tags/types";

export type TicketModalDraft = {
  ticketId: string;
  title?: string;
  body?: string;
  assigneeId?: string;
  selectedTags?: Tag[];
  customFieldPatch?: Record<string, unknown>;
};

export function useTicketModalDraft(
  ticketId: string,
  summary: TicketSummary | undefined,
) {
  const [draft, setDraft] = useState<TicketModalDraft | null>(null);

  const currentDraft = draft?.ticketId === ticketId ? draft : null;
  const title = currentDraft?.title ?? summary?.title ?? "";
  const body =
    currentDraft?.body ??
    (summary && isTaskSummary(summary) ? (summary.body ?? "") : "");
  const assigneeId =
    currentDraft?.assigneeId ?? summary?.assignee_id ?? "";
  const selectedTags = currentDraft?.selectedTags ?? summary?.tags ?? [];
  const customFieldPatch = currentDraft?.customFieldPatch;
  const customFieldsDirty =
    !!customFieldPatch && Object.keys(customFieldPatch).length > 0;

  const updateDraft = useCallback(
    (patch: Omit<Partial<TicketModalDraft>, "ticketId">) => {
      setDraft((current) =>
        current?.ticketId === ticketId
          ? { ...current, ...patch }
          : { ticketId, ...patch },
      );
    },
    [ticketId],
  );

  const updateCustomFieldValue = useCallback(
    (key: string, value: unknown) => {
      setDraft((current) => {
        const base =
          current?.ticketId === ticketId ? current : { ticketId };
        const prevPatch = base.customFieldPatch ?? {};
        return {
          ...base,
          customFieldPatch: { ...prevPatch, [key]: value },
        };
      });
    },
    [ticketId],
  );

  const customFieldValues = useMemo(() => {
    const base = summary?.custom_fields ?? {};
    if (!customFieldPatch) return base;
    return { ...base, ...customFieldPatch };
  }, [summary?.custom_fields, customFieldPatch]);

  const clearCustomFieldPatch = useCallback(() => {
    setDraft((current) =>
      current?.ticketId === ticketId
        ? { ...current, customFieldPatch: undefined }
        : current,
    );
  }, [ticketId]);

  return {
    title,
    body,
    assigneeId,
    selectedTags,
    customFieldPatch,
    customFieldsDirty,
    customFieldValues,
    updateDraft,
    updateCustomFieldValue,
    clearCustomFieldPatch,
  };
}
