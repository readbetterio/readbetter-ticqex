/** Vercel Serverless request body limit for multipart uploads. */
export const MAX_ATTACHMENT_BYTES = Math.floor(4.5 * 1024 * 1024);

export function maxAttachmentSizeLabel(): string {
  const mb = MAX_ATTACHMENT_BYTES / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function attachmentTooLargeMessage(filename: string): string {
  return `"${filename}" exceeds the ${maxAttachmentSizeLabel()} attachment limit.`;
}

export function attachmentExceedsLimitError(): string {
  return `Attachment exceeds ${maxAttachmentSizeLabel()} limit`;
}
