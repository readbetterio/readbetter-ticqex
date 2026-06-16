"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACTIVITY_OUTCOMES,
  ACTIVITY_SOURCES,
} from "@shared/activity/actions";
import type { ActivityFilters } from "@/hooks/use-activity";

const OUTCOME_OPTIONS = ["", ...Object.values(ACTIVITY_OUTCOMES)] as const;
const METHOD_OPTIONS = ["", "GET", "POST", "PATCH", "PUT", "DELETE", "MCP"] as const;
const SOURCE_OPTIONS = ["", ...Object.values(ACTIVITY_SOURCES)] as const;

export function ActivityFiltersBar({
  value,
  onChange,
}: {
  value: ActivityFilters;
  onChange: (next: ActivityFilters) => void;
}) {
  const [draft, setDraft] = useState(value);

  const canApply = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(value),
    [draft, value],
  );

  return (
    <div className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-2">
        <Label htmlFor="activity-method">Method</Label>
        <Select
          value={draft.request_method ?? "any"}
          onValueChange={(request_method) =>
            setDraft((current) => ({
              ...current,
              request_method: request_method === "any" ? "" : request_method,
            }))
          }
        >
          <SelectTrigger id="activity-method">
            <SelectValue placeholder="Any method" />
          </SelectTrigger>
          <SelectContent>
            {METHOD_OPTIONS.map((method) => (
              <SelectItem key={method || "any"} value={method || "any"}>
                {method || "Any"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-path">Path</Label>
        <Input
          id="activity-path"
          value={draft.request_path ?? ""}
          placeholder="/api/v1/tickets"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              request_path: event.target.value,
            }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-outcome">Outcome</Label>
        <Select
          value={draft.outcome ?? "any"}
          onValueChange={(outcome) =>
            setDraft((current) => ({
              ...current,
              outcome: outcome === "any" ? "" : outcome,
            }))
          }
        >
          <SelectTrigger id="activity-outcome">
            <SelectValue placeholder="Any outcome" />
          </SelectTrigger>
          <SelectContent>
            {OUTCOME_OPTIONS.map((outcome) => (
              <SelectItem key={outcome || "any"} value={outcome || "any"}>
                {outcome || "Any"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-source">Source</Label>
        <Select
          value={draft.source ?? "any"}
          onValueChange={(source) =>
            setDraft((current) => ({
              ...current,
              source: source === "any" ? "" : source,
            }))
          }
        >
          <SelectTrigger id="activity-source">
            <SelectValue placeholder="Any source" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((source) => (
              <SelectItem key={source || "any"} value={source || "any"}>
                {source || "Any"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-action">Action</Label>
        <Input
          id="activity-action"
          value={draft.action ?? ""}
          placeholder="ticket.updated"
          onChange={(event) =>
            setDraft((current) => ({ ...current, action: event.target.value }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-operation">Operation</Label>
        <Input
          id="activity-operation"
          value={draft.operation ?? ""}
          placeholder="ticqex_update_ticket"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              operation: event.target.value,
            }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-status-code">Status code</Label>
        <Input
          id="activity-status-code"
          type="number"
          inputMode="numeric"
          value={draft.status_code ?? ""}
          placeholder="400"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              status_code: event.target.value,
            }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-actor-user-id">Actor user ID</Label>
        <Input
          id="activity-actor-user-id"
          value={draft.actor_user_id ?? ""}
          placeholder="550e8400-e29b-41d4-a716-446655440000"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              actor_user_id: event.target.value,
            }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-api-key-id">API key ID</Label>
        <Input
          id="activity-api-key-id"
          value={draft.api_key_id ?? ""}
          placeholder="550e8400-e29b-41d4-a716-446655440000"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              api_key_id: event.target.value,
            }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-occurred-after">Occurred after</Label>
        <Input
          id="activity-occurred-after"
          type="datetime-local"
          value={draft.occurred_after ?? ""}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              occurred_after: event.target.value,
            }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-occurred-before">Occurred before</Label>
        <Input
          id="activity-occurred-before"
          type="datetime-local"
          value={draft.occurred_before ?? ""}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              occurred_before: event.target.value,
            }))
          }
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 md:col-span-2 xl:col-span-4">
        <div>
          <Label htmlFor="hide-self-referential">Hide activity read requests</Label>
          <p className="text-xs text-muted-foreground">
            Suppress successful GET rows for activity endpoints by default.
          </p>
        </div>
        <Switch
          id="hide-self-referential"
          checked={draft.hide_self_referential !== false}
          onCheckedChange={(checked) =>
            setDraft((current) => ({
              ...current,
              hide_self_referential: checked,
            }))
          }
        />
      </div>

      <div className="flex gap-2 md:col-span-2 xl:col-span-4">
        <Button type="button" disabled={!canApply} onClick={() => onChange(draft)}>
          Apply filters
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const cleared: ActivityFilters = { hide_self_referential: true };
            setDraft(cleared);
            onChange(cleared);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
