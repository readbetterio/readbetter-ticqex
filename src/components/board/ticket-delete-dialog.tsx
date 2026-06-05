"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ticketDeleteCopy(kind: "task" | "conversation") {
  const isTask = kind === "task";
  return {
    label: "Delete",
    title: isTask ? "Delete this task?" : "Delete this email conversation?",
    description: isTask
      ? "The task and its details will be removed from your board. This action cannot be undone."
      : "The conversation and all messages will be removed from your board. This action cannot be undone. If a new email arrives later, it will start a new conversation.",
  };
}

export function TicketDeleteDialog({
  open,
  kind,
  onOpenChange,
  onConfirmDelete,
}: {
  open: boolean;
  kind: "task" | "conversation";
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
}) {
  const copy = ticketDeleteCopy(kind);

  function stopCardOpen(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent
        className="sm:max-w-md"
        onClick={stopCardOpen}
        onPointerDown={stopCardOpen}
      >
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirmDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
