"use client";

import { useMemo } from "react";
import {
  parseMultiselectValue,
  parseSelectOptions,
} from "@shared/custom-fields/validation";
import { isOptionListType, type CustomFieldType } from "@shared/custom-fields/types";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MultiValueSelect } from "@/components/option-list/multi-value-select";
import { OptionCombobox } from "@/components/option-list/option-combobox";
import { OPTION_COMBOBOX_THRESHOLD } from "@/components/option-list/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { usePersistedExpanded } from "@/hooks/use-persisted-expanded";

const UNSET = "__unset__";

export type TicketCustomFieldEditorDef = {
  id: string;
  key: string;
  label: string;
  type: string;
  position: number;
  required?: boolean;
  options: Record<string, unknown> | null;
};

function hasCustomFieldValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function jsonDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function TicketCustomFieldInput({
  def,
  value,
  disabled,
  optionsLoading,
  onValueChange,
}: {
  def: TicketCustomFieldEditorDef;
  value: unknown;
  disabled: boolean;
  optionsLoading: boolean;
  onValueChange: (value: unknown) => void;
}) {
  const type = def.type as CustomFieldType;
  const optionValues = parseSelectOptions(def.options);
  const optionItems = useMemo(
    () => optionValues.map((opt) => ({ value: opt, label: opt })),
    [optionValues],
  );

  if (isOptionListType(type) && optionsLoading) {
    return <Skeleton className="h-9 w-full" />;
  }

  switch (type) {
    case "boolean": {
      const selectValue =
        value === true ? "true" : value === false ? "false" : UNSET;
      return (
        <Select
          value={selectValue}
          onValueChange={(v) =>
            onValueChange(v === UNSET ? null : v === "true")
          }
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Unset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNSET}>Unset</SelectItem>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    case "select": {
      const selectValue =
        typeof value === "string" && value ? value : UNSET;

      if (optionValues.length > OPTION_COMBOBOX_THRESHOLD) {
        return (
          <OptionCombobox
            value={selectValue}
            options={optionItems}
            onValueChange={(v) => onValueChange(v === UNSET ? null : v)}
            allowUnset
            unsetValue={UNSET}
            unsetLabel="Unset"
            disabled={disabled}
            placeholder="Unset"
            searchPlaceholder="Search options…"
            emptyMessage="No options found."
          />
        );
      }

      return (
        <Select
          value={selectValue}
          onValueChange={(v) => onValueChange(v === UNSET ? null : v)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Unset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNSET}>Unset</SelectItem>
            {optionValues.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case "multiselect":
      return (
        <MultiValueSelect
          value={parseMultiselectValue(value)}
          options={optionItems}
          onChange={(next) => onValueChange(next.length ? next : null)}
          disabled={disabled}
          placeholder="Search options…"
          emptyMessage="No options found."
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={
            value === null || value === undefined
              ? ""
              : String(value)
          }
          onChange={(e) => {
            const raw = e.target.value;
            onValueChange(raw === "" ? null : raw);
          }}
          disabled={disabled}
        />
      );
    case "date":
      return (
        <Input
          type="date"
          value={
            typeof value === "string"
              ? value
              : value
                ? String(value)
                : ""
          }
          onChange={(e) =>
            onValueChange(e.target.value === "" ? null : e.target.value)
          }
          disabled={disabled}
        />
      );
    case "json":
      return (
        <Textarea
          value={jsonDisplayValue(value)}
          onChange={(e) => onValueChange(e.target.value)}
          rows={4}
          className="font-mono text-xs"
          disabled={disabled}
        />
      );
    case "url":
      return (
        <Input
          type="url"
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) =>
            onValueChange(e.target.value === "" ? null : e.target.value)
          }
          disabled={disabled}
          placeholder="https://"
        />
      );
    case "text":
    default:
      return (
        <Input
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) =>
            onValueChange(e.target.value === "" ? null : e.target.value)
          }
          disabled={disabled}
        />
      );
  }
}

export function TicketCustomFieldsSection({
  definitions,
  values,
  optionsLoading = false,
  saving,
  dirty,
  onValueChange,
  onSave,
}: {
  definitions: TicketCustomFieldEditorDef[];
  values: Record<string, unknown>;
  optionsLoading?: boolean;
  saving: boolean;
  dirty: boolean;
  onValueChange: (key: string, value: unknown) => void;
  onSave: () => void;
}) {
  const { expanded, toggleExpanded } = usePersistedExpanded(
    "ticqex.ticket-custom-fields.expanded.v1",
    true,
  );

  const rows = useMemo(() => {
    return [...definitions]
      .sort((a, b) => a.position - b.position)
      .map((def) => ({
        def,
        value: values[def.key],
      }));
  }, [definitions, values]);

  const collapsedSummary = useMemo(() => {
    const filled = rows.filter(({ value }) => hasCustomFieldValue(value)).length;
    if (filled === 0) return `${rows.length} fields`;
    return `${filled} of ${rows.length}`;
  }, [rows]);

  if (rows.length === 0) return null;

  return (
    <div className="-mx-4 border-t border-border">
      <button
        type="button"
        className="flex w-full items-center gap-2 border-b border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
        aria-expanded={expanded}
        onClick={toggleExpanded}
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" />
        )}
        Custom fields
        {!expanded && (
          <span className="ml-auto min-w-0 truncate text-xs font-normal text-muted-foreground">
            {collapsedSummary}
          </span>
        )}
      </button>

      {expanded && (
        <div className="space-y-3 p-4">
          {rows.map(({ def, value }) => (
            <div key={def.id} className="space-y-2">
              <Label className="text-muted-foreground">
                {def.label}
                {def.required ? (
                  <span className="text-destructive"> *</span>
                ) : null}
              </Label>
              <TicketCustomFieldInput
                def={def}
                value={value}
                disabled={saving}
                optionsLoading={optionsLoading}
                onValueChange={(next) => onValueChange(def.key, next)}
              />
            </div>
          ))}
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={saving || !dirty}
              onClick={onSave}
            >
              Save custom fields
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
