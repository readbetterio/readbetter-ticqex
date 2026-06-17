import type { MessageRow } from "./types";

export type EmailThreadOrder = "oldest_first" | "newest_first";

const PREVIEW_MAX_LENGTH = 180;

export function scrollToLatest(el: HTMLElement, order: EmailThreadOrder) {
  if (order === "newest_first") {
    el.scrollTop = 0;
  } else {
    el.scrollTop = el.scrollHeight;
  }
}

export function isNearLatest(el: HTMLElement, order: EmailThreadOrder) {
  const threshold = 96;
  if (order === "newest_first") {
    return el.scrollTop < threshold;
  }
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

export function messageSubject(msg: MessageRow): string {
  const subject = msg.email_subject?.trim();
  if (subject) return subject;
  return "No subject";
}

export function messagePreview(msg: MessageRow): string {
  const firstLine = msg.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return "No preview";
  if (firstLine.length <= PREVIEW_MAX_LENGTH) return firstLine;
  return `${firstLine.slice(0, PREVIEW_MAX_LENGTH - 1)}…`;
}

export function orderVisibleMessages(
  messages: MessageRow[],
  threadOrder: EmailThreadOrder,
): MessageRow[] {
  const visible = messages.filter(
    (msg) => msg.email_delivery_status !== "draft",
  );
  if (threadOrder === "newest_first") {
    return [...visible].reverse();
  }
  return visible;
}
