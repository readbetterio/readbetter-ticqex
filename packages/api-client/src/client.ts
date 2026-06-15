import { TicqexApiError } from "./errors.js";
import type {
  ApiEnvelope,
  ApiErrorEnvelope,
  QueryParams,
  RequestOptions,
  TicqexClientOptions,
} from "./types.js";

const API_PREFIX = "/api/v1";

export function normalizeBaseUrl(baseUrl: string): string {
  let normalized = baseUrl.replace(/\/+$/, "");
  if (normalized.endsWith(API_PREFIX)) {
    normalized = normalized.slice(0, -API_PREFIX.length);
    normalized = normalized.replace(/\/+$/, "");
  }
  return normalized;
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }

  const error = (value as ApiErrorEnvelope).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof error.code === "string" &&
    typeof error.message === "string"
  );
}

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return typeof value === "object" && value !== null && "data" in value;
}

export class TicqexClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: TicqexClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.apiKey = options.apiKey;
  }

  get<T>(path: string, query?: QueryParams): Promise<T> {
    return this.request<T>({ method: "GET", path, query });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: "POST", path, body });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: "PATCH", path, body });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: "PUT", path, body });
  }

  delete<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>({ method: "DELETE", path, body });
  }

  async request<T>(options: RequestOptions): Promise<T> {
    const url = this.buildUrl(options.path, options.query);
    const hasBody = options.body !== undefined;

    const response = await fetch(url, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });

    const json: unknown = await response.json();

    if (isApiErrorEnvelope(json)) {
      throw new TicqexApiError(
        response.status,
        json.error.code,
        json.error.message,
      );
    }

    if (!response.ok) {
      throw new TicqexApiError(
        response.status,
        "unknown",
        "Request failed",
      );
    }

    if (!isApiEnvelope<T>(json)) {
      throw new TicqexApiError(
        response.status,
        "invalid_response",
        "Response is missing data envelope",
      );
    }

    return json.data;
  }

  private buildUrl(path: string, query?: QueryParams): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${API_PREFIX}${normalizedPath}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }
}
