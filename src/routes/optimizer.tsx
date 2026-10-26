import { createFileRoute } from "@tanstack/react-router";
import { Route as RouteIcon } from "lucide-react";
import { CargoFormPanel } from "@/components/dhow/CargoForm";
import { RouteResults } from "@/components/dhow/RouteResults";
import { RouteMap } from "@/components/dhow/RouteMap";
import { PlanCompliance } from "@/components/dhow/PlanCompliance";
import { AgentSteps } from "@/components/dhow/AgentSteps";
import { EventStream } from "@/components/dhow/EventStream";
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
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Cargo Request" icon={<RouteIcon className="size-4" />} className="lg:col-span-2"><CargoFormPanel /></Panel>
        <EventStream className="h-72 lg:h-auto" />
      </div>
      <div className={`mt-4 transition-opacity ${running ? "opacity-50" : ""}`}>
        {plan ? (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Plan source: <b>{planSource === "ai" ? "Dhow AI navigator" : "local simulation"}</b></p>
            <RouteMap waypoints={plan.waypoints} title="Shipment Route" />
            <RouteResults plan={plan} />
            <PlanCompliance plan={plan} destination={form.destination} />
          </div>
        ) : running ? (
          <Panel title="Agent Reasoning"><AgentSteps steps={steps} index={stepIndex} /></Panel>
        ) : (
          <p className="text-sm text-muted-foreground">Submit a cargo request to generate routing, duties and documents.</p>
        )}
      </div>
    </>
  );
}
