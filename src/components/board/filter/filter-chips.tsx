"use client";

import { XIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import {
  formatFilterConditionLabel,
  removeFilterCondition,
  type TicketFilter,
} from "@shared/ticket-filter";
import { cn } from "@/lib/utils";

export type FilterChipLabels = {
  users: Map<string, string>;
  contacts: Map<string, string>;
  customFields: Map<string, string>;
};

export function FilterChips({
  filter,
  labels,
  onFilterChange,
  className,
}: {
  filter: TicketFilter;
  labels: FilterChipLabels;
  onFilterChange: (filter: TicketFilter) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {filter.map((condition, index) => (
        <Badge
          key={`${condition.field}-${index}`}
          variant="secondary"
          className="shrink-0 gap-1 whitespace-nowrap"
        >
          <span>{formatFilterConditionLabel(condition, labels)}</span>
          <button
            type="button"
            className="rounded-sm opacity-70 hover:opacity-100"
            aria-label="Remove filter"
            onClick={() => onFilterChange(removeFilterCondition(filter, index))}
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
