import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { GeoPoint } from "@/lib/dhow-plan";
import { DEFAULT_ROUTE } from "@/lib/dhow-geo";

const GlobalMap = lazy(() => import("./GlobalMap"));

export function RouteMap({ waypoints, title = "Live Trade Corridor" }: { waypoints?: GeoPoint[]; title?: string }) {
  const pts = waypoints?.length ? waypoints : DEFAULT_ROUTE;
  const skeleton = <div className="h-72 w-full animate-pulse bg-navy-foreground/5 sm:h-96" />;
  return (
    <div className="overflow-hidden rounded-xl border border-gold/20 bg-gradient-navy text-navy-foreground shadow-card">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm font-medium">
        {title}
        <span className="ml-auto truncate text-[11px] text-gold">{pts.map((p) => p.name.split(",")[0]).join(" → ")}</span>
      </div>
      <ClientOnly fallback={skeleton}>
        <Suspense fallback={skeleton}><GlobalMap waypoints={pts} /></Suspense>
      </ClientOnly>
    </div>
  );
}
