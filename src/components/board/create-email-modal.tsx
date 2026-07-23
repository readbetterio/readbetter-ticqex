"use client";

import { FormEvent, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TagMultiSelect } from "@/components/tags/tag-multi-select";
import type { Tag } from "@/components/tags/types";
import { useRecentTags } from "@/hooks/use-recent-tags";
import { useTicketTags } from "@/hooks/use-ticket-reference-data";
import { CcChipInput } from "./cc-chip-input";
import type { CreateEmailPayload } from "./board-create-client";

export function CreateEmailModal({
  statuses,
  onClose,
  onCreate,
}: {
  statuses: { id: string; name: string }[];
  onClose: () => void;
  onCreate: (payload: CreateEmailPayload) => void;
}) {
  const [title, setTitle] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [cc, setCc] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [statusId, setStatusId] = useState(statuses[0]?.id ?? "");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const tagsQuery = useTicketTags();
  const allTags = tagsQuery.data ?? [];
  const { recentNames, touch: touchRecentTags } = useRecentTags();
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedTo = to.trim().toLowerCase();
    const trimmedBody = body.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }
    if (!trimmedTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedTo)) {
      setError("A valid To email address is required");
      return;
    }
    if (!trimmedBody) {
      setError("Message body is required");
      return;
    }

    setError(null);
    setSending(true);
    const tagNames = selectedTags.map((tag) => tag.name.trim()).filter(Boolean);
    const trimmedSubject = subject.trim();

    onCreate({
      title: trimmedTitle,
      contactAddress: trimmedTo,
      body: trimmedBody,
      ...(trimmedSubject ? { subject: trimmedSubject } : {}),
      ...(cc.length ? { cc } : {}),
      statusId,
      tags: selectedTags,
    });
    if (tagNames.length) touchRecentTags(tagNames);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New email</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-to">To</Label>
            <Input
              id="email-to"
              type="email"
              required
              placeholder="customer@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>CC</Label>
            <CcChipInput cc={cc} onChange={setCc} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-title">Ticket title</Label>
            <Input
              id="email-title"
              required
              value={title}
              onChange={(e) => {
                const next = e.target.value;
                setTitle(next);
                if (!subject || subject === title) setSubject(next);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              placeholder="Defaults to ticket title"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagMultiSelect
              value={selectedTags}
              options={allTags}
              onChange={setSelectedTags}
              recentNames={recentNames}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-body">Message</Label>
            <Textarea
              id="email-body"
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="mx-0 mb-0 border-0 bg-transparent p-0 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sending || !title.trim() || !to.trim() || !body.trim()}
            >
              Send email
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
