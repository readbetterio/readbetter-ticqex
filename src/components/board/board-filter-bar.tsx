"use client";

import { useState } from "react";
import { FunnelIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { type TicketFilter } from "@shared/ticket-filter";
import { cn } from "@/lib/utils";
import { BoardFilterForm } from "./filter/board-filter-form";
import { FilterChips } from "./filter/filter-chips";
import { useFilterDraft } from "./filter/use-filter-draft";

export function BoardFilterBar({
  filter,
  onFilterChange,
  className,
}: {
  filter: TicketFilter;
  onFilterChange: (filter: TicketFilter) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const draft = useFilterDraft(filter, onFilterChange, () => setOpen(false));

  const filterPopover = (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void draft.loadOptions();
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="shrink-0">
          <FunnelIcon />
          Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(20rem,calc(100vw-2rem))] space-y-3"
      >
        <BoardFilterForm draft={draft} />
      </PopoverContent>
    </Popover>
  );

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center justify-end gap-2 overflow-hidden",
        className,
      )}
    >
      {filter.length > 0 ? (
        <>
          <FilterChips
            filter={filter}
            labels={{
              users: draft.userLabels,
              contacts: draft.contactLabels,
              customFields: draft.customFieldLabels,
            }}
            onFilterChange={onFilterChange}
            className="no-scrollbar min-w-0 overflow-x-auto overscroll-x-contain"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => onFilterChange([])}
          >
            Clear all
          </Button>
        </>
      ) : null}
      {filterPopover}
    </div>
  );
}
