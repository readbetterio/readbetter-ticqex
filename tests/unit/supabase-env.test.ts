import { describe, expect, it } from "vitest";
import {
  formatSupabaseAuthError,
  isRedactedSupabaseKey,
  isUsableSupabaseSecretKey,
  validateSupabaseSeedEnv,
} from "../../scripts/lib/supabase-env";

describe("supabase-env", () => {
  it("detects redacted keys", () => {
    expect(isRedactedSupabaseKey("sb_secret_abc...xyz")).toBe(true);
    expect(isUsableSupabaseSecretKey("sb_secret_abc...xyz")).toBe(false);
    expect(isUsableSupabaseSecretKey("eyJservice_role")).toBe(true);
  });

  it("validates seed env", () => {
    expect(() =>
      validateSupabaseSeedEnv(
        "https://abcdefghijklmnop.supabase.co",
        "sb_secret_abc...xyz",
      ),
    ).toThrow(/redacted/i);
  });

  it("formats HTML auth errors clearly", () => {
    expect(
      formatSupabaseAuthError(
        `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`,
        "https://abcdefghijklmnop.supabase.co",
      ),
    ).toMatch(/HTML instead of JSON/i);
  });
});
