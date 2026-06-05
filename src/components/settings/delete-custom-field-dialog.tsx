"use client";

import type { CustomFieldDefinition } from "@shared/custom-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DeleteCustomFieldDialog({
  field,
  onCancel,
  onConfirm,
}: {
  field: CustomFieldDefinition;
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
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Delete field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
