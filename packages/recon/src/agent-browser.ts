/**
 * Thin wrapper around the `agent-browser` CLI.
 * Spawns the binary, captures stdout, parses JSON when applicable.
 */

import { execFile } from "node:child_process";

interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function run(args: string[]): Promise<SpawnResult> {
  return new Promise((resolve) => {
    execFile(
      "agent-browser",
      args,
      { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const exitCode = error ? (typeof error.code === "number" ? error.code : 1) : 0;
        resolve({ stdout, stderr: stderr || error?.message || "", exitCode });
      },
    );
  });
}

export async function open(url: string): Promise<void> {
  const r = await run(["open", url]);
  if (r.exitCode !== 0) {
    throw new Error(`agent-browser open failed: ${r.stderr}`);
  }
}

export async function waitNetworkIdle(): Promise<void> {
  await run(["wait", "--load", "networkidle"]);
}

export interface AgentSnapshotRef {
  name: string;
  role: string;
  url?: string;
}

export interface AgentSnapshot {
  origin: string;
  refs: Record<string, AgentSnapshotRef>;
  snapshot: string;
}

/**
 * Snapshot interactive elements only, including URLs on links, as JSON.
 */
export async function snapshot(): Promise<AgentSnapshot> {
  const r = await run(["snapshot", "-i", "-u", "--json"]);
  if (r.exitCode !== 0) {
    throw new Error(`agent-browser snapshot failed: ${r.stderr}`);
  }
  const parsed = JSON.parse(r.stdout) as { success: boolean; data: AgentSnapshot };
  if (!parsed.success) {
    throw new Error(`agent-browser snapshot returned success=false`);
  }
  return parsed.data;
}

export async function close(): Promise<void> {
  await run(["close", "--all"]);
}

export async function ensureBrowser(): Promise<void> {
  // Verify CDP is up. If not, the user must start Chrome with --remote-debugging-port=9222.
  try {
    const res = await fetch("http://127.0.0.1:9222/json/version", { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error("CDP not responding");
  } catch {
    throw new Error(
      "Chrome CDP not detected on port 9222. Start it with:\n" +
        '  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \\\n' +
        "    --remote-debugging-port=9222 --headless=new --disable-gpu \\\n" +
        "    --user-data-dir=/tmp/chrome-legalize-recon &",
    );
  }
}
