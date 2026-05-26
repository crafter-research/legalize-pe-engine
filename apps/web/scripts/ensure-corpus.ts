#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const corpusRepo =
  process.env.LEGALIZE_PE_CORPUS ??
  (process.env.VERCEL
    ? join(process.cwd(), ".cache/legalize-pe")
    : join(process.cwd(), "../../../legalize-pe"));

if (!existsSync(corpusRepo)) {
  mkdirSync(dirname(corpusRepo), { recursive: true });
  const result = spawnSync(
    "git",
    ["clone", "--depth", "1", "https://github.com/crafter-research/legalize-pe.git", corpusRepo],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
