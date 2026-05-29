export {
  TICQEX_CONFIG_VERSION,
  type ChannelKey,
  type ConfigValidationIssue,
  type IntegrationKey,
  type TicqexConfig,
} from "@shared/ticqex-config/types";

export type ChannelBinding = {
  enabled: boolean;
  integration: string | null;
};

export type IntegrationBinding = {
  enabled: boolean;
};

export type ConfigValidationResult = {
  ok: boolean;
  config: import("@shared/ticqex-config/types").TicqexConfig;
  issues: import("@shared/ticqex-config/types").ConfigValidationIssue[];
};
