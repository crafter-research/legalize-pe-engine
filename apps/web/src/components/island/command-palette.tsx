import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
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

const RANK_LABELS: Record<string, string> = {
  constitucion: "Constitution",
  ley: "Law",
  decreto_legislativo: "Legislative Decree",
  decreto_supremo: "Supreme Decree",
  decreto_de_urgencia: "Urgency Decree",
  decreto_urgencia: "Urgency Decree",
  decreto_ley: "Decree Law",
  resolucion_legislativa: "Legislative Resolution",
  resolucion_ministerial: "Ministerial Resolution",
  resolucion_suprema: "Supreme Resolution",
  ley_de_reforma_constitucional: "Constitutional Reform",
  ordenanza_regional: "Regional Ordinance",
  ordenanza_municipal: "Municipal Ordinance",
  decreto_regional: "Regional Decree",
  acuerdo_regional: "Regional Agreement",
  acuerdo_de_concejo: "Council Agreement",
  decreto_de_alcaldia: "Mayoral Decree",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const [index, setIndex] = useState<Hit[] | null>(null);
  const [query, setQuery] = useState("");

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

  const lawUrl = (h: Hit) => `/laws/${h.id.toLowerCase()}`;

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Find a law, jump to a section, or run a command."
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search laws, regions, sections..."
      />
      <CommandList>
        <CommandEmpty>
          {query.trim()
            ? "No matches. Try the law number or title."
            : !index
              ? "Loading index..."
              : "Start typing to search."}
        </CommandEmpty>

        {!query.trim() && (
          <>
            <CommandGroup heading="Navigate">
              <CommandItem onSelect={() => go("/")}>
                <HomeIcon />
                Home
              </CommandItem>
              <CommandItem onSelect={() => go("/laws")}>
                <BookOpenIcon />
                Browse laws
              </CommandItem>
              <CommandItem onSelect={() => go("/regions")}>
                <MapIcon />
                Regional jurisdictions
              </CommandItem>
              <CommandItem onSelect={() => go("/audit")}>
                <LayersIcon />
                Coverage audit
              </CommandItem>
              <CommandItem onSelect={() => go("/api")}>
                <Settings2Icon />
                API documentation
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Key documents">
              <CommandItem onSelect={() => go("/laws/con-1993")}>
                <LandmarkIcon />
                Constitución Política del Perú (1993)
                <span className="text-muted-foreground ml-auto text-xs">32 versions</span>
              </CommandItem>
              <CommandItem onSelect={() => go("/laws/dleg-295-1984")}>
                <GavelIcon />
                Código Civil
              </CommandItem>
              <CommandItem onSelect={() => go("/laws/dleg-635-1991")}>
                <GavelIcon />
                Código Penal
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {results.length > 0 && (
          <CommandGroup heading={`${results.length} match${results.length === 1 ? "" : "es"}`}>
            {results.map((h) => (
              <CommandItem key={h.id} value={`${h.id} ${h.t}`} onSelect={() => go(lawUrl(h))}>
                <FileTextIcon />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm">{h.t}</span>
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <span className="font-id">{h.id}</span>
                    <span aria-hidden>·</span>
                    <span>{RANK_LABELS[h.r] ?? h.r}</span>
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
