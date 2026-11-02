/**
 * Sourced reference prices for primary commodities.
 * Source: IMF Primary Commodity Prices, monthly, published through FRED (https://fred.stlouisfed.org/series/<ID>).
 * A reference price is only a benchmark to sanity-check an invoice or to estimate a value when none is entered.
 * It is NOT a transaction value: customs use the invoice (transaction) value.
 */

export type RefSeries = { id: string; label: string; hs: string[] };

/** HS-2022 prefixes mapped to the matching monthly series. Anything not listed has no reference price. */
export const REF_SERIES: RefSeries[] = [
  { id: "PBANSOPUSDM", label: "Bananas", hs: ["0803"] },
  { id: "PCOFFOTMUSDM", label: "Coffee (Arabica, unroasted)", hs: ["090111", "090112"] },
  { id: "PCOCOUSDM", label: "Cocoa beans", hs: ["1801"] },
  { id: "PCOTTINDUSDM", label: "Cotton (not carded or combed)", hs: ["5201"] },
  { id: "PCOPPUSDM", label: "Copper (refined)", hs: ["740311"] },
  { id: "PALUMUSDM", label: "Aluminium (unwrought)", hs: ["7601"] },
  { id: "PWHEAMTUSDM", label: "Wheat", hs: ["1001"] },
  { id: "PMAIZMTUSDM", label: "Maize (corn)", hs: ["1005"] },
  { id: "PRICENPQUSDM", label: "Rice", hs: ["1006"] },
  { id: "PSUGAISAUSDM", label: "Sugar (raw)", hs: ["1701"] },
];

export const REFERENCE_COMMODITIES = REF_SERIES.map((s) => s.label.split(" (")[0]!.toLowerCase());

export function seriesForHs(hsCode: string): RefSeries | null {
  const c = hsCode.replace(/[^0-9]/g, "");
  return REF_SERIES.find((s) => s.hs.some((p) => c.startsWith(p))) ?? null;
}

export type ParsedSeries = { title: string | null; units: string | null; date: string; value: number };

/** Parses the plain-text download of a FRED series (header lines, then "DATE VALUE" rows). Returns the latest numeric row. */
export function parseFredTxt(txt: string): ParsedSeries | null {
  const title = /^Title:\s*(.+)$/m.exec(txt)?.[1]?.trim() ?? null;
  const units = /^Units:\s*(.+)$/m.exec(txt)?.[1]?.trim() ?? null;
  let last: { date: string; value: number } | null = null;
  for (const m of txt.matchAll(/^(\d{4}-\d{2}-\d{2})\s+(-?\d+(?:\.\d+)?)\s*$/gm)) {
    last = { date: m[1]!, value: Number(m[2]) };
  }
  return last ? { title, units, ...last } : null;
}

/** Converts the series value to US dollars per metric ton. Unknown units return null: no silent guess. */
export function toUsdPerTonne(value: number, units: string | null): number | null {
  const u = (units ?? "").toLowerCase();
  if (u.includes("dollars per metric ton")) return value;
  if (u.includes("cents per pound")) return (value / 100) * 2204.62262;
  return null;
}

export type RefPrice = { seriesId: string; label: string; title: string; usdPerTonne: number; asOf: string; url: string };

const cache = new Map<string, { at: number; v: RefPrice | null }>();
const TTL = 12 * 3600 * 1000;

/** Parses the CSV download of a FRED series ("observation_date,ID" then "YYYY-MM-DD,value"). Returns the latest numeric row. */
export function parseFredCsv(csv: string): { date: string; value: number } | null {
  let last: { date: string; value: number } | null = null;
  for (const m of csv.matchAll(/^(\d{4}-\d{2}-\d{2}),(-?\d+(?:\.\d+)?)\s*$/gm)) {
    last = { date: m[1]!, value: Number(m[2]) };
  }
  return last;
}

/** Units checked by hand on the FRED series page; the CSV download carries no units, so only these series may use it. */
const CSV_UNITS: Record<string, string> = { PBANSOPUSDM: "U.S. Dollars per Metric Ton" };

