import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/use-lang";
import Fuse from "fuse.js";
import {
  ArrowRightIcon,
  BookOpenIcon,
  FileTextIcon,
  GavelIcon,
  HomeIcon,
  LandmarkIcon,
  LayersIcon,
  MapIcon,
  Settings2Icon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Hit = {
  id: string;
  t: string; // title
  r: string; // rank
  s?: string; // status (omit if in_force)
  f: string; // publication_date
  j: string; // jurisdiction
  b: string; // body preview
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const [index, setIndex] = useState<Hit[] | null>(null);
  const [query, setQuery] = useState("");
  const lang = useLang();
  const rankLabel = (r: string) => {
    const label = t(`rank.${r}`, lang);
    return label === `rank.${r}` ? r : label;
  };

  useEffect(() => {
    if (!open || index) return;
    fetch("/search-index.json")
      .then((r) => r.json())
      .then((data: Hit[]) => setIndex(data))
      .catch(() => setIndex([]));
  }, [open, index]);

  const fuse = useMemo(() => {
    if (!index) return null;
    return new Fuse(index, {
      keys: [
        { name: "t", weight: 0.6 },
        { name: "id", weight: 0.3 },
        { name: "b", weight: 0.1 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
      includeScore: false,
    });
  }, [index]);

  const results = useMemo(() => {
    if (!fuse || !query.trim()) return [];
    return fuse.search(query, { limit: 12 }).map((r) => r.item);
  }, [fuse, query]);

  const go = (url: string) => {
    window.location.href = url;
  };

  const lawUrl = (h: Hit) => `/laws/${h.id}`;

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("cmd.title", lang)}
      description={t("cmd.description", lang)}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={t("cmd.searchPlaceholder", lang)}
      />
      <CommandList>
        <CommandEmpty>
          {query.trim()
            ? t("cmd.emptyNoMatch", lang)
            : !index
              ? t("cmd.emptyLoading", lang)
              : t("cmd.emptyStart", lang)}
        </CommandEmpty>

        {!query.trim() && (
          <>
            <CommandGroup heading={t("cmd.navigate", lang)}>
              <CommandItem onSelect={() => go("/")}>
                <HomeIcon />
                {t("nav.home", lang)}
              </CommandItem>
              <CommandItem onSelect={() => go("/laws")}>
                <BookOpenIcon />
                {t("cmd.browseLaws", lang)}
              </CommandItem>
              <CommandItem onSelect={() => go("/regions")}>
                <MapIcon />
                {t("cmd.regions", lang)}
              </CommandItem>
              <CommandItem onSelect={() => go("/audit")}>
                <LayersIcon />
                {t("cmd.audit", lang)}
              </CommandItem>
              <CommandItem onSelect={() => go("/api")}>
                <Settings2Icon />
                {t("cmd.apiDocs", lang)}
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading={t("cmd.keyDocs", lang)}>
              <CommandItem onSelect={() => go("/laws/pe-con-1993")}>
                <LandmarkIcon />
                Constitución Política del Perú (1993)
                <span className="text-muted-foreground ml-auto text-xs">
                  32 {t("cmd.versions", lang)}
                </span>
              </CommandItem>
              <CommandItem onSelect={() => go("/laws/pe-dleg-295-1984")}>
                <GavelIcon />
                Código Civil
              </CommandItem>
              <CommandItem onSelect={() => go("/laws/pe-dleg-635-1991")}>
                <GavelIcon />
                Código Penal
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {results.length > 0 && (
          <CommandGroup
            heading={`${results.length} ${
              results.length === 1 ? t("cmd.matchOne", lang) : t("cmd.matchMany", lang)
            }`}
          >
            {results.map((h) => (
              <CommandItem key={h.id} value={`${h.id} ${h.t}`} onSelect={() => go(lawUrl(h))}>
                <FileTextIcon />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm">{h.t}</span>
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <span className="font-id">{h.id}</span>
                    <span aria-hidden>·</span>
                    <span>{rankLabel(h.r)}</span>
                    <span aria-hidden>·</span>
                    <span>{h.f.slice(0, 4)}</span>
                  </span>
                </div>
                <ArrowRightIcon className="text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
