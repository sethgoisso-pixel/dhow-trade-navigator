import type { GeoPoint } from "./dhow-plan";

export const DEFAULT_ROUTE: GeoPoint[] = [
  { name: "Ningbo, China", lat: 29.87, lng: 121.55, role: "origin" },
  { name: "Jebel Ali Port", lat: 25.01, lng: 55.06, role: "hub" },
  { name: "Cotonou, Benin", lat: 6.35, lng: 2.43, role: "destination" },
];

/** Great-circle interpolation between waypoints, with longitudes unwrapped so lines never jump across the map. */
export function geodesicPath(pts: { lat: number; lng: number }[], steps = 64): [number, number][] {
  const r = Math.PI / 180;
  const out: [number, number][] = [];
  for (let s = 0; s < pts.length - 1; s++) {
    const a = pts[s]!, b = pts[s + 1]!;
    const [la1, lo1, la2, lo2] = [a.lat * r, a.lng * r, b.lat * r, b.lng * r];
    const d = 2 * Math.asin(Math.sqrt(Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2));
    for (let i = s === 0 ? 0 : 1; i <= steps; i++) {
      const f = i / steps;
      if (d === 0) { out.push([a.lng, a.lat]); continue; }
      const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
      const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
      const y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
      const z = A * Math.sin(la1) + B * Math.sin(la2);
      let lng = Math.atan2(y, x) / r;
      const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) / r;
      const prev = out[out.length - 1];
      if (prev) while (lng - prev[0] > 180) lng -= 360;
      if (prev) while (lng - prev[0] < -180) lng += 360;
      out.push([lng, lat]);
    }
  }
  return out;
}

export type RoutePhysics = {
  totalKm: number;
  totalNm: number;
  seaHours: number;
  seaDays: number;
  airHours: number;
};

/** Calcule la distance orthodromique réelle (formule de Haversine) entre 2 coordonnées */
export function haversineKm(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  const R = 6371; // Rayon moyen de la Terre en km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/** Calcule les métriques de physique de transport pour l'ensemble des escales */
export function computeRoutePhysics(pts: { lat: number; lng: number }[]): RoutePhysics {
  if (!pts || pts.length < 2) {
    return { totalKm: 0, totalNm: 0, seaHours: 0, seaDays: 0, airHours: 0 };
  }
  let totalKm = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    totalKm += haversineKm(pts[i]!, pts[i + 1]!);
  }
  const totalNm = Math.round(totalKm / 1.852); // 1 Mille Nautique = 1.852 km
  const seaHours = Math.round(totalKm / 36.1); // ~19.5 nœuds vitesse porte-conteneurs
  const seaDays = Number((seaHours / 24).toFixed(1));
  const airHours = Number((totalKm / 898).toFixed(1)); // ~485 nœuds avion cargo

  return { totalKm, totalNm, seaHours, seaDays, airHours };
}
