import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/main.js";
import { saveStoredConfig } from "../src/credentials.js";

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn((url: string | URL, init?: RequestInit) => {
    const resolvedUrl = typeof url === "string" ? url : url.toString();
    return handler(resolvedUrl, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("cli call command", () => {
  let configRoot: string;
  let stdout: string;
  let stderr: string;

  beforeEach(async () => {
    configRoot = await mkdtemp(join(tmpdir(), "ticqex-cli-run-"));
    process.env.XDG_CONFIG_HOME = configRoot;
    await saveStoredConfig({
      instance: "https://example.com",
      apiKey: "tq_live_test_key_12345",
    });

    stdout = "";
    stderr = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      stdout += String(chunk);
      return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      stderr += String(chunk);
      return true;
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    await rm(configRoot, { recursive: true, force: true });
  });

  it("executes ticqex_get_me via call subcommand", async () => {
    mockFetch((url, init) => {
      expect(url).toBe("https://example.com/api/v1/users/me");
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer tq_live_test_key_12345",
      });
      return Response.json({
        data: { id: "user-1", email: "agent@example.com" },
      });
    });

    const exitCode = await run(["node", "ticqex", "call", "ticqex_get_me"]);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      id: "user-1",
      email: "agent@example.com",
    });
    expect(stderr).toBe("");
  });

  it("executes friendly users me command", async () => {
    mockFetch(() =>
      Response.json({
        data: { id: "user-1", email: "agent@example.com" },
      }),
    );

    const exitCode = await run(["node", "ticqex", "users", "me"]);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      id: "user-1",
      email: "agent@example.com",
    });
  });

  it("returns usage error for unknown operation", async () => {
    const exitCode = await run(["node", "ticqex", "call", "ticqex_not_real"]);
    expect(exitCode).toBe(2);
    expect(JSON.parse(stderr)).toEqual({
      error: {
        code: "usage_error",
        message: "Unknown operation: ticqex_not_real",
      },
    });
  });

  it("returns API error envelope on failed request", async () => {
    mockFetch(() =>
      Response.json(
        { error: { code: "unauthorized", message: "Invalid API key" } },
        { status: 401 },
      ),
    );

    const exitCode = await run(["node", "ticqex", "call", "ticqex_get_me"]);
    expect(exitCode).toBe(1);
    expect(JSON.parse(stderr)).toEqual({
      error: {
        code: "unauthorized",
        message: "Invalid API key",
      },
    });
  });

  it("passes query params from flags for list tickets", async () => {
    mockFetch((url) => {
      expect(url).toBe(
        "https://example.com/api/v1/tickets?page=2&per_page=10",
      );
      return Response.json({ data: [] });
    });

    const exitCode = await run([
      "node",
      "ticqex",
      "tickets",
      "list",
      "--page",
      "2",
      "--per-page",
      "10",
    ]);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual([]);
  });
});
