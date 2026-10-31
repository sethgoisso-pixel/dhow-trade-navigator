/**
 * The Dhow agent.
 *
 * Two ways to run it, both producing the same `Plan` and a real trace of what was executed:
 *  - `runToolPipeline`: a fixed sequence of tool calls, no AI. Used for the preset demos and as the fallback.
 *  - `runAgentLoop`: the AI model chooses which tool to call next (ReAct-style loop over a strict JSON action
 *    schema), reads each observation, then finishes with a short briefing.
 *
 * In both cases the model never writes the numbers. Codes, distances, duties and landed cost come from tools,
 * and the final plan is verified (the HS code must exist in the HS-2022 list, the duty rate must be a legal band).
 */
import type { CargoForm } from "../dhow-data";
import { lookupCity, simulatePlan, type Plan, type PlanOverrides, type ResolvedCity } from "../dhow-plan";
import {
  checkDutyRate, estimateLanded, estimateRoutes, type SeaState, formatHs, hsDescription, isKnownHs, normalizeHs, resolvePort,
  screenCompliance, searchHS, vatFor, type HsHit, type LandedCost, type ScreenResult,
} from "./tools";
import type { TraceEvent } from "./types";

export type ToolName = "resolve_port" | "search_hs_code" | "screen_compliance" | "estimate_routes" | "estimate_landed_cost";
export const TOOL_NAMES: ToolName[] = ["resolve_port", "search_hs_code", "screen_compliance", "estimate_routes", "estimate_landed_cost"];

export type ToolArgs = { query?: string; hs_code?: string; duty_rate_percent?: number; hub?: string };

type State = {
  hs?: HsHit;
  hub?: ResolvedCity;
  routes?: Extract<ReturnType<typeof estimateRoutes>, { ok: true }>;
  duty?: ReturnType<typeof checkDutyRate>;
  screen?: ScreenResult;
  landed?: LandedCost;
};
type Ctx = { form: CargoForm; state: State; sea?: SeaState | undefined };

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Runs one tool. Never throws: failures come back with ok=false so the agent can react. */
export function runTool(name: ToolName, a: ToolArgs, ctx: Ctx): { ok: boolean; summary: string; result: unknown } {
  const { form, state } = ctx;
  try {
    switch (name) {
      case "resolve_port": {
        const r = resolvePort(a.query ?? "");
        if (!r.found) return { ok: false, summary: `"${a.query ?? ""}" is not in the port list yet`, result: r };
        return { ok: true, summary: `${r.name}, ${r.country} (${r.code}), region ${r.region}`, result: { name: r.name, country: r.country, locode: r.code, region: r.region, lat: r.lat, lng: r.lng } };
      }
      case "search_hs_code": {
        const hits = searchHS(a.query ?? form.cargoType, 5);
        const top = hits[0];
        if (!top) return { ok: false, summary: `No HS subheading matches "${a.query ?? ""}"`, result: [] };
        state.hs = top;
        return { ok: true, summary: `${top.code} (match ${top.score.toFixed(2)}) ${clip(top.description, 70)}; ${hits.length - 1} alternatives`, result: hits };
      }
      case "screen_compliance": {
        const code = a.hs_code || state.hs?.code;
        if (!code) return { ok: false, summary: "Needs an HS code: call search_hs_code first", result: null };
        const r = screenCompliance(form, code);
        state.screen = r;
        const bits = [...r.flags, ...(r.dangerousGoods ? ["dangerous goods (lithium batteries)"] : [])];
        return { ok: true, summary: r.verdict === "no_red_flags" && !r.dangerousGoods ? "No red flags in the bundled screen" : `Review: ${clip(bits.join("; "), 110)}`, result: r };
      }
      case "estimate_routes": {
        const r = estimateRoutes(form, a.hub || undefined, ctx.sea);
        if (!r.ok) return { ok: false, summary: `Unknown port: ${r.unknown.join(", ")}`, result: r };
        state.routes = r;
        state.hub = r.hub;
        const c = r.options.find((o) => o.key === "C");
        return { ok: true, summary: `Hub ${r.hub.name}, ${r.distanceKm.toLocaleString("en-US")} km; option C ${c?.days}d, ${usd(c?.cost ?? 0)}; ${r.exposure.length} chokepoint(s)`, result: { hub: r.hub.name, distanceKm: r.distanceKm, options: r.options, exposure: r.exposure } };
      }
      case "estimate_landed_cost": {
        const dest = lookupCity(form.destination);
        if (!dest) return { ok: false, summary: `Unknown destination: ${form.destination}`, result: null };
        const raw = a.hs_code || state.hs?.code;
        if (!raw) return { ok: false, summary: "Needs an HS code: call search_hs_code first", result: null };
        if (!isKnownHs(raw)) return { ok: false, summary: `HS ${raw} is not in the HS-2022 list`, result: null };
        const code = formatHs(normalizeHs(raw));
        if (!state.hs || state.hs.code !== code) state.hs = { code, description: hsDescription(code) ?? "", score: state.hs?.score ?? 0.5 };
        const duty = checkDutyRate(dest.country, a.duty_rate_percent ?? 10);
        state.duty = duty;
        const landed = estimateLanded({ declaredValue: form.declaredValue, dutyRate: duty.rate, country: dest.country, region: dest.region });
        state.landed = landed;
        return { ok: true, summary: `HS ${code}, duty ${duty.rate}% (${duty.note}), landed ${usd(landed.totalLanded)}`, result: { hs: code, duty, landed } };
      }
    }
  } catch (e) {
    return { ok: false, summary: `Tool error: ${e instanceof Error ? e.message : "unknown"}`, result: null };
  }
}

