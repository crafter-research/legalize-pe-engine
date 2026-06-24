import { describe, expect, it } from "vitest";
import { decodeHtmlEntities } from "./decode-html-entities";

describe("decodeHtmlEntities", () => {
  it("decodes common Spanish named entities", () => {
    expect(decodeHtmlEntities("Relaci&oacute;n")).toBe("Relación");
    expect(decodeHtmlEntities("&ntilde;")).toBe("ñ");
    expect(decodeHtmlEntities("&aacute;&eacute;&iacute;&oacute;&uacute;")).toBe("áéíóú");
    expect(decodeHtmlEntities("&Ntilde;&Oacute;")).toBe("ÑÓ");
  });

  it("decodes structural entities", () => {
    expect(decodeHtmlEntities("a &amp; b")).toBe("a & b");
    expect(decodeHtmlEntities("&lt;tag&gt;")).toBe("<tag>");
    expect(decodeHtmlEntities("&quot;hello&quot;")).toBe('"hello"');
  });

  it("decodes decimal numeric references", () => {
    expect(decodeHtmlEntities("&#160;")).toBe(" ");
    expect(decodeHtmlEntities("&#243;")).toBe("ó");
  });

  it("decodes hex numeric references", () => {
    expect(decodeHtmlEntities("&#xF3;")).toBe("ó");
    expect(decodeHtmlEntities("&#xA0;")).toBe(" ");
  });

  it("leaves unknown entities unchanged", () => {
    expect(decodeHtmlEntities("&foobar;")).toBe("&foobar;");
  });

  it("leaves plain text unchanged", () => {
    const text = "Aprueban el Reglamento";
    expect(decodeHtmlEntities(text)).toBe(text);
  });

  it("handles mixed content", () => {
    expect(decodeHtmlEntities("Aprueban la Relaci&oacute;n de Trabajos &amp; Funciones")).toBe(
      "Aprueban la Relación de Trabajos & Funciones",
    );
  });
});
