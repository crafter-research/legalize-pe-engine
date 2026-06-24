/**
 * Decode HTML entities found in SPCN/El Peruano titles.
 *
 * Handles named entities for Spanish (á, é, í, ó, ú, ñ, ü and uppercase), plus
 * common structural ones (&amp; &lt; &gt; &quot; &apos;) and numeric references
 * (&#160; &#xA0;). No external dependency needed.
 */
const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  // Lower-case vowels with tilde/diacritic
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  agrave: "à",
  egrave: "è",
  igrave: "ì",
  ograve: "ò",
  ugrave: "ù",
  acirc: "â",
  ecirc: "ê",
  icirc: "î",
  ocirc: "ô",
  ucirc: "û",
  atilde: "ã",
  otilde: "õ",
  ntilde: "ñ",
  uuml: "ü",
  auml: "ä",
  euml: "ë",
  iuml: "ï",
  ouml: "ö",
  // Punctuation / symbols common in Spanish legal titles
  ordm: "º",
  ordf: "ª",
  deg: "°",
  iquest: "¿",
  iexcl: "¡",
  laquo: "«",
  raquo: "»",
  middot: "·",
  uml: "¨",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  sup1: "¹",
  sup2: "²",
  sup3: "³",
  shy: "",
  // Upper-case
  Aacute: "Á",
  Eacute: "É",
  Iacute: "Í",
  Oacute: "Ó",
  Uacute: "Ú",
  Agrave: "À",
  Egrave: "È",
  Igrave: "Ì",
  Ograve: "Ò",
  Ugrave: "Ù",
  Acirc: "Â",
  Ecirc: "Ê",
  Icirc: "Î",
  Ocirc: "Ô",
  Ucirc: "Û",
  Atilde: "Ã",
  Otilde: "Õ",
  Ntilde: "Ñ",
  Uuml: "Ü",
  Auml: "Ä",
  Euml: "Ë",
  Iuml: "Ï",
  Ouml: "Ö",
};

export function decodeHtmlEntities(text: string): string {
  return text.replace(/&([^;]+);/g, (match, entity: string) => {
    // Decimal numeric reference: &#160;
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    return NAMED[entity] ?? match;
  });
}
