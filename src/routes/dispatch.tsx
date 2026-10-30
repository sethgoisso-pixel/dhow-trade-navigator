import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X, ArrowUpRight, ShieldCheck, Clock, Send, Copy, Code, Radio } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AIBadge, Panel, PageTitle } from "@/components/dhow/ui";
import { resolveDispatch, useDhow, type Dispatch } from "@/lib/dhow-store";
import { buildTMSPayload, sendTMSWebhook, type TMSPayload } from "@/lib/dhow-tms";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/dispatch")({
  head: () => seo("Autonomous Dispatch — Dhow", "Review and execute AI-prepared carrier bookings and customs pre-filings with outbound TMS webhooks."),
  component: DispatchPage,
});

function DispatchPage() {
  const { dispatches } = useDhow();
  const pendingCount = dispatches.filter((d) => d.status === "pending").length;

  const [webhookUrl, setWebhookUrl] = useState("https://httpbin.org/post");
  const [activePayload, setActivePayload] = useState<{ id: string; data: TMSPayload } | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleApprove = async (d: Dispatch) => {
    resolveDispatch(d.id, "approved");
    const payload = buildTMSPayload(d);
    setActivePayload({ id: d.id, data: payload });

    if (webhookUrl.trim()) {
      setSendingId(d.id);
      const res = await sendTMSWebhook(webhookUrl.trim(), payload);
      setSendingId(null);
      if (res.ok) {
        toast.success("TMS Webhook Dispatched", { description: `${d.id} sent to ${webhookUrl}` });
      } else {
        toast.info("Dossier Approved & Locked", { description: `TMS notice: ${res.message}` });
      }
    } else {
      toast.success("Dossier Approved & Locked", { description: `${d.id} audit record generated` });
    }
  };

  const copyPayload = () => {
    if (!activePayload) return;
    navigator.clipboard.writeText(JSON.stringify(activePayload.data, null, 2));
    toast.success("TMS JSON payload copied to clipboard");
  };

  return (
    <>
      <PageTitle
        title="Autonomous Dispatch Tower"
        sub="Human-in-the-Loop Operations: Approve carrier slot allocations, lock freight rates, and stream IATA ONE Record events to outbound TMS."
      />

      {/* Configuration Webhook TMS Outbound */}
      <Panel className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Radio className="size-4 text-gold-2 animate-pulse" />
              <span className="text-xs font-semibold text-foreground">Outbound TMS Webhook Relay</span>
              <AIBadge>UN/CEFACT & IATA ONE Record</AIBadge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Approved actions trigger an authenticated JSON-LD POST request to your Freight Forwarding or Port Community System (CargoWise, SAP TM, Mirsal II).
            </p>
          </div>
          <div className="flex items-center gap-2 sm:w-80">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://tms.carrier.com/api/v1/dispatch"
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-gold-2 focus:outline-none"
            />
          </div>
        </div>
      </Panel>

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
                        {d.status === "pending" ? "Pending Sign-off" : d.status === "approved" ? "Locked & Signed" : "Declined"}
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
                        disabled={sendingId === d.id}
                        onClick={() => handleApprove(d)}
                      >
                        <Check className="mr-1 size-3.5" />
                        {sendingId === d.id ? "Relaying…" : "Approve & Lock"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 sm:self-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
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

                      {d.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          onClick={() => setActivePayload({ id: d.id, data: buildTMSPayload(d) })}
                        >
                          <Code className="mr-1 size-3" /> Payload
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Inspecteur de Payload JSON */}
                {activePayload?.id === d.id && (
                  <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-xs">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold text-gold-2">
                        IATA ONE Record Payload ({activePayload.data.auditSignature})
                      </span>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={copyPayload}>
                        <Copy className="mr-1 size-3" /> Copy JSON
                      </Button>
                    </div>
                    <pre className="max-h-48 overflow-x-auto rounded bg-background/80 p-2 font-mono text-[10px] text-muted-foreground">
                      {JSON.stringify(activePayload.data, null, 2)}
                    </pre>
                  </div>
                )}
              </Panel>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
