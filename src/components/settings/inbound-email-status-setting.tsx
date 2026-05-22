"use client";

import { useCallback, useEffect, useState } from "react";
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
import { apiFetch } from "@/lib/api-client";

type StatusOption = {
  id: string;
  name: string;
  color: string;
  position: number;
};

export function InboundEmailStatusSetting() {
  const [statuses, setStatuses] = useState<StatusOption[]>([]);
  const [defaultInboundStatusId, setDefaultInboundStatusId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [data, settings] = await Promise.all([
        apiFetch<StatusOption[]>("/api/v1/statuses"),
        apiFetch<{ default_inbound_status_id: string | null }>(
          "/api/v1/settings",
        ),
      ]);
      setStatuses(data);
      setDefaultInboundStatusId(settings.default_inbound_status_id);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load setting");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount
    void load();
  }, [load]);

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
          onValueChange={async (value) => {
            const previous = defaultInboundStatusId;
            setDefaultInboundStatusId(value);
            try {
              await apiFetch("/api/v1/settings", {
                method: "PATCH",
                body: JSON.stringify({ default_inbound_status_id: value }),
              });
              setError(null);
            } catch (e) {
              setDefaultInboundStatusId(previous);
              setError(
                e instanceof Error
                  ? e.message
                  : "Failed to update inbound email status",
              );
            }
          }}
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
