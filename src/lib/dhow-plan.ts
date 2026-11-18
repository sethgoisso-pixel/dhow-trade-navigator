import { classifyHS, type CargoForm } from "./dhow-data";
import type { ComplianceSummary, TraceEvent } from "./agent/types";
import type { Valuation } from "./dhow-reference";

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
  /** How the cargo value was established (entered by the user, or estimated from a sourced reference price) and how it compares with the market benchmark. */
  valuation?: Valuation;
  /** Assumptions made because an input was left empty. */
  assumptions?: string[];
};
export type PlanSource = "ai" | "tools" | "simulated" | "preset";

type City = { lat: number; lng: number; region: Region; country: string; code: string; /** Never picked automatically as a transshipment hub (inland cities and smaller ports). Still fine as origin or destination. */ noHub?: boolean };
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
  bangkok: { lat: 13.70, lng: 100.57, region: "AS", country: "Thailand", code: "THBKK" },
  hanoi: { lat: 21.03, lng: 105.85, region: "AS", country: "Vietnam", code: "VNHAN" },
  "hai phong": { lat: 20.85, lng: 106.68, region: "AS", country: "Vietnam", code: "VNHPH" },
  "da nang": { lat: 16.08, lng: 108.22, region: "AS", country: "Vietnam", code: "VNDAD" },
  manila: { lat: 14.59, lng: 120.97, region: "AS", country: "Philippines", code: "PHMNL" },
  delhi: { lat: 28.61, lng: 77.21, region: "AS", country: "India", code: "INDEL" },
  chennai: { lat: 13.08, lng: 80.29, region: "AS", country: "India", code: "INMAA" },
  kolkata: { lat: 22.57, lng: 88.36, region: "AS", country: "India", code: "INCCU" },
  kochi: { lat: 9.97, lng: 76.27, region: "AS", country: "India", code: "INCOK" },
  dhaka: { lat: 23.81, lng: 90.41, region: "AS", country: "Bangladesh", code: "BDDAC" },
  penang: { lat: 5.41, lng: 100.34, region: "AS", country: "Malaysia", code: "MYPEN" },
  surabaya: { lat: -7.2, lng: 112.73, region: "AS", country: "Indonesia", code: "IDSUB" },
  yangon: { lat: 16.77, lng: 96.16, region: "AS", country: "Myanmar", code: "MMRGN" },
  kaohsiung: { lat: 22.61, lng: 120.3, region: "AS", country: "Taiwan", code: "TWKHH" },
  taipei: { lat: 25.13, lng: 121.74, region: "AS", country: "Taiwan", code: "TWTPE" },
  osaka: { lat: 34.65, lng: 135.43, region: "AS", country: "Japan", code: "JPOSA" },
  yokohama: { lat: 35.45, lng: 139.65, region: "AS", country: "Japan", code: "JPYOK" },
  incheon: { lat: 37.45, lng: 126.6, region: "AS", country: "South Korea", code: "KRINC" },
  seoul: { lat: 37.57, lng: 126.98, region: "AS", country: "South Korea", code: "KRSEL" },
  xiamen: { lat: 24.48, lng: 118.08, region: "AS", country: "China", code: "CNXMN" },
  dalian: { lat: 38.91, lng: 121.64, region: "AS", country: "China", code: "CNDLC" },
  beijing: { lat: 39.9, lng: 116.4, region: "AS", country: "China", code: "CNBJS" },
  chengdu: { lat: 30.57, lng: 104.07, region: "AS", country: "China", code: "CNCTU" },
  wuhan: { lat: 30.59, lng: 114.31, region: "AS", country: "China", code: "CNWUH" },
  yiwu: { lat: 29.31, lng: 120.08, region: "AS", country: "China", code: "CNYIW" },
  foshan: { lat: 23.02, lng: 113.12, region: "AS", country: "China", code: "CNFOS" },
  dongguan: { lat: 23.02, lng: 113.75, region: "AS", country: "China", code: "CNDGG" },
  mersin: { lat: 36.8, lng: 34.64, region: "EU", country: "Turkey", code: "TRMER" },
  izmir: { lat: 38.42, lng: 27.14, region: "EU", country: "Turkey", code: "TRIZM" },
  riyadh: { lat: 24.71, lng: 46.68, region: "ME", country: "Saudi Arabia", code: "SARUH" },
  doha: { lat: 25.29, lng: 51.53, region: "ME", country: "Qatar", code: "QADOH" },
  kuwait: { lat: 29.37, lng: 47.98, region: "ME", country: "Kuwait", code: "KWKWI" },
  muscat: { lat: 23.61, lng: 58.59, region: "ME", country: "Oman", code: "OMMCT" },
  salalah: { lat: 17.0, lng: 54.0, region: "ME", country: "Oman", code: "OMSLL" },
  sohar: { lat: 24.5, lng: 56.6, region: "ME", country: "Oman", code: "OMSOH" },
  manama: { lat: 26.23, lng: 50.58, region: "ME", country: "Bahrain", code: "BHBAH" },
  aqaba: { lat: 29.52, lng: 35.0, region: "ME", country: "Jordan", code: "JOAQJ" },
  amman: { lat: 31.95, lng: 35.93, region: "ME", country: "Jordan", code: "JOAMM" },
  beirut: { lat: 33.9, lng: 35.5, region: "ME", country: "Lebanon", code: "LBBEY" },
  accra: { lat: 5.56, lng: -0.2, region: "AF", country: "Ghana", code: "GHACC", noHub: true },
  takoradi: { lat: 4.89, lng: -1.75, region: "AF", country: "Ghana", code: "GHTKD", noHub: true },
  nairobi: { lat: -1.29, lng: 36.82, region: "AF", country: "Kenya", code: "KENBO", noHub: true },
  kampala: { lat: 0.35, lng: 32.58, region: "AF", country: "Uganda", code: "UGKLA", noHub: true },
  kigali: { lat: -1.95, lng: 30.06, region: "AF", country: "Rwanda", code: "RWKGL", noHub: true },
  "addis ababa": { lat: 9.03, lng: 38.74, region: "AF", country: "Ethiopia", code: "ETADD", noHub: true },
  kinshasa: { lat: -4.32, lng: 15.31, region: "AF", country: "DR Congo", code: "CDFIH", noHub: true },
  matadi: { lat: -5.82, lng: 13.45, region: "AF", country: "DR Congo", code: "CDMAT", noHub: true },
  lubumbashi: { lat: -11.66, lng: 27.48, region: "AF", country: "DR Congo", code: "CDFBM", noHub: true },
  "pointe-noire": { lat: -4.78, lng: 11.86, region: "AF", country: "Congo", code: "CGPNR", noHub: true },
  brazzaville: { lat: -4.27, lng: 15.28, region: "AF", country: "Congo", code: "CGBZV", noHub: true },
  libreville: { lat: 0.39, lng: 9.45, region: "AF", country: "Gabon", code: "GALBV", noHub: true },
  "port harcourt": { lat: 4.78, lng: 7.01, region: "AF", country: "Nigeria", code: "NGPHC", noHub: true },
  abuja: { lat: 9.06, lng: 7.49, region: "AF", country: "Nigeria", code: "NGABV", noHub: true },
  kano: { lat: 12.0, lng: 8.52, region: "AF", country: "Nigeria", code: "NGKAN", noHub: true },
  ouagadougou: { lat: 12.37, lng: -1.52, region: "AF", country: "Burkina Faso", code: "BFOUA", noHub: true },
  bamako: { lat: 12.64, lng: -8.0, region: "AF", country: "Mali", code: "MLBKO", noHub: true },
  niamey: { lat: 13.51, lng: 2.11, region: "AF", country: "Niger", code: "NENIM", noHub: true },
  conakry: { lat: 9.51, lng: -13.71, region: "AF", country: "Guinea", code: "GNCKY", noHub: true },
  freetown: { lat: 8.48, lng: -13.23, region: "AF", country: "Sierra Leone", code: "SLFNA", noHub: true },
  monrovia: { lat: 6.3, lng: -10.8, region: "AF", country: "Liberia", code: "LRMLW", noHub: true },
  banjul: { lat: 13.45, lng: -16.58, region: "AF", country: "Gambia", code: "GMBJL", noHub: true },
  nouakchott: { lat: 18.08, lng: -15.98, region: "AF", country: "Mauritania", code: "MRNKC", noHub: true },
  lusaka: { lat: -15.39, lng: 28.32, region: "AF", country: "Zambia", code: "ZMLUN", noHub: true },
  harare: { lat: -17.83, lng: 31.05, region: "AF", country: "Zimbabwe", code: "ZWHRE", noHub: true },
  "cape town": { lat: -33.92, lng: 18.42, region: "AF", country: "South Africa", code: "ZACPT", noHub: true },
  "port louis": { lat: -20.16, lng: 57.5, region: "AF", country: "Mauritius", code: "MUPLU", noHub: true },
  toamasina: { lat: -18.15, lng: 49.4, region: "AF", country: "Madagascar", code: "MGTMM", noHub: true },
  algiers: { lat: 36.77, lng: 3.06, region: "AF", country: "Algeria", code: "DZALG", noHub: true },
  tunis: { lat: 36.8, lng: 10.18, region: "AF", country: "Tunisia", code: "TNTUN", noHub: true },
  cairo: { lat: 30.04, lng: 31.24, region: "AF", country: "Egypt", code: "EGCAI", noHub: true },
  lobito: { lat: -12.35, lng: 13.54, region: "AF", country: "Angola", code: "AOLOB", noHub: true },
  "walvis bay": { lat: -22.95, lng: 14.5, region: "AF", country: "Namibia", code: "NAWVB", noHub: true },
  barcelona: { lat: 41.35, lng: 2.17, region: "EU", country: "Spain", code: "ESBCN" },
  madrid: { lat: 40.42, lng: -3.7, region: "EU", country: "Spain", code: "ESMAD" },
  naples: { lat: 40.84, lng: 14.27, region: "EU", country: "Italy", code: "ITNAP" },
  milan: { lat: 45.46, lng: 9.19, region: "EU", country: "Italy", code: "ITMIL" },
  lisbon: { lat: 38.7, lng: -9.14, region: "EU", country: "Portugal", code: "PTLIS" },
  marseille: { lat: 43.3, lng: 5.37, region: "EU", country: "France", code: "FRMRS" },
  amsterdam: { lat: 52.37, lng: 4.9, region: "EU", country: "Netherlands", code: "NLAMS" },
  bremerhaven: { lat: 53.55, lng: 8.58, region: "EU", country: "Germany", code: "DEBRV" },
  berlin: { lat: 52.52, lng: 13.4, region: "EU", country: "Germany", code: "DEBER" },
  gdansk: { lat: 54.35, lng: 18.65, region: "EU", country: "Poland", code: "PLGDN" },
  warsaw: { lat: 52.23, lng: 21.01, region: "EU", country: "Poland", code: "PLWAW" },
  constanta: { lat: 44.17, lng: 28.65, region: "EU", country: "Romania", code: "ROCND" },
  manchester: { lat: 53.48, lng: -2.24, region: "EU", country: "United Kingdom", code: "GBMAN" },
  houston: { lat: 29.73, lng: -95.27, region: "AM", country: "USA", code: "USHOU" },
  savannah: { lat: 32.08, lng: -81.09, region: "AM", country: "USA", code: "USSAV" },
  chicago: { lat: 41.88, lng: -87.63, region: "AM", country: "USA", code: "USCHI" },
  toronto: { lat: 43.65, lng: -79.38, region: "AM", country: "Canada", code: "CATOR" },
  vancouver: { lat: 49.29, lng: -123.11, region: "AM", country: "Canada", code: "CAVAN" },
  montreal: { lat: 45.5, lng: -73.55, region: "AM", country: "Canada", code: "CAMTR" },
  manzanillo: { lat: 19.05, lng: -104.32, region: "AM", country: "Mexico", code: "MXZLO" },
  "mexico city": { lat: 19.43, lng: -99.13, region: "AM", country: "Mexico", code: "MXMEX" },
  panama: { lat: 8.98, lng: -79.52, region: "AM", country: "Panama", code: "PAPTY" },
  "buenos aires": { lat: -34.6, lng: -58.38, region: "AM", country: "Argentina", code: "ARBUE" },
  callao: { lat: -12.05, lng: -77.15, region: "AM", country: "Peru", code: "PECLL" },
  lima: { lat: -12.05, lng: -77.03, region: "AM", country: "Peru", code: "PELIM" },
  cartagena: { lat: 10.4, lng: -75.5, region: "AM", country: "Colombia", code: "COCTG" },
  guayaquil: { lat: -2.2, lng: -79.9, region: "AM", country: "Ecuador", code: "ECGYE" },
  valparaiso: { lat: -33.04, lng: -71.62, region: "AM", country: "Chile", code: "CLVAP" },
  santiago: { lat: -33.45, lng: -70.67, region: "AM", country: "Chile", code: "CLSCL" },
  kingston: { lat: 17.97, lng: -76.79, region: "AM", country: "Jamaica", code: "JMKIN" },
  paranagua: { lat: -25.5, lng: -48.5, region: "AM", country: "Brazil", code: "BRPNG" },
  "rio de janeiro": { lat: -22.9, lng: -43.17, region: "AM", country: "Brazil", code: "BRRIO" },
};

