"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  CUSTOM_FIELD_TYPE_LIST,
  getCustomFieldTypeMeta,
  isOptionListType,
  isValidFieldKey,
  normalizeSelectOptions,
  parseSelectOptions,
  slugifyLabelToKey,
  validateDefinitionOptions,
  type CustomFieldDefinition,
  type CustomFieldGroup,
  type CustomFieldType,
} from "@shared/custom-fields";

export type CustomFieldFormValues = {
  group: CustomFieldGroup;
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options: Record<string, unknown> | null;
};

function selectValuesToText(options: Record<string, unknown> | null): string {
  return parseSelectOptions(options).join("\n");
}

function textToSelectOptions(text: string): Record<string, unknown> | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return normalizeSelectOptions(lines);
}

function buildInitialState(
  mode: "create" | "edit",
  initialGroup: CustomFieldGroup,
  field: CustomFieldDefinition | null,
) {
  if (mode === "edit" && field) {
    return {
      group: field.group,
      label: field.label,
      key: field.key,
      keyTouched: true,
      type: field.type,
      required: field.required,
      selectValuesText: selectValuesToText(field.options),
    };
  }
  return {
    group: initialGroup,
    label: "",
    key: "",
    keyTouched: false,
    type: "text" as CustomFieldType,
    required: false,
    selectValuesText: "",
  };
}

function CustomFieldDefinitionForm({
  mode,
  initialGroup,
  field,
  saving,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  initialGroup: CustomFieldGroup;
  field: CustomFieldDefinition | null;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: CustomFieldFormValues) => Promise<void>;
}) {
  const initial = buildInitialState(mode, initialGroup, field);
  const [group, setGroup] = useState(initial.group);
  const [label, setLabel] = useState(initial.label);
  const [key, setKey] = useState(initial.key);
  const [keyTouched, setKeyTouched] = useState(initial.keyTouched);
  const [type, setType] = useState<CustomFieldType>(initial.type);
  const [required, setRequired] = useState(initial.required);
  const [selectValuesText, setSelectValuesText] = useState(initial.selectValuesText);
  const [error, setError] = useState<string | null>(null);

  const typeMeta = getCustomFieldTypeMeta(type);

  function handleLabelChange(nextLabel: string) {
    setLabel(nextLabel);
    if (mode === "create" && !keyTouched) {
      setKey(slugifyLabelToKey(nextLabel));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedLabel = label.trim();
    const trimmedKey = key.trim();
    if (!trimmedLabel) {
      setError("Label is required.");
      return;
    }
    if (!trimmedKey || !isValidFieldKey(trimmedKey)) {
      setError(
        "Key must start with a letter and contain only lowercase letters, numbers, and underscores.",
      );
      return;
    }

    const options = isOptionListType(type)
      ? textToSelectOptions(selectValuesText)
      : null;
    const optionsError = validateDefinitionOptions(type, options);
    if (optionsError) {
      setError(optionsError);
      return;
    }

    setError(null);
    try {
      await onSubmit({
        group,
        key: trimmedKey,
        label: trimmedLabel,
        type,
        required,
        options,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save field");
    }
  }

  return (
    <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {mode === "create" && (
        <>
          <div className="space-y-2">
            <Label>Applies to</Label>
            <Select
              value={group}
              onValueChange={(v) => setGroup(v as CustomFieldGroup)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ticket">Tickets</SelectItem>
                <SelectItem value="contact">Contacts</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
        </>
      )}

      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as CustomFieldType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CUSTOM_FIELD_TYPE_LIST.map((meta) => (
              <SelectItem key={meta.type} value={meta.type}>
                {meta.label}
                {meta.advanced ? " (advanced)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {typeMeta?.description && (
          <p className="text-xs text-muted-foreground">{typeMeta.description}</p>
        )}
        {mode === "edit" && (
          <p className="text-xs text-muted-foreground">
            Changing type is only allowed when no tickets or contacts have values
            for this field.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cf-label">Label</Label>
        <Input
          id="cf-label"
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder="e.g. Plan tier"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cf-key">Key</Label>
        <Input
          id="cf-key"
          value={key}
          disabled={mode === "edit"}
          onChange={(e) => {
            setKeyTouched(true);
            setKey(e.target.value);
          }}
          placeholder="plan_tier"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Used in API payloads as{" "}
          <code className="rounded bg-muted px-1">custom_fields.key</code>
        </p>
      </div>

      {typeMeta?.supportsSelectOptions && (
        <div className="space-y-2">
          <Label htmlFor="cf-select-values">Options (one per line)</Label>
          <Textarea
            id="cf-select-values"
            value={selectValuesText}
            onChange={(e) => setSelectValuesText(e.target.value)}
            rows={4}
            placeholder={"starter\npro\nenterprise"}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Checkbox
          id="cf-required"
          checked={required}
          onCheckedChange={(checked) => setRequired(checked === true)}
        />
        <Label htmlFor="cf-required" className="font-normal">
          Required field (metadata for agents; not enforced in UI yet)
        </Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : mode === "create" ? "Create field" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function CustomFieldDefinitionDialog({
  open,
  mode,
  initialGroup,
  field,
  saving,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  initialGroup: CustomFieldGroup;
  field: CustomFieldDefinition | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CustomFieldFormValues) => Promise<void>;
}) {
  const formKey =
    mode === "edit" && field
      ? `edit-${field.id}`
      : `create-${initialGroup}`;

  async function handleSubmit(values: CustomFieldFormValues) {
    await onSubmit(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add custom field" : "Edit custom field"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Define a typed field for tickets or contacts. Values are set via API and agents."
              : "Update the label, type, and options. Group and key cannot be changed."}
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <CustomFieldDefinitionForm
            key={formKey}
            mode={mode}
            initialGroup={initialGroup}
            field={field}
            saving={saving}
            onCancel={() => onOpenChange(false)}
            onSubmit={handleSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
