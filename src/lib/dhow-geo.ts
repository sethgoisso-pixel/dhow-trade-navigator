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
