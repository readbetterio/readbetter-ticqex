export const TICQEX_CONFIG_VERSION = 1 as const;

export type { ChannelKey, IntegrationKey } from "@shared/ticqex-keys";

import type { IntegrationKey } from "@shared/ticqex-keys";

export type TicqexConfig = {
  version: typeof TICQEX_CONFIG_VERSION;
  channels: {
    email: {
      enabled: boolean;
      integration: IntegrationKey | null;
    };
  };
  integrations: {
    resend: {
      enabled: boolean;
    };
  };
};

export type ConfigValidationIssue = {
  path: string;
  message: string;
};
