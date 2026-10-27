import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoPoint } from "@/lib/dhow-plan";
import { geodesicPath } from "@/lib/dhow-geo";

maplibregl.setWorkerUrl(workerUrl);

export default function GlobalMap({ waypoints }: { waypoints: GeoPoint[] }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const latest = useRef(waypoints);
  latest.current = waypoints;

  const draw = () => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;
    const pts = latest.current;
    const coords = geodesicPath(pts);
    const data = { type: "Feature", properties: {}, geometry: { type: "LineString" as const, coordinates: coords } } as const;
    const src = m.getSource("route") as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(data);
    else {
      m.addSource("route", { type: "geojson", data });
      m.addLayer({ id: "route-glow", type: "line", source: "route", paint: { "line-color": "#D4AF37", "line-width": 8, "line-opacity": 0.18, "line-blur": 4 } });
      m.addLayer({ id: "route-line", type: "line", source: "route", layout: { "line-cap": "round" }, paint: { "line-color": "#D4AF37", "line-width": 2.5, "line-dasharray": [2, 1.5] } });
    }
    markers.current.forEach((mk) => mk.remove());
    markers.current = pts.map((p) => {
      const node = document.createElement("div");
      node.className = `dhow-pin dhow-pin--${p.role}`;
      node.title = p.name;
      const lng = coords.find((c) => Math.abs(c[1] - p.lat) < 1e-6)?.[0] ?? p.lng;
      return new maplibregl.Marker({ element: node })
        .setLngLat([lng, p.lat])
        .setPopup(new maplibregl.Popup({ offset: 14, closeButton: false }).setText(`${p.role === "hub" ? "Transshipment hub" : p.role === "origin" ? "Origin" : "Destination"} · ${p.name}`))
        .addTo(m);
    });
    const b = new maplibregl.LngLatBounds();
    coords.forEach((c) => b.extend(c));
    m.fitBounds(b, { padding: 50, duration: 1200, maxZoom: 6 });
  };

  useEffect(() => {
    if (!el.current) return;
    const styleFor = () => `https://tiles.openfreemap.org/styles/${document.documentElement.classList.contains("dark") ? "dark" : "positron"}`;
    let current = styleFor();
    const m = new maplibregl.Map({
      container: el.current,
      style: current,
      center: [55, 20],
      zoom: 1.4,
      attributionControl: { compact: true },
      renderWorldCopies: true,
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.on("load", draw);
    m.on("style.load", draw);
    map.current = m;
    const obs = new MutationObserver(() => {
      const next = styleFor();
      if (next !== current) { current = next; m.setStyle(next); }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => { obs.disconnect(); markers.current.forEach((mk) => mk.remove()); m.remove(); map.current = null; };
  }, []);

  useEffect(() => { draw(); }, [waypoints]);

  return <div ref={el} className="h-72 w-full sm:h-96" />;
}
