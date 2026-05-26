/**
 * Merges Cursor Cloud harness secrets into .env.local.
 * Safe to run repeatedly — only overwrites keys that are present in process.env.
 */
import path from "node:path";
import {
  readOrCreateEnvFile,
  setEnvLine,
  writeEnvFile,
} from "./lib/env-file.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

const HARNESS_ENV_KEYS = [
  "RESEND_API_KEY",
  "RESEND_INBOUND_WEBHOOK_SECRET",
  "SUPPORT_EMAIL",
  "SUPPORT_FROM_NAME",
  "NEXT_PUBLIC_APP_URL",
] as const;

function main(): void {
  const envFile = process.env.ENV_FILE ?? ".env.local";
  const filePath = path.isAbsolute(envFile) ? envFile : path.join(ROOT, envFile);
  const examplePath = path.join(ROOT, ".env.example");

  let content = readOrCreateEnvFile(filePath, examplePath);
  const merged: string[] = [];

  for (const key of HARNESS_ENV_KEYS) {
    const value = process.env[key];
    if (!value) continue;
    content = setEnvLine(content, key, value);
    merged.push(key);
  }

  writeEnvFile(filePath, content);

  if (merged.length) {
    console.log(`Updated ${path.basename(filePath)} from harness:`);
    for (const key of merged) console.log(`  ${key}`);
  } else {
    console.log(
      `No harness keys in process.env — set secrets in Cursor Cloud or export manually.`,
    );
  }
}

main();
