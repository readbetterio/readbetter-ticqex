import { describe, expect, it } from "vitest";
import { resolveCloudSupabaseKeys } from "../../scripts/lib/cloud-supabase";

describe("resolveCloudSupabaseKeys", () => {
  it("prefers publishable and full secret keys", () => {
    const keys = resolveCloudSupabaseKeys("abcdefghijklmnopqrst", [
      { type: "publishable", name: "default", api_key: "sb_publishable_test" },
      { type: "secret", name: "default", api_key: "sb_secret_test" },
      { type: "legacy", name: "anon", api_key: "legacy_anon" },
    ]);

    expect(keys).toEqual({
      url: "https://abcdefghijklmnopqrst.supabase.co",
      publishableKey: "sb_publishable_test",
      secretKey: "sb_secret_test",
    });
  });

  it("prefers legacy service_role over redacted sb_secret keys", () => {
    const keys = resolveCloudSupabaseKeys("abcdefghijklmnopqrst", [
      { type: "publishable", name: "default", api_key: "sb_publishable_test" },
      { type: "secret", name: "default", api_key: "sb_secret_abc...xyz" },
      { type: "legacy", name: "service_role", api_key: "eyJservice_role" },
      { type: "legacy", name: "anon", api_key: "eyJanon" },
    ]);

    expect(keys.secretKey).toBe("eyJservice_role");
    expect(keys.publishableKey).toBe("sb_publishable_test");
  });

  it("falls back to legacy anon and service_role keys", () => {
    const keys = resolveCloudSupabaseKeys("abcdefghijklmnopqrst", [
      { type: "legacy", name: "anon", api_key: "eyJanon" },
      { type: "legacy", name: "service_role", api_key: "eyJservice_role" },
    ]);

    expect(keys.publishableKey).toBe("eyJanon");
    expect(keys.secretKey).toBe("eyJservice_role");
  });

  it("throws when only redacted secret keys are available", () => {
    expect(() =>
      resolveCloudSupabaseKeys("abcdefghijklmnopqrst", [
        { type: "publishable", name: "default", api_key: "sb_publishable_test" },
        { type: "secret", name: "default", api_key: "sb_secret_abc...xyz" },
      ]),
    ).toThrow(/usable publishable and secret/i);
  });
});
