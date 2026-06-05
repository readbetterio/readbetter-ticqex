import { describe, expect, it } from "vitest";
import {
  isHttpsAppUrl,
  normalizeAppUrl,
  resendWebhookUrl,
} from "@shared/integrations/resend/webhook-endpoints";

describe("resend webhook endpoints", () => {
  it("normalizes trailing slashes on the app URL", () => {
    expect(normalizeAppUrl("https://ticqex.example.com/")).toBe(
      "https://ticqex.example.com",
    );
  });

  it("detects HTTPS app URLs for Resend webhooks", () => {
    expect(isHttpsAppUrl("http://localhost:3000")).toBe(false);
    expect(isHttpsAppUrl("https://ticqex.example.com/")).toBe(true);
    expect(isHttpsAppUrl("not-a-url")).toBe(false);
  });

  it("builds the Resend webhook URL", () => {
    expect(resendWebhookUrl("https://ticqex.example.com/")).toBe(
      "https://ticqex.example.com/api/webhooks/integrations/resend",
    );
  });
});