/** Other names people type for a city or port that the table already holds. */
const ALIASES: Record<string, string> = {
  bombay: "mumbai", "nhava sheva": "mumbai", jnpt: "mumbai", "jawaharlal nehru": "mumbai",
  saigon: "ho chi minh", "hcmc": "ho chi minh", "ho chi minh city": "ho chi minh", "cat lai": "ho chi minh",
  canton: "guangzhou", nansha: "guangzhou", hongkong: "hong kong", hk: "hong kong",
  "kuala lumpur": "port klang", klang: "port klang", "tanjung pelepas": "singapore", "pasir gudang": "singapore",
  apapa: "lagos", "tin can": "lagos", lekki: "lagos", "lagos apapa": "lagos",
  "dar es-salaam": "dar es salaam",  abijan: "abidjan",
  nyc: "new york", "newark": "new york", "los angles": "los angeles",  "long beach": "los angeles",
  "gênes": "genoa", genova: "genoa", athens: "piraeus", "brussels": "antwerp", "bruxelles": "antwerp",
  "tanger": "tanger med", tangier: "tanger med", "tangiers": "tanger med", "mombassa": "mombasa",
  "jebel ali port": "jebel ali", jafza: "jebel ali", "port of dubai": "dubai", "dubai ports": "dubai",
  ajman: "sharjah", khalifa: "abu dhabi",
  "ad dammam": "dammam",
  "alexandrie": "alexandria", "le caire": "cairo", "le havre port": "le havre", "pointe noire": "pointe-noire",
  "porto novo": "cotonou", "porto-novo": "cotonou", 
  "abidjan port": "abidjan", 
  "ningbo zhoushan": "ningbo", zhoushan: "ningbo", "tianjin xingang": "tianjin", xingang: "tianjin",
  "kuwait city": "kuwait", "rio": "rio de janeiro", "sao paolo": "sao paulo",
};

