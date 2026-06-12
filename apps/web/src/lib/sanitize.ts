import sanitizeHtmlLib from "sanitize-html";

/**
 * Sanitize marked()-produced HTML for safe set:html injection.
 *
 * Uses `sanitize-html` (htmlparser2-based) rather than a jsdom-backed sanitizer:
 * the law detail page renders on-demand inside a Vercel Node serverless function,
 * and jsdom's transitive deps (html-encoding-sniffer → @exodus/bytes) throw
 * ERR_REQUIRE_ESM in that runtime. `sanitize-html` has no jsdom dependency.
 *
 * Allowlist covers everything `marked` emits for our corpus (headings with slug
 * ids, paragraphs, lists, tables, code, blockquotes, links). Anything not listed
 * — including <script>, <style>, <iframe>, <object>, <embed>, <form> and all
 * on* event handlers — is stripped. `javascript:` URLs are dropped by the scheme
 * allowlist.
 */
export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "br",
      "hr",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "sub",
      "sup",
      "a",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "span",
      "div",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      "caption",
      "img",
    ],
    allowedAttributes: {
      "*": ["id"],
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
    },
    // Drop disallowed tags AND their inner text (so <script>alert(1)</script>
    // leaves nothing behind, matching the previous DOMPurify behavior).
    disallowedTagsMode: "discard",
    nonTextTags: ["script", "style", "textarea", "option", "noscript"],
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
    },
    // Strip protocol-relative URLs only if scheme is disallowed; keep relative URLs.
    allowProtocolRelative: true,
  });
}
