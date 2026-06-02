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
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function contactMatchesSearch(username: string, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return username.toLowerCase().includes(query);
}

export type ContactOption = {
  id: string;
  username: string;
};

export function ContactFilterCombobox({
  contacts,
  value,
  onValueChange,
  placeholder = "Select contact…",
}: {
  contacts: ContactOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = contacts.find((contact) => contact.id === value);

  return (
    <div className="space-y-2">
      <Label>Contact</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">
              {selected ? selected.username : placeholder}
            </span>
            <CaretDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command
            filter={(value, search) =>
              contactMatchesSearch(value, search) ? 1 : 0
            }
          >
            <CommandInput placeholder="Search contacts…" />
            <CommandList>
              <CommandEmpty>No contact found.</CommandEmpty>
              <CommandGroup>
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={contact.username}
                    onSelect={() => {
                      onValueChange(contact.id);
                      setOpen(false);
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        "size-4",
                        value === contact.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {contact.username}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ContactFilterMultiCombobox({
  contacts,
  selected,
  onSelectedChange,
}: {
  contacts: ContactOption[];
  selected: string[];
  onSelectedChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabels = contacts
    .filter((contact) => selected.includes(contact.id))
    .map((contact) => contact.username);

  return (
    <div className="space-y-2">
      <Label>Contacts</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-auto min-h-9 w-full justify-between py-2 font-normal"
          >
            <span className="truncate text-left">
              {selectedLabels.length > 0
                ? selectedLabels.join(", ")
                : "Select contacts…"}
            </span>
            <CaretDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command
            filter={(value, search) =>
              contactMatchesSearch(value, search) ? 1 : 0
            }
          >
            <CommandInput placeholder="Search contacts…" />
            <CommandList>
              <CommandEmpty>No contact found.</CommandEmpty>
              <CommandGroup>
                {contacts.map((contact) => {
                  const isSelected = selected.includes(contact.id);
                  return (
                    <CommandItem
                      key={contact.id}
                      value={contact.username}
                      onSelect={() => {
                        onSelectedChange(
                          isSelected
                            ? selected.filter((id) => id !== contact.id)
                            : [...selected, contact.id],
                        );
                      }}
                    >
                      <CheckIcon
                        className={cn(
                          "size-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {contact.username}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
