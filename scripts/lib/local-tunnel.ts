import { spawn, spawnSync } from "node:child_process";
import type { Interface as ReadlineInterface } from "node:readline/promises";
import { isHttpsAppUrl, normalizeAppUrl } from "@shared/integrations/resend/webhook-endpoints";

const NGROK_API = "http://127.0.0.1:4040/api/tunnels";
const NGROK_START_TIMEOUT_MS = 20_000;
const NGROK_POLL_INTERVAL_MS = 500;

export function printLocalTunnelHint(localAppUrl: string): void {
  console.log(
    "\nLocal inbound email needs a public HTTPS URL that forwards to your dev server.",
  );
  console.log(
    `Resend cannot call ${localAppUrl} directly — use a tunnel (ngrok, Cloudflare Tunnel, etc.).`,
  );
  console.log(
    "Install ngrok: https://ngrok.com/download (free account + authtoken required).",
  );
}

function localDevPort(localAppUrl: string): number {
  try {
    const url = new URL(localAppUrl);
    if (url.port) return Number(url.port);
    return url.protocol === "https:" ? 443 : 80;
  } catch {
    return 3000;
  }
}

function ngrokInstalled(): boolean {
  const result = spawnSync("ngrok", ["version"], { encoding: "utf8" });
  return result.status === 0;
}

type NgrokTunnel = {
  public_url?: string;
  proto?: string;
};

type NgrokApiResponse = {
  tunnels?: NgrokTunnel[];
};

async function readNgrokHttpsUrl(): Promise<string | null> {
  try {
    const response = await fetch(NGROK_API);
    if (!response.ok) return null;
    const payload = (await response.json()) as NgrokApiResponse;
    const httpsTunnel = payload.tunnels?.find(
      (tunnel) =>
        tunnel.public_url?.startsWith("https://") &&
        (tunnel.proto === "https" || tunnel.proto === "https+http"),
    );
    return httpsTunnel?.public_url
      ? normalizeAppUrl(httpsTunnel.public_url)
      : null;
  } catch {
    return null;
  }
}

function startNgrok(port: number): void {
  const child = spawn("ngrok", ["http", String(port)], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

async function waitForNgrokHttpsUrl(): Promise<string | null> {
  const deadline = Date.now() + NGROK_START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const url = await readNgrokHttpsUrl();
    if (url) return url;
    await new Promise((resolve) => setTimeout(resolve, NGROK_POLL_INTERVAL_MS));
  }
  return null;
}

async function promptDirectTunnelUrl(
  rl: ReadlineInterface,
): Promise<string | null> {
  const answer = (
    await rl.question(
      "HTTPS tunnel URL (e.g. https://your-host.trycloudflare.com): ",
    )
  ).trim();
  if (!answer) return null;
  if (!isHttpsAppUrl(answer)) {
    console.log("URL must start with https://");
    return null;
  }
  return normalizeAppUrl(answer);
}

async function resolveViaNgrok(localAppUrl: string): Promise<string | null> {
  if (!ngrokInstalled()) {
    console.log(
      "ngrok is not installed or not on PATH. See https://ngrok.com/download",
    );
    return null;
  }

  const port = localDevPort(localAppUrl);
  let url = await readNgrokHttpsUrl();

  if (!url) {
    console.log(`\nStarting ngrok http ${port} (runs in the background)...`);
    console.log(
      "Ensure you have run `ngrok config add-authtoken <token>` if this is your first time.",
    );
    startNgrok(port);
    url = await waitForNgrokHttpsUrl();
  } else {
    console.log("\nUsing ngrok tunnel already running on port 4040.");
  }

  if (!url) {
    console.log(
      "Could not read an ngrok HTTPS URL. Start ngrok manually (`ngrok http 3000`) and choose “Enter tunnel URL”, or sign in at https://dashboard.ngrok.com/",
    );
    return null;
  }

  console.log(`ngrok HTTPS URL: ${url}`);
  return url;
}

async function promptYesNo(
  rl: ReadlineInterface,
  label: string,
  defaultValue: boolean,
): Promise<boolean> {
  const suffix = defaultValue ? "Y/n" : "y/N";
  while (true) {
    const answer = (await rl.question(`${label} [${suffix}]: `))
      .trim()
      .toLowerCase();
    if (!answer) return defaultValue;
    if (["y", "yes"].includes(answer)) return true;
    if (["n", "no"].includes(answer)) return false;
    console.log("Please answer yes or no.");
  }
}

async function promptTunnelMethod(
  rl: ReadlineInterface,
): Promise<"ngrok" | "url" | "skip"> {
  const ngrokAvailable = ngrokInstalled();
  console.log(
    "\nHow do you want to provide an HTTPS URL for Resend webhooks?",
  );
  console.log("  1) ngrok — start or reuse a local ngrok tunnel");
  console.log("  2) url  — paste a tunnel URL you already have");
  console.log("  3) skip — set up webhooks later");

  const defaultChoice = ngrokAvailable ? "1" : "2";
  while (true) {
    const answer = (
      await rl.question(`Choose [1/2/3] (default ${defaultChoice}): `)
    ).trim();
    const choice = answer || defaultChoice;
    if (choice === "1" || choice === "ngrok") {
      if (!ngrokAvailable) {
        console.log("ngrok is not on PATH. Install it or choose option 2.");
        continue;
      }
      return "ngrok";
    }
    if (choice === "2" || choice === "url") return "url";
    if (choice === "3" || choice === "skip") return "skip";
    console.log("Enter 1, 2, or 3.");
  }
}

export type ResolveLocalWebhookUrlOptions = {
  rl: ReadlineInterface;
  localAppUrl: string;
};

export async function resolveLocalWebhookHttpsUrl(
  options: ResolveLocalWebhookUrlOptions,
): Promise<string | null> {
  printLocalTunnelHint(options.localAppUrl);

  const method = await promptTunnelMethod(options.rl);
  if (method === "skip") return null;
  if (method === "ngrok") {
    return resolveViaNgrok(options.localAppUrl);
  }
  return promptDirectTunnelUrl(options.rl);
}

export async function promptUseTunnelAsAppUrl(
  rl: ReadlineInterface,
  tunnelUrl: string,
): Promise<boolean> {
  return promptYesNo(
    rl,
    `Set NEXT_PUBLIC_APP_URL to ${tunnelUrl}? (recommended for inbound email)`,
    true,
  );
}
