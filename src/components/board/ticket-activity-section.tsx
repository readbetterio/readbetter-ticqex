"use client";

import { ActivityFeed } from "@/components/activity/activity-feed";

export function TicketActivitySection({ ticketId }: { ticketId: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
      <ActivityFeed ticketId={ticketId} />
    </div>
  );
}
