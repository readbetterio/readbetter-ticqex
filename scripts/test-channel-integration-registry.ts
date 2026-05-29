import assert from "node:assert/strict";
import {
  buildTicketCardSurface,
  channelKeys,
  type ChannelDefinition,
  findMissingRequiredFields,
  getChannelDefinition,
  getChannelIntegrationEmail,
  assertChannelFields,
  assertChannelReadyToSend,
  getMissingChannelFields,
} from "@server/channels";
import { ApiError } from "@server/lib/errors";
import {
  configureIntegration,
  getIntegrationDefinition,
  integrationKeys,
} from "@server/integrations";
import {
  normalizeResendDeliveryEvent,
  parseResendInbound,
} from "@server/integrations/resend/email";
import {
  getEmailChannelRuntime,
  isChannelOperational,
  validateTicqexConfig,
} from "@server/config";
import type { TicqexConfig } from "@server/config";
import {
  EMAIL_PROVIDER_MESSAGE_REF_TYPE,
  type EmailDeliveryEvent,
  type EmailDeliveryEventResult,
  type ParsedEmail,
} from "@shared/channels/email/transport";

const enabledEmailConfig: TicqexConfig = {
  version: 1,
  channels: {
    email: {
      enabled: true,
      integration: "resend",
    },
  },
  integrations: {
    resend: {
      enabled: true,
    },
  },
};

const unboundEmailConfig: TicqexConfig = {
  version: 1,
  channels: {
    email: {
      enabled: true,
      integration: null,
    },
  },
  integrations: {
    resend: {
      enabled: true,
    },
  },
};

function testRegistries(): void {
  assert.deepEqual(channelKeys, ["email"]);
  assert.deepEqual(integrationKeys, ["resend"]);

  const email = getChannelDefinition("email");
  assert.ok(email);
  assert.equal(email.key, "email");
  assert.equal("integrationKey" in email, false);
  assert.equal(email.conversation.canSendPublicReplies, true);
  assert.ok(email.inbound);
  assert.ok(email.outbound);
  assert.ok(email.deliveryEvents);

  const neutralEmail: ChannelDefinition<
    ParsedEmail,
    EmailDeliveryEvent,
    EmailDeliveryEventResult
  > = email;
  assert.equal(neutralEmail.key, "email");

  const resend = getIntegrationDefinition("resend");
  assert.ok(resend);
  assert.ok(resend.capabilities.includes("email.inbound"));
  assert.ok(resend.email?.send);
  assert.ok(resend.email?.resolveInbound);
  assert.ok(resend.webhooks?.inbound);
  assert.ok(resend.webhooks?.events);
}

function testDefaultConfigBinding(): void {
  const env = {
    RESEND_API_KEY: "re_test",
    RESEND_INBOUND_WEBHOOK_SECRET: "whsec_test",
    SUPPORT_EMAIL: "support@example.com",
    SUPPORT_FROM_NAME: "Support",
    NEXT_PUBLIC_APP_URL: "https://example.com",
  };

  const result = validateTicqexConfig(enabledEmailConfig, env);

  assert.equal(result.ok, true);
  assert.equal(enabledEmailConfig.channels.email.integration, "resend");
}

function testMissingAppUrlWhenEmailEnabled(): void {
  const result = validateTicqexConfig(enabledEmailConfig, {
    RESEND_API_KEY: "re_test",
    RESEND_INBOUND_WEBHOOK_SECRET: "whsec_test",
    SUPPORT_EMAIL: "support@example.com",
    SUPPORT_FROM_NAME: "Support",
  });

  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) => issue.path === "env.NEXT_PUBLIC_APP_URL"),
  );
}

function testEmailChannelRuntime(): void {
  const runtime = getEmailChannelRuntime({
    config: enabledEmailConfig,
    env: {
      RESEND_API_KEY: "re_test",
      RESEND_INBOUND_WEBHOOK_SECRET: "whsec_test",
      SUPPORT_EMAIL: "support@example.com",
      SUPPORT_FROM_NAME: "Support",
      NEXT_PUBLIC_APP_URL: "https://example.com",
    },
  });

  assert.ok(runtime);
  assert.equal(runtime.channel.key, "email");
  assert.equal(runtime.integrationKey, "resend");
  assert.ok(runtime.integration?.configured);
}

function testMissingEnvSurfacesIssues(): void {
  const result = validateTicqexConfig(enabledEmailConfig, {});
  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) => issue.path === "env.RESEND_API_KEY"),
  );
}

function testEmailCardSurface(): void {
  const email = getChannelDefinition("email");
  assert.ok(email);

  const built = email.card.build({
    kind: "conversation",
    channel: "email",
    contact_address: "user@example.com",
    custom_fields: {},
  });

  assert.equal(built.badges[0]?.label, "Email");
  assert.equal(built.badges[0]?.variant, "outline");
  assert.deepEqual(built.chips, [
    { label: "Email address", value: "user@example.com" },
  ]);
  assert.equal(built.warning_badges.length, 0);
}

function testFieldPolicyHelpers(): void {
  const email = getChannelDefinition("email");
  assert.ok(email);

  const missing = findMissingRequiredFields(
    email.fields,
    { contact_address: null, custom_fields: {} },
    "on_create",
  );
  assert.equal(missing.length, 1);
  assert.equal(missing[0]?.key, "contact_address");

  const taskSurface = buildTicketCardSurface({
    kind: "task",
    channel: null,
    contact_address: null,
    custom_fields: { priority: "high", region: "eu" },
    preview: "Task preview",
  });
  assert.deepEqual(taskSurface.chips, [
    { label: "priority", value: "high" },
    { label: "region", value: "eu" },
  ]);
  assert.equal(taskSurface.preview, "Task preview");
}

