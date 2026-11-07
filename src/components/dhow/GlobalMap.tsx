import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoPoint } from "@/lib/dhow-plan";
import { seaRoute } from "@/lib/dhow-sealanes";
import { fetchMaritimeWeather, type ChokepointWeather } from "@/lib/dhow-weather";

maplibregl.setWorkerUrl(workerUrl);

export default function GlobalMap({ waypoints }: { waypoints: GeoPoint[] }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const wxMarkers = useRef<maplibregl.Marker[]>([]);
  const [wx, setWx] = useState<ChokepointWeather[]>([]);
  const latest = useRef(waypoints);
  latest.current = waypoints;

  const draw = (shouldFit = true) => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;
    // Blue water on the light style, deep navy on the dark one (layer ids of the OpenFreeMap styles; ignored if absent).
    try {
      const dark = document.documentElement.classList.contains("dark");
      if (m.getLayer("water")) m.setPaintProperty("water", "fill-color", dark ? "#0c2a47" : "#bcd9ee");
    } catch { /* style without a water layer */ }
    const pts = latest.current;
    const coords = seaRoute(pts);
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
        .setPopup(new maplibregl.Popup({ offset: 14, closeButton: false }).setText(`${p.role === "hub" ? "Transshipment hub" : p.role === "origin" ? "Origin" : "Destination"} \u00B7 ${p.name}`))
        .addTo(m);
    });
    const b = new maplibregl.LngLatBounds();
    coords.forEach((c) => b.extend(c));
    if (shouldFit) m.fitBounds(b, { padding: 50, duration: 1200, maxZoom: 6 });
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
    let firstStyle = true;
    m.on("style.load", () => { draw(firstStyle); firstStyle = false; });
    map.current = m;
    const obs = new MutationObserver(() => {
      const next = styleFor();
      if (next !== current) { current = next; m.setStyle(next); }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => { obs.disconnect(); markers.current.forEach((mk) => mk.remove()); m.remove(); map.current = null; };
  }, []);

  useEffect(() => { draw(true); }, [waypoints]);

  // Real sea state (Open-Meteo Marine) at the three chokepoints, drawn on the map. Grey = fallback value, not a measurement.
  useEffect(() => { fetchMaritimeWeather().then(setWx).catch(() => {}); }, []);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    wxMarkers.current.forEach((mk) => mk.remove());
    wxMarkers.current = wx.map((cp) => {
      const node = document.createElement("div");
      const color = !cp.live ? "#94a3b8" : cp.status === "Calm" ? "#10b981" : cp.status === "Moderate" ? "#f59e0b" : "#f43f5e";
      node.style.cssText = `width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 3px ${color}55;cursor:pointer`;
      node.title = `${cp.name}: ${cp.waveHeight} m`;
      const text = cp.live
        ? `${cp.name} \u00B7 swell ${cp.waveHeight} m (${cp.status}) \u00B7 measured ${cp.fetchedAt.slice(11, 16)} UTC \u00B7 Open-Meteo Marine`
        : `${cp.name} \u00B7 fallback value, API unreachable`;
      return new maplibregl.Marker({ element: node }).setLngLat([cp.lon, cp.lat]).setPopup(new maplibregl.Popup({ offset: 12, closeButton: false }).setText(text)).addTo(m);
    });
    return () => { wxMarkers.current.forEach((mk) => mk.remove()); wxMarkers.current = []; };
  }, [wx]);

  const allLive = wx.length > 0 && wx.every((cp) => cp.live);
  return (
    <div className="relative">
      <div ref={el} className="h-72 w-full sm:h-96" />
      {wx.length > 0 && (
        <div className="pointer-events-none absolute bottom-2 left-2 max-w-[80%] rounded-md bg-background/85 px-2 py-1 text-[10px] leading-snug text-foreground shadow backdrop-blur">
          <div className="font-medium">{allLive ? "Sea state at chokepoints" : "Sea state (fallback values)"}</div>
          <div className="flex flex-wrap items-center gap-x-2">
            <span><span className="mr-1 inline-block size-2 rounded-full bg-emerald-500" />&lt; 1 m</span>
            <span><span className="mr-1 inline-block size-2 rounded-full bg-amber-500" />{"1\u20132.2 m"}</span>
            <span><span className="mr-1 inline-block size-2 rounded-full bg-rose-500" />&gt; 2.2 m</span>
            {!allLive && <span><span className="mr-1 inline-block size-2 rounded-full bg-slate-400" />no live data</span>}
          </div>
          <div className="text-muted-foreground">Dashed line: indicative sea lane through hand-placed waypoints, not a tracked vessel route. Source: Open-Meteo Marine.</div>
        </div>
      )}
    </div>
  );
}
