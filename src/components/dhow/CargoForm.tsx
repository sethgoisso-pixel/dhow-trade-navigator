import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CARGO_TYPES, PORTS } from "@/lib/dhow-data";
import { runAgent, setForm, useDhow } from "@/lib/dhow-store";

export function CargoFormPanel() {
  const { form, running, thinking } = useDhow();
  const text = (k: "origin" | "destination" | "cargoType", label: string, list: string, ph: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input required list={list} value={form[k]} placeholder={ph} onChange={(e) => setForm({ [k]: e.target.value })} />
    </div>
  );
  const num = (k: "weight" | "volume" | "declaredValue", label: string, step = "1") => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" min={0} step={step} value={form[k]} onChange={(e) => setForm({ [k]: +e.target.value || 0 })} />
    </div>
  );
  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => { e.preventDefault(); void runAgent(null); }}
    >
      <datalist id="dhow-ports">{PORTS.map((p) => <option key={p} value={p} />)}</datalist>
      <datalist id="dhow-cargo">{CARGO_TYPES.map((p) => <option key={p} value={p} />)}</datalist>
      {text("origin", "Origin (city, country)", "dhow-ports", "e.g. Douala, Cameroon")}
      {text("destination", "Destination (city, country)", "dhow-ports", "e.g. Frankfurt, Germany")}
      {text("cargoType", "Cargo description", "dhow-cargo", "e.g. 50t Green Coffee Beans")}
      {num("weight", "Weight (metric tons)", "0.1")}
      {num("volume", "Volume (CBM)")}
      {num("declaredValue", "Declared value (USD)", "100")}
      <Button type="submit" disabled={running} className="shadow-gold sm:col-span-2 lg:col-span-3">
        <Sparkles /> {thinking ? "AI navigator planning…" : running ? "Agent reasoning…" : "Run Dhow AI Navigator"}
      </Button>
    </form>
  );
}
