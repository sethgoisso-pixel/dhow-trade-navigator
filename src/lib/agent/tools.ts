/**
 * Dhow agent tools. Every function here is deterministic and dependency-free, so the same code
 * runs on the server (when the AI model chooses the tools) and in the browser (preset demos).
 *
 * What is real: the HS nomenclature (WCO HS 2022 via UN Comtrade), the port list, the distance model and the
 * landed-cost arithmetic. What is indicative: duty rates (the agent proposes a band, the tool checks it is a
 * legal band for the destination customs union), VAT rates, the red-flag screen, and flat port/brokerage fees.
 */
import { HS6 } from "./hs6-data";
import { lookupCity, routeModel, type ResolvedCity } from "../dhow-plan";
import type { CargoForm } from "../dhow-data";
import type { PlanOption } from "../dhow-plan";

/* ───────────────────────── HS code search ───────────────────────── */

export type HsHit = { code: string; description: string; score: number };

const STOP = new Set(["the", "of", "and", "for", "with", "in", "a", "an", "other", "than", "or", "to", "by", "not", "nes", "n.e.s", "whether", "their", "from", "on", "at", "used", "new", "units", "unit"]);
const SYN: Record<string, string[]> = {
  solar: ["photovoltaic", "photosensitive"],
  pv: ["photovoltaic"],
  panel: ["modules", "panels"],
  smartphone: ["smartphones", "telephones", "cellular"],
  phone: ["telephones", "smartphones", "cellular"],
  mobile: ["cellular", "telephones"],
  laptop: ["portable", "automatic", "data", "processing"],
  tablet: ["portable", "automatic", "data", "processing"],
  rebar: ["bars", "rods", "iron", "steel", "reinforcing"],
  excavator: ["excavators", "shovels"],
  car: ["vehicles", "motor"],
  truck: ["vehicles", "goods", "transport"],
  tyre: ["tyres", "rubber", "pneumatic"],
  tire: ["tyres", "rubber", "pneumatic"],
  battery: ["accumulators", "batteries"],
  fabric: ["woven", "fabrics"],
  textile: ["fabrics", "woven"],
  generator: ["generating", "sets"],
  cement: ["cements", "portland"],
  tiles: ["ceramic", "tiles"],
};

const stem = (w: string) => {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("es") && /(ch|sh|x|s|z)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
};
const tokens = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 1 && !STOP.has(w)).map(stem);

type Doc = { code: string; description: string; toks: Set<string>; len: number };
let docs: Doc[] | null = null;
let idf: Map<string, number> | null = null;

function index() {
  if (docs && idf) return { docs, idf };
  const built: Doc[] = HS6.map((row) => {
    const i = row.indexOf("|");
    const code = row.slice(0, i);
    const description = row.slice(i + 1);
    const toks = new Set(tokens(description));
    return { code, description, toks, len: toks.size };
  });
  const df = new Map<string, number>();
  for (const d of built) for (const t of d.toks) df.set(t, (df.get(t) ?? 0) + 1);
  const n = built.length;
  const map = new Map<string, number>();
  for (const [t, c] of df) map.set(t, Math.log(1 + n / (1 + c)));
  docs = built;
  idf = map;
  return { docs: built, idf: map };
}

export const formatHs = (c: string) => (c.length === 6 ? `${c.slice(0, 4)}.${c.slice(4)}` : c);
export const normalizeHs = (c: string) => c.replace(/[^0-9]/g, "").slice(0, 6);
export const isKnownHs = (c: string) => HS6.some((r) => r.startsWith(normalizeHs(c) + "|"));
export const hsDescription = (c: string) => {
  const row = HS6.find((r) => r.startsWith(normalizeHs(c) + "|"));
  return row ? row.slice(7) : null;
};

/**
 * Ranks the 5,613 HS-2022 subheadings against a free-text product description.
 * `score` is the share of the query's (idf-weighted) terms found in the subheading text, 0–1.
 * It measures lexical match, not the probability that the code is legally correct.
 */
