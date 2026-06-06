"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { adminSettingsQueryKey } from "@/hooks/use-admin-settings";
import {
  ticketBoardSettingsQueryKey,
  useTicketCommentThreadOrder,
} from "@/hooks/use-ticket-reference-data";
import type { CommentThreadOrder } from "@/types/comments";

const OPTIONS = [
  {
    value: "oldest_first" as const,
    label: "Oldest at top",
    description: "Chronological — newest comments appear at the bottom",
  },
  {
    value: "newest_first" as const,
    label: "Newest at top",
    description: "Reverse chronological — newest comments appear at the top",
  },
];

export function CommentThreadOrderSetting() {
  const queryClient = useQueryClient();
  const threadOrderQuery = useTicketCommentThreadOrder();
  const [orderOverride, setOrderOverride] = useState<CommentThreadOrder | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const order = orderOverride ?? threadOrderQuery.data ?? null;

  if (threadOrderQuery.isPending && order === null) {
    return <Skeleton className="h-9 w-full max-w-md" />;
  }

  const resolvedOrder = order ?? "oldest_first";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comment order</CardTitle>
        <CardDescription>
          How internal ticket comments are sorted in the ticket view.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="comment-thread-order">Comment order</Label>
        <Select
          value={resolvedOrder}
          onValueChange={async (value: CommentThreadOrder) => {
            const previous = resolvedOrder;
            setOrderOverride(value);
            setSaving(true);
            try {
              await apiFetch("/api/v1/settings", {
                method: "PATCH",
                body: JSON.stringify({ comment_thread_order: value }),
              });
              setOrderOverride(null);
              void queryClient.invalidateQueries({
                queryKey: ticketBoardSettingsQueryKey,
              });
              void queryClient.invalidateQueries({
                queryKey: adminSettingsQueryKey,
              });
            } catch {
              setOrderOverride(previous);
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
        >
          <SelectTrigger id="comment-thread-order" className="w-full max-w-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {OPTIONS.find((o) => o.value === resolvedOrder)?.description}
        </p>
      </CardContent>
    </Card>
  );
}
