import { createFileRoute, notFound } from "@tanstack/react-router";
import { RouteResults } from "@/components/dhow/RouteResults";
import { RouteMap } from "@/components/dhow/RouteMap";
import { PlanCompliance } from "@/components/dhow/PlanCompliance";
import { PageTitle } from "@/components/dhow/ui";
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
  notFoundComponent: () => <p className="p-6 text-sm text-muted-foreground">Dossier not found.</p>,
  errorComponent: () => <p className="p-6 text-sm text-muted-foreground">Could not load this dossier.</p>,
  component: DossierPage,
});

function DossierPage() {
  const d = Route.useLoaderData();
  return (
    <>
      <PageTitle title={`Dossier ${d.reference}`} sub={`${d.origin} → ${d.destination} · saved ${new Date(d.created_at).toLocaleString("en-GB")}`} />
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">Corridor: <b className="text-foreground">{d.plan.corridor}</b></p>
        <RouteMap waypoints={d.plan.waypoints} title="Shipment Route" />
        <RouteResults plan={d.plan} />
        <PlanCompliance plan={d.plan} destination={d.destination} />
                {dossier.plan.documents && dossier.plan.documents.length > 0 && (
          <DocGenerator docs={dossier.plan.documents} />
        )}
        
      </div>
    </>
  );
}
