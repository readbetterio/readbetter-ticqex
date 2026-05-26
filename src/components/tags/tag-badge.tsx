"use client";

import { XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function TagBadge({
  name,
  color,
  onRemove,
  className,
}: {
  name: string;
  color: string;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-white",
        className,
      )}
      style={{ backgroundColor: color }}
    >
      <span className="truncate">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded-sm hover:bg-black/20"
          aria-label={`Remove ${name}`}
        >
          <XIcon className="size-3 shrink-0" />
        </button>
      )}
    </span>
  );
}
