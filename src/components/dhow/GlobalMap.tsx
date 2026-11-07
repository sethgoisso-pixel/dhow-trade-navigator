import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoPoint } from "@/lib/dhow-plan";
import { seaRoute } from "@/lib/dhow-sealanes";
import { fetchMaritimeWeather, type ChokepointWeather } from "@/lib/dhow-weather";

maplibregl.setWorkerUrl(workerUrl);

// Nautical blue seas: azure in light mode, deep navy in dark mode.
const waterFor = () => (document.documentElement.classList.contains("dark") ? "#0c2a47" : "#bcd9ee");

export default function GlobalMap({ waypoints }: { waypoints: GeoPoint[] }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const wxMarkers = useRef<maplibregl.Marker[]>([]);
  const [wx, setWx] = useState<ChokepointWeather[]>([]);
  const latest = useRef(waypoints);
  latest.current = waypoints;
  const hasFitted = useRef(false);

  const draw = (shouldFit = false) => {
    const m = map.current;
    if (!m) return;
    // isStyleLoaded() is false while tiles are still loading: retry once the map is idle instead of silently dropping the draw.
    if (!m.isStyleLoaded()) {
      m.once("idle", () => draw(shouldFit));
      return;
    }

    try {
      const waterColor = waterFor();
      if (m.getLayer("water")) m.setPaintProperty("water", "fill-color", waterColor);
      if (m.getLayer("waterway")) m.setPaintProperty("waterway", "line-color", waterColor);
    } catch { /* layers not mounted yet */ }

    const pts = latest.current;
    const coords = seaRoute(pts);
    const data = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString" as const, coordinates: coords },
    } as const;

    const src = m.getSource("route") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(data);
    } else {
      m.addSource("route", { type: "geojson", data });
      m.addLayer({
        id: "route-glow",
        type: "line",
        source: "route",
        paint: { "line-color": "#D4AF37", "line-width": 8, "line-opacity": 0.18, "line-blur": 4 },
      });
      m.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-cap": "round" },
        paint: { "line-color": "#D4AF37", "line-width": 2.5, "line-dasharray": [2, 1.5] },
      });
    }

    markers.current.forEach((mk) => mk.remove());
    markers.current = pts.map((p) => {
      const node = document.createElement("div");
      node.className = `dhow-pin dhow-pin--${p.role}`;
      node.title = p.name;
      const lng = coords.find((c) => Math.abs(c[1] - p.lat) < 1e-6)?.[0] ?? p.lng;
      return new maplibregl.Marker({ element: node })
        .setLngLat([lng, p.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 14, closeButton: false }).setText(
            `${p.role === "hub" ? "Transshipment hub" : p.role === "origin" ? "Origin" : "Destination"} · ${p.name}`
          )
        )
        .addTo(m);
    });

    if (shouldFit && coords.length > 0) {
      const b = new maplibregl.LngLatBounds();
      coords.forEach((c) => b.extend(c));
      m.fitBounds(b, { padding: 50, duration: 1200, maxZoom: 6 });
      hasFitted.current = true;
    }
  };

  useEffect(() => {
    if (!el.current) return;
    const styleFor = () =>
      `https://tiles.openfreemap.org/styles/${document.documentElement.classList.contains("dark") ? "dark" : "positron"}`;
    let current = styleFor();

    const m = new maplibregl.Map({
      container: el.current,
      style: current,
      center: [55, 20],
      zoom: 1.4,
      attributionControl: { compact: true },
      renderWorldCopies: true,
    });
    // map.current est assigné immédiatement
    map.current = m;

    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const onStyleReady = () => {
      // Premier affichage : centre la route. Au changement de thème : garde le zoom et la position actuelle de l'utilisateur.
      draw(!hasFitted.current);
    };

    m.on("load", onStyleReady);
    m.on("style.load", onStyleReady);

    // Theme switch: inject blue seas + gold route directly into the new style so nothing is lost and the camera stays put.
    const obs = new MutationObserver(() => {
      const next = styleFor();
      if (next === current) return;
      current = next;
      m.setStyle(next, {
        diff: false,
        transformStyle: (_prev, style) => {
          const water = waterFor();
          const coords = seaRoute(latest.current);
          const layers = style.layers.map((l) => {
            if (l.id === "water" && l.type === "fill") return { ...l, paint: { ...l.paint, "fill-color": water } };
            if (l.id === "waterway" && l.type === "line") return { ...l, paint: { ...l.paint, "line-color": water } };
            return l;
          });
          return {
            ...style,
            sources: {
              ...style.sources,
              route: {
                type: "geojson",
                data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } },
              },
            },
            layers: [
              ...layers,
              { id: "route-glow", type: "line", source: "route", paint: { "line-color": "#D4AF37", "line-width": 8, "line-opacity": 0.18, "line-blur": 4 } },
              { id: "route-line", type: "line", source: "route", layout: { "line-cap": "round" }, paint: { "line-color": "#D4AF37", "line-width": 2.5, "line-dasharray": [2, 1.5] } },
            ],
          };
        },
      });
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      obs.disconnect();
      markers.current.forEach((mk) => mk.remove());
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    hasFitted.current = false;
    draw(true);
  }, [waypoints]);

  // Données météo réelles aux 3 détroits (Open-Meteo Marine)
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
        ? `${cp.name} · swell ${cp.waveHeight} m (${cp.status}) · measured ${cp.fetchedAt.slice(11, 16)} UTC · Open-Meteo Marine`
        : `${cp.name} · fallback value, API unreachable`;
      return new maplibregl.Marker({ element: node })
        .setLngLat([cp.lon, cp.lat])
        .setPopup(new maplibregl.Popup({ offset: 12, closeButton: false }).setText(text))
        .addTo(m);
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
            <span><span className="mr-1 inline-block size-2 rounded-full bg-amber-500" />{"1–2.2 m"}</span>
            <span><span className="mr-1 inline-block size-2 rounded-full bg-rose-500" />&gt; 2.2 m</span>
            {!allLive && <span><span className="mr-1 inline-block size-2 rounded-full bg-slate-400" />no live data</span>}
          </div>
          <div className="text-muted-foreground">Dashed line: indicative sea lane through hand-placed waypoints, not a tracked vessel route. Source: Open-Meteo Marine.</div>
        </div>
      )}
    </div>
  );
}
