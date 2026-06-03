import { describe, expect, it } from "vitest";
import { resolveCloudSupabaseKeys } from "../../scripts/lib/cloud-supabase";

describe("resolveCloudSupabaseKeys", () => {
  it("prefers publishable and secret keys", () => {
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

  it("falls back to legacy anon and service_role keys", () => {
    const keys = resolveCloudSupabaseKeys("abcdefghijklmnopqrst", [
      { type: "legacy", name: "anon", api_key: "legacy_anon" },
      { type: "legacy", name: "service_role", api_key: "legacy_service" },
    ]);

    expect(keys.publishableKey).toBe("legacy_anon");
    expect(keys.secretKey).toBe("legacy_service");
  });

  it("throws when keys are missing", () => {
    expect(() =>
      resolveCloudSupabaseKeys("abcdefghijklmnopqrst", [
        { type: "legacy", name: "anon", api_key: "legacy_anon" },
      ]),
    ).toThrow(/publishable and secret/i);
  });
});
