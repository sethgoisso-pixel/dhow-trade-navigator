import { Clock, DollarSign, Leaf, ShieldCheck } from "lucide-react";
import { fmtUSD } from "@/lib/dhow-data";
import type { Plan } from "@/lib/dhow-plan";
import { AIBadge, Meter, Panel } from "./ui";

const pct = (n: number) => `${Math.round(n)}%`;

export function RouteResults({ plan }: { plan: Plan }) {
  const { options, risks } = plan;
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Corridor: <span className="font-medium text-foreground">{plan.corridor}</span></p>
      <div className="grid gap-3 md:grid-cols-3">
        {options.map((o) => {
          const best = o.key === "C";
          return (
            <div key={o.key} className={`animate-fade-up rounded-xl border p-4 shadow-card ${best ? "border-gold bg-gold/10 shadow-gold dark:bg-gradient-navy dark:text-navy-foreground" : "bg-card"}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${best ? "text-gold" : "text-muted-foreground"}`}>OPTION {o.key}</span>
                {best && <AIBadge>Recommended</AIBadge>}
              </div>
              <h3 className="mt-1 font-semibold">{o.name}</h3>
              <p className={`text-xs ${best ? "text-muted-foreground dark:text-navy-foreground/60" : "text-muted-foreground"}`}>via {o.via}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {([
                  [Clock, `${Math.round(o.days)}d`, "Transit"],
                  [DollarSign, fmtUSD(o.cost), "Cost"],
                  [Leaf, `${o.co2.toFixed(1)}t`, "CO₂"],
                ] as const).map(([Icon, v, l]) => (
                  <div key={l} className={`rounded-lg p-2 ${best ? "bg-card/70 dark:bg-navy-foreground/5" : "bg-muted"}`}>
                    <Icon className={`mx-auto size-3.5 ${best ? "text-gold" : "text-muted-foreground"}`} />
                    <div className="mt-1 truncate font-mono text-sm font-semibold">{v}</div>
                    <div className="text-[10px] opacity-60">{l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs">
                <ShieldCheck className={`size-3.5 ${best ? "text-gold" : "text-success"}`} /> Reliability score <b className="ml-auto font-mono">{pct(o.reliability)}</b>
              </div>
            </div>
          );
        })}
      </div>
      <Panel title="Risk & Disruption Index" action={<AIBadge>AI calculated</AIBadge>}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Meter label="Port congestion probability" value={Math.round(risks.congestion)} />
          <Meter label="Customs delay probability" value={Math.round(risks.customs)} />
          <Meter label="Chokepoint / weather risk" value={Math.round(risks.weather)} />
        </div>
        <p className="mt-4 rounded-lg border border-gold/20 bg-gold/5 p-3 text-xs leading-relaxed text-muted-foreground"><b className="text-gold-2">Intelligence briefing · </b>{risks.briefing}</p>
      </Panel>
    </div>
  );
}
