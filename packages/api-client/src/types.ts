export type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
  };
};

export type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>;

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type RequestOptions = {
  method: HttpMethod;
  path: string;
  query?: QueryParams;
  body?: unknown;
};

export type TicqexClientOptions = {
  baseUrl: string;
  apiKey: string;
};