const norm = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const KEY_INDEX: { n: string; key: string }[] = [
  ...Object.keys(GEO).map((k) => ({ n: norm(k), key: k })),
  ...Object.entries(ALIASES).map(([a, k]) => ({ n: norm(a), key: k })),
].sort((a, b) => b.n.length - a.n.length);

/** Finds a known city or port in free text. Whole words only, accents and punctuation ignored ("Lomé", "São Paulo, BR", "Port of Cotonou"). */
export function lookupCity(q: string): (City & { name: string }) | null {
  const s = ` ${norm(q)} `;
  const hit = KEY_INDEX.find((e) => e.n.length > 0 && s.includes(` ${e.n} `));
  return hit ? { ...GEO[hit.key]!, name: q.split(",")[0]!.trim() } : null;
}

const editDistance = (a: string, b: string): number => {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array<number>(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0]![j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m]![n]!;
};
const titleCase = (k: string) => k.replace(/\b\w/g, (c) => c.toUpperCase());

/** Closest known cities for an unrecognised name (typos, partial names). Returns display strings such as "Mombasa (Kenya)". */
export function suggestCities(q: string, max = 3): string[] {
  const t = norm(q.split(",")[0] ?? "");
  if (t.length < 3) return [];
  const scored = new Map<string, number>();
  for (const e of KEY_INDEX) {
    const limit = e.n.length <= 5 ? 1 : e.n.length <= 8 ? 2 : 3;
    let dist = editDistance(t, e.n);
    if (e.n.startsWith(t) || (t.length >= 4 && e.n.includes(t))) dist = Math.min(dist, 1);
    for (const w of t.split(" ")) if (w.length >= 4 && w === e.n.split(" ")[0]) dist = Math.min(dist, 1);
    if (dist <= limit) scored.set(e.key, Math.min(scored.get(e.key) ?? 99, dist));
  }
  return [...scored.entries()].sort((a, b) => a[1] - b[1]).slice(0, max).map(([k]) => `${titleCase(k)} (${GEO[k]!.country})`);
}

