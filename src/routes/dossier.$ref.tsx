import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { Download, ShieldCheck, ArrowLeft, ExternalLink, Hash, Clock } from "lucide-react";
import { toast } from "sonner";
import { RouteResults } from "@/components/dhow/RouteResults";
import { RouteMap } from "@/components/dhow/RouteMap";
import { PlanCompliance } from "@/components/dhow/PlanCompliance";
import { PageTitle, Panel, AIBadge } from "@/components/dhow/ui";
import { Button } from "@/components/ui/button";
import { getDossier } from "@/lib/dhow-dossiers.functions";

export const Route = createFileRoute("/dossier/$ref")({
  loader: async ({ params }) => {
    const d = await getDossier({ data: { reference: params.ref } }).catch(() => null);
    if (!d) throw notFound();
    return d;
  },
  head: ({ params }) => ({
    meta: [
      { title: `Dossier ${params.ref} — Dhow` },
      { name: "description", content: "Saved Dhow shipment dossier: route, options, duties and trade documents." },
      { property: "og:title", content: `Dossier ${params.ref} — Dhow` },
      { property: "og:description", content: "Saved Dhow shipment dossier." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  notFoundComponent: () => (
    <div className="p-8 text-center space-y-3">
      <p className="text-sm text-muted-foreground">Trade dossier not found or unindexed.</p>
      <Link to="/" className="text-xs text-gold-2 hover:underline">← Return to Mission Control</Link>
    </div>
  ),
  errorComponent: () => (
    <div className="p-8 text-center space-y-3">
      <p className="text-sm text-muted-foreground">Could not load this dossier from repository.</p>
      <Link to="/" className="text-xs text-gold-2 hover:underline">← Return to Mission Control</Link>
    </div>
  ),
  component: DossierPage,
});

function DossierPage() {
  const d = Route.useLoaderData();

  const exportJSON = () => {
    try {
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${d.reference}-manifest.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Manifest JSON downloaded");
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <>
      <div className="mb-2">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to Mission Control
        </Link>
      </div>

      <PageTitle 
        title={`Dossier ${d.reference}`} 
        sub={`${d.origin} → ${d.destination} · Recorded ${new Date(d.created_at).toLocaleString("en-GB")}`} 
      />

      <div className="space-y-4">
        {/* Institutional Verification Seal */}
        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-gold/10 text-gold-2 shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Verified Sovereign Trade Record</span>
                  <AIBadge>Mirsal II Interoperable</AIBadge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Corridor: <b className="text-foreground">{d.plan.corridor}</b> · Mode: <b className="text-foreground">{d.plan.bestMode}</b> · Source: <b className="font-mono text-foreground">{d.source}</b>
                </p>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={exportJSON} className="gap-1.5 text-xs shrink-0">
              <Download className="size-3.5" />
              Export Manifest (JSON)
            </Button>
          </div>
        </Panel>

        <RouteMap waypoints={d.plan.waypoints} title="Shipment Route" />
        <RouteResults plan={d.plan} />
        <PlanCompliance plan={d.plan} destination={d.destination} />
      </div>
    </>
  );
}
