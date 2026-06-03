"use client";

import { useMemo } from "react";
import { MultiValueSelect } from "@/components/option-list/multi-value-select";
import { optionValueKey } from "@/components/option-list/types";
import { DEFAULT_TAG_COLOR, type Tag } from "@/components/tags/types";

function tagToOption(tag: Tag) {
  return {
    value: tag.name,
    label: tag.name,
    color: tag.color,
  };
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
  const optionItems = useMemo(() => options.map(tagToOption), [options]);

  function handleChange(nextValues: string[]) {
    const nextTags = nextValues.map((name) => {
      const fromOptions = options.find(
        (tag) => optionValueKey(tag.name) === optionValueKey(name),
      );
      const fromValue = value.find(
        (tag) => optionValueKey(tag.name) === optionValueKey(name),
      );
      return (
        fromOptions ??
        fromValue ?? { name, color: DEFAULT_TAG_COLOR }
      );
    });
    onChange(nextTags);
  }

  return (
    <MultiValueSelect
      value={value.map((tag) => tag.name)}
      options={optionItems}
      onChange={handleChange}
      allowCreate
      onCreateOption={(name) => ({
        value: name,
        label: name,
        color: DEFAULT_TAG_COLOR,
      })}
      recentValues={recentNames}
      disabled={disabled}
      placeholder={placeholder}
      emptyMessage="No tags found."
    />
  );
}
