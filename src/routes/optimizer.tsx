import { createFileRoute } from "@tanstack/react-router";
import { Route as RouteIcon } from "lucide-react";
import { CargoFormPanel } from "@/components/dhow/CargoForm";
import { RouteResults } from "@/components/dhow/RouteResults";
import { RouteMap } from "@/components/dhow/RouteMap";
import { PlanCompliance } from "@/components/dhow/PlanCompliance";
import { AgentSteps } from "@/components/dhow/AgentSteps";
import { Panel, PageTitle } from "@/components/dhow/ui";
import { useDhow } from "@/lib/dhow-store";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/optimizer")({
  head: () => seo("Route & Freight Optimizer — Dhow", "Compare fastest, cheapest and AI-optimized multimodal routes with live risk and disruption scoring."),
  component: Optimizer,
});

function Optimizer() {
  const { form, running, plan, steps, stepIndex, planSource } = useDhow();
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
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Corridor: <b className="text-foreground">{plan.corridor}</b></span>
              <span className="rounded-full bg-gold/10 px-2 py-0.5 font-medium text-gold-2">
                {planSource === "ai" ? "✦ Dhow AI Navigator" : "Simulated Engine"}
              </span>
            </div>
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
