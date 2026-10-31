import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Route as RouteIcon, ArrowUpRight, Send, Waves } from "lucide-react";
import { CargoFormPanel } from "@/components/dhow/CargoForm";
import { RouteResults } from "@/components/dhow/RouteResults";
import { RouteMap } from "@/components/dhow/RouteMap";
import { PlanCompliance } from "@/components/dhow/PlanCompliance";
import { AgentSteps } from "@/components/dhow/AgentSteps";
import { Panel, PageTitle } from "@/components/dhow/ui";
import { useDhow } from "@/lib/dhow-store";
import { seo } from "@/lib/seo";
import { fetchMaritimeWeather, type ChokepointWeather } from "@/lib/dhow-weather";

export const Route = createFileRoute("/optimizer")({
  head: () => seo("Route & Freight Optimizer — Dhow", "Compare fastest, cheapest and AI-optimized multimodal routes with live risk and disruption scoring."),
  component: Optimizer,
});

function Optimizer() {
  const { form, running, plan, steps, stepIndex, planSource, dossierRef, dispatches } = useDhow();
  const pendingCount = dispatches.filter((d) => d.status === "pending").length;
    const [weather, setWeather] = useState<ChokepointWeather[]>([]);

  useEffect(() => {
    fetchMaritimeWeather().then(setWeather).catch(() => {});
  }, []);

        {weather.length > 0 && (
        <div className="mt-3 rounded-xl border border-border bg-card/60 p-3 backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Waves className="size-3.5 text-sky-400" />
              {weather.every((cp) => cp.live) ? "Live Chokepoint Sea State" : "Chokepoint Sea State (fallback values: API unreachable)"}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              Open-Meteo Marine API
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {weather.map((cp) => (
              <div
                key={cp.id}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs"
              >
                <div>
                  <div className="font-medium text-foreground">{cp.name}</div>
                  <div className="text-[10px] text-muted-foreground">{cp.zone}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold text-foreground">
                    {cp.waveHeight}m <span className="text-[10px] font-normal text-muted-foreground">swell</span>
                  </div>
                  <div className={`text-[10px] font-medium ${
                    cp.status === "Calm" ? "text-emerald-500" : cp.status === "Moderate" ? "text-amber-500" : "text-rose-500"
                  }`}>
                    ● {cp.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
  
  return (
    <>
      <PageTitle title="Autonomous Route & Freight Optimizer" sub="Describe your cargo — Dhow compares air, ocean and multimodal options instantly." />
      <Panel title="Cargo Request" icon={<RouteIcon className="size-4" />}>
        <CargoFormPanel />
      </Panel>
      <div className="mt-4">
        {running ? (
          <Panel
            title="Dhow AI Agent Reasoning"
            action={
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold-2">
                <span className="size-1.5 rounded-full bg-gold-2 animate-ping" />
                Active AI Synthesis
              </span>
            }
          >
            <p className="mb-3 text-xs text-muted-foreground">
              Analyzing trade corridor & tariff compliance for {form.origin} → {form.destination}…
            </p>
            <AgentSteps steps={steps} index={stepIndex} />
          </Panel>
        ) : plan ? (
          <div className="space-y-4 animate-fade-up">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Corridor: <b className="text-foreground">{plan.corridor}</b>
                {dossierRef && (
                  <> · Dossier <Link to="/dossier/$ref" params={{ ref: dossierRef }} className="font-mono text-gold-2 underline">{dossierRef}</Link></>
                )}
              </span>
              <span className="rounded-full bg-gold/10 px-2 py-0.5 font-medium text-gold-2">
                {planSource === "ai" ? "✦ Dhow Agent (AI + verified tools)" : planSource === "tools" ? "Tool pipeline (no AI)" : planSource === "preset" ? "Preset scenario" : "Simulated Engine"}
              </span>
            </div>

            {pendingCount > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-gold/30 bg-gold/10 p-3 text-xs">
                <span className="flex items-center gap-2 text-foreground">
                  <Send className="size-4 text-gold-2" />
                  <span><b>{pendingCount} operational dispatches</b> prepared for this shipment require operator approval.</span>
                </span>
                <Link
                  to="/dispatch"
                  className="inline-flex items-center gap-1 font-semibold text-gold-2 underline hover:opacity-80"
                >
                  Review Dispatch Tower
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            )}

            <RouteMap waypoints={plan.waypoints} title="Shipment Route" />
            <RouteResults plan={plan} />
            <PlanCompliance plan={plan} destination={form.destination} />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Submit a cargo request above to generate optimal multimodal routes, tariff duties, and compliance documentation.
          </div>
        )}
      </div>
    </>
  );
}
