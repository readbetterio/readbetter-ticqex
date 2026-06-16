"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  flattenActivityEvents,
  useActivity,
  useTicketActivity,
  type ActivityFilters,
} from "@/hooks/use-activity";
import { ActivityRow } from "@/components/activity/activity-row";

function ActivityFeedContent({
  query,
  showTicketLink = false,
}: {
  query: ReturnType<typeof useActivity>;
  showTicketLink?: boolean;
}) {
  const events = flattenActivityEvents(query.data?.pages);

  return (
    <div className="space-y-3">
      {query.isPending ? (
        <>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </>
      ) : null}

      {query.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {query.error instanceof Error
              ? query.error.message
              : "Failed to load activity"}
          </AlertDescription>
        </Alert>
      ) : null}

      {!query.isPending && !query.isError && events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : null}

      {events.map((event) => (
        <ActivityRow
          key={event.id}
          event={event}
          showTicketLink={showTicketLink}
        />
      ))}

      {query.hasNextPage ? (
        <div className="flex justify-center pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function TicketActivityFeed({ ticketId }: { ticketId: string }) {
  const query = useTicketActivity(ticketId);
  return <ActivityFeedContent query={query} />;
}

function GlobalActivityFeed({
  filters,
  showTicketLink,
}: {
  filters: ActivityFilters;
  showTicketLink?: boolean;
}) {
  const query = useActivity(filters);
  return (
    <ActivityFeedContent query={query} showTicketLink={showTicketLink} />
  );
}

export function ActivityFeed({
  ticketId,
  filters,
  showTicketLink = false,
}: {
  ticketId?: string;
  filters?: ActivityFilters;
  showTicketLink?: boolean;
}) {
  if (ticketId) {
    return <TicketActivityFeed ticketId={ticketId} />;
  }

  return (
    <GlobalActivityFeed filters={filters ?? {}} showTicketLink={showTicketLink} />
  );
}
