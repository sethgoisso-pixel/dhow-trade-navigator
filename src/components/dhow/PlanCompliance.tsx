import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtUSD } from "@/lib/dhow-data";
import type { Plan } from "@/lib/dhow-plan";
import { DocGenerator } from "./DocGenerator";
import { AIBadge, Panel } from "./ui";

export function PlanCompliance({ plan, destination }: { plan: Plan; destination: string }) {
  const { customs } = plan;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={`Duty & Tariff Breakdown — ${destination}`} action={<AIBadge>HS {customs.hsCode}</AIBadge>}>
        <p className="mb-3 text-xs text-muted-foreground">{customs.description} · confidence <b className="font-mono text-foreground">{customs.confidence.toFixed(1)}%</b></p>
        <Table>
          <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
          <TableBody>
            {customs.tariffs.map((r) => (
              <TableRow key={r.label}><TableCell>{r.label}</TableCell><TableCell className="font-mono text-xs">{r.rate}</TableCell><TableCell className="text-right font-mono">{fmtUSD(r.amount)}</TableCell></TableRow>
            ))}
            <TableRow className="bg-accent font-semibold"><TableCell colSpan={2}>Total landed charges</TableCell><TableCell className="text-right font-mono text-gold-2">{fmtUSD(customs.totalLanded)}</TableCell></TableRow>
          </TableBody>
        </Table>
      </Panel>
      <DocGenerator docs={plan.documents} />
    </div>
  );
}
