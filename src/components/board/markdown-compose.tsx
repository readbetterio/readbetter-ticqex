"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownContent } from "./markdown-content";
import { cn } from "@/lib/utils";

type ComposeMode = "write" | "preview";

function ComposeModeToggle({
  mode,
  onModeChange,
  disabled,
}: {
  mode: ComposeMode;
  onModeChange: (mode: ComposeMode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Comment editor mode"
      className="inline-flex rounded-md border border-border/70 bg-background/95 p-0.5 shadow-xs backdrop-blur-sm"
    >
      {(
        [
          { value: "write" as const, label: "md" },
          { value: "preview" as const, label: "preview" },
        ] as const
      ).map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          aria-pressed={mode === option.value}
          onClick={() => onModeChange(option.value)}
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors disabled:opacity-50",
            mode === option.value
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function MarkdownCompose({
  value,
  onChange,
  disabled = false,
  placeholder = "Write a comment…",
  minRows = 4,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minRows?: number;
  id?: string;
}) {
  const [mode, setMode] = useState<ComposeMode>("write");

  return (
    <div
      className={cn(
        "relative rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        disabled && "opacity-60",
      )}
    >
      <div className="pointer-events-none absolute top-2 right-2 z-10">
        <div className="pointer-events-auto">
          <ComposeModeToggle
            mode={mode}
            onModeChange={setMode}
            disabled={disabled}
          />
        </div>
      </div>

      {mode === "write" ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={minRows}
          className="min-h-24 resize-y border-0 bg-transparent pr-[5.5rem] pt-2 font-mono text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
        />
      ) : (
        <div className="min-h-24 p-3 pt-2 pr-[5.5rem]">
          <MarkdownContent content={value} />
        </div>
      )}
    </div>
  );
}

export function MarkdownComposeActions({
  onCancel,
  onSubmit,
  submitLabel,
  cancelLabel = "Cancel",
  disabled = false,
  submitDisabled = false,
}: {
  onCancel?: () => void;
  onSubmit: () => void;
  submitLabel: string;
  cancelLabel?: string;
  disabled?: boolean;
  submitDisabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2">
      {onCancel ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={disabled || submitDisabled}
        onClick={onSubmit}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
