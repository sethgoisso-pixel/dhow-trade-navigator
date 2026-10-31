export type CargoForm = {
  origin: string;
  destination: string;
  cargoType: string;
  weight: number;
  volume: number;
  declaredValue: number;
  deadline: string;
};

export type Scenario = {
  id: string;
  title: string;
  subtitle: string;
  hsQuery: string;
  value: number;
  units: string;
  form: CargoForm;
};

export const PORTS = [
  "Douala, Cameroon",
  "Frankfurt, Germany",
  "São Paulo, Brazil",
  "Rotterdam, Netherlands",
  "Ningbo, CN",
  "Shanghai, CN",
  "Shenzhen, CN",
  "Mumbai, IN",
  "Jebel Ali, AE",
  "Dubai Logistics City, AE",
  "Cotonou, BJ",
  "Lagos (Apapa), NG",
  "Mombasa, KE",
  "Tema, GH",
];

export const CARGO_TYPES = [
  "Solar Equipment",
  "Consumer Electronics",
  "Machinery",
  "Textiles",
  "Food & Perishables",
  "Construction Materials",
];

const inDays = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

export const SCENARIOS: Scenario[] = [
  {
    id: "solar",
    title: "500 kW Solar Farm Equipment",
    subtitle: "Ningbo → Jebel Ali → Cotonou",
    hsQuery: "solar panels",
    value: 312000,
    units: "1,250 PV modules + 8 inverters",
    form: {
      origin: "Ningbo, CN",
      destination: "Cotonou, BJ",
      cargoType: "Solar Equipment",
      weight: 38,
      volume: 132,
      declaredValue: 312000,
      deadline: inDays(32),
    },
  },
  {
    id: "electronics",
    title: "10,000 Consumer Electronics Units",
    subtitle: "Shenzhen → Dubai Logistics City",
    hsQuery: "smartphones",
    value: 1450000,
    units: "10,000 smartphones & tablets",
    form: {
      origin: "Shenzhen, CN",
      destination: "Dubai Logistics City, AE",
      cargoType: "Consumer Electronics",
      weight: 6.5,
      volume: 42,
      declaredValue: 1450000,
      deadline: inDays(9),
    },
  },
];

export type HSEntry = {
  code: string;
  description: string;
  keywords: string[];
  dutyAE: number;
  dutyAfrica: number;
};

export const HS_DB: HSEntry[] = [
  { code: "8541.43", description: "Photovoltaic cells assembled in modules or made up into panels", keywords: ["solar", "pv", "panel", "photovoltaic"], dutyAE: 0, dutyAfrica: 5 },
  { code: "8504.40", description: "Static converters (solar inverters)", keywords: ["inverter", "converter"], dutyAE: 5, dutyAfrica: 10 },
  { code: "8517.13", description: "Smartphones", keywords: ["smartphone", "phone", "mobile"], dutyAE: 5, dutyAfrica: 10 },
  { code: "8471.30", description: "Portable computers & tablets ≤10kg", keywords: ["laptop", "tablet", "computer"], dutyAE: 5, dutyAfrica: 5 },
  { code: "8507.60", description: "Lithium-ion accumulators", keywords: ["battery", "lithium", "accumulator"], dutyAE: 5, dutyAfrica: 20 },
  { code: "8429.52", description: "Excavators with 360° revolving superstructure", keywords: ["excavator", "machinery", "construction"], dutyAE: 5, dutyAfrica: 5 },
  { code: "5208.12", description: "Woven cotton fabrics, unbleached", keywords: ["cotton", "textile", "fabric"], dutyAE: 5, dutyAfrica: 20 },
  { code: "7214.20", description: "Steel reinforcing bars (rebar)", keywords: ["steel", "rebar", "bar"], dutyAE: 5, dutyAfrica: 10 },
  { code: "1006.30", description: "Semi- or wholly milled rice", keywords: ["rice", "food", "grain"], dutyAE: 0, dutyAfrica: 10 },
];

export function classifyHS(query: string) {
  const q = query.toLowerCase();
  return HS_DB.map((e) => {
    const hits = e.keywords.filter((k) => q.includes(k)).length + (q.includes(e.code) ? 3 : 0);
    const confidence = hits ? Math.min(99.4, 78 + hits * 9 + (e.code.charCodeAt(6) % 5)) : 0;
    return { ...e, confidence };
  })
    .filter((e) => e.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);
}

export const isAfrica = (dest: string) => /BJ|NG|KE|GH/.test(dest);

export function dutyBreakdown(entry: HSEntry, dest: string, cif: number) {
  const africa = isAfrica(dest);
  const dutyRate = africa ? entry.dutyAfrica : entry.dutyAE;
  const vatRate = africa ? 18 : 5;
  const duty = (cif * dutyRate) / 100;
  const vat = ((cif + duty) * vatRate) / 100;
  const port = africa ? 2850 : 1420;
  const other = africa ? cif * 0.01 : 0; // ECOWAS community levy
  return [
    { label: "Import duty", rate: `${dutyRate}%`, amount: duty },
    { label: africa ? "VAT (Benin TVA)" : "UAE VAT", rate: `${vatRate}%`, amount: vat },
    ...(africa ? [{ label: "ECOWAS community levy", rate: "1%", amount: other }] : []),
    { label: "Port & terminal handling", rate: "flat", amount: port },
    { label: "Dhow brokerage (automated)", rate: "flat", amount: 180 },
  ];
}

export type RouteOption = {
  key: "A" | "B" | "C";
  name: string;
  via: string;
  days: number;
  cost: number;
  co2: number;
  reliability: number;
};

export function optimize(f: CargoForm): { options: RouteOption[]; risk: { congestion: number; customs: number; weather: number } } {
  const africa = isAfrica(f.destination);
  const base = africa ? 1.6 : 1;
  const teu = Math.max(1, Math.ceil(f.volume / 33));
  const chargeable = Math.max(f.weight * 1000, f.volume * 167);
  const options: RouteOption[] = [
    { key: "A", name: "Fastest — Sea-Air", via: "Dubai World Central (DWC)", days: Math.round(5 * base), cost: Math.round(chargeable * 2.1 * base), co2: +(chargeable * 0.0018 * base).toFixed(1), reliability: 91 },
    { key: "B", name: "Cost-Effective — Ocean FCL", via: "Jebel Ali Port", days: Math.round(19 * base), cost: Math.round(teu * 2350 * base), co2: +(f.weight * 0.11 * base).toFixed(1), reliability: 78 },
    { key: "C", name: "Dhow AI Optimized Multimodal", via: "Jebel Ali → priority feeder", days: Math.round(13 * base), cost: Math.round(teu * 2350 * base * 1.14), co2: +(f.weight * 0.14 * base).toFixed(1), reliability: 94 },
  ];
  return {
    options,
    risk: { congestion: africa ? 41 : 22, customs: africa ? 34 : 12, weather: 27 },
  };
}

export const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
