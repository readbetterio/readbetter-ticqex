"use client";

import { Fragment } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DotsSixVerticalIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import {
  getCustomFieldTypeLabel,
  type CustomFieldDefinition,
  type CustomFieldGroup,
} from "@shared/custom-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const defaultLayoutClassName = "flex items-center gap-2";

export function SortableCustomFieldRow({
  field,
  onEdit,
  onDelete,
  className,
  infoClassName = "min-w-0 flex-1",
  children,
}: {
  field: CustomFieldDefinition;
  onEdit: (field: CustomFieldDefinition) => void;
  onDelete: (field: CustomFieldDefinition) => void;
  className?: string;
  infoClassName?: string;
  children?: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-border bg-card px-2 py-1.5",
        className ?? defaultLayoutClassName,
        isDragging && "z-10 opacity-60 shadow-md",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        aria-label={`Reorder ${field.label}`}
        {...attributes}
        {...listeners}
      >
        <DotsSixVerticalIcon className="size-4" />
      </button>

      <div className={infoClassName}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-medium">{field.label}</span>
          <Badge variant="secondary">
            {getCustomFieldTypeLabel(field.type)}
          </Badge>
          {field.required && <Badge variant="outline">Required</Badge>}
        </div>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {field.key}
        </p>
      </div>

      {children}

      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${field.label}`}
          onClick={() => onEdit(field)}
        >
          <PencilSimpleIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${field.label}`}
          onClick={() => onDelete(field)}
        >
          <TrashIcon className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export function SortableCustomFieldsList({
  fields,
  group,
  emptyMessage,
  onReorder,
  header,
  renderRow,
}: {
  fields: CustomFieldDefinition[];
  group: CustomFieldGroup;
  emptyMessage: string;
  onReorder: (group: CustomFieldGroup, orderedIds: string[]) => Promise<void>;
  header?: React.ReactNode;
  renderRow: (field: CustomFieldDefinition) => React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(fields, oldIndex, newIndex);
    await onReorder(
      group,
      reordered.map((f) => f.id),
    );
  }

  if (fields.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {header}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => void onDragEnd(e)}
      >
        <SortableContext
          items={fields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {fields.map((field) => {
              const row = renderRow(field);
              if (row === null) return null;
              return <Fragment key={field.id}>{row}</Fragment>;
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
