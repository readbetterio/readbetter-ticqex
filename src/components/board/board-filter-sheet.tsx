"use client";

import { useState } from "react";
import { FunnelIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { type TicketFilter } from "@shared/ticket-filter";
import { BoardFilterForm } from "./filter/board-filter-form";
import { FilterChips } from "./filter/filter-chips";
import { useFilterDraft } from "./filter/use-filter-draft";

export function BoardFilterSheet({
  filter,
  onFilterChange,
}: {
  filter: TicketFilter;
  onFilterChange: (filter: TicketFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const draft = useFilterDraft(filter, onFilterChange, () => setOpen(false));
  const activeCount = filter.length;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void draft.loadOptions();
      }}
    >
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative shrink-0"
          aria-label={
            activeCount > 0 ? `Filters (${activeCount} active)` : "Filters"
          }
        >
          <FunnelIcon />
          {activeCount > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground tabular-nums">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="gap-4">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        {activeCount > 0 ? (
          <div className="flex flex-col gap-2">
            <FilterChips
              filter={filter}
              labels={{
                users: draft.userLabels,
                contacts: draft.contactLabels,
                customFields: draft.customFieldLabels,
              }}
              onFilterChange={onFilterChange}
              className="flex-wrap"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => onFilterChange([])}
            >
              Clear all
            </Button>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 overflow-y-auto">
          <BoardFilterForm draft={draft} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
