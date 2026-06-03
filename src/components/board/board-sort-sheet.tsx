"use client";

import { useState } from "react";
import { CheckIcon, SortAscendingIcon } from "@phosphor-icons/react";
import {
  BOARD_SORT_OPTIONS,
  serializeBoardSort,
  formatBoardSortLabel,
  type BoardSort,
} from "@shared/board-sort";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function BoardSortSheet({
  sort,
  onSortChange,
}: {
  sort: BoardSort;
  onSortChange: (sort: BoardSort) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeValue = serializeBoardSort(sort);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label={`Sort: ${formatBoardSortLabel(sort)}`}
        >
          <SortAscendingIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Sort by</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1">
          {BOARD_SORT_OPTIONS.map((option) => {
            const value = serializeBoardSort(option);
            const selected = value === activeValue;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  onSortChange(option);
                  setOpen(false);
                }}
                className={cn(
                  "flex h-10 items-center justify-between rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted",
                  selected && "bg-muted font-medium",
                )}
              >
                <span>{formatBoardSortLabel(option)}</span>
                {selected ? (
                  <CheckIcon className="size-4 text-primary" />
                ) : null}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
