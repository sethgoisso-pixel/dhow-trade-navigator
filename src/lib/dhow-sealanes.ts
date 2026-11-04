/**
 * Indicative sea lanes for the shipment map.
 * A hand-placed network of open-water waypoints (lat, lng) along the main shipping corridors.
 * The route between two ports is the shortest path through this network. It keeps the drawn line at sea
 * instead of cutting across land. It is NOT a tracked vessel route and not a carrier schedule.
 */
import { geodesicPath, haversineKm } from "./dhow-geo";

type LatLng = { lat: number; lng: number };

/** Waypoint name -> [lat, lng], all in open water. */
export const SEA_NODES: Record<string, [number, number]> = {
  // Gulf of Guinea and West Africa
  wa_douala: [3.4, 9.2], wa_biokoS: [2.7, 8.6], wa_deltaE: [3.9, 6.8], wa_deltaW: [4.0, 5.0],
  wa_lagos: [5.8, 3.4], wa_cotonou: [5.9, 2.4], wa_lome: [5.8, 1.2], wa_tema: [5.2, 0.0],
  wa_threepts: [4.2, -2.2], wa_abidjan: [4.6, -4.0], wa_palmas: [3.8, -7.8], wa_freetown: [8.0, -13.8],
  wa_dakar: [14.7, -17.8], wa_blanc: [20.5, -17.5], ws_a: [23.5, -17.0], ws_b: [28.5, -19.0], ws_c: [28.0, -13.4],
  ma_a: [30.0, -10.2], ma_b: [31.5, -10.5], ma_c: [32.6, -9.9], ma_d: [33.8, -8.6], ma_f: [33.0, -12.0],
  ga_a: [-3.0, 8.0], ga_b: [0.5, 8.3],
  // Southern Africa, west coast to Cape
  luanda: [-9.0, 12.5], wc_d: [-16.0, 11.0], walvis: [-23.0, 13.0], wc_b: [-29.0, 14.5], cape_w: [-35.2, 18.0], sa_d: [-35.5, 20.0],
  sa_c: [-35.3, 23.0], sa_b: [-35.0, 27.0], sa_a: [-32.0, 31.5], durban: [-30.0, 31.7], maputo: [-26.0, 33.4],
  // Mozambique Channel and East Africa
  moz_c: [-22.0, 39.5], moz_b: [-17.0, 41.5], moz_a: [-13.5, 42.5], ea_g: [-10.5, 41.5], ea_f: [-8.5, 41.0],
  dar: [-6.9, 39.9], pemba_e: [-5.2, 40.6], mombasa: [-4.3, 40.2], ea_d: [-2.0, 43.0], ea_c: [2.0, 47.5], ea_b: [5.0, 50.5], ea_a: [10.5, 53.5],
  // Gulf of Aden, Red Sea, Suez
  guardafui: [12.4, 52.0], aden_e: [12.0, 48.0], aden_w: [12.2, 45.0], djibouti: [11.8, 43.5], bab: [12.65, 43.25],
  red_se: [14.5, 41.8], red_s: [18.0, 39.8], red_m: [21.0, 38.0], jeddah: [21.3, 38.5], red_n: [24.0, 36.0], gubal: [27.6, 33.95],
  gulf_suez: [29.0, 32.85], canal_s: [29.95, 32.55], canal_n: [31.25, 32.32], portsaid: [32.0, 32.0], alex: [31.9, 29.9],
  // Mediterranean
  med_cretese: [34.2, 26.3], med_cretes: [34.0, 24.0], med_cretesw: [35.0, 22.8], med_maleas: [36.5, 23.6], med_pir: [37.6, 23.9],
  med_malta: [35.4, 14.5], med_sicily: [37.2, 11.4], med_sard: [38.0, 8.0], med_alg: [38.2, 5.0], med_spain: [37.5, 0.0],
  med_valencia: [39.4, 0.4], med_alboran: [36.35, -3.0], med_gib: [35.95, -5.5], med_genoa: [43.9, 8.9], med_corsW: [42.4, 7.5], med_sardW: [40.0, 7.0],
  // Atlantic Europe and North Sea
  spartel: [35.9, -7.2], atl_pt: [37.0, -10.5], fin: [43.0, -10.5], bis: [46.0, -7.5], ushant: [48.5, -6.0], ch_a: [49.6, -4.5],
  ch_b: [50.0, -2.0], ch_c: [50.2, -0.5], ch_d: [50.3, 0.7], lehavre: [49.7, -0.2], dover: [51.0, 1.5], ns_a: [51.5, 2.3], fx: [51.9, 1.9],
  scheldt: [51.4, 3.2], rotterdam: [52.0, 3.4], gb_a: [53.9, 4.0], gb_b: [54.2, 6.5], hamburg: [54.0, 8.1],
  // Atlantic crossings
  atl_1: [49.0, -10.0], atl_2: [46.0, -35.0], atl_3: [41.0, -65.0], atl_4: [36.0, -15.0], atl_5: [38.0, -35.0],
  ny: [40.3, -73.5], hat: [35.0, -74.0], fl_a: [31.0, -79.0], fl_b: [27.2, -79.4], miami: [25.8, -79.9],
  br_s1: [3.0, -10.0], br_s2: [0.0, -25.0], br_s3: [-5.0, -31.5], bres_a: [-13.0, -36.0], bres_b: [-21.5, -38.5], bres_c: [-25.0, -42.5],
  santos: [-24.7, -46.0], cape_atl: [-34.0, -5.0], sa_e: [-29.0, -35.0],
  // Arabian Sea, Gulf, India
  socotra_n: [13.8, 54.0], arab_a: [16.0, 58.0], arab_b: [20.0, 61.0], hadd: [22.5, 61.0], oman_a: [24.0, 60.0], oman_b: [24.8, 58.5],
  fuj: [25.3, 57.0], hormuz: [26.6, 56.6], gulf_c: [26.0, 55.0], uae: [25.4, 54.8], gulf_q: [26.7, 52.5], dammam: [26.8, 50.5],
  sau_w: [21.0, 67.6], karachi: [24.4, 66.7], mundra: [22.3, 68.8], sau_s: [20.0, 70.0], mumbai: [18.8, 72.3],
  india_a: [15.0, 72.8], india_b: [12.0, 73.5], india_c: [8.5, 75.5], comorin: [7.2, 77.3], sl_sw: [5.4, 79.9], colombo: [6.7, 79.3],
  // Bay of Bengal, Malacca
  bob_a: [5.2, 81.0], bob_b: [6.0, 85.0], bob_c: [6.5, 90.0], bob_d: [15.0, 90.0], chittagong: [21.3, 91.5],
  gchan: [6.2, 94.5], malN: [5.9, 97.0], mal_a: [5.8, 98.5], mal_b: [3.0, 100.4], pk: [2.9, 100.8], mal_c: [2.2, 101.4], mal_d: [1.9, 102.3], mal_e: [1.4, 103.1],
  singapore: [1.1, 103.8], sing_e: [1.3, 104.5],
  // South-East and East Asia
  tha_a: [7.0, 104.0], tha_b: [10.0, 102.0], laem: [12.6, 100.9], vn_a: [7.5, 106.5], vungtau: [10.0, 107.7],
  scs_a: [12.5, 111.0], scs_b: [16.0, 110.2], scs_c: [19.5, 112.0], hk: [22.0, 114.2], sz: [22.35, 114.5],
  ch_aa: [22.0, 116.5], ch_bb: [24.5, 119.3], ch_cc: [27.0, 122.3], ningbo: [29.5, 122.5], ch_dd: [30.2, 123.5], shanghai: [30.9, 122.6],
  ch_ee: [34.0, 123.0], qingdao: [35.8, 120.7], bohai_a: [37.6, 123.2], bohai_b: [38.0, 121.8], tianjin: [38.9, 118.0],
  kor_a: [32.3, 126.5], kor_b: [33.5, 128.5], busan: [34.8, 129.2], jp_a: [31.0, 129.5], jp_b: [29.5, 131.0], jp_c: [32.0, 136.0],
  tok_a: [33.0, 140.8], tok_b: [34.5, 139.9], tok_c: [35.0, 139.65], tokyo: [35.3, 139.75],
  jk_a: [-0.8, 105.5], jk_b: [-1.3, 107.2], jk_c: [-2.9, 107.2], jk_d: [-4.5, 107.1], jakarta: [-5.9, 106.9],
};

