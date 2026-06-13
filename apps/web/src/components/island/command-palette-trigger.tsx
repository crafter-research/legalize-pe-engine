import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/use-lang";
import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { CommandPalette } from "./command-palette";

export function CommandPaletteTrigger() {
  const [open, setOpen] = useState(false);
  // Resolved on the client: the platform modifier label, or null when the
  // device has no physical keyboard (touch) — in which case we hide the hint.
  const [shortcut, setShortcut] = useState<string | null>(null);
  const lang = useLang();

  useEffect(() => {
    const platform =
      (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
        ?.platform ??
      navigator.platform ??
      "";
    const isApple = /Mac|iPhone|iPad|iPod/i.test(platform) || /Mac/i.test(navigator.userAgent);
    // Only advertise the shortcut where a physical keyboard is likely.
    const hasKeyboard = window.matchMedia("(pointer: fine)").matches;
    setShortcut(hasKeyboard ? (isApple ? "⌘" : "Ctrl") : null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground hidden md:inline-flex w-56 justify-between gap-2 font-normal"
        onClick={() => setOpen(true)}
        aria-label={t("cmd.title", lang)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <SearchIcon className="text-muted-foreground shrink-0" />
          <span className="truncate">{t("cmd.triggerPlaceholder", lang)}</span>
        </span>
        {shortcut && (
          <KbdGroup className="shrink-0">
            <Kbd>{shortcut}</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label={t("cmd.title", lang)}
      >
        <SearchIcon />
      </Button>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
