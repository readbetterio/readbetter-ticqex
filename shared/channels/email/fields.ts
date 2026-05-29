import type { ChannelFieldPolicy } from "../types";

/** Email channel field policies (source of truth for card surface + future config:sync). */
export const emailFieldPolicies: ChannelFieldPolicy[] = [
  {
    key: "contact_address",
    label: "Email address",
    group: "ticket",
    type: "text",
    requiredWhen: "on_create",
    visibleWhen: "always",
    lockedWhen: "on_send",
    source: "integration",
    cardPriority: 1,
  },
];
