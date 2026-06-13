#!/usr/bin/env node
import { startMcp } from "./server.js";

startMcp().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