const argsLine = (a: ToolArgs) => Object.entries(a).filter(([, v]) => v !== "" && v !== undefined && v !== 0).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ");

/** One-line text of a trace event, as shown in the agent steps panel. */
export function traceLine(e: TraceEvent): string {
  if (e.kind === "thought") return `Agent: ${e.summary}`;
  if (e.kind === "check") return `${e.ok ? "✓" : "✕"} Check: ${e.summary}`;
  return `${e.tool}(${argsLine((e.args ?? {}) as ToolArgs)}) → ${e.summary}`;
}

/** Assembles the final plan from what the tools established. Returns null if the essentials are missing. */
function assemble(form: CargoForm, state: State, trace: TraceEvent[], briefing: string | null, sea?: SeaState): Plan | null {
  const dest = lookupCity(form.destination);
  const org = lookupCity(form.origin);
  if (!dest || !org || !state.hs || !state.duty) return null;
  const routes = state.routes ?? (() => { const r = estimateRoutes(form, undefined, sea); return r.ok ? r : undefined; })();
  const vat = vatFor(dest.country, dest.region);
  const ov: PlanOverrides = {
    hs: { code: state.hs.code, description: state.hs.description, confidence: +(state.hs.score * 100).toFixed(1) },
    dutyRate: state.duty.rate,
    dutyLabel: state.duty.bloc ? `${state.duty.bloc} band` : "rate as proposed",
    vat,
    ...(state.hub ? { hub: state.hub } : {}),
    ...(routes ? { risks: { ...routes.risk, briefing: briefing ? `${briefing} ${routes.risk.briefing}` : routes.risk.briefing } } : {}),
  };
  const plan = simulatePlan(form, trace.map(traceLine), undefined, ov);
  plan.trace = trace;
  if (state.screen) plan.compliance = state.screen;
  return plan;
}

export type PipelineResult = { ok: true; plan: Plan; trace: TraceEvent[] } | { ok: false; error: string; trace: TraceEvent[] };

