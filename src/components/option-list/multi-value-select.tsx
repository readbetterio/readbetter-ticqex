"use client";

import {
  type KeyboardEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { PlusIcon } from "@phosphor-icons/react";
import { TagBadge } from "@/components/tags/tag-badge";
import { DEFAULT_TAG_COLOR } from "@/components/tags/types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  optionValueKey,
  sortOptions,
  type OptionItem,
} from "@/components/option-list/types";

export function MultiValueSelect({
  value,
  options,
  onChange,
  allowCreate = false,
  onCreateOption,
  recentValues = [],
  disabled = false,
  placeholder = "Search…",
  emptyMessage = "No options found.",
  badgeColor = DEFAULT_TAG_COLOR,
}: {
  value: string[];
  options: OptionItem[];
  onChange: (next: string[]) => void;
  allowCreate?: boolean;
  onCreateOption?: (value: string) => OptionItem;
  recentValues?: string[];
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  badgeColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const optionByKey = useMemo(() => {
    const map = new Map<string, OptionItem>();
    for (const option of options) {
      map.set(optionValueKey(option.value), option);
    }
    return map;
  }, [options]);

  const selectedKeys = useMemo(
    () => new Set(value.map((entry) => optionValueKey(entry))),
    [value],
  );

  const sortedOptions = useMemo(
    () => sortOptions(options, recentValues, query, selectedKeys),
    [options, recentValues, query, selectedKeys],
  );

  const trimmedQuery = query.trim();
  const exactMatch =
    trimmedQuery.length > 0 &&
    (options.some(
      (option) => optionValueKey(option.value) === optionValueKey(trimmedQuery),
    ) ||
      value.some(
        (entry) => optionValueKey(entry) === optionValueKey(trimmedQuery),
      ));

  const canCreate = allowCreate && trimmedQuery.length > 0 && !exactMatch;

  function resolveBadge(name: string): OptionItem {
    return (
      optionByKey.get(optionValueKey(name)) ?? {
        value: name,
        label: name,
        color: badgeColor,
      }
    );
  }

  function addValue(nextValue: string) {
    if (selectedKeys.has(optionValueKey(nextValue))) return;
    onChange([...value, nextValue]);
    setQuery("");
  }

  function removeValue(name: string) {
    const key = optionValueKey(name);
    onChange(value.filter((entry) => optionValueKey(entry) !== key));
  }

  function commitQuery() {
    if (!trimmedQuery) return;

    const existing = options.find(
      (option) => optionValueKey(option.value) === optionValueKey(trimmedQuery),
    );
    if (existing) {
      addValue(existing.value);
      return;
    }

    const selected = value.find(
      (entry) => optionValueKey(entry) === optionValueKey(trimmedQuery),
    );
    if (selected) {
      addValue(selected);
      return;
    }

    if (!allowCreate) {
      setQuery("");
      return;
    }

    const created = onCreateOption?.(trimmedQuery) ?? {
      value: trimmedQuery,
      label: trimmedQuery,
      color: badgeColor,
    };
    addValue(created.value);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (!trimmedQuery && e.key === "Tab") return;
      if (trimmedQuery) {
        e.preventDefault();
        if (sortedOptions.length > 0 && e.key === "Enter") {
          addValue(sortedOptions[0]!.value);
          return;
        }
        commitQuery();
      }
    } else if (e.key === "Backspace" && !query && value.length) {
      onChange(value.slice(0, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-disabled={disabled}
          className={cn(
            "flex min-h-9 flex-wrap items-center gap-1 rounded-lg border border-input bg-background px-2 py-1 dark:bg-input/30",
            disabled && "cursor-not-allowed opacity-50",
          )}
          onClick={() => {
            if (disabled) return;
            inputRef.current?.focus();
            setOpen(true);
          }}
        >
          {value.map((entry) => {
            const badge = resolveBadge(entry);
            return (
              <TagBadge
                key={optionValueKey(entry)}
                name={badge.label}
                color={badge.color ?? badgeColor}
                onRemove={disabled ? undefined : () => removeValue(entry)}
              />
            );
          })}
          <input
            ref={inputRef}
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            onBlur={() => {
              if (trimmedQuery) commitQuery();
            }}
            placeholder={value.length ? "" : placeholder}
            className="min-w-24 flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[var(--radix-popover-anchor-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (inputRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
      >
        <Command shouldFilter={false}>
          <CommandList id={listId}>
            {sortedOptions.length === 0 && !canCreate ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : (
              <CommandGroup>
                {sortedOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onMouseDown={(e) => e.preventDefault()}
                    onSelect={() => {
                      addValue(option.value);
                      inputRef.current?.focus();
                    }}
                  >
                    {option.color ? (
                      <span
                        className="size-2.5 shrink-0 rounded-full ring-1 ring-border"
                        style={{ backgroundColor: option.color }}
                      />
                    ) : null}
                    {option.label}
                  </CommandItem>
                ))}
                {canCreate && (
                  <CommandItem
                    value={`__create__${trimmedQuery}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onSelect={() => {
                      commitQuery();
                      inputRef.current?.focus();
                    }}
                  >
                    <PlusIcon className="size-4 opacity-70" />
                    Create &ldquo;{trimmedQuery}&rdquo;
                  </CommandItem>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
