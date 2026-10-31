import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Plan, PlanSource } from "./dhow-plan";
import { runAgentLoop, runToolPipeline, type ModelJSON } from "./agent/agent";
import type { TraceEvent } from "./agent/types";
import { checkDutyRate, estimateLanded, hsDescription, isKnownHs, formatHs, normalizeHs, screenCompliance, searchHS } from "./agent/tools";
import { lookupCity } from "./dhow-plan";
import { fetchMaritimeWeather, toSeaState } from "./dhow-weather";

const Input = z.object({
  origin: z.string().min(2).max(120),
  destination: z.string().min(2).max(120),
  cargoType: z.string().min(2).max(200),
  weight: z.number().positive().max(100000),
  volume: z.number().positive().max(100000),
  declaredValue: z.number().nonnegative().max(1e10),
  deadline: z.string().max(20),
});

export type AgentResponse = {
  plan: Plan | null;
  source: PlanSource;
  note: string | null;
  error: string | null;
  trace: TraceEvent[];
};

/** One structured model call through the Lovable AI Gateway (streamed, strict JSON schema). */
async function callModelJSON(apiKey: string, req: Parameters<ModelJSON>[0]): Promise<unknown> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, Authorization: `Bearer ${apiKey}`, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      instructions: req.instructions,
      input: req.input,
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: req.schemaName, strict: true, schema: req.schema } },
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    console.error("Dhow AI gateway error", res.status, body.slice(0, 300));
    throw new Error(res.status === 402 ? "AI credits exhausted" : res.status === 429 ? "AI rate limited" : `AI unavailable (${res.status})`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, i);
      buf = buf.slice(i + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        const ev = JSON.parse(raw) as { type?: string; delta?: string };
        if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
        if (ev.type === "response.refusal.delta" || ev.type === "response.failed" || ev.type === "error") throw new Error("AI declined or failed");
      }
    }
  }
  return JSON.parse(text) as unknown;
}

/**
 * Protects the demo's AI credits: at most DEMO_AI_RUNS_PER_HOUR agent runs per hour per server instance.
 * Beyond that the app still works, using the tool pipeline without AI.
 */
const DEMO_AI_RUNS_PER_HOUR = 40;
let bucket = { hour: -1, used: 0 };
function allowAiRun(): boolean {
  const hour = Math.floor(Date.now() / 3_600_000);
  if (bucket.hour !== hour) bucket = { hour, used: 0 };
  if (bucket.used >= DEMO_AI_RUNS_PER_HOUR) return false;
  bucket.used++;
  return true;
}

export const planShipment = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<AgentResponse> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    const sea = toSeaState(await fetchMaritimeWeather().catch(() => []));
    let note: string | null = null;
    if (!apiKey) note = "AI not configured";
    else if (!allowAiRun()) note = "Demo AI quota reached for this hour";
    else {
      try {
        const r = await runAgentLoop(data, (req) => callModelJSON(apiKey, req), { sea });
        if (r.ok) return { plan: r.plan, source: "ai", note: null, error: null, trace: r.trace };
        note = r.error;
      } catch (e) {
        note = e instanceof Error ? e.message : "AI unavailable";
      }
    }
    const p = runToolPipeline(data, { sea });
    if (p.ok) return { plan: p.plan, source: "tools", note: `${note} — ran the tool pipeline without AI`, error: null, trace: p.trace };
    return { plan: null, source: "tools", note, error: p.error, trace: p.trace };
  });

// --- Ajout à coller à la fin de src/lib/dhow-ai.functions.ts ---

const CustomsInput = z.object({
  query: z.string().min(2).max(200),
  destination: z.string().min(2).max(100),
  declaredValue: z.number().nonnegative().max(1e10),
});

export type CustomsResult = {
  hsCode: string;
  description: string;
  category: string;
  confidence: number;
  regulatoryNotes: string;
  tariffs: Array<{ label: string; rate: string; amount: number }>;
  totalDuties: number;
  requiredDocuments: string[];
  /** "ai" when the model chose among verified candidates, "tools" when no AI was involved. */
  source: "ai" | "tools";
  /** What was verified and what is assumed, shown to the user. */
  notes: string[];
};

const CLASSIFY_SCHEMA = {
  type: "object",
  properties: {
    hs_code: { type: "string" },
    category: { type: "string" },
    duty_rate_percent: { type: "number" },
    regulatory_notes: { type: "string" },
    required_documents: { type: "array", items: { type: "string" } },
  },
  required: ["hs_code", "category", "duty_rate_percent", "regulatory_notes", "required_documents"],
  additionalProperties: false,
} as const;

const BASE_DOCS = ["Commercial invoice", "Packing list", "Bill of lading or air waybill", "Certificate of origin (needed to claim preferential duty)"];

