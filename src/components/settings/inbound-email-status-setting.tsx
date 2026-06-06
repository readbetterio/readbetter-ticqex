"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useAdminSettings } from "@/hooks/use-admin-settings";
import { useStatuses } from "@/hooks/use-statuses";

type StatusOption = {
  id: string;
  name: string;
  color: string;
  position: number;
};

export function InboundEmailStatusSetting() {
  const statusesQuery = useStatuses<StatusOption>();
  const settingsQuery = useAdminSettings(true);
  const patchMutation = usePatchAdminSettings();
  const [error, setError] = useState<string | null>(null);

  const statuses = statusesQuery.data ?? [];
  const defaultInboundStatusId =
    settingsQuery.data?.default_inbound_status_id ?? null;
  const loading = statusesQuery.isPending || settingsQuery.isPending;

  const resolvedInboundStatusId =
    defaultInboundStatusId &&
    statuses.some((s) => s.id === defaultInboundStatusId)
      ? defaultInboundStatusId
      : (statuses[0]?.id ?? "");

  if (loading) {
    return <Skeleton className="h-9 w-full" />;
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="default-inbound-status">Starting status</Label>
        <Select
          value={resolvedInboundStatusId}
          onValueChange={(value) => {
            setError(null);
            patchMutation.mutate(
              { default_inbound_status_id: value },
              {
                onError: (e) => {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Failed to update inbound email status",
                  );
                },
              },
            );
          }}
          disabled={patchMutation.isPending}
        >
          <SelectTrigger id="default-inbound-status" className="w-full">
            <SelectValue placeholder="Choose a status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
