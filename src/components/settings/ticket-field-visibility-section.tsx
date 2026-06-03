"use client";

import { PlusIcon } from "@phosphor-icons/react";
import {
  type CustomFieldDefinition,
  type CustomFieldGroup,
} from "@shared/custom-fields";
import type { TicketFieldCatalogEntry } from "@shared/ticket-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SortableCustomFieldRow,
  SortableCustomFieldsList,
} from "@/components/settings/sortable-custom-fields-list";
import { cn } from "@/lib/utils";

type FieldRow = CustomFieldDefinition;
type VisibilityPatch = Partial<
  Pick<TicketFieldCatalogEntry, "showOnCard" | "showInTicket">
>;

const coreVisibilityGrid =
  "grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center gap-2";
const customVisibilityGrid =
  "grid grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_4.5rem_4.5rem] items-center gap-2";

function CoreVisibilityHeader() {
  return (
    <div
      className={cn(
        coreVisibilityGrid,
        "px-2 pb-1 text-xs font-medium text-muted-foreground",
      )}
    >
      <span>Field</span>
      <span className="text-center">Card</span>
      <span className="text-center">In ticket</span>
    </div>
  );
}

function CustomFieldsVisibilityHeader() {
  return (
    <div
      className={cn(
        customVisibilityGrid,
        "px-2 pb-1 text-xs font-medium text-muted-foreground",
      )}
    >
      <span aria-hidden className="block w-0" />
      <span>Field</span>
      <span className="text-center">Card</span>
      <span className="text-center">In ticket</span>
      <span aria-hidden className="block w-0" />
    </div>
  );
}

function VisibilityToggles({
  entry,
  disabled,
  onChange,
}: {
  entry: TicketFieldCatalogEntry;
  disabled?: boolean;
  onChange: (patch: VisibilityPatch) => void;
}) {
  return (
    <>
      <div className="flex justify-center">
        <Checkbox
          checked={entry.showOnCard}
          disabled={disabled || entry.locked}
          aria-label={`Show ${entry.label} on card`}
          onCheckedChange={(checked) =>
            onChange({ showOnCard: checked === true })
          }
        />
      </div>
      <div className="flex justify-center">
        <Checkbox
          checked={entry.showInTicket}
          disabled={disabled || entry.locked}
          aria-label={`Show ${entry.label} in ticket`}
          onCheckedChange={(checked) =>
            onChange({ showInTicket: checked === true })
          }
        />
      </div>
    </>
  );
}

function CoreFieldRow({
  entry,
  onChange,
}: {
  entry: TicketFieldCatalogEntry;
  onChange: (patch: VisibilityPatch) => void;
}) {
  return (
    <div
      className={cn(
        coreVisibilityGrid,
        "rounded-lg border border-border bg-card px-2 py-1.5",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-medium">{entry.label}</span>
          <Badge variant="outline">Core</Badge>
          {entry.locked && <Badge variant="secondary">Always visible</Badge>}
        </div>
      </div>
      <VisibilityToggles
        entry={entry}
        disabled={entry.locked}
        onChange={onChange}
      />
    </div>
  );
}

export function TicketFieldVisibilitySection({
  coreEntries,
  customEntries,
  fields,
  onVisibilityChange,
  onReorder,
  onEdit,
  onDelete,
  onAdd,
  onSaveVisibility,
  savingVisibility,
  visibilityDirty,
}: {
  coreEntries: TicketFieldCatalogEntry[];
  customEntries: TicketFieldCatalogEntry[];
  fields: FieldRow[];
  onVisibilityChange: (id: string, patch: VisibilityPatch) => void;
  onReorder: (group: CustomFieldGroup, orderedIds: string[]) => Promise<void>;
  onEdit: (field: FieldRow) => void;
  onDelete: (field: FieldRow) => void;
  onAdd: (group: CustomFieldGroup) => void;
  onSaveVisibility: () => Promise<void>;
  savingVisibility: boolean;
  visibilityDirty: boolean;
}) {
  const entryById = new Map(customEntries.map((entry) => [entry.id, entry]));

  return (
    <div className="space-y-4">
      <CoreVisibilityHeader />
      <div className="space-y-2">
        {coreEntries.map((entry) => (
          <CoreFieldRow
            key={entry.id}
            entry={entry}
            onChange={(patch) => onVisibilityChange(entry.id, patch)}
          />
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAdd("ticket")}
        >
          <PlusIcon />
          Add custom field
        </Button>
      </div>

      <SortableCustomFieldsList
        fields={fields}
        group="ticket"
        emptyMessage="No custom ticket fields yet."
        onReorder={onReorder}
        header={<CustomFieldsVisibilityHeader />}
        renderRow={(field) => {
          const entry = entryById.get(`custom:${field.id}`);
          if (!entry) return null;
          return (
            <SortableCustomFieldRow
              field={field}
              onEdit={onEdit}
              onDelete={onDelete}
              className={customVisibilityGrid}
              infoClassName="min-w-0"
            >
              <VisibilityToggles
                entry={entry}
                onChange={(patch) => onVisibilityChange(entry.id, patch)}
              />
            </SortableCustomFieldRow>
          );
        }}
      />

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={!visibilityDirty || savingVisibility}
          onClick={() => void onSaveVisibility()}
        >
          {savingVisibility ? "Saving..." : "Save visibility"}
        </Button>
      </div>
    </div>
  );
}
