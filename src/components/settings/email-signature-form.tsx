"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePatchAdminSettings } from "@/hooks/use-admin-settings-mutation";

export function EmailSignatureForm({
  signature,
  onSaved,
}: {
  signature: string;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(signature);
  const patchMutation = usePatchAdminSettings();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        patchMutation.mutate(
          { email_signature: value },
          {
            onSuccess: () => {
              onSaved();
            },
          },
        );
      }}
    >
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        placeholder={"Best regards,\nSupport Team"}
        className="font-mono"
      />
      <Button type="submit" size="sm" disabled={patchMutation.isPending}>
        Save email signature
      </Button>
    </form>
  );
}