/** Fixed sequence of real tool calls, no AI. `hsQuery` lets presets describe the product precisely. */
export function runToolPipeline(form: CargoForm, opts: { hsQuery?: string; emit?: (e: TraceEvent) => void; sea?: SeaState } = {}): PipelineResult {
  const trace: TraceEvent[] = [];
  const ctx: Ctx = { form, state: {}, sea: opts.sea };
  let n = 0;
  const step = (name: ToolName, a: ToolArgs) => {
    const t0 = Date.now();
    const r = runTool(name, a, ctx);
    const ev: TraceEvent = { step: ++n, kind: "tool", tool: name, args: a as Record<string, unknown>, summary: r.summary, ms: Math.max(1, Date.now() - t0), ok: r.ok };
    trace.push(ev);
    opts.emit?.(ev);
    return r;
  };
  const po = step("resolve_port", { query: form.origin });
  const pd = step("resolve_port", { query: form.destination });
  if (!po.ok || !pd.ok) {
    const bad = [!po.ok ? form.origin : null, !pd.ok ? form.destination : null].filter(Boolean).join(" and ");
    return { ok: false, error: `Dhow does not know ${bad} yet. Try a major port or city, for example Ningbo, Jebel Ali, Cotonou, Lagos, Mombasa or Rotterdam.`, trace };
  }
  const hsr = step("search_hs_code", { query: opts.hsQuery ?? form.cargoType });
  if (!hsr.ok) return { ok: false, error: `No HS subheading matched "${opts.hsQuery ?? form.cargoType}". Describe the product in more detail.`, trace };
  step("screen_compliance", {});
  step("estimate_routes", {});
  const dest = lookupCity(form.destination)!;
  const defaultBand = ({ AF: 10, ME: 5, EU: 5, AS: 10, AM: 5 } as const)[dest.region];
  step("estimate_landed_cost", { duty_rate_percent: defaultBand });
  const ev: TraceEvent = { step: ++n, kind: "check", summary: `duty rate ${defaultBand}% is an assumed default band for ${dest.country}, not an HS-level tariff lookup: verify with a customs broker`, ms: 1, ok: true };
  trace.push(ev);
  opts.emit?.(ev);
  const plan = assemble(form, ctx.state, trace, null, opts.sea);
  return plan ? { ok: true, plan, trace } : { ok: false, error: "Could not assemble a plan from the tool results.", trace };
}

/* ───────────────────────── The model-driven loop ───────────────────────── */

export const ACTION_SCHEMA = {
  type: "object",
  properties: {
    thought: { type: "string" },
    action: { type: "string", enum: [...TOOL_NAMES, "finish"] },
    query: { type: "string" },
    hs_code: { type: "string" },
    duty_rate_percent: { type: "number" },
    hub: { type: "string" },
    briefing: { type: "string" },
  },
  required: ["thought", "action", "query", "hs_code", "duty_rate_percent", "hub", "briefing"],
  additionalProperties: false,
} as const;

export const AGENT_INSTRUCTIONS = `You are Dhow, an autonomous trade and logistics agent based in Dubai. You plan a shipment by calling tools, one per turn, and reading each observation before deciding the next step.

Tools (set only the fields the tool needs, leave other string fields "" and duty_rate_percent 0):
- resolve_port(query): check that a port or city is known.
- search_hs_code(query): rank HS-2022 six-digit subheadings for a product description. Describe the product itself (for example "photovoltaic modules"), not the whole shipment. Read the alternatives and pick the right subheading.
- screen_compliance(hs_code): indicative red-flag screen for the route and goods.
- estimate_routes(hub): distance-model estimates for three options. Choose hub as a strategic transshipment port by name (Jebel Ali when sensible), or "" for the default.
- estimate_landed_cost(hs_code, duty_rate_percent): landed cost. Propose the duty rate as a band of the destination customs union (ECOWAS CET 0/5/10/20/35, GCC 0/5, EAC 0/10/25/35, CEMAC 0/5/10/20/30). The tool checks the band.

Rules:
- Never invent HS codes, prices, distances or tariff numbers. Numbers come from tool observations only.
- Call search_hs_code, estimate_routes and estimate_landed_cost at least once before finishing. Use at most 6 tool calls.
- If a tool reports an unknown port or a failure, adapt (for example try a different query) or finish and say what is missing.
- When you finish (action "finish"), write "briefing": 1 or 2 sentences for the merchant, grounded only in the observations (route exposure, compliance flags, duty assumption). Do not repeat raw numbers you were not given.
- "thought" is one short sentence about why you take this step.`;

export type ModelJSON = (req: { instructions: string; input: string; schemaName: string; schema: unknown }) => Promise<unknown>;

type Action = { thought: string; action: ToolName | "finish"; query: string; hs_code: string; duty_rate_percent: number; hub: string; briefing: string };

const isAction = (x: unknown): x is Action => {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o["thought"] === "string" && typeof o["action"] === "string" && (o["action"] === "finish" || (TOOL_NAMES as string[]).includes(o["action"])) && typeof o["briefing"] === "string";
};

export type LoopResult = { ok: true; plan: Plan; trace: TraceEvent[] } | { ok: false; error: string; trace: TraceEvent[] };