const EDGES: [string, string][] = [];
const chain = (...ks: string[]) => { for (let i = 0; i < ks.length - 1; i++) EDGES.push([ks[i]!, ks[i + 1]!]); };

// West Africa, Gulf of Guinea to Morocco
chain("wa_douala", "wa_biokoS", "wa_deltaE", "wa_deltaW", "wa_lagos", "wa_cotonou", "wa_lome", "wa_tema", "wa_threepts", "wa_abidjan", "wa_palmas", "wa_freetown", "wa_dakar", "wa_blanc", "ws_a", "ws_b", "ma_f", "spartel");
chain("ws_a", "ws_c", "ma_a", "ma_b", "ma_c", "ma_d", "spartel");
chain("wa_biokoS", "ga_b", "ga_a", "luanda", "wc_d", "walvis", "wc_b", "cape_w", "sa_d", "sa_c", "sa_b", "sa_a", "durban", "maputo", "moz_c", "moz_b", "moz_a", "ea_g", "ea_f", "dar", "pemba_e", "mombasa", "ea_d", "ea_c", "ea_b", "ea_a", "guardafui");
// Red Sea, Gulf of Aden, Suez
chain("portsaid", "canal_n", "canal_s", "gulf_suez", "gubal", "red_n", "red_m", "red_s", "red_se", "bab", "aden_w", "aden_e", "guardafui", "socotra_n", "arab_a", "arab_b", "hadd", "oman_a", "oman_b", "fuj", "hormuz", "gulf_c", "gulf_q", "dammam");
chain("red_m", "jeddah"); chain("bab", "djibouti", "aden_w"); chain("gulf_c", "uae"); chain("portsaid", "alex");
// Mediterranean
chain("alex", "med_cretese", "med_cretes", "med_malta", "med_sicily", "med_sard", "med_alg", "med_spain", "med_alboran", "med_gib", "spartel");
chain("med_cretese", "med_cretes", "med_cretesw", "med_maleas", "med_pir");
chain("med_genoa", "med_corsW", "med_sardW", "med_sard"); chain("med_valencia", "med_spain");
// Atlantic Europe and North Sea
chain("spartel", "atl_pt", "fin", "bis", "ushant", "ch_a", "ch_b", "ch_c", "ch_d", "dover", "ns_a", "rotterdam", "gb_a", "gb_b", "hamburg");
chain("ch_c", "lehavre"); chain("ns_a", "fx"); chain("scheldt", "rotterdam");
// Atlantic crossings
chain("ushant", "atl_1", "atl_2", "atl_3", "ny", "hat", "fl_a", "fl_b", "miami"); chain("fin", "atl_2"); chain("spartel", "atl_4", "atl_5", "atl_3");
chain("wa_threepts", "br_s1", "br_s2", "br_s3", "bres_a", "bres_b", "bres_c", "santos"); chain("cape_w", "cape_atl", "sa_e", "bres_c");
// Arabian Sea and India
chain("arab_b", "sau_w", "karachi"); chain("sau_w", "mundra"); chain("sau_w", "sau_s", "mumbai", "india_a", "india_b", "india_c", "comorin", "sl_sw", "colombo");
chain("arab_b", "mumbai"); chain("arab_a", "india_b");
// Bay of Bengal and Malacca
chain("sl_sw", "bob_a", "bob_b", "bob_c", "bob_d", "chittagong"); chain("bob_b", "gchan", "malN", "mal_a", "mal_b", "mal_c", "mal_d", "mal_e", "singapore", "sing_e");
chain("mal_b", "pk");
// South China Sea, East Asia
chain("sing_e", "tha_a", "tha_b", "laem"); chain("sing_e", "vn_a", "vungtau", "scs_a", "scs_b", "scs_c", "hk", "sz", "ch_aa", "ch_bb", "ch_cc", "ningbo", "ch_dd", "shanghai");
chain("ch_dd", "ch_ee", "qingdao"); chain("ch_ee", "bohai_a", "bohai_b", "tianjin"); chain("ch_dd", "kor_a", "kor_b", "busan");
chain("kor_a", "jp_a", "jp_b", "jp_c", "tok_a", "tok_b", "tok_c", "tokyo");
chain("singapore", "jk_a", "jk_b", "jk_c", "jk_d", "jakarta");

