import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeBaseUrl, TicqexClient } from "../src/index.js";
import { TicqexApiError } from "../src/errors.js";

type FetchCall = {
  url: string;
  init?: RequestInit;
};

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn((url: string | URL, init?: RequestInit) => {
    const resolvedUrl = typeof url === "string" ? url : url.toString();
    calls.push({ url: resolvedUrl, init });
    return handler(resolvedUrl, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, calls };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("normalizeBaseUrl", () => {
  it("strips trailing slashes", () => {
    expect(normalizeBaseUrl("https://example.com/")).toBe("https://example.com");
    expect(normalizeBaseUrl("https://example.com///")).toBe("https://example.com");
  });

  it("removes /api/v1 suffix", () => {
    expect(normalizeBaseUrl("https://example.com/api/v1")).toBe(
      "https://example.com",
    );
    expect(normalizeBaseUrl("https://example.com/api/v1/")).toBe(
      "https://example.com",
    );
  });
});

describe("TicqexClient", () => {
  it("builds requests against normalized base URL and /api/v1 prefix", async () => {
    const { calls } = mockFetch(() =>
      Response.json({ data: { ok: true } }),
    );

    const client = new TicqexClient({
      baseUrl: "https://example.com/api/v1/",
      apiKey: "test-key",
    });

    await client.get("/tickets");

    expect(calls[0]?.url).toBe("https://example.com/api/v1/tickets");
  });

  it("sends Authorization bearer header", async () => {
    const { calls } = mockFetch(() =>
      Response.json({ data: { ok: true } }),
    );

    const client = new TicqexClient({
      baseUrl: "https://example.com",
      apiKey: "secret-token",
    });

    await client.get("/health");

    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer secret-token");
    expect(headers.Accept).toBe("application/json");
  });

  it("encodes query parameters", async () => {
    const { calls } = mockFetch(() =>
      Response.json({ data: [] }),
    );

    const client = new TicqexClient({
      baseUrl: "https://example.com",
      apiKey: "key",
    });

    await client.get("/tickets", {
      page: 2,
      per_page: 25,
      q: "hello world",
      empty: null,
      skip: undefined,
    });

    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/api/v1/tickets");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("per_page")).toBe("25");
    expect(url.searchParams.get("q")).toBe("hello world");
    expect(url.searchParams.has("empty")).toBe(false);
    expect(url.searchParams.has("skip")).toBe(false);
  });

  it("serializes JSON request bodies", async () => {
    const { calls } = mockFetch(() =>
      Response.json({ data: { id: "1" } }),
    );

    const client = new TicqexClient({
      baseUrl: "https://example.com",
      apiKey: "key",
    });

    const body = { subject: "Help", priority: 1 };
    await client.post("/tickets", body);

    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.body).toBe(JSON.stringify(body));
    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("parses API error envelopes into TicqexApiError", async () => {
    mockFetch(() =>
      Response.json(
        { error: { code: "not_found", message: "Ticket not found" } },
        { status: 404 },
      ),
    );

    const client = new TicqexClient({
      baseUrl: "https://example.com",
      apiKey: "key",
    });

    await expect(client.get("/tickets/missing")).rejects.toMatchObject({
      name: "TicqexApiError",
      status: 404,
      code: "not_found",
      message: "Ticket not found",
    } satisfies Partial<TicqexApiError>);
  });

  it("returns parsed data from success envelopes", async () => {
    mockFetch(() =>
      Response.json({
        data: { id: "abc", subject: "Test" },
        meta: { total: 1 },
      }),
    );

    const client = new TicqexClient({
      baseUrl: "https://example.com",
      apiKey: "key",
    });

    const ticket = await client.get<{ id: string; subject: string }>(
      "/tickets/abc",
    );

    expect(ticket).toEqual({ id: "abc", subject: "Test" });
  });
});
