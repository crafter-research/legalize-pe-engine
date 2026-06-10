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

const spij = program.command("spij").description("SPIJ national tier (free-access API crawl)");

spij
  .command("crawl")
  .description("Recursively crawl the SPIJ index (materia compendios) into a norm registry")
  .option("--seed <id>", "Index seed norm id (default: H682710 = Legislacion por Materia)")
  .option("--max-depth <n>", "Max crawl depth from seed", "3")
  .option("--out <path>", "Registry output path", "data/spij-registry.json")
  .option("--corpus <path>", "Corpus repo path - publish leaf norms while crawling")
  .action(async (opts: { seed?: string; maxDepth: string; out: string; corpus?: string }) => {
    const { runCrawl } = await import("./scripts/spij-crawl.ts");
    await runCrawl({
      ...opts,
      out: resolve(opts.out),
      ...(opts.corpus ? { corpus: resolve(opts.corpus) } : {}),
    });
  });

spij
  .command("fetch")
  .description(
    "Fetch norms from a registry via detallenorma -> SPEC v0.2 (JSON, or commit to corpus)",
  )
  .requiredOption("--registry <path>", "Registry JSON from `spij crawl`")
  .option("--limit <n>", "Fetch only first N norms")
  .option("--out <path>", "Output dir for norm JSON (when not publishing)", "/tmp/spij-norms")
  .option("--corpus <path>", "Corpus repo path - publish SPEC Markdown + commit (one per norm)")
  .action(async (opts: { registry: string; limit?: string; out: string; corpus?: string }) => {
    const { runFetch } = await import("./scripts/spij-crawl.ts");
    await runFetch({
      ...opts,
      registry: resolve(opts.registry),
      out: resolve(opts.out),
      ...(opts.corpus ? { corpus: resolve(opts.corpus) } : {}),
    });
  });

program
  .command("discover-types")
  .description("Probe gob.pe type listings for a jurisdiction (or --all) and classify its fetcher")
  .option("--slug <slug>", "Single gob.pe slug, e.g. regionarequipa")
  .option("--all", "Probe all 26 regional-tier jurisdictions")
  .option("--out <path>", "Coverage matrix output (with --all)", "data/coverage-matrix.json")
  .action(async (opts: { slug?: string; all?: boolean; out?: string }) => {
    const { runDiscoverTypes } = await import("./scripts/discover-types.ts");
    await runDiscoverTypes({ ...opts, ...(opts.out ? { out: resolve(opts.out) } : {}) });
  });

const regional = program
  .command("regional")
  .description("Regional-tier (gob.pe, fetch-based, multi-type)");

regional
  .command("pilot")
  .description("Fetch one jurisdiction's norms from gob.pe -> SPEC v0.2 JSON (no corpus writes)")
  .requiredOption("--iso <code>", "pe-{iso} code, e.g. pe-are")
  .option("--matrix <path>", "Coverage matrix from discover-types", "data/coverage-matrix.json")
  .option("--out <path>", "Output dir for norm JSON", "/tmp/regional-pilot")
  .option("--max-pages <n>", "Max listing pages per type", "1000")
  .action(async (opts: { iso: string; matrix: string; out: string; maxPages: string }) => {
    const { runRegionalPilot } = await import("./scripts/regional-fetch.ts");
    await runRegionalPilot({
      iso: opts.iso,
      matrix: resolve(opts.matrix),
      out: resolve(opts.out),
      maxPages: Number(opts.maxPages),
    });
  });

regional
  .command("fanout")
  .description(
    "Publish all 26 regional jurisdictions' norms to the corpus (gob.pe, all type codes)",
  )
  .requiredOption("--corpus <path>", "Corpus repo path", "../legalize-pe")
  .option("--only <isos>", "Comma-separated iso subset, e.g. pe-are,pe-cus")
  .option("--max-pages <n>", "Max listing pages per type", "1000")
  .option("--out <path>", "Summary output dir", "data")
  .action(async (opts: { corpus: string; only?: string; maxPages: string; out: string }) => {
    const { runRegionalFanout } = await import("./scripts/regional-fetch.ts");
    await runRegionalFanout({
      corpus: resolve(opts.corpus),
      maxPages: Number(opts.maxPages),
      out: resolve(opts.out),
      ...(opts.only ? { only: opts.only.split(",").map((s) => s.trim()) } : {}),
    });
  });

const catalog = program
  .command("catalog")
  .description("Datos Abiertos catalog — coverage denominator + CatalogCrossrefFetcher data");

catalog
  .command("ingest")
  .description("Load the El Peruano dispositivos-legales CSV into a SQLite DB")
  .requiredOption("--csv <path>", "Path to a DatosAbiertos_Periodo_*.CSV file")
  .option("--db <path>", "SQLite output path", "data/catalog.db")
  .action(async (opts: { csv: string; db: string }) => {
    const { runCatalogIngest } = await import("./scripts/catalog-ingest.ts");
    await runCatalogIngest({ csv: resolve(opts.csv), db: resolve(opts.db) });
  });

catalog
  .command("coverage")
  .description(
    "Compare corpus files vs catalog rows per jurisdiction -> data/catalog-coverage.json",
  )
  .option("--db <path>", "SQLite DB from `catalog ingest`", "data/catalog.db")
  .option("--corpus <path>", "Corpus repo path", "../legalize-pe")
  .action(async (opts: { db: string; corpus: string }) => {
    const { runCatalogCoverage } = await import("./scripts/catalog-ingest.ts");
    await runCatalogCoverage({ db: resolve(opts.db), corpus: resolve(opts.corpus) });
  });

program.parse();
