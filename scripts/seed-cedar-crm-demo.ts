/**
 * Seeds a compact Cedar CRM demo board with common indie CRM support cases.
 * Run: pnpm seed:cedar-crm-demo
 * Reset: pnpm seed:cedar-crm-demo -- --reset
 *
 * Requires a seeded admin user so the demo API key can be attributed:
 * pnpm db:seed-admin
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_ACTOR_TYPES,
  ACTIVITY_OUTCOMES,
  ACTIVITY_SOURCES,
  type ActivityAction,
  type ActivityActorType,
  type ActivitySource,
} from "../shared/activity/actions";
import type {
  ActivityActorSnapshot,
  ActivityChange,
  TicketActivitySnapshot,
} from "../shared/activity/types";

const LEGACY_DEMO_TITLE_PREFIX = "Cedar CRM:";
const DEMO_AGENT_KEY_NAME = "Cedar CRM Demo Agent";
const DEMO_AGENT_KEY_TOKEN = "tq_demo_cedar_crm_agent_seed_only";
const SUPPORT_EMAIL = "support@cedarcrm.example";
const BASE_TIME = Date.parse("2026-06-15T08:00:00.000Z");
const LEGACY_DEMO_TAG_NAMES = [
  "cedar-api",
  "cedar-billing",
  "cedar-human-review",
  "cedar-needs-info",
  "cedar-resolved",
  "cedar-setup",
  "cedar-sync",
  "cedar-data",
];

type GenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

type DemoDatabase = {
  public: {
    Tables: Record<string, GenericTable>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, never>;
  };
};

type DbClient = SupabaseClient<DemoDatabase>;
type StatusName = "Open" | "In Process" | "Human Review" | "Closed";
type TicketKind = "task" | "conversation";
type TicketOrigin = "email" | "api" | "manual";
type MessageChannel = "email" | "api" | "admin";
type MessageAuthor = "contact" | "agent" | "system";
type FieldGroup = "ticket" | "contact";
type FieldType =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "select"
  | "url"
  | "json"
  | "multiselect";
type CustomFieldValue = string | number | boolean | string[] | Record<string, unknown>;

type DemoFieldDefinition = {
  group: FieldGroup;
  key: string;
  label: string;
  type: FieldType;
  position: number;
  options?: string[];
  show_open_in_ticket?: boolean;
};

type DemoMessage = {
  body: string;
  author_type: MessageAuthor;
  channel: MessageChannel;
  subject?: string;
  minutes_after_open: number;
};

type DemoTicket = {
  title: string;
  lane: StatusName;
  kind: TicketKind;
  origin: TicketOrigin;
  contact: string;
  tags: string[];
  contact_fields: Record<string, CustomFieldValue>;
  ticket_fields: Record<string, CustomFieldValue>;
  channel?: MessageChannel;
  body?: string;
  messages?: DemoMessage[];
  agent_comment: string;
};

type ActivityEventInsert = {
  occurred_at: string;
  action: ActivityAction;
  outcome: typeof ACTIVITY_OUTCOMES.SUCCEEDED;
  source: ActivitySource;
  target_type: string | null;
  target_id: string | null;
  ticket_id: string;
  ticket_snapshot: TicketActivitySnapshot;
  actor_type: ActivityActorType;
  actor_user_id: string | null;
  api_key_id: string | null;
  actor_snapshot: ActivityActorSnapshot;
  request_id: string | null;
  request_method: string | null;
  request_path: string | null;
  operation: string | null;
  status_code: number | null;
  summary: string;
  changes: ActivityChange[];
  metadata: Record<string, unknown>;
};

type SeededMessage = {
  id: string;
  body: string;
  author_type: MessageAuthor;
  channel: MessageChannel;
  email_from: string | null;
  email_subject: string | null;
  created_at: string;
};

const DEMO_TAGS = [
  { name: "API", color: "#1d4ed8" },
  { name: "Billing", color: "#b45309" },
  { name: "Human review", color: "#7c3aed" },
  { name: "Needs info", color: "#64748b" },
  { name: "Resolved", color: "#047857" },
  { name: "Setup", color: "#0f766e" },
  { name: "Sync", color: "#0369a1" },
  { name: "Data", color: "#be123c" },
];

const CONTACT_FIELD_DEFINITIONS: DemoFieldDefinition[] = [
  {
    group: "contact",
    key: "cedar_plan_tier",
    label: "Plan tier",
    type: "select",
    position: 0,
    options: ["Free Trial", "Starter", "Pro", "Business"],
    show_open_in_ticket: true,
  },
  {
    group: "contact",
    key: "cedar_company_size",
    label: "Company size",
    type: "select",
    position: 1,
    options: ["Solo", "2-10", "11-50"],
    show_open_in_ticket: true,
  },
  {
    group: "contact",
    key: "cedar_account_health",
    label: "Account health",
    type: "select",
    position: 2,
    options: ["Onboarding", "Healthy", "At Risk", "VIP"],
    show_open_in_ticket: true,
  },
];

const TICKET_FIELD_DEFINITIONS: DemoFieldDefinition[] = [
  {
    group: "ticket",
    key: "cedar_priority",
    label: "Priority",
    type: "select",
    position: 0,
    options: ["Low", "Normal", "High", "Urgent"],
  },
  {
    group: "ticket",
    key: "cedar_case_type",
    label: "Case type",
    type: "select",
    position: 1,
    options: [
      "API",
      "Billing",
      "Data Quality",
      "Data Recovery",
      "Email Sync",
      "Import",
      "Product Question",
      "Settings",
    ],
  },
  {
    group: "ticket",
    key: "cedar_sla_due",
    label: "SLA due",
    type: "date",
    position: 2,
  },
  {
    group: "ticket",
    key: "cedar_requires_approval",
    label: "Requires approval",
    type: "boolean",
    position: 3,
  },
];

const DEMO_TICKETS: DemoTicket[] = [
  {
    title: "CSV import completed, but 47 contacts are missing",
    lane: "Open",
    kind: "conversation",
    origin: "email",
    channel: "email",
    contact: "mara@northstar-studio.cedarcrm.example",
    tags: ["Data", "Needs info"],
    contact_fields: {
      cedar_plan_tier: "Pro",
      cedar_company_size: "2-10",
      cedar_account_health: "At Risk",
    },
    ticket_fields: {
      cedar_priority: "High",
      cedar_case_type: "Import",
      cedar_sla_due: "2026-06-16",
      cedar_requires_approval: false,
    },
    messages: [
      {
        subject: "Import finished but contacts are missing",
        body: "Hi Cedar team,\n\nI ran a CSV import from HubSpot this morning. The job says it completed, but our people list is missing 47 contacts compared with the source file.\n\nThe file had 1,284 rows and no errors showed on the final screen. Can you check whether some rows were skipped?\n\nThanks,\nMara",
        author_type: "contact",
        channel: "email",
        minutes_after_open: 0,
      },
    ],
    agent_comment:
      "Classified as import_issue. Suggested asking for CSV headers, import job ID, and whether skipped rows appeared in the import summary.",
  },
  {
    title: "Can I add custom lead statuses?",
    lane: "Open",
    kind: "conversation",
    origin: "email",
    channel: "email",
    contact: "eli@solo-consulting.cedarcrm.example",
    tags: ["Setup"],
    contact_fields: {
      cedar_plan_tier: "Free Trial",
      cedar_company_size: "Solo",
      cedar_account_health: "Onboarding",
    },
    ticket_fields: {
      cedar_priority: "Normal",
      cedar_case_type: "Product Question",
      cedar_sla_due: "2026-06-18",
      cedar_requires_approval: false,
    },
    messages: [
      {
        subject: "Can I add a Proposal sent lead status?",
        body: "Hi,\n\nI run a small consulting practice and the default lead statuses are close, but not quite how I work. Can I rename them and add one called Proposal sent?\n\nI am still in trial, so I wanted to ask before I set up the rest of my pipeline.\n\nBest,\nEli",
        author_type: "contact",
        channel: "email",
        minutes_after_open: 0,
      },
    ],
    agent_comment:
      "Product question. Drafted a short help-center reply explaining pipeline stage customization and where to find it in settings.",
  },
  {
    title: "Webhook delivery failed for deal.updated",
    lane: "Open",
    kind: "conversation",
    origin: "api",
    channel: "api",
    contact: "integrations@bluebird-ops.cedarcrm.example",
    tags: ["API", "Needs info"],
    contact_fields: {
      cedar_plan_tier: "Business",
      cedar_company_size: "11-50",
      cedar_account_health: "At Risk",
    },
    ticket_fields: {
      cedar_priority: "High",
      cedar_case_type: "API",
      cedar_sla_due: "2026-06-15",
      cedar_requires_approval: false,
    },
    messages: [
      {
        body: "Automated monitor opened this ticket after five failed deal.updated webhook attempts. Last response from subscriber endpoint was HTTP 500.",
        author_type: "system",
        channel: "api",
        minutes_after_open: 0,
      },
    ],
    agent_comment:
      "Enriched with latest webhook attempt IDs and retry timestamps. Next action is to ask the customer to check their endpoint logs.",
  },
  {
    title: "Gmail sync disconnected again",
    lane: "In Process",
    kind: "conversation",
    origin: "email",
    channel: "email",
    contact: "tessa@oak-agency.cedarcrm.example",
    tags: ["Sync", "Needs info"],
    contact_fields: {
      cedar_plan_tier: "Starter",
      cedar_company_size: "2-10",
      cedar_account_health: "Healthy",
    },
    ticket_fields: {
      cedar_priority: "Normal",
      cedar_case_type: "Email Sync",
      cedar_sla_due: "2026-06-17",
      cedar_requires_approval: false,
    },
    messages: [
      {
        subject: "Gmail sync keeps disconnecting",
        body: "Hi support,\n\nMy Gmail sync disconnected again this morning. This is the second time this week, and replies from two prospects are not showing up on their timelines.\n\nI reconnected the mailbox, but I would like to know why it keeps happening.\n\nTessa",
        author_type: "contact",
        channel: "email",
        minutes_after_open: 0,
      },
      {
        subject: "Re: Gmail sync keeps disconnecting",
        body: "Hi Tessa,\n\nThanks for the details. Could you send the Gmail address that disconnected, the approximate time you saw the reconnect prompt, and a screenshot if you still have it?\n\nOnce we have that, we can check whether this was a Google auth refresh issue or something on Cedar's side.\n\nCedar Support",
        author_type: "agent",
        channel: "email",
        minutes_after_open: 24,
      },
    ],
    agent_comment:
      "Waiting on customer context. Asked for account, timestamp, browser, and reconnect screenshot to separate auth expiry from provider interruption.",
  },
  {
    title: "Customer called about duplicate companies",
    lane: "In Process",
    kind: "task",
    origin: "manual",
    contact: "rachel@lumen-recruiting.cedarcrm.example",
    tags: ["Data"],
    contact_fields: {
      cedar_plan_tier: "Pro",
      cedar_company_size: "11-50",
      cedar_account_health: "Healthy",
    },
    ticket_fields: {
      cedar_priority: "Normal",
      cedar_case_type: "Data Quality",
      cedar_sla_due: "2026-06-18",
      cedar_requires_approval: false,
    },
    body: "Support logged a phone call from a recruiter seeing duplicate company records after a LinkedIn import.",
    agent_comment:
      "Suggested the duplicate-merge workflow and asked the support rep to collect two example company names before replying.",
  },
  {
    title: "Contact creation API returns 409 conflict",
    lane: "In Process",
    kind: "conversation",
    origin: "api",
    channel: "api",
    contact: "dev@bluebird-ops.cedarcrm.example",
    tags: ["API"],
    contact_fields: {
      cedar_plan_tier: "Business",
      cedar_company_size: "11-50",
      cedar_account_health: "Healthy",
    },
    ticket_fields: {
      cedar_priority: "Normal",
      cedar_case_type: "API",
      cedar_sla_due: "2026-06-17",
      cedar_requires_approval: false,
    },
    messages: [
      {
        body: "POST /contacts returns 409 when our nightly sync sends an email that already exists in Cedar.",
        author_type: "contact",
        channel: "api",
        minutes_after_open: 0,
      },
      {
        body: "A duplicate email triggers a conflict. Use the upsert endpoint or fetch the existing contact before retrying the create call.",
        author_type: "agent",
        channel: "api",
        minutes_after_open: 15,
      },
    ],
    agent_comment:
      "Detected duplicate constraint. Drafted developer-facing explanation with upsert guidance and the relevant API docs section.",
  },
  {
    title: "I was charged twice this month",
    lane: "Human Review",
    kind: "conversation",
    origin: "email",
    channel: "email",
    contact: "avery@oak-agency.cedarcrm.example",
    tags: ["Billing", "Human review"],
    contact_fields: {
      cedar_plan_tier: "Pro",
      cedar_company_size: "2-10",
      cedar_account_health: "At Risk",
    },
    ticket_fields: {
      cedar_priority: "Urgent",
      cedar_case_type: "Billing",
      cedar_sla_due: "2026-06-15",
      cedar_requires_approval: true,
    },
    messages: [
      {
        subject: "Duplicate charge on June invoice",
        body: "Hello,\n\nMy card shows two Cedar CRM charges this month, both for the Pro plan. We only have one workspace and I did not add another subscription.\n\nCan someone confirm which charge is correct and refund the duplicate if needed?\n\nAvery",
        author_type: "contact",
        channel: "email",
        minutes_after_open: 0,
      },
    ],
    agent_comment:
      "Human review required: billing_priority. Agent found a possible duplicate subscription but refund action needs staff approval.",
  },
  {
    title: "Can you restore a deleted deal?",
    lane: "Human Review",
    kind: "conversation",
    origin: "email",
    channel: "email",
    contact: "priya@paperlane-design.cedarcrm.example",
    tags: ["Data", "Human review"],
    contact_fields: {
      cedar_plan_tier: "Business",
      cedar_company_size: "11-50",
      cedar_account_health: "VIP",
    },
    ticket_fields: {
      cedar_priority: "Urgent",
      cedar_case_type: "Data Recovery",
      cedar_sla_due: "2026-06-15",
      cedar_requires_approval: true,
    },
    messages: [
      {
        subject: "Restore deleted Acme renewal deal",
        body: "Hi Cedar team,\n\nI accidentally deleted the Acme renewal deal about 20 minutes ago. It had several call notes and a follow-up reminder for next Tuesday.\n\nCan you restore the deal with the notes and reminder intact? This is for our Q3 renewal forecast.\n\nPriya",
        author_type: "contact",
        channel: "email",
        minutes_after_open: 0,
      },
    ],
    agent_comment:
      "Human review required: account recovery. Agent located the likely deleted deal snapshot but restoration should be confirmed by staff first.",
  },
  {
    title: "Wrong timezone on follow-up reminders",
    lane: "Closed",
    kind: "conversation",
    origin: "email",
    channel: "email",
    contact: "kai@solo-consulting.cedarcrm.example",
    tags: ["Setup", "Resolved"],
    contact_fields: {
      cedar_plan_tier: "Starter",
      cedar_company_size: "Solo",
      cedar_account_health: "Healthy",
    },
    ticket_fields: {
      cedar_priority: "Low",
      cedar_case_type: "Settings",
      cedar_sla_due: "2026-06-16",
      cedar_requires_approval: false,
    },
    messages: [
      {
        subject: "Follow-up reminders are two hours late",
        body: "Hi,\n\nMy follow-up reminders are firing two hours late. A reminder scheduled for 9:00 showed up at 11:00 this morning.\n\nI am based in Berlin, so I am wondering if this is a timezone setting somewhere.\n\nKai",
        author_type: "contact",
        channel: "email",
        minutes_after_open: 0,
      },
      {
        subject: "Re: Follow-up reminders are two hours late",
        body: "Hi Kai,\n\nYou were right - the workspace timezone was still set to UTC. I updated it to Europe/Berlin, so reminders created from now on should fire at your local time.\n\nThe existing reminders keep their saved times, so you may want to quickly review anything due today.\n\nCedar Support",
        author_type: "agent",
        channel: "email",
        minutes_after_open: 20,
      },
    ],
    agent_comment:
      "Resolved settings issue. Agent identified workspace timezone mismatch and drafted the final explanation.",
  },
  {
    title: "Can I cancel my trial?",
    lane: "Closed",
    kind: "conversation",
    origin: "email",
    channel: "email",
    contact: "maya@cedar-trial.cedarcrm.example",
    tags: ["Billing", "Resolved"],
    contact_fields: {
      cedar_plan_tier: "Free Trial",
      cedar_company_size: "Solo",
      cedar_account_health: "At Risk",
    },
    ticket_fields: {
      cedar_priority: "Normal",
      cedar_case_type: "Billing",
      cedar_sla_due: "2026-06-16",
      cedar_requires_approval: false,
    },
    messages: [
      {
        subject: "Cancel trial before billing starts",
        body: "Hi,\n\nCan you cancel my trial before billing starts on Friday? We liked parts of Cedar, but we are not ready to move the team off spreadsheets this month.\n\nPlease confirm there will not be a charge.\n\nMaya",
        author_type: "contact",
        channel: "email",
        minutes_after_open: 0,
      },
      {
        subject: "Re: Cancel trial before billing starts",
        body: "Hi Maya,\n\nYour trial has been cancelled, and no charge will be made.\n\nIf you are open to sharing feedback, what made the spreadsheet migration feel too heavy right now? We use that feedback to improve onboarding.\n\nCedar Support",
        author_type: "agent",
        channel: "email",
        minutes_after_open: 14,
      },
    ],
    agent_comment:
      "Closed cancellation. Agent classified churn reason as spreadsheet migration friction and included a feedback prompt.",
  },
];

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function timestamp(ticketIndex: number, minutesAfterOpen: number): string {
  return new Date(BASE_TIME + ticketIndex * 90 * 60_000 + minutesAfterOpen * 60_000)
    .toISOString();
}

function messagePreview(body: string, maxLength = 120): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function sourceForChannel(channel: MessageChannel): ActivitySource {
  switch (channel) {
    case "email":
      return ACTIVITY_SOURCES.EMAIL;
    case "api":
      return ACTIVITY_SOURCES.API;
    case "admin":
      return ACTIVITY_SOURCES.UI;
    default: {
      const exhaustive: never = channel;
      return exhaustive;
    }
  }
}

function contactActorSnapshot(email: string): ActivityActorSnapshot {
  return {
    label: email,
    email,
  };
}

function apiKeyActorSnapshot(): ActivityActorSnapshot {
  return {
    label: DEMO_AGENT_KEY_NAME,
    api_key_name: DEMO_AGENT_KEY_NAME,
  };
}

function ticketSnapshot(ticketId: string, ticket: DemoTicket): TicketActivitySnapshot {
  return {
    id: ticketId,
    title: subjectFor(ticket),
    kind: ticket.kind,
  };
}

function subjectFor(ticket: DemoTicket): string {
  return ticket.title;
}

function valueRowFor(
  definition: DemoFieldDefinition,
  value: CustomFieldValue,
): {
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  value_boolean: boolean | null;
  value_json: CustomFieldValue | null;
} {
  const empty = {
    value_text: null,
    value_number: null,
    value_date: null,
    value_boolean: null,
    value_json: null,
  };

  switch (definition.type) {
    case "number":
      return { ...empty, value_number: Number(value) };
    case "date":
      return { ...empty, value_date: String(value) };
    case "boolean":
      return { ...empty, value_boolean: Boolean(value) };
    case "json":
    case "multiselect":
      return { ...empty, value_json: value };
    case "select":
    case "text":
    case "url":
      return { ...empty, value_text: String(value) };
    default: {
      const exhaustive: never = definition.type;
      return exhaustive;
    }
  }
}

async function ensureFieldDefinition(
  db: DbClient,
  definition: DemoFieldDefinition,
): Promise<string> {
  const { data: existing, error: lookupError } = await db
    .from("custom_field_definitions")
    .select("id")
    .eq("group", definition.group)
    .eq("key", definition.key)
    .maybeSingle();
  if (lookupError) {
    console.error(`Failed to check custom field ${definition.key}:`, lookupError.message);
    process.exit(1);
  }

  const payload = {
    label: definition.label,
    type: definition.type,
    options: definition.options ? { values: definition.options } : null,
    required: false,
    position: definition.position,
    show_open_in_ticket:
      definition.group === "contact" ? (definition.show_open_in_ticket ?? false) : false,
  };

  if (existing) {
    const { error: updateError } = await db
      .from("custom_field_definitions")
      .update(payload)
      .eq("id", existing.id as string);
    if (updateError) {
      console.error(`Failed to update custom field ${definition.key}:`, updateError.message);
      process.exit(1);
    }
    return existing.id as string;
  }

  const { data: created, error: insertError } = await db
    .from("custom_field_definitions")
    .insert({
      group: definition.group,
      key: definition.key,
      ...payload,
    })
    .select("id")
    .single();
  if (insertError || !created) {
    console.error(`Failed to create custom field ${definition.key}:`, insertError?.message);
    process.exit(1);
  }

  return created.id as string;
}

async function ensureTag(db: DbClient, tag: { name: string; color: string }): Promise<string> {
  const { data: existing, error: lookupError } = await db
    .from("tags")
    .select("id")
    .eq("name", tag.name)
    .maybeSingle();
  if (lookupError) {
    console.error(`Failed to check tag ${tag.name}:`, lookupError.message);
    process.exit(1);
  }

  if (existing) {
    const { error: updateError } = await db
      .from("tags")
      .update({ color: tag.color })
      .eq("id", existing.id as string);
    if (updateError) {
      console.error(`Failed to update tag ${tag.name}:`, updateError.message);
      process.exit(1);
    }
    return existing.id as string;
  }

  const { data: created, error: insertError } = await db
    .from("tags")
    .insert(tag)
    .select("id")
    .single();
  if (insertError || !created) {
    console.error(`Failed to create tag ${tag.name}:`, insertError?.message);
    process.exit(1);
  }

  return created.id as string;
}

async function insertCustomFieldValues(
  db: DbClient,
  entityType: FieldGroup,
  entityId: string,
  definitionsByKey: Map<string, { id: string; definition: DemoFieldDefinition }>,
  values: Record<string, CustomFieldValue>,
) {
  const rows = Object.entries(values).map(([key, value]) => {
    const field = definitionsByKey.get(key);
    if (!field) {
      console.error(`Missing custom field definition for ${key}`);
      process.exit(1);
    }

    return {
      field_id: field.id,
      entity_type: entityType,
      entity_id: entityId,
      ...valueRowFor(field.definition, value),
    };
  });

  if (rows.length === 0) return;

  const { error } = await db
    .from("custom_field_values")
    .upsert(rows, { onConflict: "field_id,entity_type,entity_id" });
  if (error) {
    console.error(`Failed to set ${entityType} custom fields:`, error.message);
    process.exit(1);
  }
}

function statusMoveMinute(ticket: DemoTicket): number | null {
  if (ticket.lane === "Open") return null;
  const latestMessageMinute = Math.max(
    0,
    ...(ticket.messages ?? []).map((message) => message.minutes_after_open),
  );
  return Math.max(4, latestMessageMinute + 2);
}

function latestSeededActivityMinute(ticket: DemoTicket): number {
  return Math.max(
    1,
    2,
    statusMoveMinute(ticket) ?? 0,
    ...(ticket.messages ?? []).map((message) => message.minutes_after_open),
  );
}

function compactMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!metadata) return {};
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );
}

function buildBaseActivity(input: {
  ticketId: string;
  ticket: DemoTicket;
  occurredAt: string;
  action: ActivityAction;
  source: ActivitySource;
  actorType: ActivityActorType;
  actorUserId?: string | null;
  apiKeyId?: string | null;
  actorSnapshot: ActivityActorSnapshot;
  summary: string;
  targetType?: string | null;
  targetId?: string | null;
  changes?: ActivityChange[];
  metadata?: Record<string, unknown>;
}): ActivityEventInsert {
  return {
    occurred_at: input.occurredAt,
    action: input.action,
    outcome: ACTIVITY_OUTCOMES.SUCCEEDED,
    source: input.source,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    ticket_id: input.ticketId,
    ticket_snapshot: ticketSnapshot(input.ticketId, input.ticket),
    actor_type: input.actorType,
    actor_user_id: input.actorUserId ?? null,
    api_key_id: input.apiKeyId ?? null,
    actor_snapshot: input.actorSnapshot,
    request_id: null,
    request_method: null,
    request_path: null,
    operation: null,
    status_code: null,
    summary: input.summary,
    changes: input.changes ?? [],
    metadata: compactMetadata(input.metadata),
  };
}

function buildTicketCreatedActivity(input: {
  ticketId: string;
  ticket: DemoTicket;
  contactId: string;
  demoApiKeyId: string;
  occurredAt: string;
}): ActivityEventInsert {
  const source =
    input.ticket.origin === "email"
      ? ACTIVITY_SOURCES.EMAIL
      : input.ticket.origin === "api"
        ? ACTIVITY_SOURCES.API
        : ACTIVITY_SOURCES.UI;
  const isContactOpened = input.ticket.origin === "email";

  return buildBaseActivity({
    ticketId: input.ticketId,
    ticket: input.ticket,
    occurredAt: input.occurredAt,
    action: ACTIVITY_ACTIONS.TICKET_CREATED,
    source,
    actorType: isContactOpened
      ? ACTIVITY_ACTOR_TYPES.CONTACT
      : ACTIVITY_ACTOR_TYPES.API_KEY,
    apiKeyId: isContactOpened ? null : input.demoApiKeyId,
    actorSnapshot: isContactOpened
      ? contactActorSnapshot(input.ticket.contact)
      : apiKeyActorSnapshot(),
    summary: `Created ticket "${subjectFor(input.ticket)}"`,
    targetType: "ticket",
    targetId: input.ticketId,
    metadata: {
      kind: input.ticket.kind,
      origin: input.ticket.origin,
      contact_id: input.contactId,
      contact: input.ticket.contact,
      tags: input.ticket.tags,
      ticket_fields: input.ticket.ticket_fields,
    },
  });
}

function buildMessageActivity(input: {
  ticketId: string;
  ticket: DemoTicket;
  message: SeededMessage;
  demoApiKeyId: string;
}): ActivityEventInsert {
  if (input.message.author_type === "agent") {
    return buildBaseActivity({
      ticketId: input.ticketId,
      ticket: input.ticket,
      occurredAt: input.message.created_at,
      action: ACTIVITY_ACTIONS.MESSAGE_CREATED,
      source: sourceForChannel(input.message.channel),
      actorType: ACTIVITY_ACTOR_TYPES.API_KEY,
      apiKeyId: input.demoApiKeyId,
      actorSnapshot: apiKeyActorSnapshot(),
      summary: "Sent agent reply",
      targetType: "message",
      targetId: input.message.id,
      metadata: {
        channel: input.message.channel,
        body_preview: messagePreview(input.message.body),
        email_subject: input.message.email_subject,
      },
    });
  }

  const isContact = input.message.author_type === "contact";
  return buildBaseActivity({
    ticketId: input.ticketId,
    ticket: input.ticket,
    occurredAt: input.message.created_at,
    action: ACTIVITY_ACTIONS.MESSAGE_INBOUND,
    source: sourceForChannel(input.message.channel),
    actorType: isContact
      ? ACTIVITY_ACTOR_TYPES.CONTACT
      : ACTIVITY_ACTOR_TYPES.SYSTEM,
    actorSnapshot: isContact
      ? contactActorSnapshot(input.ticket.contact)
      : { label: "Cedar CRM monitor" },
    summary: "Received inbound message",
    targetType: "message",
    targetId: input.message.id,
    metadata: {
      channel: input.message.channel,
      body_preview: messagePreview(input.message.body),
      contact: isContact ? input.ticket.contact : undefined,
      email_from: input.message.email_from,
      email_subject: input.message.email_subject,
    },
  });
}

function buildCommentActivity(input: {
  ticketId: string;
  ticket: DemoTicket;
  commentId: string;
  demoApiKeyId: string;
  occurredAt: string;
}): ActivityEventInsert {
  return buildBaseActivity({
    ticketId: input.ticketId,
    ticket: input.ticket,
    occurredAt: input.occurredAt,
    action: ACTIVITY_ACTIONS.COMMENT_CREATED,
    source: ACTIVITY_SOURCES.API,
    actorType: ACTIVITY_ACTOR_TYPES.API_KEY,
    apiKeyId: input.demoApiKeyId,
    actorSnapshot: apiKeyActorSnapshot(),
    summary: "Added comment on ticket",
    targetType: "comment",
    targetId: input.commentId,
    metadata: {
      body_preview: messagePreview(input.ticket.agent_comment),
    },
  });
}

function buildStatusActivity(input: {
  ticketId: string;
  ticket: DemoTicket;
  demoApiKeyId: string;
  occurredAt: string;
}): ActivityEventInsert | null {
  if (input.ticket.lane === "Open") return null;

  return buildBaseActivity({
    ticketId: input.ticketId,
    ticket: input.ticket,
    occurredAt: input.occurredAt,
    action: ACTIVITY_ACTIONS.TICKET_STATUS_CHANGED,
    source: ACTIVITY_SOURCES.API,
    actorType: ACTIVITY_ACTOR_TYPES.API_KEY,
    apiKeyId: input.demoApiKeyId,
    actorSnapshot: apiKeyActorSnapshot(),
    summary: `Moved ticket "${subjectFor(input.ticket)}" from Open to ${input.ticket.lane}`,
    targetType: "ticket",
    targetId: input.ticketId,
    changes: [
      {
        field: "status_id",
        label: "Status",
        from: "Open",
        to: input.ticket.lane,
      },
    ],
  });
}

async function insertActivityEvents(db: DbClient, rows: ActivityEventInsert[]) {
  if (rows.length === 0) return;

  const { error } = await db.from("activity_events").insert(rows);
  if (error) {
    console.error("Failed to create activity events:", error.message);
    process.exit(1);
  }
}

async function main() {
  const reset = process.argv.includes("--reset");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    console.error("Missing Supabase URL or SUPABASE_SECRET_KEY");
    process.exit(1);
  }

  const db = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const ticketTitles = DEMO_TICKETS.map((ticket) => subjectFor(ticket));

  if (reset) {
    const { data: legacyTickets, error: listLegacyTicketsError } = await db
      .from("tickets")
      .select("id")
      .like("title", `${LEGACY_DEMO_TITLE_PREFIX}%`);
    if (listLegacyTicketsError) {
      console.error(
        "Failed to list prior Cedar CRM tickets:",
        listLegacyTicketsError.message,
      );
      process.exit(1);
    }

    const { data: namedTickets, error: listNamedTicketsError } = await db
      .from("tickets")
      .select("id")
      .in("title", ticketTitles);
    if (listNamedTicketsError) {
      console.error(
        "Failed to list prior Cedar CRM tickets:",
        listNamedTicketsError.message,
      );
      process.exit(1);
    }

    const existingTicketIds = [
      ...new Set(
        [...(legacyTickets ?? []), ...(namedTickets ?? [])].map(
          (row) => row.id as string,
        ),
      ),
    ];
    if (existingTicketIds.length) {
      const { error: deleteActivityError } = await db
        .from("activity_events")
        .delete()
        .in("ticket_id", existingTicketIds);
      if (deleteActivityError) {
        console.error(
          "Failed to delete prior Cedar CRM activity:",
          deleteActivityError.message,
        );
        process.exit(1);
      }

      await db
        .from("custom_field_values")
        .delete()
        .eq("entity_type", "ticket")
        .in("entity_id", existingTicketIds);

      const { error: deleteTicketsError } = await db
        .from("tickets")
        .delete()
        .in("id", existingTicketIds);
      if (deleteTicketsError) {
        console.error("Failed to delete prior Cedar CRM tickets:", deleteTicketsError.message);
        process.exit(1);
      }
      console.log(`Removed ${existingTicketIds.length} prior Cedar CRM tickets`);
    }

    const { data: existingContacts, error: listContactsError } = await db
      .from("contacts")
      .select("id")
      .like("username", "%.cedarcrm.example");
    if (listContactsError) {
      console.error("Failed to list prior Cedar CRM contacts:", listContactsError.message);
      process.exit(1);
    }

    const existingContactIds = (existingContacts ?? []).map((row) => row.id as string);
    if (existingContactIds.length) {
      await db
        .from("custom_field_values")
        .delete()
        .eq("entity_type", "contact")
        .in("entity_id", existingContactIds);
      await db.from("contacts").delete().in("id", existingContactIds);
    }

    await db.from("api_keys").delete().eq("name", DEMO_AGENT_KEY_NAME);
    await db.from("tags").delete().in("name", LEGACY_DEMO_TAG_NAMES);
  }

  const { data: existingDemoTickets, error: existingTicketsError } = await db
    .from("tickets")
    .select("title")
    .in("title", ticketTitles);
  if (existingTicketsError) {
    console.error("Failed to check existing Cedar CRM tickets:", existingTicketsError.message);
    process.exit(1);
  }

  if (existingDemoTickets?.length) {
    console.log(
      `Cedar CRM demo already exists (${existingDemoTickets.length} tickets). Use --reset to recreate it.`,
    );
    return;
  }

  const { data: statuses, error: statusesError } = await db
    .from("status_types")
    .select("id, name")
    .in("name", ["Open", "In Process", "Human Review", "Closed"]);
  if (statusesError || !statuses?.length) {
    console.error("Missing board lanes:", statusesError?.message);
    process.exit(1);
  }

  const statusByName = new Map(
    statuses.map((status) => [status.name as StatusName, status.id as string]),
  );
  for (const lane of ["Open", "In Process", "Human Review", "Closed"] satisfies StatusName[]) {
    if (!statusByName.has(lane)) {
      console.error(`Missing required board lane: ${lane}`);
      process.exit(1);
    }
  }

  const { data: adminUser, error: adminError } = await db
    .from("users")
    .select("id")
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (adminError || !adminUser) {
    console.error(
      "Cedar CRM demo needs an admin user to own the demo API key. Run `pnpm db:seed-admin` first.",
    );
    if (adminError) console.error(adminError.message);
    process.exit(1);
  }

  const fieldDefinitions = [...CONTACT_FIELD_DEFINITIONS, ...TICKET_FIELD_DEFINITIONS];
  const fieldIds = new Map<string, { id: string; definition: DemoFieldDefinition }>();
  for (const definition of fieldDefinitions) {
    fieldIds.set(definition.key, {
      id: await ensureFieldDefinition(db, definition),
      definition,
    });
  }

  const ticketVisibilityPatch: Record<string, { showOnCard: boolean; showInTicket: boolean }> = {};
  for (const definition of TICKET_FIELD_DEFINITIONS) {
    const field = fieldIds.get(definition.key);
    if (!field) continue;
    ticketVisibilityPatch[`custom:${field.id}`] = {
      showOnCard: definition.key === "cedar_priority",
      showInTicket: true,
    };
  }

  const { data: settings, error: settingsLookupError } = await db
    .from("global_settings")
    .select("ticket_field_visibility")
    .eq("id", 1)
    .single();
  if (settingsLookupError) {
    console.error("Failed to load ticket field visibility:", settingsLookupError.message);
    process.exit(1);
  }

  const existingVisibility =
    settings.ticket_field_visibility &&
    typeof settings.ticket_field_visibility === "object" &&
    !Array.isArray(settings.ticket_field_visibility)
      ? (settings.ticket_field_visibility as Record<
          string,
          { showOnCard: boolean; showInTicket: boolean }
        >)
      : {};

  const { error: settingsError } = await db
    .from("global_settings")
    .update({
      ticket_field_visibility: {
        ...existingVisibility,
        ...ticketVisibilityPatch,
      },
    })
    .eq("id", 1);
  if (settingsError) {
    console.error("Failed to set Cedar CRM ticket field visibility:", settingsError.message);
    process.exit(1);
  }

  const tagIds = new Map<string, string>();
  for (const tag of DEMO_TAGS) {
    tagIds.set(tag.name, await ensureTag(db, tag));
  }

  let demoApiKeyId: string;
  const { data: existingKey, error: existingKeyError } = await db
    .from("api_keys")
    .select("id")
    .eq("name", DEMO_AGENT_KEY_NAME)
    .is("revoked_at", null)
    .maybeSingle();
  if (existingKeyError) {
    console.error("Failed to check Cedar CRM demo API key:", existingKeyError.message);
    process.exit(1);
  }

  if (existingKey) {
    demoApiKeyId = existingKey.id as string;
  } else {
    const { data: createdKey, error: keyError } = await db
      .from("api_keys")
      .insert({
        name: DEMO_AGENT_KEY_NAME,
        key_hash: hashApiKey(DEMO_AGENT_KEY_TOKEN),
        key_prefix: DEMO_AGENT_KEY_TOKEN.slice(0, 12),
        created_by: adminUser.id,
      })
      .select("id")
      .single();
    if (keyError || !createdKey) {
      console.error("Failed to create Cedar CRM demo API key:", keyError?.message);
      process.exit(1);
    }
    demoApiKeyId = createdKey.id as string;
  }

  const contactIds = new Map<string, string>();
  for (const ticket of DEMO_TICKETS) {
    if (contactIds.has(ticket.contact)) continue;

    const { data: existingContact, error: contactLookupError } = await db
      .from("contacts")
      .select("id")
      .eq("username", ticket.contact)
      .maybeSingle();
    if (contactLookupError) {
      console.error(`Failed to check contact ${ticket.contact}:`, contactLookupError.message);
      process.exit(1);
    }

    let contactId: string;
    if (existingContact) {
      contactId = existingContact.id as string;
    } else {
      const { data: createdContact, error: contactInsertError } = await db
        .from("contacts")
        .insert({ username: ticket.contact })
        .select("id")
        .single();
      if (contactInsertError || !createdContact) {
        console.error(`Failed to create contact ${ticket.contact}:`, contactInsertError?.message);
        process.exit(1);
      }
      contactId = createdContact.id as string;
    }

    contactIds.set(ticket.contact, contactId);
    await insertCustomFieldValues(
      db,
      "contact",
      contactId,
      fieldIds,
      ticket.contact_fields,
    );
  }

  const laneCounts = new Map<StatusName, number>();

  for (const [index, ticket] of DEMO_TICKETS.entries()) {
    const createdAt = timestamp(index, 0);
    const updatedAt = timestamp(index, latestSeededActivityMinute(ticket));

    const { data: createdTicket, error: ticketError } = await db
      .from("tickets")
      .insert({
        title: subjectFor(ticket),
        kind: ticket.kind,
        body: ticket.kind === "task" ? ticket.body : null,
        channel: ticket.kind === "conversation" ? ticket.channel : null,
        contact_address: ticket.kind === "conversation" ? ticket.contact : null,
        contact_id: contactIds.get(ticket.contact),
        status_id: statusByName.get(ticket.lane),
        origin: ticket.origin,
        created_at: createdAt,
        updated_at: updatedAt,
      })
      .select("id")
      .single();
    if (ticketError || !createdTicket) {
      console.error(`Failed to create ticket ${ticket.title}:`, ticketError?.message);
      process.exit(1);
    }

    const ticketId = createdTicket.id as string;
    const contactId = contactIds.get(ticket.contact);
    if (!contactId) {
      console.error(`Missing contact for ticket ${ticket.title}`);
      process.exit(1);
    }

    await insertCustomFieldValues(db, "ticket", ticketId, fieldIds, ticket.ticket_fields);

    const ticketTagRows = ticket.tags.map((tagName) => ({
      ticket_id: ticketId,
      tag_id: tagIds.get(tagName),
    }));
    if (ticketTagRows.length) {
      const { error: tagsError } = await db.from("ticket_tags").insert(ticketTagRows);
      if (tagsError) {
        console.error(`Failed to tag ticket ${ticket.title}:`, tagsError.message);
        process.exit(1);
      }
    }

    const messages = (ticket.messages ?? []).map((message, messageIndex) => ({
      ticket_id: ticketId,
      body: message.body,
      visibility: "public",
      author_type: message.author_type,
      channel: message.channel,
      created_at: timestamp(index, message.minutes_after_open),
      email_from:
        message.channel === "email"
          ? message.author_type === "contact"
            ? ticket.contact
            : SUPPORT_EMAIL
          : null,
      email_to:
        message.channel === "email"
          ? [message.author_type === "contact" ? SUPPORT_EMAIL : ticket.contact]
          : [],
      email_subject:
        message.channel === "email"
          ? (message.subject ?? subjectFor(ticket))
          : null,
      email_message_id:
        message.channel === "email"
          ? `<cedar-demo-${index + 1}-${messageIndex + 1}@cedarcrm.example>`
          : null,
    }));

    let createdMessages: SeededMessage[] = [];
    if (messages.length) {
      const { data, error: messagesError } = await db
        .from("messages")
        .insert(messages)
        .select("id, body, author_type, channel, email_from, email_subject, created_at");
      if (messagesError) {
        console.error(`Failed to create messages for ${ticket.title}:`, messagesError.message);
        process.exit(1);
      }
      createdMessages = (data ?? []) as SeededMessage[];
    }

    const commentCreatedAt = timestamp(index, 2);
    const { data: createdComment, error: commentError } = await db
      .from("ticket_comments")
      .insert({
        ticket_id: ticketId,
        body: ticket.agent_comment,
        author_type: "api_key",
        author_id: null,
        api_key_id: demoApiKeyId,
        created_at: commentCreatedAt,
      })
      .select("id")
      .single();
    if (commentError || !createdComment) {
      console.error(
        `Failed to create agent comment for ${ticket.title}:`,
        commentError?.message,
      );
      process.exit(1);
    }

    const activityRows: ActivityEventInsert[] = [
      buildTicketCreatedActivity({
        ticketId,
        ticket,
        contactId,
        demoApiKeyId,
        occurredAt: createdAt,
      }),
      ...createdMessages.map((message) =>
        buildMessageActivity({
          ticketId,
          ticket,
          message,
          demoApiKeyId,
        }),
      ),
      buildCommentActivity({
        ticketId,
        ticket,
        commentId: createdComment.id as string,
        demoApiKeyId,
        occurredAt: commentCreatedAt,
      }),
    ];
    const statusActivityMinute = statusMoveMinute(ticket);
    const statusActivity =
      statusActivityMinute === null
        ? null
        : buildStatusActivity({
            ticketId,
            ticket,
            demoApiKeyId,
            occurredAt: timestamp(index, statusActivityMinute),
          });
    if (statusActivity) activityRows.push(statusActivity);
    await insertActivityEvents(db, activityRows);

    laneCounts.set(ticket.lane, (laneCounts.get(ticket.lane) ?? 0) + 1);
  }

  console.log("Seeded Cedar CRM demo tickets:");
  for (const lane of ["Open", "In Process", "Human Review", "Closed"] satisfies StatusName[]) {
    console.log(`- ${lane}: ${laneCounts.get(lane) ?? 0}`);
  }
  console.log(`Custom fields: ${fieldDefinitions.length}`);
  console.log(`Tags: ${DEMO_TAGS.length}`);
  console.log(`Agent comments authored by API key: ${DEMO_AGENT_KEY_NAME}`);
  console.log("Activity timeline: ticket creation, messages, comments, and lane moves");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
