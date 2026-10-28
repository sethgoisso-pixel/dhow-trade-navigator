import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, Loader2, FileCheck, ShieldAlert, DollarSign, Layers } from "lucide-react";
import { fetchLiveFxRates, type FxRates } from "@/lib/dhow-fx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AIBadge, Panel, PageTitle } from "@/components/dhow/ui";
import { classifyCommodity, type CustomsResult } from "@/lib/dhow-ai.functions";
import { useDhow } from "@/lib/dhow-store";
import { seo } from "@/lib/seo";
import { toast } from "sonner";

export const Route = createFileRoute("/customs")({
  head: () =>
    seo(
      "Smart Customs, HS Code & Compliance — Dhow",
      "Instant real-time HS code classification, official WCO tariff schedules, and automated duty calculations powered by Dhow AI."
    ),
  component: Customs,
});

export function ComplianceBlock({ query, value }: { query: string; value: number }) {
  return null;
}

function Customs() {
  const { form } = useDhow();
  const [q, setQ] = useState("industrial solar photovoltaic panels");
  const [destination, setDestination] = useState(form.destination || "Dubai (Jebel Ali / DXB)");
  const [value, setValue] = useState(250000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CustomsResult | null>(null);
  const [fx, setFx] = useState<FxRates | null>(null);

useEffect(() => {
  fetchLiveFxRates().then(setFx).catch(() => null);
}, []);
  

  const handleClassify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await classifyCommodity({
        data: {
          query: q.trim(),
          destination: destination.trim() || "Dubai (Jebel Ali)",
          declaredValue: value || 10000,
        },
      });
      setResult(res);
      toast.success(`Classified as HS ${res.hsCode}`, { description: res.description });
    } catch (err) {
      toast.error("Erreur de classification", {
        description: err instanceof Error ? err.message : "Vérifiez la connexion ou les crédits IA.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageTitle
        title="Smart Customs, HS Code & Compliance Engine"
        sub="Describe any commercial commodity — Dhow identifies the 6-digit WCO tariff code and computes real landed duties for your port."
      />

      <Panel title="Live WCO Commodity Classification" icon={<Search className="size-4" />}>
        <form onSubmit={handleClassify} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-6">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Product Description</label>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g. lithium battery packs, organic green coffee, copper cathodes…"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Destination Port / Hub</label>
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Jebel Ali, Rotterdam, Lagos…"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">CIF Declared Value ($ USD)</label>
              <Input
                type="number"
                min="100"
                value={value}
                onChange={(e) => setValue(+e.target.value || 0)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-muted-foreground">
              Official World Customs Organization (WCO) nomenclature · Real-time inference
            </span>
            <Button type="submit" disabled={loading || !q.trim()} className="bg-gradient-gold text-navy font-semibold">
              {loading ? <><Loader2 className="size-4 animate-spin" /> Classifying…</> : "Classify & Compute Duties"}
            </Button>
          </div>
        </form>
      </Panel>

      {result && (
        <div className="mt-4 space-y-4 animate-fade-up">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gold/40 bg-card p-4 shadow-card md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl font-bold text-gold-2 sm:text-3xl">
                  HS {result.hsCode}
                </span>
                <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold-2">
                  Confidence: {result.confidence}%
                </span>
              </div>
              <h3 className="mt-2 text-base font-semibold">{result.description}</h3>
              <p className="mt-1 text-xs text-muted-foreground">Category: {result.category}</p>

              <div className="mt-4 rounded-lg border border-border/80 bg-accent/40 p-3">
                            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <DollarSign className="size-4 text-gold-2" /> Total Landed Duties
              </span>
              {fx && (
                <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-mono text-gold-2">
                  Live FX: 1$ = {fx.rates.AED?.toFixed(2) ?? "3.67"} AED
                </span>
              )}
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-foreground">
              ${result.totalDuties.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            {fx && (
              <div className="mt-1 flex flex-wrap gap-2 text-xs font-mono text-gold-2">
                <span>≈ {(result.totalDuties * (fx.rates.AED ?? 3.6725)).toLocaleString("en-US", { maximumFractionDigits: 0 })} AED</span>
                <span>·</span>
                <span>≈ €{(result.totalDuties * (fx.rates.EUR ?? 0.898)).toLocaleString("en-US", { maximumFractionDigits: 0 })} EUR</span>
              </div>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">Based on CIF ${value.toLocaleString("en-US")} USD</p>


              <div className="mt-4 space-y-2 border-t pt-3">
                {result.tariffs.map((t, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t.label} ({t.rate})</span>
                    <span className="font-mono font-medium">${t.amount.toLocaleString("en-US")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Panel title="Mandatory Regulatory Documentation for Clearance" icon={<FileCheck className="size-4" />}>
            <div className="grid gap-2 sm:grid-cols-2">
              {result.requiredDocuments.map((doc, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-border/60 bg-accent/20 p-2.5 text-xs">
                  <span className="grid size-5 place-items-center rounded-full bg-gold/10 font-mono text-[10px] text-gold-2">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-foreground">{doc}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
