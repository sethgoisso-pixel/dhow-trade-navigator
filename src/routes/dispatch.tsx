import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X, ArrowUpRight, ShieldCheck, Clock } from "lucide-react";
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
  const pendingCount = dispatches.filter((d) => d.status === "pending").length;

  return (
    <>
      <PageTitle
        title="Autonomous Dispatch Tower"
        sub="Human-in-the-Loop Operations: Review and execute AI-prepared carrier bookings and customs pre-filings."
      />

      <div className="space-y-4">
        {dispatches.length === 0 ? (
          <Panel>
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-gold/10 text-gold-2">
                <Check className="size-6" />
              </div>
              <h3 className="text-base font-semibold">No Pending Operational Actions</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                The operations queue is empty. Submit a cargo request in the Route Optimizer to generate real carrier space bookings and digital customs pre-filings.
              </p>
              <div className="mt-6">
                <Link
                  to="/optimizer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-gold px-4 py-2 text-xs font-semibold text-navy shadow-gold hover:opacity-95"
                >
                  Launch Route Optimizer
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </Panel>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
              <span>
                Operations Queue: <b className="text-foreground">{dispatches.length}</b> total · <b className="text-gold-2">{pendingCount} pending</b>
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <ShieldCheck className="size-3.5 text-gold-2" />
                Operator Sign-off Active
              </span>
            </div>

            {dispatches.map((d) => (
              <Panel key={d.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-foreground">{d.id}</span>
                      {d.dossierRef && (
                        <Link
                          to="/dossier/$ref"
                          params={{ ref: d.dossierRef }}
                          className="font-mono text-gold-2 hover:underline inline-flex items-center gap-0.5"
                        >
                          {d.dossierRef}
                          <ArrowUpRight className="size-3" />
                        </Link>
                      )}
                      {d.corridor && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          {d.corridor}
                        </span>
                      )}
                      <AIBadge>
                        {d.status === "pending" ? "Pending Sign-off" : d.status === "approved" ? "Executed" : "Declined"}
                      </AIBadge>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto sm:ml-0">
                        <Clock className="size-3" />
                        {d.createdAt}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-foreground">{d.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {d.detail} · <span className="font-semibold text-gold-2">{d.saving}</span>
                    </p>
                  </div>

                  {d.status === "pending" ? (
                    <div className="flex gap-2 sm:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => resolveDispatch(d.id, "rejected")}
                      >
                        <X className="mr-1 size-3.5" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-gradient-gold text-xs font-semibold text-navy shadow-gold hover:opacity-95"
                        onClick={() => resolveDispatch(d.id, "approved")}
                      >
                        <Check className="mr-1 size-3.5" /> Approve & Lock
                      </Button>
                    </div>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 self-start sm:self-center rounded-full px-3 py-1 text-xs font-semibold ${
                        d.status === "approved"
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {d.status === "approved" ? (
                        <>
                          <Check className="size-3.5" /> Approved by Operator
                        </>
                      ) : (
                        <>
                          <X className="size-3.5" /> Cancelled by Operator
                        </>
                      )}
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