const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; DhowTradeNavigator/1.0)", Accept: "text/plain,text/csv,*/*" };

async function get(url: string, why: string[]): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (!res.ok) { why.push(`HTTP ${res.status}`); return null; }
    return await res.text();
  } catch (e) {
    why.push(e instanceof Error ? e.name : "network error");
    return null;
  }
}

/** Like fetchReferencePrice, but also says why nothing was returned (shown to the user instead of a silent failure). */
export async function fetchReferencePriceDiag(series: RefSeries): Promise<{ ref: RefPrice | null; why: string | null }> {
  const hit = cache.get(series.id);
  if (hit && Date.now() - hit.at < TTL) return { ref: hit.v, why: null };
  const why: string[] = [];
  const page = `https://fred.stlouisfed.org/series/${series.id}`;
  let v: RefPrice | null = null;

  const txt = await get(`https://fred.stlouisfed.org/data/${series.id}.txt`, why);
  if (txt) {
    const p = parseFredTxt(txt);
    const perTonne = p ? toUsdPerTonne(p.value, p.units) : null;
    if (p && perTonne && perTonne > 0) v = { seriesId: series.id, label: series.label, title: p.title ?? series.label, usdPerTonne: perTonne, asOf: p.date, url: page };
    else why.push("unexpected file format or units");
  }

  const csvUnits = CSV_UNITS[series.id];
  if (!v && csvUnits) {
    const csv = await get(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${series.id}`, why);
    const p = csv ? parseFredCsv(csv) : null;
    const perTonne = p ? toUsdPerTonne(p.value, csvUnits) : null;
    if (p && perTonne && perTonne > 0) v = { seriesId: series.id, label: series.label, title: series.label, usdPerTonne: perTonne, asOf: p.date, url: page };
    else if (csv) why.push("unexpected CSV format");
  }

  if (v) cache.set(series.id, { at: Date.now(), v });
  return { ref: v, why: v ? null : why.join(", ") || "no data" };
}

/** Fetches the latest monthly price of a series (server side). Returns null if the source is unreachable or its format is unexpected. */
export async function fetchReferencePrice(series: RefSeries): Promise<RefPrice | null> {
  return (await fetchReferencePriceDiag(series)).ref;
}

export type Valuation = {
  basis: "entered" | "reference";
  valueUsd: number;
  /** "low" when the entered value is under half of the reference, "high" when above 2.5 times. */
  flag: "low" | "high" | null;
  note: string;
  reference?: { label: string; title: string; usdPerTonne: number; asOf: string; url: string; impliedUsd: number };
};

/** Compares an entered value with the reference price, or builds the estimate when no value was entered. */
export function buildValuation(opts: { enteredUsd: number; tonnes: number; ref: RefPrice | null }): Valuation | null {
  const { enteredUsd, tonnes, ref } = opts;
  if (!ref) return null;
  const implied = Math.round(ref.usdPerTonne * tonnes);
  const reference = { label: ref.label, title: ref.title, usdPerTonne: Math.round(ref.usdPerTonne), asOf: ref.asOf, url: ref.url, impliedUsd: implied };
  if (enteredUsd <= 0) {
    return { basis: "reference", valueUsd: implied, flag: null, reference, note: `No invoice value entered: estimated at ${tonnes} t \u00D7 $${reference.usdPerTonne.toLocaleString("en-US")}/t (${ref.title}, IMF via FRED, ${ref.asOf}). Customs use the invoice value, so replace this with your real one.` };
  }
  const ratio = enteredUsd / implied;
  const flag = ratio < 0.5 ? "low" : ratio > 2.5 ? "high" : null;
  const pct = Math.round(ratio * 100);
  const note =
    flag === "low"
      ? `Declared value is ${pct}% of the reference benchmark (${ref.title}, ${ref.asOf}). Customs may question a value this far below market (under-invoicing risk): check the invoice.`
      : flag === "high"
        ? `Declared value is ${pct}% of the reference benchmark (${ref.title}, ${ref.asOf}). Check the invoice: a value this far above market can also trigger a customs review.`
        : `Declared value is ${pct}% of the reference benchmark (${ref.title}, ${ref.asOf}): consistent with the market.`;
  return { basis: "entered", valueUsd: enteredUsd, flag, reference, note };
}
