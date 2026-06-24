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

  it("decodes punctuation entities common in legal titles", () => {
    expect(decodeHtmlEntities("Directiva N&ordm; 005")).toBe("Directiva Nº 005");
    expect(decodeHtmlEntities("1&ordf; Disposici&oacute;n")).toBe("1ª Disposición");
    expect(decodeHtmlEntities("&iquest;Qu&eacute;?")).toBe("¿Qué?");
    expect(decodeHtmlEntities("30&deg;C")).toBe("30°C");
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
