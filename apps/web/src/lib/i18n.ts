/**
 * Client-side i18n for the Legalize PE web UI.
 *
 * Scope: this translates the *interface chrome* (navigation, footer, headings,
 * static page copy, rank/status labels) only. The legal corpus itself — every
 * Markdown norm body — stays in its original Spanish and is never touched here.
 *
 * Mechanism: the full dictionary is serialized into the page <head> by
 * `i18n-script.astro`. A small inline script swaps the content of every element
 * carrying `data-i18n` (innerHTML) or `data-i18n-attr` (attributes) to the
 * active language before paint. React islands read the same dictionary via
 * `use-lang.ts`. Values may contain trusted static HTML.
 */

export type Lang = "es" | "en";

export const LANGS: Lang[] = ["es", "en"];

/** Default when the visitor has no stored choice and no detectable preference. */
export const DEFAULT_LANG: Lang = "es";

/** Native display names for the language switcher. */
export const LANG_NAMES: Record<Lang, string> = {
  es: "Español",
  en: "English",
};

type Entry = Record<Lang, string>;

export const translations: Record<string, Entry> = {
  // ---- Navigation ----
  "nav.laws": { en: "Laws", es: "Leyes" },
  "nav.regions": { en: "Regions", es: "Regiones" },
  "nav.audit": { en: "Audit", es: "Auditoría" },
  "nav.api": { en: "API", es: "API" },
  "nav.about": { en: "About", es: "Acerca de" },
  "nav.home": { en: "Home", es: "Inicio" },

  // ---- Theme switcher ----
  "theme.label": { en: "Switch theme", es: "Cambiar tema" },
  "theme.light": { en: "Light", es: "Claro" },
  "theme.dark": { en: "Dark", es: "Oscuro" },
  "theme.system": { en: "System", es: "Sistema" },

  // ---- Language switcher ----
  "lang.label": { en: "Switch language", es: "Cambiar idioma" },

  // ---- Footer ----
  "footer.tagline": {
    en: 'Peruvian legislation as a git repository. Every law a file, every reform a commit. Community-maintained by <a href="https://github.com/crafter-research" class="underline underline-offset-4 hover:text-foreground">Crafter Research</a>.',
    es: 'La legislación peruana como un repositorio git. Cada ley un archivo, cada reforma un commit. Mantenido por la comunidad de <a href="https://github.com/crafter-research" class="underline underline-offset-4 hover:text-foreground">Crafter Research</a>.',
  },
  "footer.browse": { en: "Browse", es: "Explorar" },
  "footer.build": { en: "Build", es: "Construir" },
  "footer.legal": {
    en: "Content: public domain (DLeg 822 Art. 9). Code: MIT.",
    es: "Contenido: dominio público (DLeg 822 Art. 9). Código: MIT.",
  },
  "footer.federation": {
    en: 'Part of the <a href="https://legalize.dev" class="underline underline-offset-4 hover:text-foreground">legalize.dev</a> federation.',
    es: 'Parte de la federación <a href="https://legalize.dev" class="underline underline-offset-4 hover:text-foreground">legalize.dev</a>.',
  },

  // ---- Layout ----
  "layout.skip": { en: "Skip to content", es: "Saltar al contenido" },

  // ---- Command palette ----
  "cmd.searchPlaceholder": {
    en: "Search laws, regions, sections…",
    es: "Buscar leyes, regiones, secciones…",
  },
  "cmd.triggerPlaceholder": { en: "Search laws, regions…", es: "Buscar leyes, regiones…" },
  "cmd.title": { en: "Search", es: "Buscar" },
  "cmd.description": {
    en: "Find a law, jump to a section, or run a command.",
    es: "Encuentra una ley, salta a una sección o ejecuta un comando.",
  },
  "cmd.emptyNoMatch": {
    en: "No matches. Try the law number or title.",
    es: "Sin resultados. Prueba con el número o el título de la ley.",
  },
  "cmd.emptyLoading": { en: "Loading index...", es: "Cargando índice..." },
  "cmd.emptyStart": { en: "Start typing to search.", es: "Empieza a escribir para buscar." },
  "cmd.navigate": { en: "Navigate", es: "Navegar" },
  "cmd.browseLaws": { en: "Browse laws", es: "Explorar leyes" },
  "cmd.regions": { en: "Regional jurisdictions", es: "Jurisdicciones regionales" },
  "cmd.audit": { en: "Coverage audit", es: "Auditoría de cobertura" },
  "cmd.apiDocs": { en: "API documentation", es: "Documentación de la API" },
  "cmd.keyDocs": { en: "Key documents", es: "Documentos clave" },
  "cmd.versions": { en: "versions", es: "versiones" },
  "cmd.matchOne": { en: "match", es: "resultado" },
  "cmd.matchMany": { en: "matches", es: "resultados" },

  // ---- Home ----
  "home.badge": {
    en: "Pre-1.0 · Community-maintained",
    es: "Pre-1.0 · Mantenido por la comunidad",
  },
  "home.hero": {
    en: 'Peruvian law,<br /><span class="text-primary">as a git repo.</span>',
    es: 'La ley peruana,<br /><span class="text-primary">como un repo git.</span>',
  },
  "home.heroSub": {
    en: "legal norms as Markdown files. Every reform is a commit with the real publication date. Clone it, grep it, diff it, build on it.",
    es: "normas legales como archivos Markdown. Cada reforma es un commit con su fecha real de publicación. Clónalo, búscalo, compáralo, construye sobre ello.",
  },
  "home.browseLaws": { en: "Browse laws", es: "Explorar leyes" },
  "home.cloneGithub": { en: "Clone on GitHub", es: "Clonar en GitHub" },
  "home.statNational": { en: "National norms", es: "Normas nacionales" },
  "home.statNationalHint": { en: "Laws, DLeg, DS", es: "Leyes, DLeg, DS" },
  "home.statReforms": { en: "Const. reforms", es: "Reformas const." },
  "home.statReformsHint": { en: "1995 → 2024", es: "1995 → 2024" },
  "home.statRegional": { en: "Regional norms", es: "Normas regionales" },
  "home.statRegionalHint": { en: "25 GORE + Lima Met", es: "25 GORE + Lima Met" },
  "home.statJurisdictions": { en: "Jurisdictions", es: "Jurisdicciones" },
  "home.statJurisdictionsHint": { en: "Sub-national coverage", es: "Cobertura sub-nacional" },
  "home.whatYouGet": { en: "What you get", es: "Lo que obtienes" },
  "home.whatYouGetTitle": {
    en: 'Legal infrastructure that&apos;s actually <em class="italic text-primary">accessible.</em>',
    es: 'Infraestructura legal que de verdad es <em class="italic text-primary">accesible.</em>',
  },
  "home.feat1Title": { en: "Every reform is a commit", es: "Cada reforma es un commit" },
  "home.feat1Body": {
    en: "The 1993 Constitution has 32 commits over the same file: one for the original text and one per amendment, dated correctly.",
    es: "La Constitución de 1993 tiene 32 commits sobre el mismo archivo: uno por el texto original y uno por cada reforma, con su fecha correcta.",
  },
  "home.feat2Title": { en: "Plain markdown, plain YAML", es: "Markdown plano, YAML plano" },
  "home.feat2Body": {
    en: "No proprietary format. Every norm is a single .md file with eight standard frontmatter fields you can parse in any language.",
    es: "Sin formato propietario. Cada norma es un único archivo .md con ocho campos estándar de frontmatter que puedes parsear en cualquier lenguaje.",
  },
  "home.feat3Title": { en: "For agents and humans", es: "Para agentes y humanos" },
  "home.feat3Body": {
    en: "Use it as LLM context, as research input, as a CLI argument, or browse it here. Public domain (DLeg 822 Art. 9).",
    es: "Úsalo como contexto para LLM, como insumo de investigación, como argumento de CLI, o explóralo aquí. Dominio público (DLeg 822 Art. 9).",
  },
  "home.recent": { en: "Recent", es: "Reciente" },
  "home.recentTitle": { en: "Latest norms in the corpus", es: "Últimas normas del corpus" },
  "home.allLaws": { en: "All laws", es: "Todas las leyes" },
  "home.federation": { en: "Federation", es: "Federación" },
  "home.federationTitle": {
    en: 'Part of <em class="italic">legalize.dev</em>',
    es: 'Parte de <em class="italic">legalize.dev</em>',
  },
  "home.federationBody": {
    en: "Same spec, same commit conventions, same git-native workflow as Spain, Portugal, Italy, Korea, and 30+ other countries. Community-maintained by Crafter Research.",
    es: "Misma especificación, mismas convenciones de commit, mismo flujo git-nativo que España, Portugal, Italia, Corea y 30+ países más. Mantenido por la comunidad de Crafter Research.",
  },
  "home.whyExists": { en: "Why this exists", es: "Por qué existe" },
  "home.apiComment": {
    en: "# Clone, grep, diff. That&apos;s the API.",
    es: "# Clonar, grep, diff. Esa es la API.",
  },

  // ---- About ----
  "about.kicker": { en: "About", es: "Acerca de" },
  "about.title": { en: "Why this exists", es: "Por qué existe" },
  "about.p1": {
    en: "Peruvian legislation is published, but it is not <em>accessible</em> as machine-readable, version-controlled data.",
    es: "La legislación peruana se publica, pero no es <em>accesible</em> como datos legibles por máquina y versionados.",
  },
  "about.p2": {
    en: "A citizen, lawyer, journalist, or AI agent that needs to know <strong>which legal rules apply to them</strong> faces a fragmented landscape: SPIJ has the national text but not the sub-national; El Peruano publishes reforms as new PDFs unlinked to their predecessors; 1,919 issuing authorities each have their own portal with their own schema; commercial providers charge for what is public domain.",
    es: "Un ciudadano, abogado, periodista o agente de IA que necesita saber <strong>qué reglas legales le aplican</strong> enfrenta un panorama fragmentado: SPIJ tiene el texto nacional pero no el sub-nacional; El Peruano publica reformas como nuevos PDF sin enlazar a sus predecesores; 1,919 entidades emisoras tienen cada una su propio portal con su propio esquema; los proveedores comerciales cobran por lo que es de dominio público.",
  },
  "about.h2what": { en: "What this is", es: "Qué es esto" },
  "about.whatIntro": { en: "A two-repo system:", es: "Un sistema de dos repositorios:" },
  "about.whatCorpus": {
    en: '<strong>Corpus</strong> at <a href="https://github.com/crafter-research/legalize-pe">crafter-research/legalize-pe</a>. Every Peruvian legal norm as a Markdown file with YAML frontmatter, following SPEC v0.2. Every reform is a git commit with the real publication date.',
    es: '<strong>Corpus</strong> en <a href="https://github.com/crafter-research/legalize-pe">crafter-research/legalize-pe</a>. Cada norma legal peruana como archivo Markdown con frontmatter YAML, siguiendo la SPEC v0.2. Cada reforma es un commit de git con la fecha real de publicación.',
  },
  "about.whatEngine": {
    en: '<strong>Engine</strong> at <a href="https://github.com/crafter-research/legalize-pe-engine">crafter-research/legalize-pe-engine</a>. The CLI, this web app, the scrapers, and the recon IRs that produce the corpus. Pre-1.0.',
    es: '<strong>Motor</strong> en <a href="https://github.com/crafter-research/legalize-pe-engine">crafter-research/legalize-pe-engine</a>. La CLI, esta aplicación web, los scrapers y los IR de recon que producen el corpus. Pre-1.0.',
  },
  "about.h2diff": { en: "What makes it different", es: "Qué lo hace diferente" },
  "about.diffSubnational": {
    en: "<strong>Sub-national coverage.</strong> Peru has 1,919 legally distinct issuing authorities: 25 regional governments, Lima Metropolitana, Callao, 196 provincial municipalities, and 1,695 district municipalities. SPIJ covers national legislation decently and almost nothing below it. This is the first attempt at a cohesive sub-national legal corpus aggregation for a Global South country.",
    es: "<strong>Cobertura sub-nacional.</strong> Perú tiene 1,919 entidades emisoras legalmente distintas: 25 gobiernos regionales, Lima Metropolitana, Callao, 196 municipalidades provinciales y 1,695 municipalidades distritales. SPIJ cubre la legislación nacional de forma aceptable y casi nada por debajo. Este es el primer intento de agregar un corpus legal sub-nacional cohesionado para un país del Sur Global.",
  },
  "about.diffTimeline": {
    en: '<strong>Full Constitution timeline.</strong> <code class="font-id text-sm">git log pe/CON-1993.md</code> returns 32 commits with real author dates from 1993-12-30 to 2024-12-11. No other country in the legalize.dev federation has its constitution this granularly versioned.',
    es: '<strong>Línea de tiempo completa de la Constitución.</strong> <code class="font-id text-sm">git log pe/CON-1993.md</code> devuelve 32 commits con fechas reales de autor desde 1993-12-30 hasta 2024-12-11. Ningún otro país de la federación legalize.dev tiene su constitución versionada con este nivel de granularidad.',
  },
  "about.diffAgent": {
    en: "<strong>Agent-first engineering.</strong> Every step of the pipeline is invocable from a CLI. Recon writes a persisted IR per jurisdiction; runtime extraction is then zero-LLM and reproducible.",
    es: "<strong>Ingeniería agent-first.</strong> Cada paso del pipeline es invocable desde una CLI. Recon escribe un IR persistido por jurisdicción; la extracción en runtime es entonces sin-LLM y reproducible.",
  },
  "about.h2fed": { en: "Federation", es: "Federación" },
  "about.fedBody": {
    en: 'Same spec, same commit conventions, same git-native workflow as 30+ other countries on <a href="https://legalize.dev">legalize.dev</a>. Community-maintained.',
    es: 'Misma especificación, mismas convenciones de commit, mismo flujo git-nativo que 30+ países más en <a href="https://legalize.dev">legalize.dev</a>. Mantenido por la comunidad.',
  },
  "about.h2license": { en: "License", es: "Licencia" },
  "about.licenseBody": {
    en: "The text of legal norms is public domain by force of law (Decreto Legislativo 822, Art. 9). Repository structure and tooling: MIT.",
    es: "El texto de las normas legales es de dominio público por mandato de ley (Decreto Legislativo 822, Art. 9). La estructura del repositorio y las herramientas: MIT.",
  },
  "about.h2maintainers": { en: "Maintainers", es: "Mantenedores" },
  "about.maintRailly": {
    en: '<a href="https://github.com/Railly">Railly Hugo</a> (engine, recon, federation)',
    es: '<a href="https://github.com/Railly">Railly Hugo</a> (motor, recon, federación)',
  },
  "about.maintShiara": {
    en: '<a href="https://github.com/shiarauzo">Shiara Arauzo</a> (design, frontend, initial corpus)',
    es: '<a href="https://github.com/shiarauzo">Shiara Arauzo</a> (diseño, frontend, corpus inicial)',
  },
  "about.partOf": {
    en: 'Part of <a href="https://github.com/crafter-research">Crafter Research</a>.',
    es: 'Parte de <a href="https://github.com/crafter-research">Crafter Research</a>.',
  },
  "about.github": { en: "GitHub", es: "GitHub" },

  // ---- API page ----
  "api.kicker": { en: "API", es: "API" },
  "api.title": { en: "REST endpoints", es: "Endpoints REST" },
  "api.intro": {
    en: "Read-only access to commit history, diffs, and search. All endpoints return JSON. Public, no auth.",
    es: "Acceso de solo lectura al historial de commits, diffs y búsqueda. Todos los endpoints devuelven JSON. Públicos, sin autenticación.",
  },
  "api.descHistory": {
    en: "Returns the full commit history for a norm.",
    es: "Devuelve el historial completo de commits de una norma.",
  },
  "api.descAt": {
    en: "Returns the file content at a specific commit.",
    es: "Devuelve el contenido del archivo en un commit específico.",
  },
  "api.descDiff": {
    en: "Returns a unified diff between two commits.",
    es: "Devuelve un diff unificado entre dos commits.",
  },
  "api.descCompare": {
    en: "Returns a side-by-side comparison between two commits.",
    es: "Devuelve una comparación lado a lado entre dos commits.",
  },
  "api.descOg": {
    en: "Generates an Open Graph image for a norm or page.",
    es: "Genera una imagen Open Graph para una norma o página.",
  },
  "api.descSearch": {
    en: "Smart search over the corpus index.",
    es: "Búsqueda inteligente sobre el índice del corpus.",
  },
  "api.descFeed": {
    en: "RSS feed of the latest norms.",
    es: "Feed RSS de las últimas normas.",
  },
  "api.footer": {
    en: 'Want a richer API? Clone the <a href="https://github.com/crafter-research/legalize-pe" class="underline underline-offset-4 text-foreground">corpus repo</a> and run any tool that reads git history. The whole API is just <code class="font-id text-foreground">git log</code> and <code class="font-id text-foreground">git diff</code> under the hood.',
    es: '¿Quieres una API más rica? Clona el <a href="https://github.com/crafter-research/legalize-pe" class="underline underline-offset-4 text-foreground">repo del corpus</a> y corre cualquier herramienta que lea el historial de git. Toda la API es solo <code class="font-id text-foreground">git log</code> y <code class="font-id text-foreground">git diff</code> por debajo.',
  },

  // ---- Audit page ----
  "audit.kicker": { en: "Methodology", es: "Metodología" },
  "audit.title": { en: "Coverage audit", es: "Auditoría de cobertura" },
  "audit.intro": {
    en: "How much of Peru&apos;s legal universe is in the corpus today. Updated on every commit.",
    es: "Cuánto del universo legal del Perú está en el corpus hoy. Se actualiza en cada commit.",
  },
  "audit.byTier": { en: "By tier", es: "Por nivel" },
  "audit.byRank": { en: "By rank", es: "Por rango" },
  "audit.notes": { en: "Notes", es: "Notas" },
  "audit.tierNational": { en: "National (Tier 0)", es: "Nacional (Nivel 0)" },
  "audit.tierNationalNote": {
    en: "Constitution + laws + DLeg + DS + RM",
    es: "Constitución + leyes + DLeg + DS + RM",
  },
  "audit.tierRegional": { en: "Regional (Tier 1)", es: "Regional (Nivel 1)" },
  "audit.tierRegionalNote": {
    en: "25 GR + Lima Metro + Callao",
    es: "25 GR + Lima Metro + Callao",
  },
  "audit.tierProvincial": { en: "Provincial (Tier 2)", es: "Provincial (Nivel 2)" },
  "audit.tierProvincialNote": {
    en: "Municipalidades provinciales",
    es: "Municipalidades provinciales",
  },
  "audit.tierDistrict": { en: "District (Tier 3)", es: "Distrital (Nivel 3)" },
  "audit.tierDistrictNote": {
    en: "Municipalidades distritales (long tail)",
    es: "Municipalidades distritales (cola larga)",
  },
  "audit.notesBody": {
    en: "Tier counts are approximate and based on INEI 2019. Coverage growth is incremental: V1 shipped Cusco as the regional pioneer; V2 targets the remaining 26 regional jurisdictions.",
    es: "Los conteos por nivel son aproximados y se basan en INEI 2019. El crecimiento de la cobertura es incremental: V1 lanzó Cusco como pionero regional; V2 apunta a las 26 jurisdicciones regionales restantes.",
  },

  // ---- Laws index ----
  "laws.kicker": { en: "Corpus", es: "Corpus" },
  "laws.title": { en: "All laws", es: "Todas las leyes" },
  "laws.useSearch": {
    en: "to search by title or ID.",
    es: "para buscar por título o ID.",
  },
  "laws.norms": { en: "norms.", es: "normas." },
  "laws.sorted": {
    en: "Sorted by publication date (descending)",
    es: "Ordenadas por fecha de publicación (descendente)",
  },
  "laws.emptyTitle": { en: "No norms in the corpus yet", es: "Aún no hay normas en el corpus" },
  "laws.emptyDesc": {
    en: "The corpus is being built. Check back soon.",
    es: "El corpus se está construyendo. Vuelve pronto.",
  },
  "laws.showing": { en: "Showing", es: "Mostrando" },
  "laws.of": { en: "of", es: "de" },
  "laws.useSearchRest": {
    en: "to search the rest.",
    es: "para buscar el resto.",
  },

  // ---- Regions index ----
  "regions.kicker": { en: "Sub-national tier", es: "Nivel sub-nacional" },
  "regions.title": { en: "Regional jurisdictions", es: "Jurisdicciones regionales" },
  "regions.intro": {
    en: "The first cohesive sub-national legal corpus for a Global South country — regional-government coverage no other Peruvian source offers.",
    es: "El primer corpus legal sub-nacional cohesionado para un país del Sur Global: cobertura de gobiernos regionales que ninguna otra fuente peruana ofrece.",
  },
  "regions.statRegional": { en: "regional norms", es: "normas regionales" },
  "regions.statJurisdictions": { en: "jurisdictions", es: "jurisdicciones" },
  "regions.normsSuffix": { en: "norms", es: "normas" },
  "regions.pending": { en: "Pending", es: "Pendiente" },

  // ---- Region detail ----
  "region.normOne": { en: "norm", es: "norma" },
  "region.normMany": { en: "norms", es: "normas" },
  "region.empty": { en: "No norms yet. Coming in V2.", es: "Aún no hay normas. Llegan en V2." },

  // ---- Law detail ----
  "law.minRead": { en: "min read", es: "min de lectura" },
  "law.truncated": {
    en: 'Title truncated at source. <a class="underline underline-offset-4 hover:text-foreground" data-truncated-link>View full title at gob.pe</a>.',
    es: 'Título truncado en la fuente. <a class="underline underline-offset-4 hover:text-foreground" data-truncated-link>Ver título completo en gob.pe</a>.',
  },
  "law.yearOnly": { en: "(year only)", es: "(solo año)" },
  "law.metadata": { en: "Metadata", es: "Metadatos" },
  "law.identifier": { en: "Identifier", es: "Identificador" },
  "law.rank": { en: "Rank", es: "Rango" },
  "law.status": { en: "Status", es: "Estado" },
  "law.jurisdiction": { en: "Jurisdiction", es: "Jurisdicción" },
  "law.published": { en: "Published", es: "Publicada" },
  "law.updated": { en: "Updated", es: "Actualizada" },
  "law.gazette": { en: "Gazette", es: "Diario" },
  "law.originalSource": { en: "Original source", es: "Fuente original" },
  "law.originalPdf": { en: "Original PDF", es: "PDF original" },
  "law.reformsApplied": { en: "reforms applied", es: "reformas aplicadas" },
  "law.viewTimeline": {
    en: "View the commit timeline via the API:",
    es: "Ver la línea de tiempo de commits vía la API:",
  },

  // ---- 404 ----
  "e404.notFound": { en: "Norm not found.", es: "Norma no encontrada." },
  "e404.back": { en: "Back to home", es: "Volver al inicio" },

  // ---- Offline ----
  "offline.title": { en: "No connection", es: "Sin conexión" },
  "offline.body": {
    en: "We couldn't load this page because you have no internet connection.",
    es: "No pudimos cargar esta página porque no tienes conexión a internet.",
  },
  "offline.retry": { en: "Retry", es: "Reintentar" },
  "offline.home": { en: "Go home", es: "Ir al inicio" },
  "offline.hint": {
    en: 'Pages you visited earlier may be available in cache. Try navigating from <a href="/">home</a>.',
    es: 'Las páginas que visitaste antes pueden estar disponibles en caché. Prueba navegando desde el <a href="/">inicio</a>.',
  },

  // ---- Rank labels ----
  "rank.constitucion": { en: "Constitution", es: "Constitución" },
  "rank.codigo": { en: "Code", es: "Código" },
  "rank.ley": { en: "Law", es: "Ley" },
  "rank.ley_organica": { en: "Organic Law", es: "Ley Orgánica" },
  "rank.decreto_legislativo": { en: "Legislative Decree", es: "Decreto Legislativo" },
  "rank.decreto_supremo": { en: "Supreme Decree", es: "Decreto Supremo" },
  "rank.decreto_de_urgencia": { en: "Urgency Decree", es: "Decreto de Urgencia" },
  "rank.decreto_urgencia": { en: "Urgency Decree", es: "Decreto de Urgencia" },
  "rank.decreto_ley": { en: "Decree Law", es: "Decreto Ley" },
  "rank.resolucion_legislativa": { en: "Legislative Resolution", es: "Resolución Legislativa" },
  "rank.resolucion_ministerial": { en: "Ministerial Resolution", es: "Resolución Ministerial" },
  "rank.resolucion_suprema": { en: "Supreme Resolution", es: "Resolución Suprema" },
  "rank.ley_de_reforma_constitucional": {
    en: "Constitutional Reform",
    es: "Reforma Constitucional",
  },
  "rank.ordenanza_regional": { en: "Regional Ordinance", es: "Ordenanza Regional" },
  "rank.ordenanza_municipal": { en: "Municipal Ordinance", es: "Ordenanza Municipal" },
  "rank.decreto_regional": { en: "Regional Decree", es: "Decreto Regional" },
  "rank.acuerdo_regional": { en: "Regional Agreement", es: "Acuerdo Regional" },
  "rank.acuerdo_de_concejo": { en: "Council Agreement", es: "Acuerdo de Concejo" },
  "rank.decreto_de_alcaldia": { en: "Mayoral Decree", es: "Decreto de Alcaldía" },

  // ---- Status labels ----
  "status.in_force": { en: "In force", es: "Vigente" },
  "status.repealed": { en: "Repealed", es: "Derogada" },
  "status.partially_repealed": { en: "Partially repealed", es: "Derogada parcialmente" },
  "status.annulled": { en: "Annulled", es: "Anulada" },
  "status.expired": { en: "Expired", es: "Expirada" },
};

/** Translate a single key. Falls back to the key itself when missing. */
export function t(key: string, lang: Lang): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en ?? key;
}

/**
 * Resolve the active language from a stored choice or browser preference.
 * Mirrors the inline script in `i18n-script.astro` — keep both in sync.
 */
export function resolveLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const w = window as unknown as { __LANG__?: Lang };
  if (w.__LANG__ === "es" || w.__LANG__ === "en") return w.__LANG__;
  try {
    const stored = localStorage.getItem("lang");
    if (stored === "es" || stored === "en") return stored;
  } catch {
    /* ignore */
  }
  const nav = (navigator.language || "").toLowerCase();
  return nav.startsWith("es") ? "es" : "en";
}
