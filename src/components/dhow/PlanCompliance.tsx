import { AlertTriangle, CheckCircle2, Wrench, ShieldCheck, Brain } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtUSD } from "@/lib/dhow-data";
import type { Plan } from "@/lib/dhow-plan";
import { DocGenerator } from "./DocGenerator";
import { AIBadge, Panel } from "./ui";

function TracePanel({ trace }: { trace: NonNullable<Plan["trace"]> }) {
  const icon = (k: "thought" | "tool" | "check", ok: boolean) =>
    !ok ? <AlertTriangle className="size-3.5 text-amber-500" /> : k === "tool" ? <Wrench className="size-3.5 text-gold-2" /> : k === "check" ? <ShieldCheck className="size-3.5 text-emerald-500" /> : <Brain className="size-3.5 text-muted-foreground" />;
  return (
    <Panel title={`Agent trace — ${trace.length} real steps`} icon={<Wrench className="size-4" />}>
      <ol className="space-y-1.5">
        {trace.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5">{icon(t.kind, t.ok)}</span>
            <span className="flex-1 leading-relaxed">
              {t.tool && <span className="mr-1 rounded bg-accent px-1 font-mono text-[10px] text-gold-2">{t.tool}</span>}
              <span className="text-muted-foreground">{t.summary}</span>
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">{t.ms} ms</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[10px] text-muted-foreground">Each line is a tool call or verification that actually ran. Amounts come from tools, not from the model.</p>
    </Panel>
  );
}

export function PlanCompliance({ plan, destination }: { plan: Plan; destination: string }) {
  const { customs, compliance, trace } = plan;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Duty & Tariff Estimate — ${destination}`} action={<AIBadge>HS {customs.hsCode}</AIBadge>}>
          <p className="mb-3 text-xs text-muted-foreground">
            {customs.description} · match score <b className="font-mono text-foreground">{customs.confidence.toFixed(1)}%</b>
            <span className="ml-1">(text match against HS-2022, not a legal ruling)</span>
          </p>
          <Table>
            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {customs.tariffs.map((r) => (
                <TableRow key={r.label}><TableCell>{r.label}</TableCell><TableCell className="font-mono text-xs">{r.rate}</TableCell><TableCell className="text-right font-mono">{fmtUSD(r.amount)}</TableCell></TableRow>
              ))}
              <TableRow className="bg-accent font-semibold"><TableCell colSpan={2}>Estimated landed charges</TableCell><TableCell className="text-right font-mono text-gold-2">{fmtUSD(customs.totalLanded)}</TableCell></TableRow>
            </TableBody>
          </Table>
          {compliance && (
            <div className={`mt-3 rounded-lg border p-2.5 text-xs ${compliance.verdict === "review_required" ? "border-amber-500/50 bg-amber-500/5" : "border-emerald-500/40 bg-emerald-500/5"}`}>
              <div className="flex items-center gap-1.5 font-medium">
                {compliance.verdict === "review_required" ? <AlertTriangle className="size-4 text-amber-500" /> : <CheckCircle2 className="size-4 text-emerald-500" />}
                {compliance.verdict === "review_required" ? "Review required" : "No red flags in the indicative screen"}
              </div>
              {[...compliance.flags, ...(compliance.dangerousGoods ? [compliance.dangerousGoods] : [])].map((f, i) => (
                <p key={i} className="mt-1 text-muted-foreground">• {f}</p>
              ))}
              <p className="mt-1 text-[10px] text-muted-foreground">{compliance.disclaimer}</p>
            </div>
          )}
        </Panel>
        <DocGenerator docs={plan.documents} />
      </div>
      {trace && trace.length > 0 && <TracePanel trace={trace} />}
    </div>
  );
}
