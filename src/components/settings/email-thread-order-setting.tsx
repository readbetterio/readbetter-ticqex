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
import { useTicketThreadOrder } from "@/hooks/use-ticket-reference-data";

export type EmailThreadOrder = "oldest_first" | "newest_first";

const OPTIONS = [
  {
    value: "oldest_first" as const,
    label: "Oldest at top",
    description: "Chat-style — newest at the bottom, scroll down to read latest",
  },
  {
    value: "newest_first" as const,
    label: "Newest at top",
    description: "Inbox-style — newest at the top, scroll up for history",
  },
];

export function EmailThreadOrderSetting() {
  const threadOrderQuery = useTicketThreadOrder();
  const patchMutation = usePatchAdminSettings();

  if (threadOrderQuery.isPending) {
    return <Skeleton className="h-9 w-full max-w-md" />;
  }

  const resolvedOrder = threadOrderQuery.data ?? "oldest_first";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email thread order</CardTitle>
        <CardDescription>
          How messages are sorted in the ticket conversation view.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="email-thread-order">Message order</Label>
        <Select
          value={resolvedOrder}
          onValueChange={(value: EmailThreadOrder) => {
            patchMutation.mutate({ email_thread_order: value });
          }}
          disabled={patchMutation.isPending}
        >
          <SelectTrigger id="email-thread-order" className="w-full max-w-md">
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
