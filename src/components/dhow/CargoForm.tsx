import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CARGO_TYPES, PORTS } from "@/lib/dhow-data";
import { runAgent, setForm, useDhow } from "@/lib/dhow-store";

export function CargoFormPanel() {
  const { form, running } = useDhow();
  const pick = (k: "origin" | "destination" | "cargoType", opts: string[], label: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={form[k]} onValueChange={(v) => setForm({ [k]: v })}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => { e.preventDefault(); runAgent(null); }}
    >
      {pick("origin", PORTS, "Origin port / city")}
      {pick("destination", PORTS, "Destination port / city")}
      {pick("cargoType", CARGO_TYPES, "Cargo type")}
      <div className="space-y-1.5"><Label className="text-xs">Weight (tons)</Label><Input type="number" min={0.1} step="0.1" value={form.weight} onChange={(e) => setForm({ weight: +e.target.value || 0 })} /></div>
      <div className="space-y-1.5"><Label className="text-xs">Volume (CBM)</Label><Input type="number" min={1} value={form.volume} onChange={(e) => setForm({ volume: +e.target.value || 0 })} /></div>
      <div className="space-y-1.5"><Label className="text-xs">Target deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ deadline: e.target.value })} /></div>
      <Button type="submit" disabled={running} className="shadow-gold sm:col-span-2 lg:col-span-3">
        <Sparkles /> {running ? "Agent reasoning…" : "Run Dhow Optimizer"}
      </Button>
    </form>
  );
}
