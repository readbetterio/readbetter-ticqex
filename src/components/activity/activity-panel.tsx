"use client";

import { useState } from "react";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { ActivityFiltersBar } from "@/components/activity/activity-filters";
import type { ActivityFilters } from "@/hooks/use-activity";

export function ActivityPanel() {
  const [filters, setFilters] = useState<ActivityFilters>({
    hide_self_referential: true,
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Full audit trail for API, MCP, and ticket changes.
        </p>
      </div>

      <ActivityFiltersBar
        key={JSON.stringify(filters)}
        value={filters}
        onChange={setFilters}
      />
      <ActivityFeed filters={filters} showTicketLink />
    </div>
  );
}
