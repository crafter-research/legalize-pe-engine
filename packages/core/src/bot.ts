/**
 * Crafternauta bot identity for corpus repo commits.
 * Engine repo commits use Hunter's normal identity.
 */

export const CRAFTERNAUTA_NAME = "Crafternauta";
export const CRAFTERNAUTA_EMAIL = "the.crafter.station@gmail.com";

export const USER_AGENT = "legalize-bot/1.0 (+https://github.com/crafter-research/legalize-pe)";

/**
 * Git rejects commits with author-date before 1970-01-01.
 * For pre-1970 norms, return 1970-01-02 (still represents historical norm but git-safe).
 * Real date stays in frontmatter `publication_date` and `Source-Date` trailer.
 */
export function gitSafeAuthorDate(publicationDate: string): string {
  const year = Number(publicationDate.slice(0, 4));
  if (Number.isNaN(year) || year < 1970) {
    return "1970-01-02T00:00:00Z";
  }
  return `${publicationDate}T00:00:00Z`;
}
