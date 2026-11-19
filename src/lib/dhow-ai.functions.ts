import { callGeminiChain } from "./dhow-gemini";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { lookupCity, unknownCityMessage, type Plan, type PlanSource } from "./dhow-plan";
import { runAgentLoop, runToolPipeline, type ModelJSON } from "./agent/agent";
import type { TraceEvent } from "./agent/types";
import { clarificationFor, findMissing, normalizeFields } from "./dhow-extract";
import { checkDutyRate, estimateLanded, hsDescription, isKnownHs, formatHs, normalizeHs, screenCompliance, searchHS } from "./agent/tools";
import { fetchMaritimeWeather, toSeaState } from "./dhow-weather";
import { buildValuation, fetchReferencePriceDiag, REFERENCE_COMMODITIES, seriesForHs } from "./dhow-reference";

const Input = z.object({
  origin: z.string().min(2).max(120),
  destination: z.string().min(2).max(120),
  cargoType: z.string().min(2).max(200),
  weight: z.number().positive().max(100000),
  volume: z.number().nonnegative().max(100000),
  declaredValue: z.number().nonnegative().max(1e10),
  deadline: z.string().max(20),
  visitorId: z.string().max(80).optional(),
});

export type AgentResponse = {
  plan: Plan | null;
  source: PlanSource;
  note: string | null;
  error: string | null;
  trace: TraceEvent[];
};

export const AI_MODEL = "google/gemini-3.1-flash-lite";
/** Tried in order: a temporary Google failure is retried once, then the next model is used. */
export const AI_MODELS = [AI_MODEL, "google/gemini-3.5-flash-lite"];

/** Per-run usage counters, filled by every model call and stored in agent_runs. */
type Meter = { calls: number; inputTokens: number; outputTokens: number; t0: number; model?: string };
const newMeter = (): Meter => ({ calls: 0, inputTokens: 0, outputTokens: 0, t0: Date.now() });

/** Writes one agent-run telemetry row. Never throws: logging must not break the user's request. */
async function logRun(kind: string, source: string, m: Meter, note: string | null, modelName: string = AI_MODEL) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("agent_runs").insert({
      kind, source, model: m.model ?? modelName, model_calls: m.calls, input_tokens: m.inputTokens,
      output_tokens: m.outputTokens, duration_ms: Date.now() - m.t0, note: note?.slice(0, 300) ?? null,
    });
    if (error) console.error("agent_runs insert", error.message);
  } catch (e) {
    console.error("agent_runs insert", e);
  }
}

/** The same strict action schema, now sent directly to Google instead of the credit gateway. */
async function callModelJSON(apiKey: string, req: Parameters<ModelJSON>[0], meter?: Meter): Promise<unknown> {
  return callGeminiChain(apiKey, AI_MODELS, req, meter);
}

/**
 * Protection des crédits IA :
 * - Maximum 10 exécutions par visiteur par heure.
 * - Plafond global de sécurité à 100 exécutions par heure pour l'ensemble du site.
 * Au-delà, l'application bascule automatiquement sur les outils locaux déterministes.
 */
const AI_RUNS_PER_VISITOR_PER_HOUR = 10;
const AI_RUNS_GLOBAL_PER_HOUR = 100;

let globalBucket = { hour: -1, used: 0 };
const visitorBuckets = new Map<string, { hour: number; used: number }>();

