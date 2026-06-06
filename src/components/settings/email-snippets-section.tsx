"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmailSnippetOptimistic,
  deleteEmailSnippetOptimistic,
  useEmailSnippets,
} from "@/hooks/use-email-snippets";

export function EmailSnippetsSection() {
  const { snippets } = useEmailSnippets();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {snippets.map((snippet) => (
          <li
            key={snippet.id}
            className="flex items-start justify-between gap-2 rounded-lg border border-border p-3"
          >
            <div>
              <p className="font-medium">{snippet.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                {snippet.body.slice(0, 120)}
                {snippet.body.length > 120 ? "…" : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="xs"
              disabled={deletingId === snippet.id}
              onClick={async () => {
                setDeletingId(snippet.id);
                try {
                  await deleteEmailSnippetOptimistic(snippet.id);
                } finally {
                  setDeletingId(null);
                }
              }}
            >
              Delete
            </Button>
          </li>
        ))}
        {snippets.length === 0 && (
          <li className="text-sm text-muted-foreground">No snippets yet.</li>
        )}
      </ul>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await createEmailSnippetOptimistic({ title, body });
            setTitle("");
            setBody("");
          } finally {
            setSaving(false);
          }
        }}
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Snippet title"
          required
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Snippet body"
          rows={3}
          required
        />
        <Button type="submit" size="sm" disabled={saving}>
          Add snippet
        </Button>
      </form>
    </div>
  );
}
