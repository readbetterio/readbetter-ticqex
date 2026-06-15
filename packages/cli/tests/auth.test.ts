import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getConfigDir, getConfigPath } from "../src/config.js";
import {
  clearStoredConfig,
  loadStoredConfig,
  resolveCredentials,
  saveStoredConfig,
} from "../src/credentials.js";

describe("config paths", () => {
  const originalXdg = process.env.XDG_CONFIG_HOME;

  afterEach(() => {
    if (originalXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = originalXdg;
    }
  });

  it("uses XDG_CONFIG_HOME when set", () => {
    process.env.XDG_CONFIG_HOME = "/tmp/xdg-config";
    expect(getConfigDir()).toBe("/tmp/xdg-config/ticqex");
    expect(getConfigPath()).toBe("/tmp/xdg-config/ticqex/config.json");
  });
});

describe("credential precedence", () => {
  let configRoot: string;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    configRoot = await mkdtemp(join(tmpdir(), "ticqex-cli-auth-"));
    process.env.XDG_CONFIG_HOME = configRoot;
    delete process.env.TICQEX_INSTANCE;
    delete process.env.TICQEX_API_KEY;
    await saveStoredConfig({
      instance: "https://stored.example.com",
      apiKey: "tq_live_stored_key",
    });
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await rm(configRoot, { recursive: true, force: true });
  });

  it("prefers CLI flags over env and stored config", async () => {
    process.env.TICQEX_INSTANCE = "https://env.example.com";
    process.env.TICQEX_API_KEY = "tq_live_env_key";

    const resolved = await resolveCredentials({
      instance: "https://flag.example.com",
      apiKey: "tq_live_flag_key",
    });

    expect(resolved).toEqual({
      instance: "https://flag.example.com",
      apiKey: "tq_live_flag_key",
      source: "flags",
    });
  });

  it("prefers env over stored config when flags are absent", async () => {
    process.env.TICQEX_INSTANCE = "https://env.example.com";
    process.env.TICQEX_API_KEY = "tq_live_env_key";

    const resolved = await resolveCredentials({});
    expect(resolved).toEqual({
      instance: "https://env.example.com",
      apiKey: "tq_live_env_key",
      source: "env",
    });
  });

  it("falls back to stored config", async () => {
    const resolved = await resolveCredentials({});
    expect(resolved).toEqual({
      instance: "https://stored.example.com",
      apiKey: "tq_live_stored_key",
      source: "config",
    });
  });

  it("returns null when nothing is configured", async () => {
    await clearStoredConfig();
    const resolved = await resolveCredentials({});
    expect(resolved).toBeNull();
  });

  it("writes config with restrictive permissions", async () => {
    await saveStoredConfig({
      instance: "https://secure.example.com",
      apiKey: "tq_live_secure_key",
    });
    const loaded = await loadStoredConfig();
    expect(loaded).toEqual({
      instance: "https://secure.example.com",
      apiKey: "tq_live_secure_key",
    });

    const raw = await readFile(getConfigPath(), "utf8");
    expect(JSON.parse(raw)).toEqual({
      instance: "https://secure.example.com",
      apiKey: "tq_live_secure_key",
    });
  });
});

describe("clearStoredConfig", () => {
  let configRoot: string;

  beforeEach(async () => {
    configRoot = await mkdtemp(join(tmpdir(), "ticqex-cli-clear-"));
    process.env.XDG_CONFIG_HOME = configRoot;
    await saveStoredConfig({
      instance: "https://example.com",
      apiKey: "tq_live_test",
    });
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(configRoot, { recursive: true, force: true });
  });

  it("removes stored credentials", async () => {
    await clearStoredConfig();
    expect(await loadStoredConfig()).toBeNull();
  });
});
