import { classifyHS, type CargoForm } from "./dhow-data";
import type { ComplianceSummary, TraceEvent } from "./agent/types";

export type Region = "AF" | "ME" | "EU" | "AS" | "AM";
export type GeoPoint = { name: string; lat: number; lng: number; role: "origin" | "hub" | "destination" };
export type PlanOption = { key: "A" | "B" | "C"; name: string; via: string; days: number; cost: number; co2: number; reliability: number };
export type TariffLine = { label: string; rate: string; amount: number };
export type TradeDoc = {
  kind: "invoice" | "packing" | "bl";
  title: string;
  reference: string;
  incoterms: string;
  parties: { role: string; name: string; address: string }[];
  meta: { label: string; value: string }[];
  columns: string[];
  rows: string[][];
  totals: { label: string; value: string }[];
  marks: string;
};
export type Plan = {
  reasoningSteps: string[];
  corridor: string;
  waypoints: GeoPoint[];
  options: PlanOption[];
  customs: { hsCode: string; description: string; confidence: number; tariffs: TariffLine[]; totalLanded: number };
  risks: { congestion: number; customs: number; weather: number; briefing: string };
  documents: TradeDoc[];
  /** Real tool calls made by the agent (present when the plan came from the tool pipeline or the AI loop). */
  trace?: TraceEvent[];
  compliance?: ComplianceSummary;
};
export type PlanSource = "ai" | "tools" | "simulated" | "preset";