/** The message shown when a city or port is not in the table. Suggests the closest names instead of a bare refusal. */
export function unknownCityMessage(names: string[]): string {
  const list = names.map((n) => `"${n.trim()}"`).join(" and ");
  const tips = names.flatMap((n) => suggestCities(n, 2));
  const uniq = [...new Set(tips)];
  const did = uniq.length ? ` Did you mean ${uniq.join(" or ")}?` : "";
  return `Dhow does not know ${list} yet.${did} Try a major port or city, for example Ningbo, Jebel Ali, Cotonou, Lagos, Mombasa or Rotterdam.`;
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
  let hub: ResolvedCity = hubOverride ?? { ...GEO[hubKey]!, name: hubKey === "jebel ali" ? "Jebel Ali" : "Rotterdam" };
  // Detour guard: on a short leg between two African ports, a hub that adds more than 25% to the direct distance
  // (for example a port beyond the destination) is replaced by the African port that adds the least.
  let hubNote: string | null = null;
  const direct = distanceKm(o, d);
  const via = (h: { lat: number; lng: number }) => distanceKm(o, h) + distanceKm(h, d);
  if (o.region === "AF" && d.region === "AF" && direct < 2500 && via(hub) > direct * 1.25) {
    let best: ResolvedCity | null = null;
    for (const [k, c] of Object.entries(GEO)) {
      if (c.region !== "AF" || c.noHub || c.code === o.code || c.code === d.code || k === "johannesburg" || k === "lomé") continue;
      if (!best || via(c) < via(best)) best = { ...c, name: k.replace(/\b\w/g, (ch) => ch.toUpperCase()) };
    }
    if (best && via(best) < via(hub)) {
      hubNote = `Hub changed from ${hub.name} to ${best.name}: ${hub.name} would add ${Math.round((via(hub) / direct - 1) * 100)}% to the direct distance, ${best.name} adds ${Math.round((via(best) / direct - 1) * 100)}%.`;
      hub = best;
    }
  }
  const km = distanceKm(o, hub) + distanceKm(hub, d);
  const k = Math.max(0.5, km / 9000);
  const teu = Math.max(1, Math.ceil(f.volume / 33));
  const chargeable = Math.max(f.weight * 1000, f.volume * 167);
  const options: PlanOption[] = [
    { key: "A", name: "Fastest — Sea-Air / Direct Air", via: `${hub.name} air hub`, days: Math.max(3, Math.round(5 * k)), cost: Math.round(chargeable * 1.9 * k), co2: +(chargeable * 0.0016 * k).toFixed(1), reliability: 91 },
    { key: "B", name: "Cost-Effective — Ocean FCL", via: `Direct ocean / ${hub.name}`, days: Math.round(22 * k), cost: Math.round(teu * 2300 * k), co2: +(f.weight * 0.1 * k).toFixed(1), reliability: 78 },
    { key: "C", name: "Dhow AI Optimized Multimodal", via: `${hub.name} transshipment → priority feeder`, days: Math.round(15 * k), cost: Math.round(teu * 2300 * k * 1.14), co2: +(f.weight * 0.12 * k).toFixed(1), reliability: 94 },
  ];
  return { hub, km, teu, options, hubNote };
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

/** Perishable or temperature-controlled cargo (meat, fish, dairy, live plants, vegetables, fruit, vaccines) travels in reefer containers. */
function needsReefer(hsCode: string, cargoType: string): boolean {
  const ch = hsCode.replace(/[^0-9]/g, "").slice(0, 2);
  return ["02", "03", "04", "06", "07", "08"].includes(ch) || hsCode.replace(/[^0-9]/g, "").startsWith("3002") || /cold chain|frozen|fresh|refrigerat|vaccine|2-8/i.test(cargoType);
}

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
  // CIF = goods + the freight of the recommended option (C) + insurance assumed at 0.5% of the goods. The same figure is shown in the route cards.
  const freight = options.find((x) => x.key === "C")?.cost ?? Math.round(value * 0.06);
  const cif = value + freight + value * 0.005;
  const duty = (cif * dutyRate) / 100;
  const tariffs: TariffLine[] = [
    { label: `Import duty (${d.country})${ov.dutyLabel ? ` — ${ov.dutyLabel}` : ""}`, rate: `${dutyRate}%`, amount: Math.round(duty) },
    { label: `${vatLabel} — ${d.country}`, rate: `${vatRate}%`, amount: Math.round(((cif + duty) * vatRate) / 100) },
    { label: "Port & terminal handling (assumed)", rate: "flat", amount: d.region === "AF" ? 2850 : 1420 },
    { label: "Dhow automated brokerage (assumed)", rate: "flat", amount: 180 },
  ];
  const ref = `DH-${o.code.slice(2)}${d.code.slice(2)}-${new Date().getFullYear()}-${(hash(f.origin + f.destination + f.cargoType) % 9000) + 1000}`;
  const reefer = needsReefer(hsCode, f.cargoType);
  // Package count is an estimate (25 kg average per package); the shipper must confirm it.
  const pkgs = Math.max(1, Math.ceil((f.weight * 1000) / 25));
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
      rows: [[hsCode, description, `${pkgs} pkgs (est.)`, money(value)], ["-", "Freight (recommended option) & insurance (0.5%, assumed)", "1 lot", money(cif - value)]],
      totals: [{ label: "FOB value", value: money(value) }, { label: "Total CIF value", value: money(cif) }],
      marks: `DHOW / ${hsCode} / ${d.code}`,
    },
    {
      kind: "packing", title: "Packing List", reference: `${ref}-PL`, incoterms: `CIF ${d.name} (Incoterms® 2020)`, parties,
      meta: [{ label: "Gross weight", value: `${(f.weight * 1000).toLocaleString("en-US")} kg` }, { label: "Net weight (est. 93%)", value: `${Math.round(f.weight * 930).toLocaleString("en-US")} kg` }, { label: "Volume", value: `${f.volume} CBM` }],
      columns: ["Container", "Type", "Packages", "Gross kg"],
      rows: containers.map((c) => [c, reefer ? "40' RF (reefer)" : "40' HC", String(Math.ceil(pkgs / containers.length)), Math.round((f.weight * 1000) / containers.length).toLocaleString("en-US")]),
      totals: [{ label: "Total packages (est.)", value: String(pkgs) }, { label: "Total gross weight", value: `${(f.weight * 1000).toLocaleString("en-US")} kg` }],
      marks: `DHOW / ${hsCode} / 1-UP`,
    },
    {
      kind: "bl", title: "Draft Bill of Lading", reference: `${ref}-BL`, incoterms: `CIF ${d.name} (Incoterms® 2020)`, parties,
      meta: [{ label: "Carrier", value: "To be booked" }, { label: "Vessel / Voyage", value: "To be confirmed at booking" }, { label: "Port of loading", value: `${o.name} (${o.code})` }, { label: "Transshipment", value: `${hub.name} (${hub.code})` }, { label: "Port of discharge", value: `${d.name} (${d.code})` }, { label: "Freight", value: "PREPAID" }, ...(reefer ? [{ label: "Temperature", value: "Reefer: set point to be specified by the shipper" }] : [])],
      columns: ["Container / Seal", "Description of goods", "Gross kg", "CBM"],
      rows: containers.map((c, i) => [`${c} / seal to be assigned`, i === 0 ? `${f.cargoType} — HS ${hsCode}` : "Same as above", Math.round((f.weight * 1000) / containers.length).toLocaleString("en-US"), (f.volume / containers.length).toFixed(1)]),
      totals: [{ label: "Said to contain", value: `${pkgs} packages (est.)` }],
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
