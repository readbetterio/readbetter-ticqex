"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatActivityAction,
  formatActivitySource,
  formatChangeValue,
} from "@shared/activity/format";
import {
  ACTIVITY_ACTOR_TYPES,
  ACTIVITY_OUTCOMES,
  type ActivityOutcome,
  type ActivitySource,
} from "@shared/activity/actions";
import type { ActivityEvent } from "@shared/activity/types";

function OutcomeBadge({ outcome }: { outcome: ActivityOutcome }) {
  return (
    <Badge
      variant={outcome === ACTIVITY_OUTCOMES.FAILED ? "destructive" : "secondary"}
      className="shrink-0 text-[10px]"
    >
      {outcome}
    </Badge>
  );
}

function SourceBadge({ source }: { source: ActivitySource }) {
  return (
    <Badge variant="outline" className="shrink-0 text-[10px]">
      {formatActivitySource(source)}
    </Badge>
  );
}

function ActorLabel({ event }: { event: ActivityEvent }) {
  const isApiKey = event.actor_type === ACTIVITY_ACTOR_TYPES.API_KEY;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate text-sm font-medium text-foreground">
        {event.actor_snapshot.label}
      </span>
      {isApiKey ? (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          API key
        </Badge>
      ) : null}
    </div>
  );
}

function ChangesList({ event }: { event: ActivityEvent }) {
  if (!event.changes.length) return null;

  return (
    <ul className="mt-2 space-y-1 rounded-md bg-background/80 p-2 text-xs">
      {event.changes.map((change) => (
        <li key={`${event.id}-${change.field}`}>
          <span className="font-medium">{change.label ?? change.field}: </span>
          <span className="text-muted-foreground">{formatChangeValue(change.from)}</span>
          <span className="px-1 text-muted-foreground">→</span>
          <span>{formatChangeValue(change.to)}</span>
        </li>
      ))}
    </ul>
  );
}

export function ActivityRow({
  event,
  showTicketLink = false,
}: {
  event: ActivityEvent;
  showTicketLink?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    event.changes.length > 0 ||
    Boolean(event.metadata.body_preview) ||
    Boolean(event.request_path);

  return (
    <div className="rounded-lg bg-muted/50 p-3 text-sm ring-1 ring-foreground/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{formatActivityAction(event.action)}</span>
            <OutcomeBadge outcome={event.outcome} />
            <SourceBadge source={event.source} />
            {event.status_code ? (
              <Badge variant="outline" className="text-[10px]">
                {event.status_code}
              </Badge>
            ) : null}
          </div>
          <ActorLabel event={event} />
          <p className="text-foreground/90">{event.summary}</p>
          {showTicketLink && event.ticket_snapshot ? (
            <Link
              href={`/board/tickets/${event.ticket_snapshot.id}`}
              className="text-xs text-primary hover:underline"
            >
              {event.ticket_snapshot.title}
            </Link>
          ) : null}
          <time
            dateTime={event.occurred_at}
            className="block text-xs tabular-nums text-muted-foreground"
          >
            {new Date(event.occurred_at).toLocaleString()}
          </time>
          {event.request_method && event.request_path ? (
            <p className="font-mono text-[11px] text-muted-foreground">
              {event.request_method} {event.request_path}
            </p>
          ) : null}
        </div>
        {hasDetails ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={expanded ? "Hide details" : "Show details"}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? <CaretDownIcon /> : <CaretRightIcon />}
          </Button>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-2 space-y-2">
          <ChangesList event={event} />
          {typeof event.metadata.body_preview === "string" ? (
            <p className="rounded-md bg-background/80 p-2 text-xs text-muted-foreground">
              {event.metadata.body_preview}
            </p>
          ) : null}
          {typeof event.metadata.error_message === "string" ? (
            <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {event.metadata.error_message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
