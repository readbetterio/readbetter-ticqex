import { ApiError } from "@server/lib/errors";
import {
  buildQuotedReply,
  formatReplySubject,
} from "@server/lib/utils";
import { getSettings } from "@server/services/settings";
import type { MessageDbRow } from "@/types/database";

const supportEmail = () =>
  process.env.SUPPORT_EMAIL ?? "support@ticqex.local";

function dedupeEmails(addresses: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const addr of addresses) {
    const normalized = addr.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(addr.trim());
  }
  return result;
}

function computeReplyCc(
  options: { cc?: string[]; reply_all?: boolean },
  lastContactMessage: MessageDbRow | null,
  contactEmail: string,
): string[] {
  const contact = contactEmail.trim().toLowerCase();
  const support = supportEmail().trim().toLowerCase();

  if (!options.reply_all) {
    return dedupeEmails(options.cc ?? []);
  }

  const merged: string[] = [...(options.cc ?? [])];
  for (const addr of lastContactMessage?.email_cc ?? []) {
    merged.push(addr);
  }
  for (const addr of lastContactMessage?.email_to ?? []) {
    merged.push(addr);
  }

  return dedupeEmails(
    merged.filter((addr) => {
      const normalized = addr.trim().toLowerCase();
      return normalized && normalized !== contact && normalized !== support;
    }),
  );
}

export type AgentOutboundReplyInput = {
  body: string;
  email?: {
    cc?: string[];
    subject?: string;
    reply_all?: boolean;
    include_quote?: boolean;
  };
};

export type PreparedAgentOutboundReply = {
  body: string;
  emailFrom: string;
  emailTo: string[];
  emailCc: string[];
  emailSubject: string;
};

export type AgentOutboundReplyContext = {
  lastContactMessage: MessageDbRow | null;
  lastSubjectMessage: MessageDbRow | null;
};

function prepareAgentReplyHeaders(
  ticket: { title: string; contact_address: string },
  context: AgentOutboundReplyContext,
  input: AgentOutboundReplyInput,
): Omit<PreparedAgentOutboundReply, "body"> {
  const contactEmail = ticket.contact_address.trim();
  if (!contactEmail) {
    throw ApiError.internal("Ticket contact address not found");
  }

  const { lastContactMessage, lastSubjectMessage } = context;

  return {
    emailTo: [contactEmail],
    emailCc: computeReplyCc(
      {
        cc: input.email?.cc,
        reply_all: input.email?.reply_all,
      },
      lastContactMessage,
      contactEmail,
    ),
    emailSubject: input.email?.subject
      ? input.email.subject
      : formatReplySubject(
          lastSubjectMessage?.email_subject ?? null,
          ticket.title,
        ),
    emailFrom: `${process.env.SUPPORT_FROM_NAME ?? "Support"} <${supportEmail()}>`,
  };
}

export async function prepareAgentDraftReply(
  ticket: {
    title: string;
    contact_address: string;
  },
  context: AgentOutboundReplyContext,
  input: AgentOutboundReplyInput,
): Promise<PreparedAgentOutboundReply> {
  const headers = prepareAgentReplyHeaders(ticket, context, input);
  return { body: input.body.trim(), ...headers };
}

export async function prepareAgentOutboundReply(
  ticket: {
    title: string;
    contact_address: string;
  },
  context: AgentOutboundReplyContext,
  input: AgentOutboundReplyInput,
): Promise<PreparedAgentOutboundReply> {
  const contactEmail = ticket.contact_address.trim();
  if (!contactEmail) {
    throw ApiError.internal("Ticket contact address not found");
  }

  const { lastContactMessage } = context;
  const headers = prepareAgentReplyHeaders(ticket, context, input);

  let body = input.body;

  const effectiveIncludeQuote =
    input.email?.include_quote ??
    lastContactMessage?.channel === "api";

  if (effectiveIncludeQuote && lastContactMessage) {
    const quoteAuthor =
      contactEmail ?? String(lastContactMessage.email_from ?? "Contact");
    body += buildQuotedReply(
      lastContactMessage.body,
      quoteAuthor,
      lastContactMessage.created_at,
    );
  }

  const settings = await getSettings();
  const signature = String(settings.email_signature ?? "").trim();
  if (signature) {
    body = `${body.trim()}\n\n${signature}`;
  }

  return { body, ...headers };
}

/** First outbound email that opens a conversation — no Re: prefix, no quote. */
export async function prepareAgentInitialOutbound(
  ticket: {
    title: string;
    contact_address: string;
  },
  input: {
    body: string;
    email?: {
      cc?: string[];
      subject?: string;
    };
  },
): Promise<PreparedAgentOutboundReply> {
  const contactEmail = ticket.contact_address.trim();
  if (!contactEmail) {
    throw ApiError.internal("Ticket contact address not found");
  }

  const subject =
    input.email?.subject?.trim() ||
    ticket.title.trim() ||
    "(no subject)";

  let body = input.body.trim();
  const settings = await getSettings();
  const signature = String(settings.email_signature ?? "").trim();
  if (signature) {
    body = `${body}\n\n${signature}`;
  }

  return {
    body,
    emailFrom: `${process.env.SUPPORT_FROM_NAME ?? "Support"} <${supportEmail()}>`,
    emailTo: [contactEmail],
    emailCc: dedupeEmails(input.email?.cc ?? []),
    emailSubject: subject,
  };
}
