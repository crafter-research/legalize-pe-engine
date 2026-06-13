import { DEFAULT_LANG, type Lang, resolveLang, t } from "@/lib/i18n";
import { useEffect, useState } from "react";

/**
 * React hook for the active UI language. Seeds from the value the inline
 * `i18n-script.astro` already resolved (window.__LANG__), then re-renders when
 * the language toggle dispatches a `langchange` event.
 */
export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    setLang(resolveLang());
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<Lang>).detail;
      if (next === "es" || next === "en") setLang(next);
    };
    window.addEventListener("langchange", onChange);
    return () => window.removeEventListener("langchange", onChange);
  }, []);

  return lang;
}

/** Convenience: bind `t` to the active language. */
export function useT(): (key: string) => string {
  const lang = useLang();
  return (key: string) => t(key, lang);
}
