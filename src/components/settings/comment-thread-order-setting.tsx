"use client";

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
import { usePatchAdminSettings } from "@/hooks/use-admin-settings-mutation";
import { useTicketCommentThreadOrder } from "@/hooks/use-ticket-reference-data";
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
  const threadOrderQuery = useTicketCommentThreadOrder();
  const patchMutation = usePatchAdminSettings();

  if (threadOrderQuery.isPending) {
    return <Skeleton className="h-9 w-full max-w-md" />;
  }

  const resolvedOrder = threadOrderQuery.data ?? "oldest_first";

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
          onValueChange={(value: CommentThreadOrder) => {
            patchMutation.mutate({ comment_thread_order: value });
          }}
          disabled={patchMutation.isPending}
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
