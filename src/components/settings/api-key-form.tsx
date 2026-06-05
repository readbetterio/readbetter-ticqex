"use client";

import { type FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { adminApiKeysQueryKey } from "@/hooks/use-admin-settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";

export function ApiKeyForm({
  onCreated,
  onError,
}: {
  onCreated: (key: string) => void;
  onError?: (message: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function createKey(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      onError?.("Enter a key name.");
      return;
    }

    setCreating(true);
    try {
      const res = await apiFetch<{ key: string }>("/api/v1/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: trimmedName }),
      });
      setName("");
      onError?.(null);
      onCreated(res.key);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        void createKey(e);
      }}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Key name"
        className="flex-1"
        required
        disabled={creating}
      />
      <Button type="submit" size="sm" disabled={creating || !name.trim()}>
        {creating ? "Creating…" : "Create key"}
      </Button>
    </form>
  );
}

export function RevokeButton({
  id,
  name,
  keyPrefix,
  onError,
}: {
  id: string;
  name: string;
  keyPrefix: string;
  onError?: (message: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  function revoke() {
    setOpen(false);
    onError?.(null);
    queryClient.setQueryData(
      adminApiKeysQueryKey,
      (current: { id: string }[] | undefined) =>
        (current ?? []).filter((key) => key.id !== id),
    );
    void (async () => {
      try {
        await apiFetch(`/api/v1/api-keys/${id}`, { method: "DELETE" });
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "Failed to revoke API key");
        void queryClient.invalidateQueries({ queryKey: adminApiKeysQueryKey });
      }
    })();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="destructive"
        size="xs"
        onClick={() => setOpen(true)}
      >
        Revoke
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revoke &ldquo;{name}&rdquo;?</DialogTitle>
          <DialogDescription>
            This will permanently revoke API key {keyPrefix}…. Any integrations
            using this key will stop working immediately.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={revoke}>
            Revoke key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
