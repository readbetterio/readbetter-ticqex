import { TicqexClient, TicqexApiError, type HttpMethod } from "@ticqex/api-client";
import { getOperation } from "./command-catalog.js";
import { resolveCredentials, type CredentialOverrides } from "./credentials.js";
import { buildRequest, mergeInput } from "./input.js";
import { CliUsageError, writeJson } from "./output.js";

export type GlobalOptions = CredentialOverrides & {
  input?: string;
  json?: boolean;
  [key: string]: unknown;
};

function assertNever(value: never): never {
  throw new CliUsageError(`Unsupported HTTP method: ${String(value)}`);
}

async function invokeClient(
  client: TicqexClient,
  method: HttpMethod,
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
  body?: unknown,
): Promise<unknown> {
  switch (method) {
    case "GET":
      return client.get(path, query);
    case "POST":
      return client.post(path, body);
    case "PATCH":
      return client.patch(path, body);
    case "PUT":
      return client.put(path, body);
    case "DELETE":
      return client.delete(path, body);
    default:
      return assertNever(method);
  }
}

export async function executeOperation(
  operationName: string,
  options: GlobalOptions,
): Promise<void> {
  const operation = getOperation(operationName);
  if (!operation) {
    throw new CliUsageError(`Unknown operation: ${operationName}`);
  }

  const credentials = await resolveCredentials(options);
  if (!credentials) {
    throw new CliUsageError(
      "Missing credentials. Run `ticqex auth login --instance <url>` or set TICQEX_INSTANCE and TICQEX_API_KEY.",
    );
  }

  const input = mergeInput(options.input, options);
  const { path, query, body } = buildRequest(operation, input);
  const client = new TicqexClient({
    baseUrl: credentials.instance,
    apiKey: credentials.apiKey,
  });

  try {
    const data = await invokeClient(client, operation.method, path, query, body);
    writeJson(data);
  } catch (error) {
    if (error instanceof TicqexApiError) {
      throw error;
    }
    throw error;
  }
}

export { TicqexApiError };