export function searchHS(query: string, k = 5): HsHit[] {
  const { docs: ds, idf: w } = index();
  const direct = query.match(/\b\d{4}\.?\d{2}\b/);
  const out: HsHit[] = [];
  if (direct) {
    const c = normalizeHs(direct[0]);
    const row = ds.find((d) => d.code === c);
    if (row) out.push({ code: formatHs(row.code), description: row.description, score: 1 });
  }
  const q = new Set<string>();
  for (const t of tokens(query)) {
    q.add(t);
    for (const s of SYN[t] ?? []) q.add(stem(s));
  }
  if (q.size === 0) return out.slice(0, k);
  let total = 0;
  for (const t of q) total += w.get(t) ?? 1;
  const scored: HsHit[] = [];
  for (const d of ds) {
    let s = 0;
    for (const t of q) if (d.toks.has(t)) s += w.get(t) ?? 1;
    if (s === 0) continue;
    const coverage = s / total;
    const focus = s / (s + 0.15 * Math.max(0, d.len - 4) * 1.2);
    // Subheadings that exclude the product ("not assembled", "other than …") rank slightly lower unless the query asks for it.
    const negated = /\bnot\b|other than/i.test(d.description) && !/\bnot\b|other than/i.test(query) ? 0.92 : 1;
    scored.push({ code: formatHs(d.code), description: d.description, score: +(coverage * (0.6 + 0.4 * focus) * negated).toFixed(2) });
  }
  scored.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
  for (const h of scored) if (!out.some((o) => o.code === h.code)) out.push(h);
  return out.slice(0, k);
}

/* ───────────────────────── Ports ───────────────────────── */

export function resolvePort(query: string): (ResolvedCity & { found: true }) | { found: false; query: string } {
  const c = lookupCity(query);
  return c ? { ...c, found: true } : { found: false, query };
}

/* ───────────────────────── Compliance red-flag screen ───────────────────────── */

const REVIEW_JURISDICTIONS = ["iran", "north korea", "dprk", "syria", "cuba", "russia", "belarus", "crimea", "donetsk", "luhansk", "myanmar", "venezuela", "sudan"];
const CONTROLLED_PREFIXES: { prefix: string; why: string }[] = [
  { prefix: "93", why: "Arms and ammunition (HS chapter 93): export/import licence required" },
  { prefix: "3601", why: "Propellent powders: explosives licensing" },
  { prefix: "3602", why: "Prepared explosives: explosives licensing" },
  { prefix: "2844", why: "Radioactive elements: nuclear licensing" },
  { prefix: "8802", why: "Aircraft including drones: end-use and export-control review" },
  { prefix: "8526", why: "Radar and radio navigation equipment: dual-use review" },
];
const LITHIUM_BATTERY_CODES = ["850760", "850750", "850780", "851713", "847130"];

export type ScreenResult = {
  verdict: "no_red_flags" | "review_required";
  flags: string[];
  dangerousGoods: string | null;
  disclaimer: string;
};

/** A red-flag screen against a bundled indicative list. It is not legal clearance and not an OFAC/UN list lookup. */
export function screenCompliance(f: Pick<CargoForm, "origin" | "destination" | "cargoType">, hsCode: string): ScreenResult {
  const flags: string[] = [];
  const hay = `${f.origin} ${f.destination}`.toLowerCase();
  for (const j of REVIEW_JURISDICTIONS) if (hay.includes(j)) flags.push(`Jurisdiction "${j}" commonly triggers enhanced sanctions review`);
  const c = normalizeHs(hsCode);
  for (const r of CONTROLLED_PREFIXES) if (c.startsWith(r.prefix)) flags.push(r.why);
  const dangerousGoods = LITHIUM_BATTERY_CODES.includes(c)
    ? "Lithium batteries (UN3480/UN3481/UN3090/UN3091): dangerous-goods paperwork and IATA packing instructions apply for air freight"
    : null;
  return {
    verdict: flags.length ? "review_required" : "no_red_flags",
    flags,
    dangerousGoods,
    disclaimer: "Indicative red-flag screen against a small bundled list. Not a substitute for screening against official OFAC, EU, UN and UAE lists.",
  };
}

/* ───────────────────────── Duties, VAT, landed cost ───────────────────────── */

