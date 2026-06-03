import { describe, expect, it } from "vitest";
import { isHttpsAppUrl, normalizeAppUrl } from "@shared/integrations/resend/webhook-endpoints";

describe("local tunnel URL helpers", () => {
  it("accepts pasted tunnel URLs for webhook setup", () => {
    expect(
      isHttpsAppUrl("https://abc123.ngrok-free.app"),
    ).toBe(true);
    expect(
      normalizeAppUrl("https://ticqex.example.com/"),
    ).toBe("https://ticqex.example.com");
  });

  it("rejects non-HTTPS URLs", () => {
    expect(isHttpsAppUrl("http://localhost:3000")).toBe(false);
  });
});
