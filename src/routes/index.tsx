import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Container, TrendingDown, Workflow } from "lucide-react";
import { RouteMap } from "@/components/dhow/RouteMap";
import { EventStream } from "@/components/dhow/EventStream";
import { AIBadge, PageTitle } from "@/components/dhow/ui";
import { useDhow } from "@/lib/dhow-store";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => seo("Mission Control — Dhow AI Logistics Agent", "Live overview of shipments, savings, customs times and autonomous dispatches across Dubai, Asia and Africa."),
  component: MissionControl,
});

function MissionControl() {
  const { dispatches } = useDhow();
  const pending = dispatches.filter((d) => d.status === "pending").length;
  const kpis = [
    { icon: Container, label: "Active Shipments Monitored", value: "24", unit: "Containers", note: "+3 this week" },
    { icon: TrendingDown, label: "Average Transit Cost Saved", value: "-18.4%", unit: "vs Spot Rate", note: "$212k saved YTD", gold: true },
    { icon: Clock, label: "Customs Clearance Time", value: "4.2", unit: "hrs", note: "vs 5 days standard" },
    { icon: Workflow, label: "Dispatches Pending Approval", value: String(pending), unit: "actions", note: "Review now →", link: true },
  ];
  return (
    <>
      <PageTitle title="Mission Control" sub="Your autonomous agent is monitoring the Asia → Dubai → Africa corridors in real time." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const body = (
            <div className="animate-fade-up h-full rounded-xl border bg-card p-4 shadow-card transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <k.icon className="size-4 text-muted-foreground" />
                {k.gold && <AIBadge />}
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className={`font-mono text-2xl font-bold sm:text-3xl ${k.gold ? "text-gold-2" : ""}`}>{k.value}</span>
                <span className="text-xs text-muted-foreground">{k.unit}</span>
              </div>
              <div className="mt-1 text-xs font-medium sm:text-sm">{k.label}</div>
              <div className={`mt-1 text-[11px] ${k.link ? "text-gold-2" : "text-muted-foreground"}`}>{k.note}</div>
            </div>
          );
          return k.link ? <Link key={k.label} to="/dispatch">{body}</Link> : <div key={k.label}>{body}</div>;
        })}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3"><RouteMap /></div>
        <EventStream className="h-80 lg:col-span-2 lg:h-auto" />
      </div>
    </>
  );
}
