/**
 * Resolve a norma `id` (e.g. "pe-lal-093-2026-grll-cr") to its corpus-relative
 * file path (e.g. "pe-lal/093-2026-GRLL-CR.md") using the build-time map.
 *
 * Returns `undefined` when the id is not in the map (unknown norma).
 *
 * The map is imported as a module so Vite bundles it into the serverless
 * function — the `public/` directory is not on the function filesystem at runtime.
 */
import idPathMap from "id-path-map";

export function resolveNormaPath(id: string): string | undefined {
  return idPathMap[id];
}
