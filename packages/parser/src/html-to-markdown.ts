/**
 * HTML → Markdown conversion via turndown.
 * Used by fetchers to convert gob.pe detail pages or PDF text extracts.
 */

import TurndownService from "turndown";

let _service: TurndownService | null = null;

function getService(): TurndownService {
  if (_service) return _service;
  _service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "_",
    strongDelimiter: "**",
  });
  _service.remove(["script", "style", "noscript"]);
  return _service;
}

export function htmlToMarkdown(html: string): string {
  return getService().turndown(html).trim();
}
