"use client";

import {
  type CustomFieldDefinition,
  type CustomFieldGroup,
} from "@shared/custom-fields";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@phosphor-icons/react";
import {
  SortableCustomFieldRow,
  SortableCustomFieldsList,
} from "@/components/settings/sortable-custom-fields-list";

export function ContactCustomFieldsList({
  fields,
  onReorder,
  onEdit,
  onDelete,
  onAdd,
}: {
  fields: CustomFieldDefinition[];
  onReorder: (group: CustomFieldGroup, orderedIds: string[]) => Promise<void>;
  onEdit: (field: CustomFieldDefinition) => void;
  onDelete: (field: CustomFieldDefinition) => void;
  onAdd: (group: CustomFieldGroup) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAdd("contact")}
        >
          <PlusIcon />
          Add
        </Button>
      </div>

      <SortableCustomFieldsList
        fields={fields}
        group="contact"
        emptyMessage="No contact fields yet."
        onReorder={onReorder}
        renderRow={(field) => (
          <SortableCustomFieldRow
            field={field}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      />
    </div>
  );
}
