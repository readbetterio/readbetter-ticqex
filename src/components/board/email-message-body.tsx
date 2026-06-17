"use client";

import { useCallback, useRef, useState } from "react";
import { PaperclipIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MessageAttachment, MessageRow } from "./types";
import { formatBytes } from "./email-utils";

const COLLAPSED_BODY_MAX_HEIGHT = "min(40vh, 20rem)";

function collapsedBodyMaxPx(): number {
  return Math.min(window.innerHeight * 0.4, 320);
}

function AttachmentList({
  messageId,
  attachments,
}: {
  messageId: string;
  attachments: MessageAttachment[];
}) {
  if (!attachments.length) return null;

  return (
    <ul className="mt-2 space-y-1 border-t border-border pt-2">
      {attachments.map((att) => (
        <li key={att.id}>
          <a
            href={`/api/v1/messages/${messageId}/attachments/${att.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <PaperclipIcon className="size-3.5" />
            <span>{att.filename}</span>
            <span className="text-muted-foreground">
              ({formatBytes(att.size_bytes)})
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function emailIframeSrcDoc(html: string, expanded: boolean) {
  const overflow = expanded ? "hidden" : "auto";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"><style>
    html, body { box-sizing: border-box; margin: 0; padding: 0; background: #ffffff; }
    body { padding: 12px; font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #27272a; word-break: break-word; overflow: ${overflow}; }
    img { max-width: 100%; height: auto; }
    a { color: #4f46e5; }
    blockquote { margin: 0.5em 0; padding-left: 0.75em; border-left: 3px solid #d4d4d8; color: #52525b; }
  </style></head><body>${html}</body></html>`;
}

type IframeMeasurement = {
  displayHeight: number;
  hasOverflow: boolean;
};

function measureHtmlEmailIframe(
  iframe: HTMLIFrameElement,
  expanded: boolean,
): IframeMeasurement | null {
  const doc = iframe.contentDocument;
  if (!doc?.body) return null;

  const contentHeight = Math.max(80, doc.body.scrollHeight);
  const collapsedMax = collapsedBodyMaxPx();

  return {
    displayHeight: expanded
      ? contentHeight
      : Math.min(collapsedMax, contentHeight),
    hasOverflow: contentHeight > collapsedMax,
  };
}

function HtmlEmailIframe({
  html,
  expanded,
  onMeasurement,
}: {
  html: string;
  expanded: boolean;
  onMeasurement?: (measurement: IframeMeasurement) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(120);

  const measure = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const measurement = measureHtmlEmailIframe(iframe, expanded);
    if (!measurement) return;

    setHeight(measurement.displayHeight);
    onMeasurement?.(measurement);
  }, [expanded, onMeasurement]);

  const handleLoad = useCallback(() => {
    measure();
    requestAnimationFrame(measure);
  }, [measure]);

  return (
    <iframe
      ref={iframeRef}
      title="Email content"
      sandbox="allow-same-origin"
      scrolling={expanded ? "no" : "auto"}
      srcDoc={emailIframeSrcDoc(html, expanded)}
      onLoad={handleLoad}
      className="block w-full bg-background"
      style={{
        height,
        minHeight: 80,
        ...(expanded ? {} : { maxHeight: COLLAPSED_BODY_MAX_HEIGHT }),
      }}
    />
  );
}

export function EmailMessageBody({
  message,
  emphasize,
  expanded = false,
  onToggleExpanded,
}: {
  message: MessageRow;
  emphasize?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasHtml = Boolean(message.email_body_html?.trim());
  const [htmlHasOverflow, setHtmlHasOverflow] = useState(false);
  const textClass = cn(
    "px-3 py-2 whitespace-pre-wrap text-foreground",
    emphasize && "font-medium",
    !expanded && "max-h-80 overflow-y-auto overscroll-contain",
  );

  const handleHtmlMeasurement = useCallback(
    (measurement: IframeMeasurement) => {
      setHtmlHasOverflow(measurement.hasOverflow);
    },
    [],
  );

  const handleToggleExpanded = useCallback(() => {
    onToggleExpanded?.();
  }, [onToggleExpanded]);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }

  const showExpandControl =
    Boolean(onToggleExpanded) &&
    (!hasHtml || expanded || htmlHasOverflow);

  return (
    <div
      className="overflow-hidden rounded-lg border border-border bg-background"
      onClick={(e) => e.stopPropagation()}
    >
      {expanded && (
        <div className="flex justify-end border-b border-border/60 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={scrollToBottom}
          >
            Scroll to bottom
          </Button>
        </div>
      )}

      {hasHtml ? (
        <HtmlEmailIframe
          html={message.email_body_html!}
          expanded={expanded}
          onMeasurement={handleHtmlMeasurement}
        />
      ) : (
        <p className={textClass}>{message.body}</p>
      )}

      {showExpandControl && (
        <div
          ref={bottomRef}
          className="flex justify-end border-t border-border/60 px-3 py-2"
        >
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={handleToggleExpanded}
          >
            {expanded ? "Show less" : "Show full text"}
          </Button>
        </div>
      )}

      {message.attachments && message.attachments.length > 0 && (
        <div className="px-3 pb-2">
          <AttachmentList messageId={message.id} attachments={message.attachments} />
        </div>
      )}
    </div>
  );
}
