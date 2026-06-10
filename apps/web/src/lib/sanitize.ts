import DOMPurify from "isomorphic-dompurify";

/** Sanitize marked()-produced HTML for safe set:html injection. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "style"],
  });
}