function allowAiRun(visitorId?: string): { allowed: boolean; note?: string } {
  const currentHour = Math.floor(Date.now() / 3_600_000);
  const minutesRemaining = Math.max(1, 60 - new Date().getMinutes());
  const waitMsg = `Try again in ${minutesRemaining} minute${minutesRemaining > 1 ? "s" : ""}.`;

  if (globalBucket.hour !== currentHour) {
    globalBucket = { hour: currentHour, used: 0 };
    visitorBuckets.clear();
  }

  if (globalBucket.used >= AI_RUNS_GLOBAL_PER_HOUR) {
    return {
      allowed: false,
      note: `The site-wide AI limit has been reached (100 per hour). The result below comes from the built-in tools only, without AI. ${waitMsg}`,
    };
  }

  const vid = (visitorId && visitorId.trim()) || "anonymous";
  let v = visitorBuckets.get(vid);
  if (!v || v.hour !== currentHour) {
    v = { hour: currentHour, used: 0 };
    visitorBuckets.set(vid, v);
  }

  if (v.used >= AI_RUNS_PER_VISITOR_PER_HOUR) {
    return {
      allowed: false,
      note: `Your AI limit has been reached (10 per hour per visitor). The result below comes from the built-in tools only, without AI. ${waitMsg}`,
    };
  }

  globalBucket.used++;
  v.used++;
  return { allowed: true };
}

export const planShipment = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<AgentResponse> => {
    const apiKey = process.env["GEMINI_API_KEY"];
    const sea = toSeaState(await fetchMaritimeWeather().catch(() => []));

    // Optional inputs: volume and value. Estimates are always labelled, and the value is checked against a sourced benchmark.
    const assumptions: string[] = [];
    let form = data;
    if (form.volume <= 0) {
      form = { ...form, volume: Math.max(1, Math.round(form.weight * 2)) };
      assumptions.push(`Volume not entered: estimated at 2 CBM per tonne (general-cargo assumption), ${form.volume} CBM.`);
    }
    const guess = searchHS(data.cargoType, 1)[0];
    const series = guess ? seriesForHs(guess.code) : null;
    const fetched = series ? await fetchReferencePriceDiag(series) : null;
    const ref = fetched?.ref ?? null;
    if (form.declaredValue <= 0 && !ref) {
      const reason = fetched?.why
        ? `The reference source (IMF via FRED) could not be read right now (${fetched.why}). Enter the invoice value to continue.`
        : `Dhow has no sourced reference price for "${data.cargoType}". Reference prices exist for ${REFERENCE_COMMODITIES.join(", ")}.`;
      return {
        plan: null, source: "tools", note: null, trace: [],
        error: `Enter the invoice value: ${reason}`,
      };
    }
    const valuation = buildValuation({ enteredUsd: data.declaredValue, tonnes: form.weight, ref });
    if (valuation && valuation.basis === "reference") form = { ...form, declaredValue: valuation.valueUsd };

    const attach = (plan: Plan): Plan => {
      const extra = [...assumptions];
      const v = valuation;
      if (v && series && seriesForHs(plan.customs.hsCode)?.id !== series.id) {
        extra.push(`The reference price was matched on the search result HS ${guess?.code}, but the final HS is ${plan.customs.hsCode}: treat the value check as indicative.`);
      }
      const out: Plan = { ...plan };
      if (v) {
        out.valuation = v;
        if (v.basis === "reference") {
          out.documents = out.documents.map((dc) =>
            dc.kind === "invoice"
              ? { ...dc, meta: [...dc.meta, { label: "Value basis", value: "Estimated from the IMF reference price. Replace with the real invoice value." }] }
              : dc,
          );
        }
        if (v.flag) {
          out.compliance = {
            verdict: "review_required",
            flags: [...(plan.compliance?.flags ?? []), v.note],
            dangerousGoods: plan.compliance?.dangerousGoods ?? null,
            disclaimer: plan.compliance?.disclaimer ?? "Indicative screen. Not legal advice.",
          };
        }
      }
      if (extra.length) out.assumptions = extra;
      return out;
    };

        let note: string | null = null;
    const meter = newMeter();
    const quota = allowAiRun(data.visitorId);
    if (!apiKey) note = "AI not configured";
    else if (!quota.allowed) note = quota.note ?? "The AI limit has been reached. The result comes from built-in tools only.";
    else {
      try {
        const r = await runAgentLoop(form, (req) => callModelJSON(apiKey, req, meter), { sea });
        if (r.ok) await logRun("plan", "ai", meter, null);
        if (r.ok) return { plan: attach(r.plan), source: "ai", note: null, error: null, trace: r.trace };
        note = r.error;
      } catch (e) {
        note = e instanceof Error ? e.message : "AI unavailable";
      }
    }
    const p = runToolPipeline(form, { sea });
    await logRun("plan", "tools", meter, note);
    if (p.ok) return { plan: attach(p.plan), source: "tools", note: `${note} \u2014 ran the tool pipeline without AI`, error: null, trace: p.trace };
    return { plan: null, source: "tools", note, error: p.error, trace: p.trace };
  });