type Bloc = { bloc: string; bands: number[] };
const ECOWAS: Bloc = { bloc: "ECOWAS Common External Tariff", bands: [0, 5, 10, 20, 35] };
const CEMAC: Bloc = { bloc: "CEMAC external tariff", bands: [0, 5, 10, 20, 30] };
const EAC: Bloc = { bloc: "EAC Common External Tariff", bands: [0, 10, 25, 35] };
const GCC: Bloc = { bloc: "GCC Common Customs Tariff", bands: [0, 5] };
const BLOC: Record<string, Bloc> = {
  Benin: ECOWAS, Nigeria: ECOWAS, Ghana: ECOWAS, "Côte d'Ivoire": ECOWAS, Senegal: ECOWAS, Togo: ECOWAS,
  Cameroon: CEMAC, Angola: { bloc: "national tariff", bands: [] },
  Kenya: EAC, Tanzania: EAC,
  UAE: GCC, "Saudi Arabia": GCC,
};
/** Standard VAT rates (indicative, as of the last update of this table: verify with the national tax authority). */
const VAT_BY_COUNTRY: Record<string, number> = {
  UAE: 5, "Saudi Arabia": 15, Benin: 18, Nigeria: 7.5, Ghana: 15, "Côte d'Ivoire": 18, Senegal: 18, Togo: 18, Cameroon: 19.25,
  Kenya: 16, Tanzania: 18, "South Africa": 15, Morocco: 20, Egypt: 14, Mozambique: 16,
};

const VAT_FALLBACK = { AF: 18, ME: 5, EU: 19, AS: 13, AM: 10 } as const;
export function vatFor(country: string, region: "AF" | "ME" | "EU" | "AS" | "AM"): { rate: number; label: string } {
  const known = VAT_BY_COUNTRY[country];
  return { rate: known ?? VAT_FALLBACK[region], label: known === undefined ? "VAT (regional default, assumed)" : "VAT" };
}

export type DutyAssessment = { rate: number; snapped: boolean; bloc: string | null; bands: number[]; note: string };

/** Checks the duty rate proposed by the agent against the legal bands of the destination customs union. */
export function checkDutyRate(country: string, proposed: number): DutyAssessment {
  const b = BLOC[country];
  const p = Math.max(0, Math.min(100, Number.isFinite(proposed) ? proposed : 0));
  if (!b || b.bands.length === 0) return { rate: p, snapped: false, bloc: b?.bloc ?? null, bands: [], note: `No band table for ${country}: rate taken as proposed (${p}%), verify with a customs broker` };
  const nearest = b.bands.reduce((best, x) => (Math.abs(x - p) < Math.abs(best - p) ? x : best), b.bands[0]!);
  const snapped = nearest !== p;
  return { rate: nearest, snapped, bloc: b.bloc, bands: b.bands, note: snapped ? `${p}% is not a ${b.bloc} band; snapped to ${nearest}%` : `${p}% is a valid ${b.bloc} band` };
}

export type LandedCost = {
  cif: number;
  lines: { label: string; rate: string; amount: number }[];
  totalTaxesAndFees: number;
  totalLanded: number;
  assumptions: string[];
};

export function estimateLanded(opts: { declaredValue: number; dutyRate: number; country: string; region: "AF" | "ME" | "EU" | "AS" | "AM" }): LandedCost {
  const cif = opts.declaredValue * 1.06;
  const duty = (cif * opts.dutyRate) / 100;
  const vatRate = vatFor(opts.country, opts.region).rate;
  const vat = ((cif + duty) * vatRate) / 100;
  const port = opts.region === "AF" ? 2850 : 1420;
  const lines = [
    { label: `Import duty (${opts.country})`, rate: `${opts.dutyRate}%`, amount: Math.round(duty) },
    { label: `VAT — ${opts.country}`, rate: `${vatRate}%`, amount: Math.round(vat) },
    { label: "Port & terminal handling (assumed)", rate: "flat", amount: port },
    { label: "Dhow automated brokerage (assumed)", rate: "flat", amount: 180 },
  ];
  const totalTaxesAndFees = lines.reduce((s, l) => s + l.amount, 0);
  return {
    cif: Math.round(cif),
    lines,
    totalTaxesAndFees,
    totalLanded: Math.round(cif + totalTaxesAndFees),
    assumptions: ["CIF = declared value × 1.06 (freight and insurance assumed at 6%)", "Port/terminal and brokerage amounts are flat model assumptions"],
  };
}

