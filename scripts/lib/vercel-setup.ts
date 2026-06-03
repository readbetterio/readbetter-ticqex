import fs from "node:fs";
import path from "node:path";
import { readGitOriginRemote, runVercel, sleepMs } from "./run-command";

const ROOT = path.resolve(import.meta.dirname, "../..");
const VERCEL_DIR = path.join(ROOT, ".vercel");
const VERCEL_PROJECT_FILE = path.join(VERCEL_DIR, "project.json");
const PACKAGE_JSON = path.join(ROOT, "package.json");

/** Env vars synced to Vercel when deployment linking is enabled. */
export const VERCEL_SYNC_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_APP_URL",
  "RESEND_API_KEY",
  "RESEND_INBOUND_WEBHOOK_SECRET",
  "RESEND_EVENTS_WEBHOOK_SECRET",
  "SUPPORT_EMAIL",
  "SUPPORT_FROM_NAME",
  "SEED_ADMIN_EMAIL",
  "SEED_ADMIN_PASSWORD",
] as const;

const VERCEL_SENSITIVE_ENV_KEYS = new Set<string>([
  "SUPABASE_SECRET_KEY",
  "RESEND_API_KEY",
  "RESEND_INBOUND_WEBHOOK_SECRET",
  "RESEND_EVENTS_WEBHOOK_SECRET",
  "SEED_ADMIN_EMAIL",
  "SEED_ADMIN_PASSWORD",
]);

type VercelProjectLink = {
  projectId?: string;
  orgId?: string;
  projectName?: string;
};

type VercelDeploymentList = {
  deployments?: Array<{
    url?: string;
    state?: string;
    target?: string;
  }>;
};

export type VercelTeam = {
  id: string;
  slug: string;
  name: string;
  current: boolean;
};

type VercelTeamsList = {
  teams?: Array<{
    id?: string;
    slug?: string;
    name?: string;
    current?: boolean;
  }>;
};

type VercelProjectList = {
  projects?: Array<{
    id?: string;
    name?: string;
    latestProductionUrl?: string;
  }>;
};

export function isVercelCliAvailable(): boolean {
  try {
    runVercel(["--version"], { capture: true });
    return true;
  } catch {
    return false;
  }
}

export function isVercelLinked(): boolean {
  return fs.existsSync(VERCEL_PROJECT_FILE);
}

export function readVercelProjectLink(): VercelProjectLink | null {
  if (!isVercelLinked()) return null;
  return JSON.parse(fs.readFileSync(VERCEL_PROJECT_FILE, "utf8")) as VercelProjectLink;
}

export function readLinkedVercelProjectName(): string | null {
  return readVercelProjectLink()?.projectName?.trim() || null;
}

export function defaultVercelProjectUrl(projectName: string): string {
  return `https://${projectName}.vercel.app`;
}

export function normalizeVercelProductionUrl(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (
    !trimmed ||
    trimmed === "--" ||
    trimmed === "https://--" ||
    trimmed === "http://--"
  ) {
    return null;
  }

  const url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(url);
    if (
      !parsed.hostname ||
      parsed.hostname === "--" ||
      !parsed.hostname.includes(".")
    ) {
      return null;
    }
    return url.replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function defaultVercelProjectName(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8")) as { name?: string };
    return pkg.name?.trim() || "ticqex";
  } catch {
    return "ticqex";
  }
}

export function parseVercelTeamsJson(output: string): VercelTeam[] {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start === -1 || end === -1) return [];

  const parsed = JSON.parse(output.slice(start, end + 1)) as VercelTeamsList;
  return (parsed.teams ?? [])
    .filter(
      (team): team is { id: string; slug: string; name: string; current?: boolean } =>
        Boolean(team.id && team.slug && team.name),
    )
    .map((team) => ({
      id: team.id,
      slug: team.slug,
      name: team.name,
      current: team.current ?? false,
    }));
}

export function listVercelTeams(): VercelTeam[] {
  const output = runVercel(["teams", "ls", "--format", "json"], {
    capture: true,
  });
  return parseVercelTeamsJson(output);
}

export function resolveVercelTeamSelection(
  input: string,
  teams: VercelTeam[],
): VercelTeam | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return teams.find((team) => team.current) ?? teams[0] ?? null;
  }

  const asNumber = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(asNumber) && asNumber >= 1 && asNumber <= teams.length) {
    return teams[asNumber - 1] ?? null;
  }

  return (
    teams.find((team) => team.slug === trimmed || team.id === trimmed) ?? null
  );
}

function appendVercelScope(args: string[], scope?: string): string[] {
  if (!scope) return args;
  return ["--scope", scope, ...args];
}

export function linkVercelProject(projectName?: string, scope?: string): void {
  const args = appendVercelScope(["link", "--yes"], scope);
  if (projectName) {
    args.push("--project", projectName);
  }
  runVercel(args);
}

export function createVercelProject(projectName: string, scope?: string): void {
  runVercel(appendVercelScope(["project", "add", projectName], scope));
}

