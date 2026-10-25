import { Clock, DollarSign, Leaf, ShieldCheck } from "lucide-react";
import { optimize, fmtUSD, type CargoForm } from "@/lib/dhow-data";
import { AIBadge, Meter, Panel } from "./ui";

export function RouteResults({ form }: { form: CargoForm }) {
  const { options, risk } = optimize(form);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {options.map((o) => {
          const best = o.key === "C";
          return (
            <div key={o.key} className={`animate-fade-up rounded-xl border p-4 shadow-card ${best ? "border-gold bg-gradient-navy text-navy-foreground shadow-gold" : "bg-card"}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${best ? "text-gold" : "text-muted-foreground"}`}>OPTION {o.key}</span>
                {best && <AIBadge>Recommended</AIBadge>}
              </div>
              <h3 className="mt-1 font-semibold">{o.name}</h3>
              <p className={`text-xs ${best ? "text-navy-foreground/60" : "text-muted-foreground"}`}>via {o.via}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  [Clock, `${o.days}d`, "Transit"],
                  [DollarSign, fmtUSD(o.cost), "Cost"],
                  [Leaf, `${o.co2}t`, "CO₂"],
                ].map(([I, v, l], i) => {
                  const Icon = I as typeof Clock;
                  return (
                    <div key={i} className={`rounded-lg p-2 ${best ? "bg-navy-foreground/5" : "bg-muted"}`}>
                      <Icon className={`mx-auto size-3.5 ${best ? "text-gold" : "text-muted-foreground"}`} />
                      <div className="mt-1 font-mono text-sm font-semibold">{v as string}</div>
                      <div className="text-[10px] opacity-60">{l as string}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs">
                <ShieldCheck className={`size-3.5 ${best ? "text-gold" : "text-success"}`} /> Reliability score <b className="ml-auto font-mono">{o.reliability}%</b>
              </div>
            </div>
          );
        })}
      </div>
      <Panel title="Risk & Disruption Index" action={<AIBadge>AI calculated</AIBadge>}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Meter label="Port congestion probability" value={risk.congestion} />
          <Meter label="Customs delay probability" value={risk.customs} />
          <Meter label="Weather / chokepoint risk" value={risk.weather} />
        </div>
      </Panel>
    </div>
  );
}
