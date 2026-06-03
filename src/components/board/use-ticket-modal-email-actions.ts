"use client";

import { useCallback } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import {
  invalidateTicketDrafts,
  ticketDraftsQueryKey,
} from "@/hooks/use-ticket-drafts";
import {
  invalidateTicketMessages,
} from "@/hooks/use-ticket-messages";
import { ticketSummaryQueryKey } from "@/hooks/use-ticket-summary";
import type { EmailComposePayload } from "./types";

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
      try {
        await apiFetch(`/api/v1/tickets/${ticketId}/messages/drafts`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        invalidateTicketDrafts(queryClient, ticketId);
      } catch (err) {
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
      try {
        await apiFetch(`/api/v1/tickets/${ticketId}/messages/drafts/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        invalidateTicketDrafts(queryClient, ticketId);
      } catch (err) {
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
      try {
        await apiFetch(`/api/v1/tickets/${ticketId}/messages/drafts/${id}`, {
          method: "DELETE",
        });
        invalidateTicketDrafts(queryClient, ticketId);
        queryClient.removeQueries({
          queryKey: ticketDraftsQueryKey(ticketId),
          exact: false,
        });
      } catch (err) {
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