/**
 * Classifies a product. The model only chooses among real HS-2022 candidates and proposes a duty band;
 * the code is verified against the nomenclature and every amount is computed by the tools, not by the model.
 */
export const classifyCommodity = createServerFn({ method: "POST" })
  .inputValidator((d) => CustomsInput.parse(d))
  .handler(async ({ data }): Promise<CustomsResult> => {
    const dest = lookupCity(data.destination);
    if (!dest) throw new Error(`Dhow does not know "${data.destination}" yet. Try a major port or city, for example Jebel Ali, Dubai, Cotonou, Lagos, Mombasa or Rotterdam.`);
    const candidates = searchHS(data.query, 8);
    if (candidates.length === 0) throw new Error(`No HS subheading matches "${data.query}". Describe the product in more detail.`);

    let pick = candidates[0]!;
    let proposedDuty: number | null = null;
    let category = `HS chapter ${pick.code.slice(0, 2)}`;
    let aiNotes = "";
    let aiDocs: string[] = [];
    let source: "ai" | "tools" = "tools";
    const notes: string[] = [];

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (apiKey && allowAiRun()) {
      try {
        const raw = (await callModelJSON(apiKey, {
          schemaName: "dhow_classification",
          schema: CLASSIFY_SCHEMA,
          instructions: `You are a customs classification assistant. You receive a product description, a destination, and a list of real HS-2022 candidate subheadings found by a search tool. Choose the best candidate by reading its full description (mind phrases such as "other than" and "not assembled"). Never output a code that is not in the candidate list. Propose the import duty rate as a band of the destination's customs union (ECOWAS CET 0/5/10/20/35, GCC 0/5, EAC 0/10/25/35, CEMAC 0/5/10/20/30). Write 2 sentences of regulatory notes (permits, standards, conformity marking) and list the documents needed for clearance. Be explicit when you are unsure.`,
          input: `Product: "${data.query}"\nDestination: ${data.destination} (${dest.country})\nCandidates:\n${candidates.map((c) => `${c.code} | ${c.description}`).join("\n")}`,
        })) as { hs_code?: unknown; category?: unknown; duty_rate_percent?: unknown; regulatory_notes?: unknown; required_documents?: unknown };
        const code = typeof raw.hs_code === "string" ? formatHs(normalizeHs(raw.hs_code)) : "";
        const chosen = candidates.find((c) => c.code === code);
        if (chosen && isKnownHs(code)) {
          pick = chosen;
          source = "ai";
          if (typeof raw.duty_rate_percent === "number") proposedDuty = raw.duty_rate_percent;
          if (typeof raw.category === "string" && raw.category.trim()) category = raw.category.trim().slice(0, 120);
          if (typeof raw.regulatory_notes === "string") aiNotes = raw.regulatory_notes.trim().slice(0, 600);
          if (Array.isArray(raw.required_documents)) aiDocs = raw.required_documents.filter((x): x is string => typeof x === "string").slice(0, 8);
        } else {
          notes.push("The model proposed a code outside the verified candidates, so the top search match was used.");
        }
      } catch (e) {
        notes.push(`${e instanceof Error ? e.message : "AI unavailable"}: used the search match without AI.`);
      }
    } else if (!apiKey) {
      notes.push("AI not configured: used the search match without AI.");
    } else {
      notes.push("Demo AI quota reached for this hour: used the search match without AI.");
    }

    const defaultBand = ({ AF: 10, ME: 5, EU: 5, AS: 10, AM: 5 } as const)[dest.region];
    const duty = checkDutyRate(dest.country, proposedDuty ?? defaultBand);
    const landed = estimateLanded({ declaredValue: data.declaredValue, dutyRate: duty.rate, country: dest.country, region: dest.region });
    const screen = screenCompliance({ origin: "", destination: data.destination, cargoType: data.query }, pick.code);
    const docs = aiDocs.length ? aiDocs : [...BASE_DOCS];
    if (screen.dangerousGoods) docs.push("Dangerous goods declaration (lithium batteries)");

    notes.unshift(`HS ${pick.code} exists in the WCO HS-2022 nomenclature; the match score measures how well the text matches, not legal certainty.`);
    notes.push(proposedDuty === null ? `Duty ${duty.rate}% is an assumed default band for ${dest.country}.` : duty.note);
    notes.push(...landed.assumptions, "Verify the HS-level tariff with a licensed customs broker before filing.");

    const regulatory = [aiNotes, ...screen.flags, screen.dangerousGoods ?? "", screen.disclaimer].filter(Boolean).join(" ");
    return {
      hsCode: pick.code,
      description: hsDescription(pick.code) ?? pick.description,
      category,
      confidence: Math.round(pick.score * 100),
      regulatoryNotes: regulatory,
      tariffs: landed.lines,
      totalDuties: landed.totalTaxesAndFees,
      requiredDocuments: docs,
      source,
      notes,
    };
  });
