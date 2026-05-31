import fs from "node:fs";
import path from "node:path";
import {
  assertConfigShape,
  loadTicqexConfig as loadSharedConfig,
  resolveConfigPath as resolveSharedConfigPath,
  resolveExampleConfigPath,
} from "@shared/ticqex-config/load";
import type { TicqexConfig } from "@shared/ticqex-config/types";

function projectRoot(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), ".");
}

export function resolveConfigPath(configPath?: string): string {
  if (configPath) {
    return path.isAbsolute(configPath)
      ? configPath
      : path.join(projectRoot(), configPath);
  }

  return resolveSharedConfigPath(projectRoot());
}

function readAndAssertConfig(filePath: string): TicqexConfig {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing config file ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const config = JSON.parse(raw) as TicqexConfig;
  assertConfigShape(config);
  return config;
}

export function loadTicqexConfig(configPath?: string): TicqexConfig {
  if (configPath) {
    return readAndAssertConfig(resolveConfigPath(configPath));
  }

  const config = loadSharedConfig(projectRoot());
  assertConfigShape(config);
  return config;
}

export function defaultTicqexConfig(): TicqexConfig {
  return loadTicqexConfig();
}

export { resolveExampleConfigPath };
