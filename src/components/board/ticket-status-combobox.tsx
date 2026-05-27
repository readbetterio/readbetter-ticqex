"use client";

import { useState } from "react";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type StatusOption = {
  id: string;
  name: string;
  color: string;
};

function statusMatchesSearch(name: string, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return name.toLowerCase().includes(query);
}

export function TicketStatusCombobox({
  statuses,
  value,
  onValueChange,
  disabled = false,
}: {
  statuses: StatusOption[];
  value: string;
  onValueChange: (statusId: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = statuses.find((status) => status.id === value);

  if (!selected && statuses.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label="Change status"
          disabled={disabled || statuses.length === 0}
          className="h-7 shrink-0 gap-2 px-2 font-medium"
        >
          {selected && (
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: selected.color }}
            />
          )}
          <span className="max-w-[8rem] truncate text-sm">
            {selected?.name ?? "Status"}
          </span>
          <CaretDownIcon className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="end">
        <Command
          filter={(name, search) =>
            statusMatchesSearch(name, search) ? 1 : 0
          }
        >
          <CommandInput placeholder="Search statuses…" />
          <CommandList>
            <CommandEmpty>No status found.</CommandEmpty>
            <CommandGroup>
              {statuses.map((status) => (
                <CommandItem
                  key={status.id}
                  value={status.name}
                  onSelect={() => {
                    onValueChange(status.id);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "size-4",
                      value === status.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  {status.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
