import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("removes <script> tags and their content", () => {
    const out = sanitizeHtml('<p>hola</p><script>alert(1)</script>');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("<p>hola</p>");
  });

  it("strips onerror from <img>", () => {
    const out = sanitizeHtml('<img src="x" onerror="alert(1)">');
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("alert(1)");
  });

  it("neutralizes javascript: hrefs", () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain("javascript:");
    expect(out).toContain("click");
  });

  it("removes <iframe>, <object>, <embed>, <form>, <style>", () => {
    const out = sanitizeHtml(
      '<iframe src="evil"></iframe><object data="x"></object><embed src="x"><form></form><style>body{}</style><p>ok</p>',
    );
    expect(out).not.toContain("<iframe");
    expect(out).not.toContain("<object");
    expect(out).not.toContain("<embed");
    expect(out).not.toContain("<form");
    expect(out).not.toContain("<style");
    expect(out).toContain("<p>ok</p>");
  });

  it("preserves legitimate norm formatting", () => {
    const input =
      '<h2 id="art-1">Artículo 1</h2><p>El presente <strong>decreto</strong> regula.</p><ul><li>uno</li><li>dos</li></ul><a href="https://gob.pe/norma">fuente</a>';
    const out = sanitizeHtml(input);
    expect(out).toContain("<h2");
    expect(out).toContain('id="art-1"');
    expect(out).toContain("Artículo 1");
    expect(out).toContain("<strong>decreto</strong>");
    expect(out).toContain("<ul>");
    expect(out).toContain("<li>uno</li>");
    expect(out).toContain("<li>dos</li>");
    expect(out).toContain('href="https://gob.pe/norma"');
    expect(out).toContain("fuente");
  });
});
