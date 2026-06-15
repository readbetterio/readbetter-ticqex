import { homedir } from "node:os";
import { join } from "node:path";

export type StoredConfig = {
  instance: string;
  apiKey: string;
};

export function getConfigDir(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) {
    return join(xdgConfigHome, "ticqex");
  }
  return join(homedir(), ".config", "ticqex");
}

export function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}
