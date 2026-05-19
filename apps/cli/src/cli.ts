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
  .description("Fetch norms for a jurisdiction using its persisted IR")
  .requiredOption("-j, --jurisdiction <slug>", "Jurisdiction slug, e.g. regioncusco")
  .option("-l, --limit <n>", "Max norms to fetch", "5")
  .option("--corpus <path>", "Path to corpus repo", "../legalize-pe")
  .action(async (opts: { jurisdiction: string; limit: string; corpus: string }) => {
    const irPath = resolve(`recon/${opts.jurisdiction}.ir.json`);
    const ir = JSON.parse(await readFile(irPath, "utf-8"));
    const corpusRoot = resolve(opts.corpus);

    const { GobPeFetcher } = await import("@legalize-pe/jurisdictions");
    const { GitPublisher } = await import("@legalize-pe/git-publisher");

    const rankByJurisdiction: Record<string, string> = {
      regioncusco: "ordenanza_regional",
      munilima: "ordenanza_municipal",
    };
    const rankCode = rankByJurisdiction[opts.jurisdiction] ?? "ordenanza_regional";

    const fetcher = new GobPeFetcher({ ir, rankCode });
    await fetcher.ensureReady();

    const items = await fetcher.discoverListing(Number(opts.limit));
    console.log(`Discovered ${items.length} items from ${ir.listing.url}`);

    const publisher = new GitPublisher(corpusRoot);

    for (const item of items) {
      // V1: use today's date as publication_date placeholder
      // V2: parse from listing or fetch detail page to get real date
      const today = new Date().toISOString().slice(0, 10);
      const fm = fetcher.buildFrontmatter(item, today);
      const body = `# ${fm.title}\n\n${item.pdf_url ? `[PDF original](${item.pdf_url})\n\n` : ""}*Fuente: ${item.detail_url}*\n`;

      const relPath = `${fm.jurisdiction}/${fm.identifier}.md`;
      const sha = await publisher.commitNorm({
        corpusRoot,
        relativePath: relPath,
        frontmatter: fm,
        body,
        commit: {
          type: "bootstrap",
          title: fm.title,
          trailers: {
            "Source-Id": fm.identifier,
            "Source-Date": today,
            "Norm-Id": fm.identifier,
          },
        },
      });
      console.log(`✓ ${relPath} @ ${sha.slice(0, 8)}`);
    }
  });

program
  .command("migrate")
  .description("Migrate national corpus from ES frontmatter to SPEC v0.2 EN")
  .option("--corpus <path>", "Path to corpus repo", "../legalize-pe")
  .option("--dry-run", "Print mapping without writing")
  .action(async (opts: { corpus: string; dryRun?: boolean }) => {
    const { migrateNational } = await import("./scripts/migrate-national.ts");
    await migrateNational({ corpusRoot: resolve(opts.corpus), dryRun: !!opts.dryRun });
  });

program.parse();
