import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { GeoPoint } from "@/lib/dhow-plan";
import { DEFAULT_ROUTE, computeRoutePhysics } from "@/lib/dhow-geo";

const GlobalMap = lazy(() => import("./GlobalMap"));

export function RouteMap({ waypoints, title = "Trade Corridor" }: { waypoints?: GeoPoint[] | undefined; title?: string }) {
  const pts = waypoints?.length ? waypoints : DEFAULT_ROUTE;
    const skeleton = <div className="h-72 w-full animate-pulse bg-muted sm:h-96" />;
  const physics = computeRoutePhysics(pts);

  return (
    <div className="overflow-hidden rounded-xl border border-gold/20 bg-card text-foreground shadow-card backdrop-blur-md dark:bg-gradient-navy dark:text-navy-foreground">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm font-medium">
        {title}
        <span className="ml-auto truncate text-[11px] font-semibold text-gold-2 dark:text-gold">{pts.map((p) => p.name.split(",")[0]).join(" → ")}</span>
      </div>
      <ClientOnly fallback={skeleton}>
        <Suspense fallback={skeleton}><GlobalMap waypoints={pts} /></Suspense>
      </ClientOnly>
      <div className="grid grid-cols-2 divide-x divide-border/60 border-t border-border/60 bg-accent/20 px-3 py-2 text-xs sm:grid-cols-4">
        <div className="px-2 py-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Great-Circle Distance</div>
          <div className="font-mono font-medium text-foreground">{physics.totalNm.toLocaleString("en-US")} NM <span className="text-[10px] text-muted-foreground">({physics.totalKm.toLocaleString("en-US")} km)</span></div>
        </div>
        <div className="px-2 py-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ocean Speed (@19.5 kts)</div>
          <div className="font-mono font-medium text-foreground">{physics.seaDays} sailing days <span className="text-[10px] text-muted-foreground">({physics.seaHours}h)</span></div>
        </div>
        <div className="px-2 py-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Air Speed (@485 kts)</div>
          <div className="font-mono font-medium text-foreground">{physics.airHours}h flight time</div>
        </div>
        <div className="px-2 py-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Geodesic Engine</div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-gold-2">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-500" /> Haversine Verified
          </div>
        </div>
      </div>
    </div>
  );
}
