import fs from "node:fs";
import path from "node:path";
import {
  TICQEX_CONFIG_VERSION,
  type TicqexConfig,
} from "./types";

export function resolveConfigPath(rootDir: string): string {
  const configured = process.env.TICQEX_CONFIG_FILE;
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(rootDir, configured);
  }
  return path.join(rootDir, "config/ticqex.config.json");
}

export function resolveExampleConfigPath(rootDir: string): string {
  return path.join(rootDir, "config/ticqex.config.example.json");
}

export function loadTicqexConfig(rootDir: string): TicqexConfig {
  const configPath = resolveConfigPath(rootDir);
  const examplePath = resolveExampleConfigPath(rootDir);

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Missing ${path.relative(rootDir, configPath)}. Run \`pnpm ticqex init\` or copy ${path.relative(rootDir, examplePath)}.`,
    );
  }

  const raw = fs.readFileSync(configPath, "utf8");
  return JSON.parse(raw) as TicqexConfig;
}

export function assertConfigShape(config: TicqexConfig): void {
  if (config.version !== TICQEX_CONFIG_VERSION) {
    throw new Error(
      `Unsupported config version ${String(config.version)}. Expected ${TICQEX_CONFIG_VERSION}.`,
    );
  }

  if (!config.channels?.email) {
    throw new Error("config.channels.email is required");
  }

  if (!config.integrations?.resend) {
    throw new Error("config.integrations.resend is required");
  }
}
