import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { getConfigDir, getConfigPath, type StoredConfig } from "./config.js";

export type CredentialOverrides = {
  instance?: string;
  apiKey?: string;
};

export type ResolvedCredentials = {
  instance: string;
  apiKey: string;
  source: "flags" | "env" | "config" | "mixed";
};

export async function loadStoredConfig(): Promise<StoredConfig | null> {
  try {
    const raw = await readFile(getConfigPath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as StoredConfig).instance === "string" &&
      typeof (parsed as StoredConfig).apiKey === "string"
    ) {
      return parsed as StoredConfig;
    }
    return null;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

export async function saveStoredConfig(config: StoredConfig): Promise<void> {
  await mkdir(getConfigDir(), { recursive: true, mode: 0o700 });
  await writeFile(getConfigPath(), `${JSON.stringify(config, null, 2)}\n`, {
    mode: 0o600,
  });
}

export async function clearStoredConfig(): Promise<void> {
  try {
    await unlink(getConfigPath());
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }
}

export async function resolveCredentials(
  overrides: CredentialOverrides = {},
): Promise<ResolvedCredentials | null> {
  const flagInstance = overrides.instance?.trim();
  const flagApiKey = overrides.apiKey?.trim();
  const envInstance = process.env.TICQEX_INSTANCE?.trim();
  const envApiKey = process.env.TICQEX_API_KEY?.trim();
  const stored = await loadStoredConfig();

  const instance =
    flagInstance ?? envInstance ?? stored?.instance ?? undefined;
  const apiKey = flagApiKey ?? envApiKey ?? stored?.apiKey ?? undefined;

  if (!instance || !apiKey) {
    return null;
  }

  const instanceFromFlags = Boolean(flagInstance);
  const apiKeyFromFlags = Boolean(flagApiKey);
  const instanceFromEnv = Boolean(!flagInstance && envInstance);
  const apiKeyFromEnv = Boolean(!flagApiKey && envApiKey);

  let source: ResolvedCredentials["source"] = "config";
  if (instanceFromFlags && apiKeyFromFlags) {
    source = "flags";
  } else if (instanceFromEnv && apiKeyFromEnv) {
    source = "env";
  } else if (
    instanceFromFlags ||
    apiKeyFromFlags ||
    instanceFromEnv ||
    apiKeyFromEnv
  ) {
    source = "mixed";
  }

  return { instance, apiKey, source };
}

export function formatApiKeyPrefix(apiKey: string): string {
  return apiKey.slice(0, 12);
}
