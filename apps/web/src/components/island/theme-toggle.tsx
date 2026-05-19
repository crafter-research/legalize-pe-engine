import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Theme = "light" | "dark" | "system";

const OPTIONS: Array<{ value: Theme; label: string; Icon: typeof SunIcon }> = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
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
          <Button variant="ghost" size="icon-sm" aria-label="Switch theme">
            <ActiveIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={6}>
        {OPTIONS.map(({ value, label, Icon }) => (
          <DropdownMenuItem key={value} onClick={() => choose(value)} className="gap-2">
            <Icon className="size-4" />
            <span>{label}</span>
            {theme === value && <CheckIcon className="ml-auto size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
