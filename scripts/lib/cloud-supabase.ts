import path from "node:path";
import {
  readOrCreateEnvFile,
  setEnvLine,
  writeEnvFile,
} from "./env-file";
import { runPnpm, runSupabase, runSupabaseCapture } from "./run-command";

const ROOT = path.resolve(import.meta.dirname, "../..");
const BOOTSTRAP_SQL = path.join(ROOT, "supabase/bootstrap.sql");

export type CloudSupabaseKeys = {
  url: string;
  publishableKey: string;
  secretKey: string;
};

type ApiKeyEntry = {
  type?: string | null;
  name?: string;
  api_key?: string;
};

function parseJsonPayload<T>(stdout: string): T {
  const arrayStart = stdout.indexOf("[");
  const objectStart = stdout.indexOf("{");
  const start =
    arrayStart >= 0 && objectStart >= 0
      ? Math.min(arrayStart, objectStart)
      : arrayStart >= 0
        ? arrayStart
        : objectStart;
  const end = Math.max(stdout.lastIndexOf("]"), stdout.lastIndexOf("}"));

  if (start === -1 || end === -1) {
    throw new Error("Could not parse Supabase CLI output as JSON");
  }

  return JSON.parse(stdout.slice(start, end + 1)) as T;
}

export function resolveCloudSupabaseKeys(
  projectRef: string,
  entries: ApiKeyEntry[],
): CloudSupabaseKeys {
  const publishableKey =
    entries.find((entry) => entry.type === "publishable")?.api_key ??
    entries.find((entry) => entry.name === "anon")?.api_key;
  const secretKey =
    entries.find((entry) => entry.type === "secret")?.api_key ??
    entries.find((entry) => entry.name === "service_role")?.api_key;

  if (!publishableKey || !secretKey) {
    throw new Error(
      "Could not resolve publishable and secret Supabase API keys from the linked project.",
    );
  }

  return {
    url: `https://${projectRef}.supabase.co`,
    publishableKey,
    secretKey,
  };
}

export function fetchCloudSupabaseKeys(projectRef: string): CloudSupabaseKeys {
  const output = runSupabaseCapture([
    "projects",
    "api-keys",
    "--project-ref",
    projectRef,
    "-o",
    "json",
  ]);
  const entries = parseJsonPayload<ApiKeyEntry[]>(output);
  return resolveCloudSupabaseKeys(projectRef, entries);
}

export function writeCloudSupabaseEnv(
  envFile: string,
  envExample: string,
  keys: CloudSupabaseKeys,
): string {
  let content = readOrCreateEnvFile(envFile, envExample);
  content = setEnvLine(content, "NEXT_PUBLIC_SUPABASE_URL", keys.url);
  content = setEnvLine(
    content,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    keys.publishableKey,
  );
  content = setEnvLine(content, "SUPABASE_SECRET_KEY", keys.secretKey);
  writeEnvFile(envFile, content);
  return content;
}

export function bootstrapCloudDatabase(): void {
  runSupabase(["db", "query", "--linked", "-f", BOOTSTRAP_SQL]);
}

export function seedCloudAdmin(
  envFile: string,
  envExample: string,
  email: string,
  password: string,
): void {
  let content = readOrCreateEnvFile(envFile, envExample);
  content = setEnvLine(content, "SEED_ADMIN_EMAIL", email);
  content = setEnvLine(content, "SEED_ADMIN_PASSWORD", password);
  writeEnvFile(envFile, content);
  runPnpm(["db:seed-admin"]);
}