type City = { lat: number; lng: number; region: Region; country: string; code: string };
const GEO: Record<string, City> = {
  ningbo: { lat: 29.87, lng: 121.55, region: "AS", country: "China", code: "CNNGB" },
  shanghai: { lat: 31.23, lng: 121.47, region: "AS", country: "China", code: "CNSHA" },
  shenzhen: { lat: 22.54, lng: 114.06, region: "AS", country: "China", code: "CNSZX" },
  "hong kong": { lat: 22.3, lng: 114.17, region: "AS", country: "Hong Kong", code: "HKHKG" },
  singapore: { lat: 1.26, lng: 103.82, region: "AS", country: "Singapore", code: "SGSIN" },
  mumbai: { lat: 18.95, lng: 72.84, region: "AS", country: "India", code: "INNSA" },
  busan: { lat: 35.1, lng: 129.04, region: "AS", country: "South Korea", code: "KRPUS" },
  tokyo: { lat: 35.62, lng: 139.77, region: "AS", country: "Japan", code: "JPTYO" },
  "jebel ali": { lat: 25.01, lng: 55.06, region: "ME", country: "UAE", code: "AEJEA" },
  dubai: { lat: 25.2, lng: 55.27, region: "ME", country: "UAE", code: "AEDXB" },
  "dubai logistics city": { lat: 24.9, lng: 55.16, region: "ME", country: "UAE", code: "AEDWC" },
  jeddah: { lat: 21.48, lng: 39.17, region: "ME", country: "Saudi Arabia", code: "SAJED" },
  cotonou: { lat: 6.35, lng: 2.43, region: "AF", country: "Benin", code: "BJCOO" },
  lagos: { lat: 6.44, lng: 3.39, region: "AF", country: "Nigeria", code: "NGAPP" },
  tema: { lat: 5.63, lng: 0.02, region: "AF", country: "Ghana", code: "GHTEM" },
  mombasa: { lat: -4.06, lng: 39.67, region: "AF", country: "Kenya", code: "KEMBA" },
  douala: { lat: 4.05, lng: 9.7, region: "AF", country: "Cameroon", code: "CMDLA" },
  abidjan: { lat: 5.3, lng: -4.01, region: "AF", country: "Côte d'Ivoire", code: "CIABJ" },
  dakar: { lat: 14.69, lng: -17.44, region: "AF", country: "Senegal", code: "SNDKR" },
  durban: { lat: -29.87, lng: 31.03, region: "AF", country: "South Africa", code: "ZADUR" },
  johannesburg: { lat: -26.2, lng: 28.05, region: "AF", country: "South Africa", code: "ZAJNB" },
  "dar es salaam": { lat: -6.82, lng: 39.29, region: "AF", country: "Tanzania", code: "TZDAR" },
  casablanca: { lat: 33.6, lng: -7.62, region: "AF", country: "Morocco", code: "MACAS" },
  rotterdam: { lat: 51.95, lng: 4.14, region: "EU", country: "Netherlands", code: "NLRTM" },
  antwerp: { lat: 51.26, lng: 4.4, region: "EU", country: "Belgium", code: "BEANR" },
  hamburg: { lat: 53.54, lng: 9.98, region: "EU", country: "Germany", code: "DEHAM" },
  frankfurt: { lat: 50.11, lng: 8.68, region: "EU", country: "Germany", code: "DEFRA" },
  paris: { lat: 48.86, lng: 2.35, region: "EU", country: "France", code: "FRPAR" },
  "le havre": { lat: 49.49, lng: 0.11, region: "EU", country: "France", code: "FRLEH" },
  london: { lat: 51.51, lng: -0.13, region: "EU", country: "United Kingdom", code: "GBLON" },
  "new york": { lat: 40.67, lng: -74.04, region: "AM", country: "USA", code: "USNYC" },
  "los angeles": { lat: 33.74, lng: -118.26, region: "AM", country: "USA", code: "USLAX" },
  miami: { lat: 25.77, lng: -80.17, region: "AM", country: "USA", code: "USMIA" },
  "são paulo": { lat: -23.55, lng: -46.63, region: "AM", country: "Brazil", code: "BRSAO" },
  "sao paulo": { lat: -23.55, lng: -46.63, region: "AM", country: "Brazil", code: "BRSAO" },
  santos: { lat: -23.96, lng: -46.33, region: "AM", country: "Brazil", code: "BRSSZ" },
  qingdao: { lat: 36.07, lng: 120.32, region: "AS", country: "China", code: "CNTAO" },
  guangzhou: { lat: 23.1, lng: 113.5, region: "AS", country: "China", code: "CNCAN" },
  tianjin: { lat: 39.0, lng: 117.7, region: "AS", country: "China", code: "CNTXG" },
  "ho chi minh": { lat: 10.77, lng: 106.7, region: "AS", country: "Vietnam", code: "VNSGN" },
  "port klang": { lat: 3.0, lng: 101.39, region: "AS", country: "Malaysia", code: "MYPKG" },
  jakarta: { lat: -6.1, lng: 106.88, region: "AS", country: "Indonesia", code: "IDJKT" },
  "laem chabang": { lat: 13.08, lng: 100.88, region: "AS", country: "Thailand", code: "THLCH" },
  mundra: { lat: 22.74, lng: 69.7, region: "AS", country: "India", code: "INMUN" },
  colombo: { lat: 6.95, lng: 79.85, region: "AS", country: "Sri Lanka", code: "LKCMB" },
  karachi: { lat: 24.84, lng: 66.98, region: "AS", country: "Pakistan", code: "PKKHI" },
  chittagong: { lat: 22.31, lng: 91.8, region: "AS", country: "Bangladesh", code: "BDCGP" },
  "khor fakkan": { lat: 25.35, lng: 56.36, region: "ME", country: "UAE", code: "AEKLF" },
  fujairah: { lat: 25.17, lng: 56.36, region: "ME", country: "UAE", code: "AEFJR" },
  "abu dhabi": { lat: 24.8, lng: 54.65, region: "ME", country: "UAE", code: "AEAUH" },
  sharjah: { lat: 25.36, lng: 55.38, region: "ME", country: "UAE", code: "AESHJ" },
  dammam: { lat: 26.5, lng: 50.2, region: "ME", country: "Saudi Arabia", code: "SADMM" },
  djibouti: { lat: 11.6, lng: 43.15, region: "AF", country: "Djibouti", code: "DJJIB" },
  alexandria: { lat: 31.2, lng: 29.88, region: "AF", country: "Egypt", code: "EGALY" },
  "port said": { lat: 31.26, lng: 32.3, region: "AF", country: "Egypt", code: "EGPSD" },
  "tanger med": { lat: 35.89, lng: -5.5, region: "AF", country: "Morocco", code: "MAPTM" },
  lome: { lat: 6.13, lng: 1.21, region: "AF", country: "Togo", code: "TGLFW" },
  "lomé": { lat: 6.13, lng: 1.21, region: "AF", country: "Togo", code: "TGLFW" },
  luanda: { lat: -8.8, lng: 13.24, region: "AF", country: "Angola", code: "AOLAD" },
  maputo: { lat: -25.97, lng: 32.57, region: "AF", country: "Mozambique", code: "MZMPM" },
  istanbul: { lat: 41.0, lng: 28.98, region: "EU", country: "Turkey", code: "TRIST" },
  piraeus: { lat: 37.94, lng: 23.64, region: "EU", country: "Greece", code: "GRPIR" },
  valencia: { lat: 39.45, lng: -0.32, region: "EU", country: "Spain", code: "ESVLC" },
  algeciras: { lat: 36.13, lng: -5.44, region: "EU", country: "Spain", code: "ESALG" },
  genoa: { lat: 44.4, lng: 8.92, region: "EU", country: "Italy", code: "ITGOA" },
  felixstowe: { lat: 51.96, lng: 1.35, region: "EU", country: "United Kingdom", code: "GBFXT" },
};

