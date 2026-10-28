import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Container, TrendingDown, Workflow, ExternalLink, ArrowRight, ShieldCheck } from "lucide-react";
import { RouteMap } from "@/components/dhow/RouteMap";
import { AIBadge, PageTitle, Panel } from "@/components/dhow/ui";
import { useDhow } from "@/lib/dhow-store";
import { listRecentDossiers, type DossierSummary } from "@/lib/dhow-dossiers.functions";
import { seo } from "@/lib/seo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  loader: async () => {
    return await listRecentDossiers().catch(() => [] as DossierSummary[]);
  },
  head: () =>
    seo(
      "Mission Control — Dhow AI Logistics Agent",
      "Live overview of shipments, savings, customs times and autonomous dispatches across Dubai, Asia and Africa."
    ),
  component: MissionControl,
});

function MissionControl() {
  const recentDossiers = Route.useLoaderData();
  const { dispatches, plan, dossierRef } = useDhow();
  const pending = dispatches.filter((d) => d.status === "pending").length;

  const kpis = [
    {
      icon: Container,
      label: "Persisted Trade Dossiers",
      value: String(recentDossiers.length),
      unit: "in Lovable Cloud",
      note: recentDossiers.length > 0 ? "Tamper-proof registry" : "No dossiers saved yet",
      gold: true,
    },
    {
      icon: TrendingDown,
      label: "AI Logistics Engine",
      value: "Online",
      unit: "GPT-6 Astra",
      note: "Lovable AI Gateway · Active",
    },
    {
      icon: Clock,
      label: "Sovereign Hub Protocol",
      value: "Dubai D33",
      unit: "Jebel Ali / DWC",
      note: "Neutral Sea-Air Corridor",
    },
    {
      icon: Workflow,
      label: "Dispatches Pending Approval",
      value: String(pending),
      unit: "orders",
      note: pending > 0 ? "Review now →" : "All dispatches cleared",
      link: true,
    },
  ];

  return (
    <>
      <span className="mb-3 inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-medium text-gold-2 lg:hidden">
        Neutral Trade Corridor · Zero-Knowledge Manifest Privacy
      </span>
      <PageTitle
        title="Mission Control"
        sub="Your autonomous agent is monitoring the Asia → Dubai → Africa corridors in real time."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const body = (
            <div className="animate-fade-up h-full rounded-xl border bg-card p-4 shadow-card transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <k.icon className="size-4 text-muted-foreground" />
                {k.gold && <AIBadge />}
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className={`font-mono text-2xl font-bold sm:text-3xl ${k.gold ? "text-gold-2" : ""}`}>
                  {k.value}
                </span>
                <span className="text-xs text-muted-foreground">{k.unit}</span>
              </div>
              <div className="mt-1 text-xs font-medium sm:text-sm">{k.label}</div>
              <div className={`mt-1 text-[11px] ${k.link ? "text-gold-2 font-medium" : "text-muted-foreground"}`}>
                {k.note}
              </div>
            </div>
          );
          return k.link ? (
            <Link key={k.label} to="/dispatch">
              {body}
            </Link>
          ) : (
            <div key={k.label}>{body}</div>
          );
        })}
      </div>

      <div className="mt-4">
        <RouteMap />
      </div>

      <div className="mt-6">
                <Panel title="Sovereign Trade Dossier Registry">
          <p className="-mt-3 mb-4 text-xs text-muted-foreground">
            Persistent shipment dossiers stored in Lovable Cloud database with cryptographic reference and full audit trail.
          </p>

          {recentDossiers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <ShieldCheck className="mx-auto size-10 text-muted-foreground opacity-50" />
              <h3 className="mt-3 text-sm font-semibold">No dossiers persisted yet</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                Generate your first multimodal route in the Optimizer to create a verified, permanent trade dossier.
              </p>
              <div className="mt-4">
                <Button asChild size="sm" className="bg-gold hover:bg-gold-2 text-navy-dark font-medium">
                  <Link to="/optimizer">
                    Launch Route Optimizer <ArrowRight className="ml-1.5 size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-mono">
                    <th className="pb-2.5 font-medium">DOSSIER REF</th>
                    <th className="pb-2.5 font-medium">CORRIDOR</th>
                    <th className="pb-2.5 font-medium">MODE</th>
                    <th className="pb-2.5 font-medium">SOURCE</th>
                    <th className="pb-2.5 font-medium">DATE</th>
                    <th className="pb-2.5 text-right font-medium">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                                    {recentDossiers.map((d: DossierSummary) => (
                    <tr key={d.reference} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 font-mono font-semibold text-gold-2">
                        <Link to="/dossier/$ref" params={{ ref: d.reference }} className="hover:underline">
                          {d.reference}
                        </Link>
                      </td>
                      <td className="py-3 font-medium text-foreground">
                        {d.origin} → {d.destination}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-[10px]">
                          {d.mode}
                        </span>
                      </td>
                      <td className="py-3 uppercase text-[10px] text-muted-foreground font-mono">
                        {d.source}
                      </td>
                      <td className="py-3 text-muted-foreground font-mono text-[11px]">
                        {new Date(d.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 text-right">
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-gold-2 hover:text-gold">
                          <Link to="/dossier/$ref" params={{ ref: d.reference }}>
                            Inspect <ExternalLink className="ml-1 size-3" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
