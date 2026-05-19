import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { CommandPalette } from "./command-palette";

export function CommandPaletteTrigger() {
  const [open, setOpen] = useState(false);

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
        className="text-muted-foreground hidden md:inline-flex w-56 justify-start gap-2 font-normal"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <SearchIcon className="text-muted-foreground" />
        <span className="flex-1 text-left">Search laws, regions...</span>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <SearchIcon />
      </Button>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
