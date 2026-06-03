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
import {
  optionMatchesSearch,
  type OptionItem,
} from "@/components/option-list/types";

export function OptionCombobox({
  value,
  options,
  onValueChange,
  allowUnset = false,
  unsetValue = "__unset__",
  unsetLabel = "Unset",
  placeholder = "Select…",
  disabled = false,
  searchPlaceholder = "Search…",
  emptyMessage = "No options found.",
  className,
}: {
  value: string;
  options: OptionItem[];
  onValueChange: (value: string) => void;
  allowUnset?: boolean;
  unsetValue?: string;
  unsetLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const isUnset = allowUnset && value === unsetValue;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between font-normal",
            className,
          )}
        >
          <span className="truncate">
            {isUnset ? unsetLabel : (selected?.label ?? placeholder)}
          </span>
          <CaretDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command
          filter={(label, search) =>
            optionMatchesSearch(label, search) ? 1 : 0
          }
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {allowUnset && (
                <CommandItem
                  value={unsetLabel}
                  onSelect={() => {
                    onValueChange(unsetValue);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "size-4",
                      isUnset ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {unsetLabel}
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "size-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.color ? (
                    <span
                      className="size-2 shrink-0 rounded-full ring-1 ring-border"
                      style={{ backgroundColor: option.color }}
                    />
                  ) : null}
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
