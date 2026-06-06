"use client";

import { useCallback } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import {
  applyDraftPayloadToRow,
  buildOptimisticDraft,
  createOptimisticDraftId,
  invalidateTicketDrafts,
  normalizeDraftFromApi,
  ticketDraftsQueryKey,
} from "@/hooks/use-ticket-drafts";
import { invalidateTicketMessages } from "@/hooks/use-ticket-messages";
import { ticketSummaryQueryKey } from "@/hooks/use-ticket-summary";
import type { EmailComposePayload, MessageRow } from "./types";

export function useTicketModalEmailActions({
  ticketId,
  queryClient,
  setSaving,
  setCurrentError,
}: {
  ticketId: string;
  queryClient: QueryClient;
  setSaving: (saving: boolean) => void;
  setCurrentError: (message: string | null) => void;
}) {
  const saveEmailDraft = useCallback(
    async (payload: EmailComposePayload) => {
      setSaving(true);
      setCurrentError(null);

      const queryKey = ticketDraftsQueryKey(ticketId);
      const tempId = createOptimisticDraftId();
      const optimisticDraft = buildOptimisticDraft(payload, tempId);

      await queryClient.cancelQueries({ queryKey });
      const previousDrafts = queryClient.getQueryData<MessageRow[]>(queryKey);

      queryClient.setQueryData<MessageRow[]>(queryKey, (current) => [
        optimisticDraft,
        ...(current ?? []),
      ]);

      try {
        const message = await apiFetch<MessageRow>(
          `/api/v1/tickets/${ticketId}/messages/drafts`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );

        queryClient.setQueryData<MessageRow[]>(queryKey, (current) => {
          if (!current) {
            return [normalizeDraftFromApi(message, optimisticDraft)];
          }
          if (!current.some((draft) => draft.id === tempId)) {
            return [normalizeDraftFromApi(message), ...current];
          }
          return current.map((draft) =>
            draft.id === tempId
              ? normalizeDraftFromApi(message, draft)
              : draft,
          );
        });
        invalidateTicketDrafts(queryClient, ticketId);
      } catch (err) {
        queryClient.setQueryData(queryKey, previousDrafts);
        setCurrentError(
          err instanceof Error ? err.message : "Save draft failed",
        );
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [ticketId, queryClient, setSaving, setCurrentError],
  );

  const updateEmailDraft = useCallback(
    async (id: string, payload: EmailComposePayload) => {
      setSaving(true);
      setCurrentError(null);

      const queryKey = ticketDraftsQueryKey(ticketId);

      await queryClient.cancelQueries({ queryKey });
      const previousDrafts = queryClient.getQueryData<MessageRow[]>(queryKey);

      queryClient.setQueryData<MessageRow[]>(queryKey, (current) =>
        current?.map((draft) =>
          draft.id === id ? applyDraftPayloadToRow(draft, payload) : draft,
        ) ?? current,
      );

      try {
        const message = await apiFetch<MessageRow>(
          `/api/v1/tickets/${ticketId}/messages/drafts/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
        );

        queryClient.setQueryData<MessageRow[]>(queryKey, (current) =>
          current?.map((draft) =>
            draft.id === id
              ? normalizeDraftFromApi(message, draft)
              : draft,
          ) ?? current,
        );
        invalidateTicketDrafts(queryClient, ticketId);
      } catch (err) {
        queryClient.setQueryData(queryKey, previousDrafts);
        setCurrentError(
          err instanceof Error ? err.message : "Update draft failed",
        );
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [ticketId, queryClient, setSaving, setCurrentError],
  );

  // Send paths stay wait-then-invalidate: the server triggers real outbound email
  // (Resend) and may rewrite body/subject/recipients. Optimistic "sent" UI would
  // lie about external delivery and show message state the server has not committed.
  const sendEmailDraft = useCallback(
    async (
      id: string,
      _payload: EmailComposePayload,
      includeQuote: boolean,
    ) => {
      setSaving(true);
      setCurrentError(null);
      try {
        await apiFetch(
          `/api/v1/tickets/${ticketId}/messages/drafts/${id}/send`,
          {
            method: "POST",
            body: JSON.stringify({ include_quote: includeQuote }),
          },
        );
        invalidateTicketDrafts(queryClient, ticketId);
        invalidateTicketMessages(queryClient, ticketId);
        await queryClient.invalidateQueries({
          queryKey: ticketSummaryQueryKey(ticketId),
        });
      } catch (err) {
        setCurrentError(
          err instanceof Error ? err.message : "Send draft failed",
        );
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [ticketId, queryClient, setSaving, setCurrentError],
  );

  const deleteEmailDraft = useCallback(
    async (id: string) => {
      setSaving(true);
      setCurrentError(null);

      const queryKey = ticketDraftsQueryKey(ticketId);

      await queryClient.cancelQueries({ queryKey });
      const previousDrafts = queryClient.getQueryData<MessageRow[]>(queryKey);

      queryClient.setQueryData<MessageRow[]>(queryKey, (current) =>
        current?.filter((draft) => draft.id !== id) ?? current,
      );

      try {
        await apiFetch(`/api/v1/tickets/${ticketId}/messages/drafts/${id}`, {
          method: "DELETE",
        });
        invalidateTicketDrafts(queryClient, ticketId);
      } catch (err) {
        queryClient.setQueryData(queryKey, previousDrafts);
        setCurrentError(
          err instanceof Error ? err.message : "Delete draft failed",
        );
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [ticketId, queryClient, setSaving, setCurrentError],
  );

  // Same as sendEmailDraft: outbound email is an external side effect; wait for
  // the server response before updating the message thread or ticket summary.
  const sendEmailReply = useCallback(
    async (payload: EmailComposePayload) => {
      setSaving(true);
      setCurrentError(null);
      try {
        await apiFetch(`/api/v1/tickets/${ticketId}/messages`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        invalidateTicketMessages(queryClient, ticketId);
        await queryClient.invalidateQueries({
          queryKey: ticketSummaryQueryKey(ticketId),
        });
      } catch (err) {
        setCurrentError(err instanceof Error ? err.message : "Reply failed");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [ticketId, queryClient, setSaving, setCurrentError],
  );

  return {
    saveEmailDraft,
    updateEmailDraft,
    sendEmailDraft,
    deleteEmailDraft,
    sendEmailReply,
  };
}