function testConfigureIntegration(): void {
  const runtime = configureIntegration(
    "resend",
    {
      RESEND_API_KEY: "re_test",
      RESEND_INBOUND_WEBHOOK_SECRET: "whsec_test",
      SUPPORT_EMAIL: "support@example.com",
      SUPPORT_FROM_NAME: "Support",
    },
    { enabled: true },
  );

  assert.ok(runtime?.configured);
  assert.deepEqual(runtime?.missingEnv, []);
}

function testChannelIntegrationEmail(): void {
  const env = {
    RESEND_API_KEY: "re_test",
    RESEND_INBOUND_WEBHOOK_SECRET: "whsec_test",
    SUPPORT_EMAIL: "support@example.com",
    SUPPORT_FROM_NAME: "Support",
    NEXT_PUBLIC_APP_URL: "https://example.com",
  };

  const unboundEmailApi = getChannelIntegrationEmail("email", {
    config: unboundEmailConfig,
    env,
  });
  assert.equal(unboundEmailApi, null);

  const emailApi = getChannelIntegrationEmail("email", {
    config: enabledEmailConfig,
    env,
  });
  assert.ok(emailApi);
  assert.equal(typeof emailApi.send, "function");
  assert.equal(typeof emailApi.resolveInbound, "function");
}

function testResendInboundNormalization(): void {
  const parsed = parseResendInbound({
    type: "email.received",
    data: {
      email_id: "resend-inbound-id",
      from: "User <user@example.com>",
      to: "support@example.com",
      subject: "Hello",
      text: "Body",
      message_id: "<message@example.com>",
      headers: {},
    },
  });

  assert.equal(parsed.from, "user@example.com");
  assert.equal(parsed.providerRef?.provider, "resend");
  assert.equal(parsed.providerRef?.integrationKey, "resend");
  assert.equal(parsed.providerRef?.direction, "inbound");
  assert.equal(parsed.providerRef?.refType, EMAIL_PROVIDER_MESSAGE_REF_TYPE);
  assert.equal(parsed.providerRef?.externalId, "resend-inbound-id");
  assert.equal("providerInboundId" in parsed, false);
}

function testResendDeliveryNormalization(): void {
  const event = normalizeResendDeliveryEvent({
    type: "email.delivered",
    created_at: "2026-05-29T19:30:00.000Z",
    data: {
      email_id: "resend-outbound-id",
    },
  });

  assert.ok(event);
  assert.equal(event.status, "delivered");
  assert.equal(event.providerEventType, "email.delivered");
  assert.equal(event.providerRef.provider, "resend");
  assert.equal(event.providerRef.integrationKey, "resend");
  assert.equal(event.providerRef.direction, "outbound");
  assert.equal(event.providerRef.refType, EMAIL_PROVIDER_MESSAGE_REF_TYPE);
  assert.equal(event.providerRef.externalId, "resend-outbound-id");
  assert.equal(
    normalizeResendDeliveryEvent({
      type: "email.opened",
      data: { email_id: "ignored" },
    }),
    null,
  );
}

function testFieldPolicyEnforcement(): void {
  assert.throws(
    () =>
      assertChannelFields("email", "on_create", {
        contact_address: null,
        custom_fields: {},
      }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      assert.match(error.message, /Email address/);
      return true;
    },
  );

  assert.doesNotThrow(() =>
    assertChannelFields("email", "on_create", {
      contact_address: "user@example.com",
      custom_fields: {},
    }),
  );

  assert.throws(
    () =>
      assertChannelReadyToSend("email", {
        contact_address: null,
        custom_fields: {},
      }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      return true;
    },
  );

  assert.doesNotThrow(() =>
    assertChannelReadyToSend("email", {
      contact_address: "user@example.com",
      custom_fields: {},
    }),
  );

  assert.deepEqual(
    getMissingChannelFields("email", "on_create", {
      contact_address: "",
      custom_fields: {},
    }).map((field) => field.key),
    ["contact_address"],
  );
}

function testChannelOperationalGate(): void {
  const env = {
    RESEND_API_KEY: "re_test",
    RESEND_INBOUND_WEBHOOK_SECRET: "whsec_test",
    SUPPORT_EMAIL: "support@example.com",
    SUPPORT_FROM_NAME: "Support",
    NEXT_PUBLIC_APP_URL: "https://example.com",
  };

  assert.equal(
    isChannelOperational("email", { env, config: enabledEmailConfig }),
    true,
  );
  assert.equal(
    isChannelOperational("email", { env: {}, config: enabledEmailConfig }),
    false,
  );
}

function main(): void {
  testRegistries();
  testDefaultConfigBinding();
  testMissingAppUrlWhenEmailEnabled();
  testEmailChannelRuntime();
  testMissingEnvSurfacesIssues();
  testEmailCardSurface();
  testFieldPolicyHelpers();
  testConfigureIntegration();
  testChannelIntegrationEmail();
  testResendInboundNormalization();
  testResendDeliveryNormalization();
  testFieldPolicyEnforcement();
  testChannelOperationalGate();
  console.log("channel-integration registry tests passed");
}

main();
