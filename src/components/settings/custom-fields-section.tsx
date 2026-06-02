"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import {
  getCustomFieldTypeLabel,
  type CustomFieldDefinition,
  type CustomFieldGroup,
} from "@shared/custom-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import {
  CustomFieldDefinitionDialog,
  type CustomFieldFormValues,
} from "@/components/settings/custom-field-definition-dialog";

type FieldRow = CustomFieldDefinition;

function SortableFieldRow({
  field,
  onEdit,
  onDelete,
}: {
  field: FieldRow;
  onEdit: (field: FieldRow) => void;
  onDelete: (field: FieldRow) => void;
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
        "flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5",
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

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-medium">{field.label}</span>
          <Badge variant="secondary">{getCustomFieldTypeLabel(field.type)}</Badge>
          {field.required && <Badge variant="outline">Required</Badge>}
        </div>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {field.key}
        </p>
      </div>

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
  );
}

function FieldGroupList({
  title,
  group,
  fields,
  onReorder,
  onEdit,
  onDelete,
  onAdd,
}: {
  title: string;
  group: CustomFieldGroup;
  fields: FieldRow[];
  onReorder: (group: CustomFieldGroup, orderedIds: string[]) => Promise<void>;
  onEdit: (field: FieldRow) => void;
  onDelete: (field: FieldRow) => void;
  onAdd: (group: CustomFieldGroup) => void;
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAdd(group)}
        >
          <PlusIcon />
          Add
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          No {group} fields yet.
        </p>
      ) : (
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
              {fields.map((field) => (
                <SortableFieldRow
                  key={field.id}
                  field={field}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function DeleteFieldDialog({
  field,
  deleting,
  onCancel,
  onConfirm,
}: {
  field: FieldRow;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{field.label}&rdquo;?</DialogTitle>
          <DialogDescription>
            This removes the field definition and all stored values on tickets or
            contacts. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? "Deleting…" : "Delete field"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CustomFieldsSection() {
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogGroup, setDialogGroup] = useState<CustomFieldGroup>("ticket");
  const [editingField, setEditingField] = useState<FieldRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FieldRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<FieldRow[]>("/api/v1/custom-fields");
      setFields(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load custom fields");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount
    void load();
  }, [load]);

  const ticketFields = useMemo(
    () =>
      fields
        .filter((f) => f.group === "ticket")
        .sort((a, b) => a.position - b.position),
    [fields],
  );

  const contactFields = useMemo(
    () =>
      fields
        .filter((f) => f.group === "contact")
        .sort((a, b) => a.position - b.position),
    [fields],
  );

  function openCreate(group: CustomFieldGroup) {
    setDialogMode("create");
    setDialogGroup(group);
    setEditingField(null);
    setDialogOpen(true);
  }

  function openEdit(field: FieldRow) {
    setDialogMode("edit");
    setDialogGroup(field.group);
    setEditingField(field);
    setDialogOpen(true);
  }

  async function handleReorder(group: CustomFieldGroup, orderedIds: string[]) {
    const previous = fields;
    const byId = new Map(fields.map((f) => [f.id, f]));
    const reordered = orderedIds
      .map((id, position) => {
        const field = byId.get(id);
        return field ? { ...field, position } : null;
      })
      .filter((f): f is FieldRow => f !== null);
    const other = fields.filter((f) => f.group !== group);
    setFields([...other, ...reordered]);

    try {
      const updated = await apiFetch<FieldRow[]>("/api/v1/custom-fields/reorder", {
        method: "PUT",
        body: JSON.stringify({ group, ids: orderedIds }),
      });
      setFields((current) => [
        ...current.filter((f) => f.group !== group),
        ...updated,
      ]);
      setError(null);
    } catch (e) {
      setFields(previous);
      setError(e instanceof Error ? e.message : "Failed to reorder fields");
    }
  }

  async function handleDialogSubmit(values: CustomFieldFormValues) {
    setSaving(true);
    try {
      if (dialogMode === "create") {
        const created = await apiFetch<FieldRow>("/api/v1/custom-fields", {
          method: "POST",
          body: JSON.stringify({
            group: values.group,
            key: values.key,
            label: values.label,
            type: values.type,
            required: values.required,
            options: values.options,
            position: fields.filter((f) => f.group === values.group).length,
          }),
        });
        setFields((current) => [...current, created]);
      } else if (editingField) {
        const updated = await apiFetch<FieldRow>(
          `/api/v1/custom-fields/${editingField.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              label: values.label,
              type: values.type,
              required: values.required,
              options: values.options,
            }),
          },
        );
        setFields((current) =>
          current.map((f) => (f.id === editingField.id ? updated : f)),
        );
      }
      setError(null);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/v1/custom-fields/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setFields((current) => current.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete field");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FieldGroupList
        title="Ticket fields"
        group="ticket"
        fields={ticketFields}
        onReorder={handleReorder}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onAdd={openCreate}
      />

      <FieldGroupList
        title="Contact fields"
        group="contact"
        fields={contactFields}
        onReorder={handleReorder}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
        onAdd={openCreate}
      />

      <CustomFieldDefinitionDialog
        open={dialogOpen}
        mode={dialogMode}
        initialGroup={dialogGroup}
        field={editingField}
        saving={saving}
        onOpenChange={setDialogOpen}
        onSubmit={handleDialogSubmit}
      />

      {deleteTarget && (
        <DeleteFieldDialog
          field={deleteTarget}
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
}
