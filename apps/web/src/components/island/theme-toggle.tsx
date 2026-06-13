import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/use-lang";
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const OPTIONS: Array<{ value: Theme; key: string; Icon: typeof SunIcon }> = [
  { value: "light", key: "theme.light", Icon: SunIcon },
  { value: "dark", key: "theme.dark", Icon: MoonIcon },
  { value: "system", key: "theme.system", Icon: MonitorIcon },
];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && systemDark);
  root.classList.toggle("dark", isDark);
  root.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const lang = useLang();

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme | null) ?? "system";
    setTheme(stored);
    applyTheme(stored);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if ((localStorage.getItem("theme") as Theme | null) === "system") applyTheme("system");
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const choose = (next: Theme) => {
    localStorage.setItem("theme", next);
    setTheme(next);
    applyTheme(next);
  };

  const ActiveIcon = OPTIONS.find((o) => o.value === theme)?.Icon ?? MonitorIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={t("theme.label", lang)}>
            <ActiveIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={6}>
        {OPTIONS.map(({ value, key, Icon }) => (
          <DropdownMenuItem key={value} onClick={() => choose(value)} className="gap-2">
            <Icon className="size-4" />
            <span>{t(key, lang)}</span>
            {theme === value && <CheckIcon className="ml-auto size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