export function lookupCity(q: string): (City & { name: string }) | null {
  const s = q.toLowerCase();
  const key = Object.keys(GEO).sort((a, b) => b.length - a.length).find((k) => s.includes(k));
  return key ? { ...GEO[key]!, name: q.split(",")[0]!.trim() } : null;
}

const VAT: Record<Region, [number, string]> = { AF: [18, "VAT / TVA"], ME: [5, "UAE / GCC VAT"], EU: [19, "EU import VAT"], AS: [13, "Import VAT"], AM: [10, "Sales / import tax"] };
const DUTY: Record<Region, number> = { AF: 10, ME: 5, EU: 4, AS: 6, AM: 5 };

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const d = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(d));
}

export type ResolvedCity = City & { name: string };

/** Distance-based route model shared by the local simulator and the agent's `estimate_routes` tool. These are model estimates, not carrier quotes. */
export function routeModel(f: CargoForm, o: ResolvedCity, d: ResolvedCity, hubOverride?: ResolvedCity) {
  const hubKey = d.region === "ME" || o.region === "ME" ? "jebel ali" : o.region === "AM" || d.region === "AM" ? "rotterdam" : "jebel ali";
  const hub: ResolvedCity = hubOverride ?? { ...GEO[hubKey]!, name: hubKey === "jebel ali" ? "Jebel Ali" : "Rotterdam" };
  const km = distanceKm(o, hub) + distanceKm(hub, d);
  const k = Math.max(0.5, km / 9000);
  const teu = Math.max(1, Math.ceil(f.volume / 33));
  const chargeable = Math.max(f.weight * 1000, f.volume * 167);
  const options: PlanOption[] = [
    { key: "A", name: "Fastest — Sea-Air / Direct Air", via: `${hub.name} air hub`, days: Math.max(3, Math.round(5 * k)), cost: Math.round(chargeable * 1.9 * k), co2: +(chargeable * 0.0016 * k).toFixed(1), reliability: 91 },
    { key: "B", name: "Cost-Effective — Ocean FCL", via: `Direct ocean / ${hub.name}`, days: Math.round(22 * k), cost: Math.round(teu * 2300 * k), co2: +(f.weight * 0.1 * k).toFixed(1), reliability: 78 },
    { key: "C", name: "Dhow AI Optimized Multimodal", via: `${hub.name} transshipment → priority feeder`, days: Math.round(15 * k), cost: Math.round(teu * 2300 * k * 1.14), co2: +(f.weight * 0.12 * k).toFixed(1), reliability: 94 },
  ];
  return { hub, km, teu, options };
}

