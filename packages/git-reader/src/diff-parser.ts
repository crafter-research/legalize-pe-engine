import type { DiffHunk } from "./types";

/**
 * Parse a unified diff patch string into structured DiffHunk objects.
 *
 * Rules:
 *   "+" prefix  → add line
 *   "-" prefix  → del line
 *   " " prefix  → context line (single leading space, stripped)
 *   ""  (empty) → ignored; in a real unified diff the patch terminator or
 *                 inter-hunk separator, never a content line.
 *   "\" prefix  → git annotation (e.g. "\ No newline at end of file"); skip.
 */
export function parsePatch(patch: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  const lines = patch.split("\n");

  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);

    if (hunkMatch) {
      if (currentHunk) hunks.push(currentHunk);

      const oldStart = hunkMatch[1];
      const newStart = hunkMatch[3];
      if (!oldStart || !newStart) continue;

      oldLine = Number.parseInt(oldStart, 10);
      newLine = Number.parseInt(newStart, 10);

      currentHunk = {
        oldStart: oldLine,
        oldLines: Number.parseInt(hunkMatch[2] ?? "1", 10),
        newStart: newLine,
        newLines: Number.parseInt(hunkMatch[4] ?? "1", 10),
        lines: [],
      };
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith("+") && !line.startsWith("+++")) {
      currentHunk.lines.push({
        type: "add",
        content: line.slice(1),
        newLine: newLine++,
      });
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      currentHunk.lines.push({
        type: "del",
        content: line.slice(1),
        oldLine: oldLine++,
      });
    } else if (line.startsWith(" ")) {
      // Genuine context line: exactly one leading space.
      currentHunk.lines.push({
        type: "context",
        content: line.slice(1),
        oldLine: oldLine++,
        newLine: newLine++,
      });
    }
    // Empty string ("") = patch separator / terminator -> ignore.
    // "\" prefix = git annotation -> ignore.
  }

  if (currentHunk) hunks.push(currentHunk);
  return hunks;
}
