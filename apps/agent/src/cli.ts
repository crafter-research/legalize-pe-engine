#!/usr/bin/env node
import { JURISDICTIONS, ask, getNorm, searchNorms } from "./client.js";

const HELP = `legalize — agent-first CLI for Peruvian law (corpus legalize-pe via amicus)

Usage:
  legalize search <query> [--jurisdiction <code>] [--rank <type>] [--page N] [--json]
  legalize get <id> [--json]
  legalize ask <question...> [--json]
  legalize jurisdictions [--json]
  legalize mcp                              # run the MCP server (stdio)

Examples:
  legalize search "prescripción adquisitiva" --jurisdiction pe
  legalize get pe/RM-0702-2026-IN
  legalize ask "¿puedo quedarme con un terreno si lo ocupo varios años?"

Env:
  AMICUS_API_URL   default https://amicus.crafter.ing
  AMICUS_API_KEY   required only for \`ask\` (get one at amicus.crafter.ing)`;

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}
function has(args: string[], name: string): boolean {
  return args.includes(`--${name}`);
}
function positional(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      if (a !== "--json") i++; // skip the flag's value
      continue;
    }
    out.push(a);
  }
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const rest = argv.slice(1);
  const json = has(argv, "json");

  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    console.log(HELP);
    return;
  }

  if (cmd === "search") {
    const q = positional(rest).join(" ");
    const res = await searchNorms({
      q,
      jurisdiction: flag(rest, "jurisdiction"),
      rank: flag(rest, "rank"),
      page: flag(rest, "page") ? Number(flag(rest, "page")) : undefined,
    });
    if (json) return console.log(JSON.stringify(res, null, 2));
    console.log(`${res.total.toLocaleString("es-PE")} normas · página ${res.page}/${res.pages}\n`);
    for (const n of res.norms) {
      const date = n.publication_date ? n.publication_date.slice(0, 10) : "—";
      console.log(`${n.identifier ?? n.id}  ·  ${date}`);
      console.log(`  ${n.title ?? ""}`);
      console.log(
        `  ${n.rank ?? ""} · ${JURISDICTIONS[n.jurisdiction ?? ""] ?? n.jurisdiction}  ·  id: ${n.id}\n`,
      );
    }
    return;
  }

  if (cmd === "get") {
    const id = positional(rest)[0];
    if (!id) throw new Error("get requiere un <id> (ej. pe/RM-0702-2026-IN)");
    const n = await getNorm(id);
    if (!n) {
      console.error(`No encontrada: ${id}`);
      process.exit(1);
    }
    if (json) return console.log(JSON.stringify(n, null, 2));
    console.log(`${n.identifier ?? n.id}${n.publication_date ? `  ·  ${n.publication_date}` : ""}`);
    console.log(`${n.title ?? ""}`);
    console.log(
      `${n.rank ?? ""} · ${JURISDICTIONS[n.jurisdiction ?? ""] ?? n.jurisdiction}${n.source ? `\nfuente: ${n.source}` : ""}\n`,
    );
    console.log(n.body);
    return;
  }

  if (cmd === "ask") {
    const question = positional(rest).join(" ");
    if (!question) throw new Error("ask requiere una pregunta");
    const res = await ask(question);
    if (json) return console.log(JSON.stringify(res, null, 2));
    console.log(`${res.answer}\n`);
    if (res.sources.length) {
      console.log("Fuentes:");
      for (const s of res.sources) {
        console.log(`  - ${s.identifier ?? ""}${s.url ? `  ${s.url}` : ""}`);
      }
    }
    return;
  }

  if (cmd === "mcp") {
    const { startMcp } = await import("./server.js");
    await startMcp();
    return;
  }

  if (cmd === "jurisdictions") {
    if (json) return console.log(JSON.stringify(JURISDICTIONS, null, 2));
    for (const [code, label] of Object.entries(JURISDICTIONS)) {
      console.log(`${code.padEnd(12)} ${label}`);
    }
    return;
  }

  console.error(`Comando desconocido: ${cmd}\n`);
  console.log(HELP);
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
