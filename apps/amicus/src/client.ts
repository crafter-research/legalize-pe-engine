// Thin client over the amicus hosted API (https://amicus.crafter.ing).
// search_norms + get_norm are public; ask requires an API key.

const BASE = (process.env.AMICUS_API_URL || "https://amicus.crafter.ing").replace(/\/$/, "");
const KEY = process.env.AMICUS_API_KEY || "";

export type NormSummary = {
  id: string;
  identifier: string | null;
  title: string | null;
  rank: string | null;
  jurisdiction: string | null;
  scope: string | null;
  publication_date: string | null;
};

export type Norm = NormSummary & {
  status: string | null;
  source: string | null;
  body: string;
};

export type SearchResult = {
  norms: NormSummary[];
  total: number;
  page: number;
  pages: number;
};

export type AskResult = {
  answer: string;
  sources: { identifier: string | null; publication_date: string | null; url: string | null }[];
  conversation_id: string;
  model: string;
  usage: { input_tokens: number | null; output_tokens: number | null };
};

export async function searchNorms(opts: {
  q?: string;
  jurisdiction?: string;
  rank?: string;
  page?: number;
}): Promise<SearchResult> {
  const p = new URLSearchParams();
  if (opts.q) p.set("q", opts.q);
  if (opts.jurisdiction) p.set("jurisdiction", opts.jurisdiction);
  if (opts.rank) p.set("rank", opts.rank);
  if (opts.page) p.set("page", String(opts.page));
  const r = await fetch(`${BASE}/api/norms?${p.toString()}`);
  if (!r.ok) throw new Error(`search_norms failed: HTTP ${r.status}`);
  return (await r.json()) as SearchResult;
}

export async function getNorm(id: string): Promise<Norm | null> {
  const path = id
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/");
  const r = await fetch(`${BASE}/api/norms/${path}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`get_norm failed: HTTP ${r.status}`);
  return (await r.json()) as Norm;
}

export async function ask(query: string, conversationId?: string): Promise<AskResult> {
  if (!KEY) {
    throw new Error(
      "AMICUS_API_KEY is required for `ask`. Get one from amicus.crafter.ing and set AMICUS_API_KEY.",
    );
  }
  const r = await fetch(`${BASE}/api/v1/ask`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({ query, conversationId }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`ask failed: HTTP ${r.status} ${t.slice(0, 200)}`);
  }
  return (await r.json()) as AskResult;
}

// Jurisdiction codes -> labels (national `pe` + 26 regions).
export const JURISDICTIONS: Record<string, string> = {
  pe: "Nacional",
  "pe-ama": "Amazonas",
  "pe-anc": "Áncash",
  "pe-apu": "Apurímac",
  "pe-are": "Arequipa",
  "pe-aya": "Ayacucho",
  "pe-caj": "Cajamarca",
  "pe-cal": "Callao",
  "pe-cus": "Cusco",
  "pe-huc": "Huánuco",
  "pe-huv": "Huancavelica",
  "pe-ica": "Ica",
  "pe-jun": "Junín",
  "pe-lal": "La Libertad",
  "pe-lam": "Lambayeque",
  "pe-lim": "Lima (región)",
  "pe-lim-met": "Lima Metropolitana",
  "pe-lor": "Loreto",
  "pe-mdd": "Madre de Dios",
  "pe-moq": "Moquegua",
  "pe-pas": "Pasco",
  "pe-piu": "Piura",
  "pe-pun": "Puno",
  "pe-sam": "San Martín",
  "pe-tac": "Tacna",
  "pe-tum": "Tumbes",
  "pe-uca": "Ucayali",
};
