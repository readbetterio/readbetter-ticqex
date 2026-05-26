"use client";

import {
  KeyboardEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { PlusIcon } from "@phosphor-icons/react";
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
import { TagBadge } from "@/components/tags/tag-badge";
import { DEFAULT_TAG_COLOR, type Tag } from "@/components/tags/types";

function tagNameKey(name: string): string {
  return name.trim().toLowerCase();
}

function sortTagOptions(
  options: Tag[],
  recentNames: string[],
  query: string,
  selectedKeys: Set<string>,
): Tag[] {
  const q = query.trim().toLowerCase();
  const filtered = options.filter((tag) => {
    if (selectedKeys.has(tagNameKey(tag.name))) return false;
    if (!q) return true;
    return tag.name.toLowerCase().includes(q);
  });

  const recentRank = new Map(
    recentNames.map((name, index) => [tagNameKey(name), index]),
  );

  return [...filtered].sort((a, b) => {
    const aRank = recentRank.get(tagNameKey(a.name));
    const bRank = recentRank.get(tagNameKey(b.name));
    if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
    if (aRank !== undefined) return -1;
    if (bRank !== undefined) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export function TagMultiSelect({
  value,
  options,
  onChange,
  recentNames = [],
  disabled = false,
  placeholder = "Search or add tags…",
}: {
  value: Tag[];
  options: Tag[];
  onChange: (next: Tag[]) => void;
  recentNames?: string[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = "tag-multi-select-list";

  const selectedKeys = useMemo(
    () => new Set(value.map((tag) => tagNameKey(tag.name))),
    [value],
  );

  const sortedOptions = useMemo(
    () => sortTagOptions(options, recentNames, query, selectedKeys),
    [options, recentNames, query, selectedKeys],
  );

  const trimmedQuery = query.trim();
  const exactMatch =
    trimmedQuery.length > 0 &&
    (options.some((tag) => tagNameKey(tag.name) === tagNameKey(trimmedQuery)) ||
      value.some((tag) => tagNameKey(tag.name) === tagNameKey(trimmedQuery)));

  const canCreate = trimmedQuery.length > 0 && !exactMatch;

  function addTag(tag: Tag) {
    if (selectedKeys.has(tagNameKey(tag.name))) return;
    onChange([...value, tag]);
    setQuery("");
  }

  function removeTag(name: string) {
    const key = tagNameKey(name);
    onChange(value.filter((tag) => tagNameKey(tag.name) !== key));
  }

  function commitQuery() {
    if (!trimmedQuery) return;

    const existing =
      options.find((tag) => tagNameKey(tag.name) === tagNameKey(trimmedQuery)) ??
      value.find((tag) => tagNameKey(tag.name) === tagNameKey(trimmedQuery));

    if (existing) {
      addTag(existing);
      return;
    }

    addTag({ name: trimmedQuery, color: DEFAULT_TAG_COLOR });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (!trimmedQuery && e.key === "Tab") return;
      if (trimmedQuery) {
        e.preventDefault();
        if (sortedOptions.length > 0 && e.key === "Enter") {
          addTag(sortedOptions[0]!);
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
          {value.map((tag) => (
            <TagBadge
              key={tag.id ?? tagNameKey(tag.name)}
              name={tag.name}
              color={tag.color}
              onRemove={disabled ? undefined : () => removeTag(tag.name)}
            />
          ))}
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
              <CommandEmpty>No tags found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {sortedOptions.map((tag) => (
                  <CommandItem
                    key={tag.id ?? tag.name}
                    value={tag.name}
                    onMouseDown={(e) => e.preventDefault()}
                    onSelect={() => {
                      addTag(tag);
                      inputRef.current?.focus();
                    }}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full ring-1 ring-border"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
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
