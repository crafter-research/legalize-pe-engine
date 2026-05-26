#!/usr/bin/env bun
/**
 * legalize-pe-recon CLI.
 *
 * Commands:
 *   discover <slug>           - probe portal, print snapshot (manual IR drafting)
 *   fetch-all -j <slug>       - run fetcher per IR, commit norms to corpus
 *   migrate                   - migrate national corpus ES→EN frontmatter
 *   audit                     - generate AUDIT.md in corpus repo
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Command } from "commander";

const program = new Command();
program.name("legalize-pe-recon").description("Engine CLI for legalize-pe").version("0.0.0");

program
  .command("discover")
  .description("Probe portal listing, print agent-browser snapshot (helps draft IR by hand)")
  .argument("<url>", "Portal listing URL")
  .action(async (url: string) => {
    const { open, waitNetworkIdle, snapshot, ensureBrowser, close } = await import(
      "@legalize-pe/recon"
    );
    await ensureBrowser();
    await open(url);
    await waitNetworkIdle();
    const snap = await snapshot();
    console.log(JSON.stringify(snap, null, 2));
    await close();
  });

program
  .command("fetch-all")
  .description(
    "Fetch norms for a jurisdiction using its IR. Writes files + a TSV plan for the commit loop.",
  )
  .requiredOption("-j, --jurisdiction <slug>", "Jurisdiction slug, e.g. regioncusco")
  .option("-l, --limit <n>", "Max norms to fetch", "5")
  .option("--corpus <path>", "Path to corpus repo", "../legalize-pe")
  .option("--plan-out <path>", "TSV plan output for bash commit loop", "./fetch-plan.tsv")
  .action(
    async (opts: { jurisdiction: string; limit: string; corpus: string; planOut: string }) => {
      const { writeFile, mkdir } = await import("node:fs/promises");
      const { join, dirname } = await import("node:path");
      const matter = (await import("gray-matter")).default;

      const irPath = resolve(`recon/${opts.jurisdiction}.ir.json`);
      const ir = JSON.parse(await readFile(irPath, "utf-8"));
      const corpusRoot = resolve(opts.corpus);

      const { GobPeFetcher } = await import("@legalize-pe/jurisdictions");

      const rankByJurisdiction: Record<string, string> = {
        regioncusco: "ordenanza_regional",
        munilima: "ordenanza_municipal",
      };
      const rankCode = rankByJurisdiction[opts.jurisdiction] ?? "ordenanza_regional";

      const fetcher = new GobPeFetcher({ ir, rankCode });
      await fetcher.ensureReady();

      const items = await fetcher.discoverListing(Number(opts.limit));
      console.log(`Discovered ${items.length} items from ${ir.listing.url}`);

      if (items.length === 0) {
        console.log("Nothing to write. Exiting.");
        return;
      }

      const planRows: string[] = [];
      const today = new Date().toISOString().slice(0, 10);

      for (const item of items) {
        const fm = fetcher.buildFrontmatter(item, today);
        const body = `# ${fm.title}\n\n${item.pdf_url ? `[PDF original](${item.pdf_url})\n\n` : ""}*Fuente:* ${item.detail_url}\n`;
        const content = matter.stringify(body, fm as unknown as Record<string, unknown>);

        const relPath = `${fm.jurisdiction}/${fm.identifier}.md`;
        const absPath = join(corpusRoot, relPath);
        await mkdir(dirname(absPath), { recursive: true });
        await writeFile(absPath, content, "utf-8");

        const safeTitle = fm.title.replace(/[\t\n\r]/g, " ").trim();
        planRows.push(
          [relPath, fm.identifier, safeTitle, today, `${today}T00:00:00Z`, today.slice(0, 4)].join(
            "\t",
          ),
        );
        console.log(`✓ wrote ${relPath}`);
      }

      await writeFile(resolve(opts.planOut), `${planRows.join("\n")}\n`, "utf-8");
      console.log(`\nWrote ${planRows.length} rows to ${opts.planOut}`);
      console.log("Now commit with:");
      console.log(`  ./apps/cli/src/scripts/run-bootstrap.sh ${opts.corpus} ${opts.planOut}`);
    },
  );

program
  .command("migrate")
  .description("Migrate national corpus from ES frontmatter to SPEC v0.2 EN")
  .option("--corpus <path>", "Path to corpus repo", "../legalize-pe")
  .option("--dry-run", "Print mapping without writing")
  .action(async (opts: { corpus: string; dryRun?: boolean }) => {
    const { migrateNational } = await import("./scripts/migrate-national.ts");
    await migrateNational({ corpusRoot: resolve(opts.corpus), dryRun: !!opts.dryRun });
  });

program
  .command("bootstrap-corpus")
  .description("Create one Crafternauta commit per norm in the corpus repo (via simple-git)")
  .option("--corpus <path>", "Path to corpus repo", "../legalize-pe")
  .option("--limit <n>", "Limit to first N norms (for testing)")
  .option("--dry-run", "Print plan without committing")
  .action(async (opts: { corpus: string; limit?: string; dryRun?: boolean }) => {
    const { bootstrapCorpus } = await import("./scripts/bootstrap-corpus.ts");
    await bootstrapCorpus({
      corpusRoot: resolve(opts.corpus),
      ...(opts.limit ? { limit: Number(opts.limit) } : {}),
      dryRun: !!opts.dryRun,
    });
  });

program
  .command("path-colombia")
  .description("Build timeline of 32 commits over pe/CON-1993.md (bootstrap + 31 reformas)")
  .option("--corpus <path>", "Path to corpus repo", "../legalize-pe")
  .option("--dry-run", "Print plan without writing")
  .action(async (opts: { corpus: string; dryRun?: boolean }) => {
    const { pathColombiaConstitucion } = await import("./scripts/path-colombia-constitucion.ts");
    await pathColombiaConstitucion({
      corpusRoot: resolve(opts.corpus),
      dryRun: !!opts.dryRun,
    });
  });

program
  .command("bootstrap-plan")
  .description(
    "Generate TSV plan (relativePath, identifier, title, date, year) to be consumed by bash loop",
  )
  .option("--corpus <path>", "Path to corpus repo", "../legalize-pe")
  .option("--out <path>", "Output TSV path", "./bootstrap-plan.tsv")
  .option("--limit <n>", "Limit to first N rows")
  .action(async (opts: { corpus: string; out: string; limit?: string }) => {
    const { buildBootstrapPlan } = await import("./scripts/build-bootstrap-plan.ts");
    await buildBootstrapPlan({
      corpusRoot: resolve(opts.corpus),
      out: resolve(opts.out),
      ...(opts.limit ? { limit: Number(opts.limit) } : {}),
    });
  });

program.parse();
