import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocGenerator } from "@/components/dhow/DocGenerator";
import { AIBadge, Panel, PageTitle } from "@/components/dhow/ui";
import { HS_DB, classifyHS, dutyBreakdown, fmtUSD } from "@/lib/dhow-data";
import { useDhow } from "@/lib/dhow-store";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/customs")({
  head: () => seo("Customs, HS Code & Compliance — Dhow", "Instant HS code classification, duty and tariff breakdowns, and 1-click trade document generation."),
  component: Customs,
});

export function ComplianceBlock({ query, value }: { query: string; value: number }) {
  const { form } = useDhow();
  const results = classifyHS(query);
  const top = results[0] ?? { ...HS_DB[0]!, confidence: 0 };
  const rows = dutyBreakdown(top, form.destination, value);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={`Duty & Tariff Breakdown — ${form.destination}`} action={<AIBadge>HS {top.code}</AIBadge>}>
        <Table>
          <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.label}><TableCell>{r.label}</TableCell><TableCell className="font-mono text-xs">{r.rate}</TableCell><TableCell className="text-right font-mono">{fmtUSD(r.amount)}</TableCell></TableRow>
            ))}
            <TableRow className="bg-accent font-semibold"><TableCell colSpan={2}>Total landed charges</TableCell><TableCell className="text-right font-mono text-gold-2">{fmtUSD(total)}</TableCell></TableRow>
          </TableBody>
        </Table>
        <p className="mt-2 text-[11px] text-muted-foreground">Based on declared CIF value of {fmtUSD(value)}.</p>
      </Panel>
      <DocGenerator form={form} hs={top} value={value} />
    </div>
  );
}

function Customs() {
  const { scenario } = useDhow();
  const [q, setQ] = useState(scenario?.hsQuery ?? "solar panels");
  const [value, setValue] = useState(scenario?.value ?? 312000);
  const results = classifyHS(q);
  return (
    <>
      <PageTitle title="Smart Customs, HS Code & Compliance" sub="Describe a product — Dhow classifies it and computes landed costs for the destination." />
      <Panel title="Instant HS Code Classification" icon={<Search className="size-4" />}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. lithium battery, smartphones, steel rebar…" className="flex-1" />
          <Input type="number" value={value} onChange={(e) => setValue(+e.target.value || 0)} className="sm:w-44" aria-label="CIF value (USD)" />
        </div>
        <div className="mt-4 space-y-2">
          {results.length === 0 && <p className="text-sm text-muted-foreground">No match yet — try "solar", "phone", "rice", "excavator"…</p>}
          {results.slice(0, 3).map((r, i) => (
            <div key={r.code} className={`animate-fade-up flex items-center gap-3 rounded-lg border p-3 ${i === 0 ? "border-gold bg-accent" : ""}`}>
              <span className="font-mono font-semibold">{r.code}</span>
              <span className="flex-1 text-sm">{r.description}</span>
              <div className="w-24 text-right">
                <div className="font-mono text-sm font-semibold">{r.confidence.toFixed(1)}%</div>
                <div className="mt-1 h-1 rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-gold" style={{ width: `${r.confidence}%` }} /></div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <div className="mt-4"><ComplianceBlock query={q} value={value} /></div>
    </>
  );
}