/** The AI model drives the tools. Throws only if the model call itself fails, so the caller can fall back. */
export async function runAgentLoop(form: CargoForm, callModel: ModelJSON, opts: { emit?: (e: TraceEvent) => void; maxSteps?: number; sea?: SeaState } = {}): Promise<LoopResult> {
  const trace: TraceEvent[] = [];
  const ctx: Ctx = { form, state: {}, sea: opts.sea };
  const maxSteps = opts.maxSteps ?? 6;
  let n = 0;
  const push = (e: Omit<TraceEvent, "step">) => {
    const ev = { step: ++n, ...e } as TraceEvent;
    trace.push(ev);
    opts.emit?.(ev);
  };
  const transcript: string[] = [];
  let briefing: string | null = null;

  for (let turn = 0; turn < maxSteps + 1; turn++) {
    const input = `Cargo request: ${JSON.stringify(form)}\n\n${transcript.length ? `Steps so far:\n${transcript.join("\n")}\n\n` : ""}Choose the next action.`;
    const t0 = Date.now();
    const raw = await callModel({ instructions: AGENT_INSTRUCTIONS, input, schemaName: "dhow_action", schema: ACTION_SCHEMA });
    if (!isAction(raw)) throw new Error("Model returned an invalid action");
    const dt = Math.max(1, Date.now() - t0);
    if (raw.thought.trim()) push({ kind: "thought", summary: clip(raw.thought.trim(), 160), ms: dt, ok: true });
    if (raw.action === "finish") {
      briefing = raw.briefing.trim() ? clip(raw.briefing.trim(), 400) : null;
      break;
    }
    if (turn >= maxSteps) break;
    const args: ToolArgs = {
      ...(raw.query ? { query: raw.query } : {}),
      ...(raw.hs_code ? { hs_code: raw.hs_code } : {}),
      ...(raw.duty_rate_percent ? { duty_rate_percent: raw.duty_rate_percent } : {}),
      ...(raw.hub ? { hub: raw.hub } : {}),
    };
    const t1 = Date.now();
    const r = runTool(raw.action, args, ctx);
    push({ kind: "tool", tool: raw.action, args: args as Record<string, unknown>, summary: r.summary, ms: Math.max(1, Date.now() - t1), ok: r.ok });
    transcript.push(`${transcript.length + 1}. thought: ${raw.thought}\n   call: ${raw.action}(${argsLine(args)})\n   observation (${r.ok ? "ok" : "failed"}): ${clip(JSON.stringify(r.result), 1400)}`);
  }

  // Verification: the agent must have done the essentials; if it skipped any, run them now and say so.
  const ensure = (name: ToolName, a: ToolArgs, done: boolean) => {
    if (done) return;
    const t0 = Date.now();
    const r = runTool(name, a, ctx);
    push({ kind: "tool", tool: name, args: a as Record<string, unknown>, summary: `(run by the verifier) ${r.summary}`, ms: Math.max(1, Date.now() - t0), ok: r.ok });
  };
  ensure("search_hs_code", { query: form.cargoType }, !!ctx.state.hs);
  ensure("estimate_routes", {}, !!ctx.state.routes);
  const dest = lookupCity(form.destination);
  if (dest && ctx.state.hs && !ctx.state.landed) {
    const band = ({ AF: 10, ME: 5, EU: 5, AS: 10, AM: 5 } as const)[dest.region];
    ensure("estimate_landed_cost", { duty_rate_percent: band }, false);
  }
  if (!ctx.state.hs) return { ok: false, error: "The agent could not identify an HS code for this cargo.", trace };
  const known = isKnownHs(ctx.state.hs.code);
  push({ kind: "check", summary: known ? `HS ${ctx.state.hs.code} exists in the HS-2022 nomenclature (5,613 subheadings)` : `HS ${ctx.state.hs.code} is not in HS-2022`, ms: 1, ok: known });
  if (ctx.state.duty) push({ kind: "check", summary: ctx.state.duty.note, ms: 1, ok: !ctx.state.duty.snapped });
  if (!known) return { ok: false, error: "The agent proposed an HS code that does not exist.", trace };
  const plan = assemble(form, ctx.state, trace, briefing, opts.sea);
  if (!plan) {
    const r = estimateRoutes(form, undefined, opts.sea);
    return { ok: false, error: r.ok ? "Could not assemble a plan from the tool results." : `Dhow does not know ${r.unknown.join(" and ")} yet. Try a major port or city.`, trace };
  }
  return { ok: true, plan, trace };
}
