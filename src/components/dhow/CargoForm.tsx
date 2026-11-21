import { useRef, useState } from "react";
import { Sparkles, Check, AlertCircle, HelpCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CARGO_TYPES, PORTS } from "@/lib/dhow-data";
import { runAgent, setForm, useDhow, getVisitorId } from "@/lib/dhow-store";
import { formFromExtraction } from "@/lib/dhow-extract";
import { extractShipment, type ExtractionResult } from "@/lib/dhow-ai.functions";

export function CargoFormPanel() {
  const { form, running, thinking } = useDhow();

  const [nlText, setNlText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractionResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const handleExtract = async () => {
    if (!nlText.trim()) return;
    setExtracting(true);
    setConfirmed(false);
    try {
      const res = await extractShipment({ data: { text: nlText.trim(), visitorId: getVisitorId() } });
      setExtracted(res);
    } catch (e) {
      setExtracted({
        success: false,
        fields: { origin: null, destination: null, cargoType: null, weight: null, volume: null, declaredValue: null },
        missingFields: [],
        clarificationQuestion: null,
        summary: "",
        source: "fallback",
        error: "Connection error. You can fill in the form below directly.",
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirm = () => {
    if (!extracted || !extracted.success) return;
    // Every field is replaced. Nothing from an earlier request is kept, and the
    // button is disabled while a required field is missing.
    const values = formFromExtraction(extracted.fields);
    if (!values) return;
    setForm(values);
    setConfirmed(true);
  };

  const text = (k: "origin" | "destination" | "cargoType", label: string, list: string, ph: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input required list={list} value={form[k]} placeholder={ph} onChange={(e) => setForm({ [k]: e.target.value })} />
    </div>
  );

  const num = (k: "weight" | "volume" | "declaredValue", label: string, step = "1") => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        step={step}
        value={form[k] === 0 ? "" : form[k]}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setForm({ [k]: e.target.value === "" ? 0 : +e.target.value })}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Zone en langage naturel */}
      <div className="rounded-2xl border border-gold/30 bg-card/60 backdrop-blur-md p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-gold-2" />
            <span className="text-xs font-semibold text-foreground">Describe your shipment</span>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Gemini 3.1 Flash-Lite</span>
        </div>

        <div className="relative">
        <Textarea
          ref={descriptionRef}
          placeholder="e.g. Solar panels, Shenzhen to Lagos, 20 tonnes in one 20 ft container"
          value={nlText}
          disabled={extracting || running}
          onChange={(e) => { setNlText(e.target.value); setConfirmed(false); setExtracted(null); }}
          className="min-h-[64px] text-xs resize-none pr-12"
        />
        {nlText.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear shipment description"
            title="Clear shipment description"
            disabled={extracting || running}
            className="absolute right-1 top-1 size-9 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setNlText("");
              setExtracted(null);
              setConfirmed(false);
              descriptionRef.current?.focus();
            }}
          >
            <X className="size-4" />
          </Button>
        )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            disabled={extracting || !nlText.trim() || running}
            onClick={() => void handleExtract()}
            className="text-xs h-8 shadow-gold"
          >
            {extracting ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {extracting ? "Reading your request\u2026" : "Analyze shipment"}
          </Button>
          {confirmed && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <Check className="size-3.5" /> Confirmed and copied into the form
            </span>
          )}
        </div>

        {/* Message d'erreur ou quota atteint */}
        {extracted && !extracted.success && extracted.error && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-foreground">
            <AlertCircle className="size-4 shrink-0 text-amber-400 mt-0.5" />
            <span>{extracted.error}</span>
          </div>
        )}

        {/* Question de clarification si information manquante */}
        {extracted?.success && extracted.clarificationQuestion && (
          <div className="flex items-start gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 p-2.5 text-xs text-foreground">
            <HelpCircle className="size-4 shrink-0 text-sky-400 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-sky-700 dark:text-sky-300">Agent question:</div>
              <div>{extracted.clarificationQuestion}</div>
            </div>
          </div>
        )}

        {/* Récapitulatif compris + bouton Confirmer */}
        {extracted?.success && (
          <div className="space-y-2 rounded-xl border border-border/80 bg-background/50 p-3 text-xs">
            <div className="font-medium text-muted-foreground">What the agent understood:</div>
            <p className="text-foreground">{extracted.summary}</p>
            <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
              {extracted.fields.origin && (
                <span className="rounded-md border border-border px-2 py-0.5 bg-card/80">Origin: <b>{extracted.fields.origin}</b></span>
              )}
              {extracted.fields.destination && (
                <span className="rounded-md border border-border px-2 py-0.5 bg-card/80">Destination: <b>{extracted.fields.destination}</b></span>
              )}
              {extracted.fields.cargoType && (
                <span className="rounded-md border border-border px-2 py-0.5 bg-card/80">Cargo: <b>{extracted.fields.cargoType}</b></span>
              )}
              {extracted.fields.weight && (
                <span className="rounded-md border border-border px-2 py-0.5 bg-card/80">Weight: <b>{extracted.fields.weight} t</b></span>
              )}
              {extracted.fields.volume && (
                <span className="rounded-md border border-border px-2 py-0.5 bg-card/80">Volume: <b>{extracted.fields.volume} CBM</b></span>
              )}
            </div>

            {!confirmed && extracted.missingFields.length > 0 && (
              <p className="pt-1 text-[11px] text-muted-foreground">
                Add the missing detail in your sentence and analyze again, or fill in the form below directly.
              </p>
            )}

            {!confirmed && extracted.missingFields.length === 0 && (
              <div className="pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleConfirm}
                  className="w-full text-xs h-8 border-gold/40 hover:bg-gold/10 hover:text-gold-2 cursor-pointer"
                >
                  <Check className="size-3.5 text-emerald-400" />
                  Confirm these details
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Formulaire manuel classique conservé */}
      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => { e.preventDefault(); void runAgent(null); }}
      >
        <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-2 pb-1 border-b border-border/50">
          <span className="text-xs font-medium text-muted-foreground">Quick Manifests:</span>
          <button
            type="button"
            disabled={running}
            onClick={() =>
              setForm({
                origin: "Shenzhen, China",
                destination: "Rotterdam, Netherlands",
                cargoType: "Solar Photovoltaic Arrays (Mono PERC)",
                weight: 420,
                volume: 1350,
                declaredValue: 1420000,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 py-1 text-xs font-medium transition hover:border-gold hover:text-gold-2 cursor-pointer"
          >
            <span>{"\u2600\uFE0F"}</span>
            <span>Shenzhen {"\u2192"} Rotterdam (Solar Modules {"\u00B7"} $1.4M)</span>
          </button>
          <button
            type="button"
            disabled={running}
            onClick={() =>
              setForm({
                origin: "Dubai, UAE",
                destination: "Mombasa, Kenya",
                cargoType: "Pharmaceutical Cold Chain (Vaccines 2-8\u00B0C)",
                weight: 18,
                volume: 45,
                declaredValue: 650000,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 py-1 text-xs font-medium transition hover:border-gold hover:text-gold-2 cursor-pointer"
          >
            <span>{"\u2744\uFE0F"}</span>
            <span>Dubai {"\u2192"} Mombasa (Medical Cold-Chain {"\u00B7"} $650k)</span>
          </button>
        </div>

        <datalist id="dhow-ports">{PORTS.map((p) => <option key={p} value={p} />)}</datalist>
        <datalist id="dhow-cargo">{CARGO_TYPES.map((p) => <option key={p} value={p} />)}</datalist>
        {text("origin", "Origin (city, country)", "dhow-ports", "e.g. Douala, Cameroon")}
        {text("destination", "Destination (city, country)", "dhow-ports", "e.g. Frankfurt, Germany")}
        {text("cargoType", "Cargo description", "dhow-cargo", "e.g. 50t Green Coffee Beans")}
        {num("weight", "Weight (metric tons)", "0.1")}
        {num("volume", "Volume (CBM), optional")}
        {num("declaredValue", "Declared value (USD), optional for common commodities", "100")}
        <Button type="submit" disabled={running} className="shadow-gold sm:col-span-2 lg:col-span-3">
          <Sparkles /> {thinking ? "AI navigator planning\u2026" : running ? "Agent reasoning\u2026" : "Run Dhow AI Navigator"}
        </Button>
      </form>
    </div>
  );
}
