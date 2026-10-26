import { createFileRoute } from "@tanstack/react-router";
import { Play, Sun, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentSteps } from "@/components/dhow/AgentSteps";
import { RouteResults } from "@/components/dhow/RouteResults";
import { RouteMap } from "@/components/dhow/RouteMap";
import { AIBadge, Panel, PageTitle } from "@/components/dhow/ui";
import { PlanCompliance } from "@/components/dhow/PlanCompliance";
import { SCENARIOS } from "@/lib/dhow-data";
import { runAgent, useDhow } from "@/lib/dhow-store";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/scenarios")({
  head: () => seo("Hackathon Demo Scenarios — Dhow", "Two 1-click demo scenarios showing Dhow's multi-step reasoning, optimal routing and compliance documents."),
  component: Scenarios,
});

function Scenarios() {
  const { scenario, running, stepIndex, completed, plan } = useDhow();
  return (
    <>
      <PageTitle title="Demo Scenarios" sub="One click: the agent fills the request, reasons step by step, and delivers routing + compliance." />
      <div className="grid gap-3 md:grid-cols-2">
        {SCENARIOS.map((s, i) => {
          const Icon = i === 0 ? Sun : Smartphone;
          const on = scenario?.id === s.id;
          return (
            <div key={s.id} className={`animate-fade-up flex items-center gap-4 rounded-xl border p-4 shadow-card ${on ? "border-gold bg-gradient-navy text-navy-foreground" : "bg-card"}`}>
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-gold text-navy"><Icon className="size-6" /></span>
              <div className="min-w-0 flex-1">
                <div className="text-xs opacity-60">Scenario {i + 1}</div>
                <h3 className="font-semibold leading-tight">{s.title}</h3>
                <p className="text-sm opacity-70">{s.subtitle}</p>
              </div>
              <Button size="sm" disabled={running} onClick={() => runAgent(s)}><Play /> Run</Button>
            </div>
          );
        })}
      </div>

      {scenario && (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            <Panel title="Agent Reasoning" action={<AIBadge>{completed ? "Complete" : "Live"}</AIBadge>} className="lg:col-span-2">
              <p className="mb-3 text-xs text-muted-foreground">{scenario.units} · {scenario.form.weight}t · {scenario.form.volume} CBM</p>
              <AgentSteps steps={scenario.steps} index={stepIndex} />
            </Panel>
            <div className="lg:col-span-3">
              <RouteMap waypoints={plan?.waypoints} title="Shipment Route" />
            </div>
          </div>
          {completed && plan && (
            <div className="mt-4 space-y-4">
              <RouteResults plan={plan} />
              <PlanCompliance plan={plan} destination={scenario.form.destination} />
            </div>
          )}
        </>
      )}
    </>
  );
}
