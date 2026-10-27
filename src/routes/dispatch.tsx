import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIBadge, Panel, PageTitle } from "@/components/dhow/ui";
import { resolveDispatch, useDhow } from "@/lib/dhow-store";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/dispatch")({
  head: () => seo("Autonomous Dispatch — Dhow", "Review and approve bookings, reroutes and customs filings proposed by the Dhow AI agent."),
  component: DispatchPage,
});

function DispatchPage() {
  const { dispatches } = useDhow();
  return (
    <>
      <PageTitle title="Autonomous Dispatch" sub="Actions the agent has prepared. Approve to execute instantly with carriers and customs." />
      <div className="space-y-4">
        {dispatches.length === 0 ? (
          <Panel>
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-gold/10 text-gold-2">
                <Check className="size-6" />
              </div>
              <h3 className="text-base font-semibold">No Pending Operational Actions</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                The operations queue is clear. When the AI agent identifies carrier booking optimizations, multimodal reroutes, or customs filings requiring operator sign-off, they will appear here.
              </p>
              <div className="mt-6">
                <Link to="/optimizer" className="inline-flex items-center rounded-xl bg-gradient-gold px-4 py-2 text-xs font-semibold text-navy shadow-gold hover:opacity-95">
                  Launch Route Optimizer
                </Link>
              </div>
            </div>
          </Panel>
        ) : (
          <div className="space-y-3">
            {dispatches.map((d) => (
              <Panel key={d.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{d.id}</span>
                      <AIBadge>Proposed</AIBadge>
                    </div>
                    <h3 className="mt-1 font-semibold">{d.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {d.detail} · <span className="font-medium text-gold-2">{d.saving}</span>
                    </p>
                  </div>
                  {d.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => resolveDispatch(d.id, "rejected")}>
                        <X /> Reject
                      </Button>
                      <Button size="sm" onClick={() => resolveDispatch(d.id, "approved")}>
                        <Check /> Approve
                      </Button>
                    </div>
                  ) : (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${d.status === "approved" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {d.status === "approved" ? "Executed" : "Rejected"}
                    </span>
                  )}
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
