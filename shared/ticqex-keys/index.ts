/** Canonical channel keys compiled into ticqex. */
export const CHANNEL_KEYS = ["email"] as const;

/** Canonical integration keys compiled into ticqex. */
export const INTEGRATION_KEYS = ["resend"] as const;

export type ChannelKey = (typeof CHANNEL_KEYS)[number];
export type IntegrationKey = (typeof INTEGRATION_KEYS)[number];

export function isChannelKey(value: string): value is ChannelKey {
  return (CHANNEL_KEYS as readonly string[]).includes(value);
}

export function isIntegrationKey(value: string): value is IntegrationKey {
  return (INTEGRATION_KEYS as readonly string[]).includes(value);
}