/** Overrides produced by the agent's tools; when present they replace the built-in guesses. */
export type PlanOverrides = {
  hs?: { code: string; description: string; confidence: number };
  dutyRate?: number;
  dutyLabel?: string;
  vat?: { rate: number; label: string };
  hub?: ResolvedCity;
  risks?: Plan["risks"];
};

/** Deterministic local plan: used for the preset demos and whenever the AI call is unavailable. */
export function simulatePlan(f: CargoForm, presetSteps?: string[], hsQuery?: string, ov: PlanOverrides = {}): Plan {
  const o = lookupCity(f.origin) ?? { ...GEO["shanghai"]!, name: f.origin.split(",")[0]!.trim() || "Origin" };
  const d = lookupCity(f.destination) ?? { ...GEO["cotonou"]!, name: f.destination.split(",")[0]!.trim() || "Destination" };
  const { hub, km, options } = routeModel(f, o, d, ov.hub);
  const hs = ov.hs ? undefined : classifyHS(`${hsQuery ?? ""} ${f.cargoType}`)[0];
  const hsCode = ov.hs?.code ?? hs?.code ?? "8479.89";
  const description = ov.hs?.description ?? hs?.description ?? `${f.cargoType} (machines n.e.s.)`;
  const confidence = ov.hs ? ov.hs.confidence : hs ? +hs.confidence.toFixed(1) : 72.4;
  const value = f.declaredValue;
  const [defVatRate, defVatLabel] = VAT[d.region];
  const vatRate = ov.vat?.rate ?? defVatRate;
  const vatLabel = ov.vat?.label ?? defVatLabel;
  const dutyRate = ov.dutyRate ?? (hs ? (d.region === "AF" ? hs.dutyAfrica : hs.dutyAE) : DUTY[d.region]);
  const cif = value * 1.06;
  const duty = (cif * dutyRate) / 100;
  const tariffs: TariffLine[] = [
    { label: `Import duty (${d.country})${ov.dutyLabel ? ` — ${ov.dutyLabel}` : ""}`, rate: `${dutyRate}%`, amount: Math.round(duty) },
    { label: `${vatLabel} — ${d.country}`, rate: `${vatRate}%`, amount: Math.round(((cif + duty) * vatRate) / 100) },
    { label: "Port & terminal handling (assumed)", rate: "flat", amount: d.region === "AF" ? 2850 : 1420 },
    { label: "Dhow automated brokerage (assumed)", rate: "flat", amount: 180 },
  ];
  const ref = `DH-${o.code.slice(2)}${d.code.slice(2)}-${new Date().getFullYear()}-${(hash(f.origin + f.destination + f.cargoType) % 9000) + 1000}`;
  const pkgs = Math.max(1, Math.ceil(f.volume * 9));
  const containers = Array.from({ length: Math.max(1, Math.ceil(f.volume / 66)) }, (_, i) => `Container ${i + 1} (no. to be assigned)`);
  const parties = [
    { role: "Shipper / Exporter", name: "[Shipper name — to be completed]", address: `${o.name}, ${o.country}` },
    { role: "Consignee / Importer", name: "[Consignee name — to be completed]", address: `${d.name}, ${d.country}` },
    { role: "Notify Party", name: "[Notify party — to be completed]", address: "[Address — to be completed]" },
  ];
  const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const docs: TradeDoc[] = [
    {
      kind: "invoice", title: "Commercial Invoice", reference: `${ref}-CI`, incoterms: `CIF ${d.name} (Incoterms® 2020)`, parties,
      meta: [{ label: "Payment terms", value: "To be agreed between the parties" }, { label: "Country of origin", value: o.country }, { label: "Currency", value: "USD" }],
      columns: ["HS Code", "Description", "Qty", "Amount"],
      rows: [[hsCode, description, `${pkgs} pkgs`, money(value)], ["—", "Ocean freight & insurance", "1 lot", money(value * 0.06)]],
      totals: [{ label: "FOB value", value: money(value) }, { label: "Total CIF value", value: money(cif) }],
      marks: `DHOW / ${hsCode} / ${d.code}`,
    },
    {
      kind: "packing", title: "Packing List", reference: `${ref}-PL`, incoterms: `CIF ${d.name} (Incoterms® 2020)`, parties,
      meta: [{ label: "Gross weight", value: `${(f.weight * 1000).toLocaleString("en-US")} kg` }, { label: "Net weight", value: `${Math.round(f.weight * 930).toLocaleString("en-US")} kg` }, { label: "Volume", value: `${f.volume} CBM` }],
      columns: ["Container", "Type", "Packages", "Gross kg"],
      rows: containers.map((c) => [c, "40' HC", String(Math.ceil(pkgs / containers.length)), Math.round((f.weight * 1000) / containers.length).toLocaleString("en-US")]),
      totals: [{ label: "Total packages", value: String(pkgs) }, { label: "Total gross weight", value: `${(f.weight * 1000).toLocaleString("en-US")} kg` }],
      marks: `DHOW / ${hsCode} / 1-UP`,
    },
    {
      kind: "bl", title: "Draft Bill of Lading", reference: `${ref}-BL`, incoterms: `CIF ${d.name} (Incoterms® 2020)`, parties,
      meta: [{ label: "Carrier", value: "To be booked" }, { label: "Vessel / Voyage", value: "To be confirmed at booking" }, { label: "Port of loading", value: `${o.name} (${o.code})` }, { label: "Transshipment", value: `${hub.name} (${hub.code})` }, { label: "Port of discharge", value: `${d.name} (${d.code})` }, { label: "Freight", value: "PREPAID" }],
      columns: ["Container / Seal", "Description of goods", "Gross kg", "CBM"],
      rows: containers.map((c, i) => [`${c} / seal to be assigned`, i === 0 ? `${f.cargoType} — HS ${hsCode}` : "Same as above", Math.round((f.weight * 1000) / containers.length).toLocaleString("en-US"), (f.volume / containers.length).toFixed(1)]),
      totals: [{ label: "Said to contain", value: `${pkgs} packages` }],
      marks: "DRAFT — NOT NEGOTIABLE — NOT SUBMITTED TO ANY AUTHORITY",
    },
  ];
  return {
    reasoningSteps: presetSteps ?? [
      `Parsing cargo request: ${f.cargoType}, ${f.weight}t / ${f.volume} CBM, declared ${money(value)}`,
      `Resolving corridor ${o.name} (${o.code}) → ${hub.name} → ${d.name} (${d.code}), ~${Math.round(km).toLocaleString("en-US")} km`,
      "Evaluating chokepoint risk: Suez, Bab-el-Mandeb / Red Sea, Malacca, Panama",
      "Matching carriers: Maersk, MSC, CMA CGM, Emirates SkyCargo block space",
      `Classified HS ${hsCode} — ${description} (confidence ${confidence}%)`,
      `Applying ${d.country} import duty ${dutyRate}% and ${vatLabel} ${vatRate}%`,
      "Generating Commercial Invoice, Packing List & draft Bill of Lading",
      `Optimal route locked: multimodal via ${hub.name} — reliability 94%`,
    ],
    corridor: `${o.name} → ${hub.name} → ${d.name}`,
    waypoints: [
      { name: `${o.name}, ${o.country}`, lat: o.lat, lng: o.lng, role: "origin" },
      { name: `${hub.name} Port`, lat: hub.lat, lng: hub.lng, role: "hub" },
      { name: `${d.name}, ${d.country}`, lat: d.lat, lng: d.lng, role: "destination" },
    ],
    options,
    customs: { hsCode, description, confidence, tariffs, totalLanded: tariffs.reduce((s, t) => s + t.amount, 0) },
    risks: ov.risks ?? {
      congestion: d.region === "AF" ? 41 : 22,
      customs: d.region === "AF" ? 34 : 12,
      weather: 27,
      briefing: `Red Sea routing remains elevated-risk; Dhow recommends consolidation at ${hub.name} with a priority feeder to ${d.name} to hedge berth congestion and customs dwell.`,
    },
    documents: docs,
  };
}
