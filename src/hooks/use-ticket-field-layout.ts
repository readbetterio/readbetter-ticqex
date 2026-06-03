"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { ResolvedTicketFieldLayout } from "@shared/ticket-fields";

type SettingsWithLayout = {
  ticket_field_layout?: ResolvedTicketFieldLayout;
};

export function useTicketFieldLayoutFallback(
  layoutFromBoard: ResolvedTicketFieldLayout | null,
) {
  const [fallbackLayout, setFallbackLayout] =
    useState<ResolvedTicketFieldLayout | null>(null);

  useEffect(() => {
    if (layoutFromBoard) return;

    let cancelled = false;
    void apiFetch<SettingsWithLayout>("/api/v1/settings")
      .then((data) => {
        if (!cancelled) {
          setFallbackLayout(data.ticket_field_layout ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setFallbackLayout(null);
      });

    return () => {
      cancelled = true;
    };
  }, [layoutFromBoard]);

  return layoutFromBoard ?? fallbackLayout;
}
