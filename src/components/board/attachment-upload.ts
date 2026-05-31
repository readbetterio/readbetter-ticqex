import {
  attachmentTooLargeMessage,
  MAX_ATTACHMENT_BYTES,
} from "@shared/attachment-limits";
import type { AttachmentUpload } from "./types";

type ApiResponse<T> = { data: T } | { error: { code: string; message: string } };

async function parseApiResponse<T>(res: Response): Promise<ApiResponse<T> | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return null;
  }
}

export async function uploadAttachment(
  ticketId: string,
  file: File,
): Promise<AttachmentUpload> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(attachmentTooLargeMessage(file.name || "attachment"));
  }

  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`/api/v1/tickets/${ticketId}/attachment-uploads`, {
    method: "POST",
    credentials: "include",
    body: form,
  });

  if (res.status === 413) {
    throw new Error(attachmentTooLargeMessage(file.name || "attachment"));
  }

  const json = await parseApiResponse<AttachmentUpload>(res);
  if (json && "error" in json) throw new Error(json.error.message);
  if (!res.ok) throw new Error("Upload failed");
  if (!json || !("data" in json)) throw new Error("Upload failed");
  return json.data;
}
