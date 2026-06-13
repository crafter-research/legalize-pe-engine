import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGS, LANG_NAMES, type Lang, t } from "@/lib/i18n";
import { useLang } from "@/lib/use-lang";
import { CheckIcon, LanguagesIcon } from "lucide-react";

declare global {
  interface Window {
    __applyI18n?: (lang: Lang) => void;
    __LANG__?: Lang;
  }
}

export function LanguageToggle() {
  const lang = useLang();

  const choose = (next: Lang) => {
    try {
      localStorage.setItem("lang", next);
    } catch {
      /* ignore */
    }
    window.__LANG__ = next;
    window.__applyI18n?.(next);
    window.dispatchEvent(new CustomEvent<Lang>("langchange", { detail: next }));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={t("lang.label", lang)}>
            <LanguagesIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={6}>
        {LANGS.map((value) => (
          <DropdownMenuItem key={value} onClick={() => choose(value)} className="gap-2">
            <span className="font-id text-xs uppercase">{value}</span>
            <span>{LANG_NAMES[value]}</span>
            {lang === value && <CheckIcon className="ml-auto size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