const NAMES = Object.keys(SEA_NODES);
const INDEX = new Map(NAMES.map((n, i) => [n, i]));
const pt = (n: string): LatLng => ({ lat: SEA_NODES[n]![0], lng: SEA_NODES[n]![1] });
const ADJ: { to: number; w: number }[][] = NAMES.map(() => []);
for (const [a, b] of EDGES) {
  const ia = INDEX.get(a), ib = INDEX.get(b);
  if (ia === undefined || ib === undefined) continue;
  const w = haversineKm(pt(a), pt(b));
  ADJ[ia]!.push({ to: ib, w });
  ADJ[ib]!.push({ to: ia, w });
}
export const SEA_EDGES = EDGES;

/** Farthest a port may be from its nearest waypoint (km) before the network is not used for it. */
const MAX_PORT_TO_NODE_KM = 600;

function nearestNode(p: LatLng): { id: number; km: number } {
  let best = { id: -1, km: Infinity };
  NAMES.forEach((n, i) => {
    const km = haversineKm(p, pt(n));
    if (km < best.km) best = { id: i, km };
  });
  return best;
}

/** Shortest chain of waypoint names between two ports, or null when the network does not serve them. */
export function seaNodePath(a: LatLng, b: LatLng): string[] | null {
  const s = nearestNode(a), t = nearestNode(b);
  if (s.id < 0 || t.id < 0 || s.km > MAX_PORT_TO_NODE_KM || t.km > MAX_PORT_TO_NODE_KM) return null;
  const n = NAMES.length;
  const dist = new Array<number>(n).fill(Infinity);
  const prev = new Array<number>(n).fill(-1);
  const done = new Array<boolean>(n).fill(false);
  dist[s.id] = 0;
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i]! < dist[u]!)) u = i;
    if (u < 0 || dist[u] === Infinity) break;
    done[u] = true;
    if (u === t.id) break;
    for (const { to, w } of ADJ[u]!) if (dist[u]! + w < dist[to]!) { dist[to] = dist[u]! + w; prev[to] = u; }
  }
  if (dist[t.id] === Infinity) return null;
  const ids: number[] = [];
  for (let v = t.id; v >= 0; v = prev[v]!) ids.push(v);
  ids.reverse();
  const names = ids.map((i) => NAMES[i]!);
  // Sea routes are often much longer than the great circle (Africa or Europe lie in between). Only a path that is absurdly long is rejected.
  let len = s.km + t.km;
  for (let i = 0; i < names.length - 1; i++) len += haversineKm(pt(names[i]!), pt(names[i + 1]!));
  if (len > haversineKm(a, b) * 9 + 3000) return null;
  return names;
}

/**
 * Coordinates ([lng, lat]) of the indicative sea route through the given waypoints (origin, hub, destination).
 * Legs the network cannot serve fall back to a great-circle arc, so a line is always returned.
 */
export function seaRoute(pts: LatLng[]): [number, number][] {
  if (pts.length === 0) return [];
  const out: [number, number][] = [[pts[0]!.lng, pts[0]!.lat]];
  let prevLast: string | null = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!, b = pts[i + 1]!;
    const ids = seaNodePath(a, b);
    if (!ids) {
      out.push(...geodesicPath([a, b]).slice(1));
      prevLast = null;
      continue;
    }
    const mine = [...ids];
    // The hub sits between two legs that share the same offshore waypoint: drop it to avoid a stub going out and back.
    if (prevLast && mine[0] === prevLast && out.length >= 2) {
      mine.shift();
      out.splice(out.length - 2, 1);
    }
    for (const nme of mine) out.push([pt(nme).lng, pt(nme).lat]);
    out.push([b.lng, b.lat]);
    prevLast = ids[ids.length - 1] ?? null;
  }
  return out;
}
