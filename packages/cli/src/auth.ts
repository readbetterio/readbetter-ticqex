import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { TicqexClient, TicqexApiError } from "@ticqex/api-client";
import {
  clearStoredConfig,
  formatApiKeyPrefix,
  resolveCredentials,
  saveStoredConfig,
  type CredentialOverrides,
} from "./credentials.js";
import { CliUsageError, writeJson } from "./output.js";

function createClient(instance: string, apiKey: string): TicqexClient {
  return new TicqexClient({ baseUrl: instance, apiKey });
}

async function promptForApiKey(): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    const key = (await rl.question("API key (tq_live_*): ")).trim();
    if (!key.startsWith("tq_live_")) {
      throw new CliUsageError("API key must start with tq_live_");
    }
    return key;
  } finally {
    rl.close();
  }
}

export async function authLogin(
  overrides: CredentialOverrides & { instance?: string },
): Promise<void> {
  const instance = overrides.instance?.trim();
  if (!instance) {
    throw new CliUsageError("--instance is required for auth login");
  }

  const apiKey = await promptForApiKey();
  const client = createClient(instance, apiKey);

  try {
    const user = await client.get<Record<string, unknown>>("/users/me");
    await saveStoredConfig({ instance, apiKey });
    writeJson({
      loggedIn: true,
      instance,
      apiKeyPrefix: formatApiKeyPrefix(apiKey),
      user,
    });
  } catch (error) {
    if (error instanceof TicqexApiError) {
      throw error;
    }
    throw error;
  }
}

export async function authLogout(): Promise<void> {
  await clearStoredConfig();
  writeJson({ loggedOut: true });
}

export async function authStatus(
  overrides: CredentialOverrides = {},
): Promise<void> {
  const credentials = await resolveCredentials(overrides);
  if (!credentials) {
    writeJson({
      authenticated: false,
      instance: null,
      apiKeyPrefix: null,
      user: null,
    });
    return;
  }

  const client = createClient(credentials.instance, credentials.apiKey);
  const user = await client.get<Record<string, unknown>>("/users/me");
  writeJson({
    authenticated: true,
    instance: credentials.instance,
    apiKeyPrefix: formatApiKeyPrefix(credentials.apiKey),
    source: credentials.source,
    user,
  });
}

export async function validateCredentials(
  instance: string,
  apiKey: string,
): Promise<Record<string, unknown>> {
  const client = createClient(instance, apiKey);
  return client.get<Record<string, unknown>>("/users/me");
}