/* ───────────────────────── Route and chokepoint model ───────────────────────── */

export function chokepoints(o: ResolvedCity, d: ResolvedCity, hub: ResolvedCity): string[] {
  const out: string[] = [];
  const asia = o.region === "AS" || d.region === "AS";
  const southEastAsia = ["Malaysia", "Singapore", "Vietnam", "Thailand", "Indonesia", "China", "Hong Kong", "South Korea", "Japan"].includes(o.country);
  if (southEastAsia && asia) out.push("Strait of Malacca / Singapore (typical for East Asia to the Gulf)");
  if (hub.country === "UAE" && hub.code !== "AEKLF" && hub.code !== "AEFJR") out.push("Strait of Hormuz (Jebel Ali and Dubai ports are inside the Gulf)");
  const redSeaCountries = ["Benin", "Nigeria", "Ghana", "Togo", "Côte d'Ivoire", "Senegal", "Cameroon", "Morocco", "Egypt"];
  const viaSuezOrCape = (c: ResolvedCity) => c.region === "EU" || c.region === "AM" || redSeaCountries.includes(c.country);
  if (viaSuezOrCape(o) || viaSuezOrCape(d)) out.push("Red Sea / Bab-el-Mandeb and Suez, or the longer Cape of Good Hope detour");
  return out;
}

/** Live wave heights (metres) at the three chokepoints, from Open-Meteo Marine. `live` is false when the API did not answer. */
export type SeaState = { live: boolean; fetchedAt: string; waves: { hormuz: number; bab_el_mandeb: number; malacca: number } };

const CHOKE_ID: { match: string; id: keyof SeaState["waves"]; label: string }[] = [
  { match: "Malacca", id: "malacca", label: "Malacca" },
  { match: "Hormuz", id: "hormuz", label: "Hormuz" },
  { match: "Red Sea", id: "bab_el_mandeb", label: "Bab-el-Mandeb" },
];

export function estimateRoutes(f: CargoForm, hubName?: string, sea?: SeaState) {
  const o = lookupCity(f.origin);
  const d = lookupCity(f.destination);
  if (!o || !d) return { ok: false as const, unknown: [!o ? f.origin : null, !d ? f.destination : null].filter(Boolean) as string[] };
  const hubCity = hubName ? lookupCity(hubName) : null;
  const m = routeModel(f, o, d, hubCity ?? undefined);
  const exposure = chokepoints(o, d, m.hub);
  const exposed = CHOKE_ID.filter((c) => exposure.some((e) => e.includes(c.match)));
  const useLive = !!sea && sea.live && exposed.length > 0;
  // Weather index: with live data it grows with the wave height measured at each exposed chokepoint; otherwise it is a geography heuristic.
  const weather = useLive
    ? Math.min(80, Math.round(10 + exposed.reduce((sum, c) => sum + sea!.waves[c.id] * 14, 0)))
    : Math.min(60, 15 + exposure.length * 4);
  const waveText = useLive ? ` Live wave heights (Open-Meteo Marine, ${sea!.fetchedAt.slice(0, 16).replace("T", " ")} UTC): ${exposed.map((c) => `${c.label} ${sea!.waves[c.id].toFixed(1)} m`).join(", ")}.` : "";
  const risk = {
    congestion: Math.min(80, 15 + (d.region === "AF" ? 20 : 5) + exposure.length * 5),
    customs: d.region === "AF" ? 30 : 12,
    weather,
    briefing: (exposure.length
      ? `Exposure: ${exposure.join("; ")}.${waveText} Congestion and customs indices are heuristic scores from route geography, not live port data.`
      : "No major chokepoint on the modelled path. Indices are heuristic scores from route geography, not live port data.") + (useLive ? "" : " Weather index is a heuristic (no live sea data used)."),
  };
  return { ok: true as const, hub: m.hub, distanceKm: Math.round(m.km), options: m.options as PlanOption[], exposure, risk };
}