// --- Customs classification ---

const CustomsInput = z.object({
  query: z.string().min(2).max(200),
  destination: z.string().min(2).max(100),
  declaredValue: z.number().nonnegative().max(1e10),
  visitorId: z.string().max(80).optional(),
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
    if (!dest) throw new Error(unknownCityMessage([data.destination]));
    const candidates = searchHS(data.query, 8);
    if (!candidates[0]) throw new Error(`No HS subheading matches "${data.query}". Describe the product in more detail.`);

    let pick = candidates[0];
    let proposedDuty: number | null = null;
    let category = `HS chapter ${pick.code.slice(0, 2)}`;
    let aiNotes = "";
    let aiDocs: string[] = [];
    let source: "ai" | "tools" = "tools";
    const notes: string[] = [];

        const apiKey = process.env["GEMINI_API_KEY"];
    const meter = newMeter();
    const quota = allowAiRun(data.visitorId);
    if (apiKey && quota.allowed) {
      try {
        const raw = (await callModelJSON(apiKey, {
          schemaName: "dhow_classification",
          schema: CLASSIFY_SCHEMA,
          instructions: `You are a customs classification assistant. You receive a product description, a destination, and a list of real HS-2022 candidate subheadings found by a search tool. Choose the best candidate by reading its full description (mind phrases such as "other than" and "not assembled"). Never output a code that is not in the candidate list. Propose the import duty rate as a band of the destination's customs union (ECOWAS CET 0/5/10/20/35, GCC 0/5, EAC 0/10/25/35, CEMAC 0/5/10/20/30). Write 2 sentences of regulatory notes (permits, standards, conformity marking) and list the documents needed for clearance. Be explicit when you are unsure.`,
          input: `Product: "${data.query}"\nDestination: ${data.destination} (${dest.country})\nCandidates:\n${candidates.map((c) => `${c.code} | ${c.description}`).join("\n")}`,
        }, meter)) as { hs_code?: unknown; category?: unknown; duty_rate_percent?: unknown; regulatory_notes?: unknown; required_documents?: unknown };
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
      notes.push(quota.note ?? "The AI limit has been reached. The result comes from the built-in tools only, without AI.");
    }
    await logRun("customs", source, meter, source === "ai" ? null : notes[notes.length - 1] ?? null);
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

// --- Natural Language Shipment Extraction (Fast & Economic) ---

export const EXTRACTION_MODEL = AI_MODEL;

const ExtractionInput = z.object({
  text: z.string().min(2).max(1000),
  visitorId: z.string().max(80).optional(),
});

export type ExtractionResult = {
  success: boolean;
  fields: {
    origin: string | null;
    destination: string | null;
    cargoType: string | null;
    weight: number | null;
    volume: number | null;
    declaredValue: number | null;
  };
  missingFields: string[];
  clarificationQuestion: string | null;
  summary: string;
  source: "ai" | "fallback";
  error: string | null;
};

export const extractShipment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ExtractionInput.parse(d))
  .handler(async ({ data }): Promise<ExtractionResult> => {
    const apiKey = process.env["GEMINI_API_KEY"];
    const meter = newMeter();
    const quota = allowAiRun(data.visitorId);

    if (!apiKey) {
      await logRun("extraction", "fallback", meter, "API key missing", EXTRACTION_MODEL);
      return {
        success: false,
        fields: { origin: null, destination: null, cargoType: null, weight: null, volume: null, declaredValue: null },
        missingFields: [], clarificationQuestion: null, summary: "", source: "fallback",
        error: "AI is not configured. You can still use the form below.",
      };
    }

    if (!quota.allowed) {
      await logRun("extraction", "fallback", meter, quota.note ?? "Quota", EXTRACTION_MODEL);
      return {
        success: false,
        fields: { origin: null, destination: null, cargoType: null, weight: null, volume: null, declaredValue: null },
        missingFields: [], clarificationQuestion: null, summary: "", source: "fallback",
        error: quota.note ?? "The AI limit has been reached. Please fill in the form below directly.",
      };
    }

    try {
      const prompt = `You read one shipment request and return strict JSON. Always write in English, whatever the language of the request.
Keys:
- "origin": departure city and/or country, or null if not stated
- "destination": arrival city and/or country, or null if not stated
- "cargoType": the goods, written in English (translate if needed, for example "riz" becomes "rice"), or null if not stated
- "weight": total weight in metric tonnes, ONLY if the text states a weight (convert kg to tonnes) or a container size (20 ft container = 20, 40 ft container = 25, and say this assumption in the summary). For pallets, cartons, boxes or pieces without a weight, use null. Never guess.
- "volume": volume in CBM, ONLY if stated or from a container size (20 ft = 33, 40 ft = 67), otherwise null
- "declaredValue": value in USD, ONLY if stated, otherwise null
- "summary": one short sentence saying what was understood, and which values were not given.
Never invent a value. Use null when unsure.`;

      const parsed = await callGeminiChain(apiKey, AI_MODELS, {
        instructions: prompt,
        input: data.text,
        schema: {
          type: "object",
          properties: {
            origin: { type: ["string", "null"] },
            destination: { type: ["string", "null"] },
            cargoType: { type: ["string", "null"] },
            weight: { type: ["number", "null"] },
            volume: { type: ["number", "null"] },
            declaredValue: { type: ["number", "null"] },
            summary: { type: "string" },
          },
          required: ["origin", "destination", "cargoType", "weight", "volume", "declaredValue", "summary"],
          additionalProperties: false,
        },
      }, meter) as Record<string, unknown>;

      await logRun("extraction", "ai", meter, null, EXTRACTION_MODEL);

      // What is missing, and the question to ask, are decided in code, not by the model.
      const fields = normalizeFields(parsed as Record<string, unknown>);
      const missing = findMissing(fields);
      return {
        success: true,
        fields,
        missingFields: missing,
        clarificationQuestion: clarificationFor(missing),
        summary: typeof parsed["summary"] === "string" && parsed["summary"].trim() ? parsed["summary"].trim().slice(0, 300) : "Request analysed.",
        source: "ai",
        error: null,
      };
    } catch (e) {
      const err = e instanceof Error ? e.message : "AI error";
      await logRun("extraction", "fallback", meter, err, EXTRACTION_MODEL);
      return {
        success: false,
        fields: { origin: null, destination: null, cargoType: null, weight: null, volume: null, declaredValue: null },
        missingFields: [], clarificationQuestion: null, summary: "", source: "fallback",
        error: `Reading your request is unavailable right now (${err}). You can still use the form below.`,
      };
    }
  });

// --- Agent run journal (read-only, numbers only) ---

export type AgentRunRow = {
  id: string; created_at: string; kind: string; model: string; source: string;
  model_calls: number; input_tokens: number; output_tokens: number; duration_ms: number; note: string | null;
};

export const listAgentRuns = createServerFn({ method: "GET" }).handler(async (): Promise<AgentRunRow[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("agent_runs")
    .select("id, created_at, kind, model, source, model_calls, input_tokens, output_tokens, duration_ms, note")
    .order("created_at", { ascending: false }).limit(200);
  if (error) { console.error(error.message); return []; }
  return data ?? [];
});