function resolveVercelProductionUrlFromProjectList(scope?: string): string | null {
  const link = readVercelProjectLink();
  if (!link?.projectId) return null;

  const output = runVercel(
    appendVercelScope(["project", "ls", "--format", "json"], scope),
    {
      capture: true,
    },
  );
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start === -1 || end === -1) return null;

  const parsed = JSON.parse(output.slice(start, end + 1)) as VercelProjectList;
  const project = parsed.projects?.find((entry) => entry.id === link.projectId);
  return normalizeVercelProductionUrl(project?.latestProductionUrl);
}

function resolveLatestDeploymentProductionUrl(scope?: string): string | null {
  try {
    const output = runVercel(
      appendVercelScope(
        ["ls", "--environment", "production", "--format", "json", "--yes"],
        scope,
      ),
      { capture: true },
    );
    const start = output.indexOf("{");
    const end = output.lastIndexOf("}");
    if (start === -1 || end === -1) return null;

    const parsed = JSON.parse(output.slice(start, end + 1)) as VercelDeploymentList;
    for (const deployment of parsed.deployments ?? []) {
      if (deployment.state !== "READY") continue;
      const url = normalizeVercelProductionUrl(deployment.url);
      if (url) return url;
    }
  } catch {
    return null;
  }

  return null;
}

export function resolveVercelProductionUrl(
  scope?: string,
  projectName?: string,
): string | null {
  const fromProjectList = resolveVercelProductionUrlFromProjectList(scope);
  if (fromProjectList) return fromProjectList;

  const fromDeployment = resolveLatestDeploymentProductionUrl(scope);
  if (fromDeployment) return fromDeployment;

  const name = projectName ?? readLinkedVercelProjectName();
  return name ? defaultVercelProjectUrl(name) : null;
}

export function connectVercelGitRepository(scope?: string): boolean {
  const remote = readGitOriginRemote();
  if (!remote) {
    console.log("\nNo git origin remote found; skipping Vercel Git connection.");
    return false;
  }

  console.log(`\nConnecting Vercel project to git remote: ${remote}`);
  try {
    runVercel(appendVercelScope(["git", "connect", remote], scope));
    console.log("Vercel Git repository connected.");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`\nCould not connect Vercel Git repository: ${message}`);
    return false;
  }
}

export function waitForVercelProductionUrl(
  scope?: string,
  projectName?: string,
  options: { maxWaitMs?: number; pollIntervalMs?: number } = {},
): string | null {
  const maxWaitMs = options.maxWaitMs ?? 180_000;
  const pollIntervalMs = options.pollIntervalMs ?? 5_000;
  const fallbackName = projectName ?? readLinkedVercelProjectName();
  const fallback = fallbackName ? defaultVercelProjectUrl(fallbackName) : null;
  const deadline = Date.now() + maxWaitMs;

  console.log("\nWaiting for Vercel production URL...");
  while (Date.now() < deadline) {
    const fromProjectList = resolveVercelProductionUrlFromProjectList(scope);
    if (fromProjectList) {
      console.log(`Production URL ready: ${fromProjectList}`);
      return fromProjectList;
    }

    const fromDeployment = resolveLatestDeploymentProductionUrl(scope);
    if (fromDeployment) {
      console.log(`Production URL ready: ${fromDeployment}`);
      return fromDeployment;
    }

    sleepMs(pollIntervalMs);
  }

  if (fallback) {
    console.log(
      `Timed out waiting for a deployed URL; using default project URL: ${fallback}`,
    );
    return fallback;
  }

  return null;
}

export function provisionVercelProductionUrl(
  scope?: string,
  projectName?: string,
): string | null {
  const fallback = resolveVercelProductionUrl(scope, projectName);
  const gitConnected = connectVercelGitRepository(scope);
  if (!gitConnected) {
    return fallback;
  }

  return waitForVercelProductionUrl(scope, projectName) ?? fallback;
}

function parseEnvValues(content: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    values.set(trimmed.slice(0, index), trimmed.slice(index + 1));
  }
  return values;
}

function resolveEnvValues(
  envSource: string | Record<string, string>,
): Map<string, string> {
  if (typeof envSource === "string") {
    return parseEnvValues(envSource);
  }

  const values = new Map<string, string>();
  for (const [key, value] of Object.entries(envSource)) {
    const trimmed = value.trim();
    if (trimmed) values.set(key, trimmed);
  }
  return values;
}

function isPlaceholderEnvValue(value: string): boolean {
  return (
    value.endsWith("...") ||
    value.startsWith("your-") ||
    value.includes("@yourdomain.")
  );
}

export function pushEnvToVercel(
  envSource: string | Record<string, string>,
  scope?: string,
): string[] {
  const values = resolveEnvValues(envSource);
  const pushed: string[] = [];

  for (const key of VERCEL_SYNC_ENV_KEYS) {
    const value = values.get(key)?.trim();
    if (!value || isPlaceholderEnvValue(value)) continue;

    const sensitiveFlag = VERCEL_SENSITIVE_ENV_KEYS.has(key)
      ? ["--sensitive"]
      : ["--no-sensitive"];

    for (const target of ["production", "preview", "development"] as const) {
      runVercel(
        appendVercelScope(
          [
            "env",
            "add",
            key,
            target,
            ...sensitiveFlag,
            "--value",
            value,
            "--yes",
            "--force",
          ],
          scope,
        ),
      );
    }

    pushed.push(key);
  }

  return pushed;
}
