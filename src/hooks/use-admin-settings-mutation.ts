"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import {
  adminSettingsQueryKey,
  type AdminSettings,
} from "@/hooks/use-admin-settings";
import {
  ticketBoardSettingsQueryKey,
  type TicketBoardSettings,
} from "@/hooks/use-ticket-reference-data";

export type AdminSettingsPatch = Partial<
  Pick<
    AdminSettings,
    | "email_thread_order"
    | "comment_thread_order"
    | "default_inbound_status_id"
    | "email_signature"
  >
>;

type PatchContext = {
  previousAdmin: AdminSettings | undefined;
  previousBoard: TicketBoardSettings | undefined;
};

function applyAdminSettingsPatch(
  current: AdminSettings,
  patch: AdminSettingsPatch,
): AdminSettings {
  return { ...current, ...patch };
}

function applyBoardSettingsPatch(
  current: TicketBoardSettings,
  patch: AdminSettingsPatch,
): TicketBoardSettings {
  return {
    ...current,
    ...(patch.email_thread_order !== undefined
      ? { emailThreadOrder: patch.email_thread_order }
      : null),
    ...(patch.comment_thread_order !== undefined
      ? { commentThreadOrder: patch.comment_thread_order }
      : null),
  };
}

export function usePatchAdminSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: AdminSettingsPatch) => {
      await apiFetch("/api/v1/settings", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    },
    onMutate: async (patch): Promise<PatchContext> => {
      await queryClient.cancelQueries({ queryKey: adminSettingsQueryKey });
      await queryClient.cancelQueries({ queryKey: ticketBoardSettingsQueryKey });

      const previousAdmin = queryClient.getQueryData<AdminSettings>(
        adminSettingsQueryKey,
      );
      const previousBoard = queryClient.getQueryData<TicketBoardSettings>(
        ticketBoardSettingsQueryKey,
      );

      if (previousAdmin) {
        queryClient.setQueryData<AdminSettings>(
          adminSettingsQueryKey,
          applyAdminSettingsPatch(previousAdmin, patch),
        );
      }

      const touchesBoardSettings =
        patch.email_thread_order !== undefined ||
        patch.comment_thread_order !== undefined;

      if (previousBoard && touchesBoardSettings) {
        queryClient.setQueryData<TicketBoardSettings>(
          ticketBoardSettingsQueryKey,
          applyBoardSettingsPatch(previousBoard, patch),
        );
      }

      return { previousAdmin, previousBoard };
    },
    onError: (_error, _patch, context) => {
      if (context?.previousAdmin !== undefined) {
        queryClient.setQueryData(adminSettingsQueryKey, context.previousAdmin);
      }
      if (context?.previousBoard !== undefined) {
        queryClient.setQueryData(
          ticketBoardSettingsQueryKey,
          context.previousBoard,
        );
      }
    },
    onSettled: (_data, _error, patch) => {
      void queryClient.invalidateQueries({ queryKey: adminSettingsQueryKey });

      if (
        patch.email_thread_order !== undefined ||
        patch.comment_thread_order !== undefined
      ) {
        void queryClient.invalidateQueries({
          queryKey: ticketBoardSettingsQueryKey,
        });
      }
    },
  });
}
