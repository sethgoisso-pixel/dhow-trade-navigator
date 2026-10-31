import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { SCENARIOS, type CargoForm, type Scenario } from "./dhow-data";
import type { Plan, PlanSource } from "./dhow-plan";
import { planShipment } from "./dhow-ai.functions";
import { saveDossier } from "./dhow-dossiers.functions";

export type LogEntry = { id: number; t: string; msg: string; kind: "info" | "ok" | "warn" | "agent" };
export type Dispatch = {
  id: string;
  title: string;
  detail: string;
  saving: string;
  status: "pending" | "approved" | "rejected";
  dossierRef?: string;
  corridor?: string;
  createdAt: string;
};

type State = {
  form: CargoForm;
  scenario: Scenario | null;
  running: boolean;
  thinking: boolean;
  stepIndex: number;
  completed: boolean;
  steps: string[];
  plan: Plan | null;
  planSource: PlanSource | null;
  dossierRef: string | null;
  log: LogEntry[];
  dispatches: Dispatch[];
};

let id = 0;
const now = () => new Date().toISOString().slice(11, 19);

let state: State = {
  form: { ...SCENARIOS[0]!.form },
  scenario: null,
  running: false,
  thinking: false,
  stepIndex: -1,
  completed: false,
  steps: [],
  plan: null,
  planSource: null,
  dossierRef: null,
  log: [],
  dispatches: [],
};

const subs = new Set<() => void>();
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  subs.forEach((s) => s());
};

export const useDhow = () =>
  useSyncExternalStore(
    (cb) => (subs.add(cb), () => subs.delete(cb)),
    () => state,
    () => state,
  );

export function pushLog(msg: string, kind: LogEntry["kind"] = "info") {
  set({ log: [...state.log.slice(-60), { id: ++id, t: now(), msg, kind }] });
}

export const setForm = (form: Partial<CargoForm>) => set({ form: { ...state.form, ...form }, completed: false, scenario: null });

let timer: ReturnType<typeof setTimeout> | undefined;
let runId = 0;

/** Génère 2 ordres opérationnels liés au dossier analysé */
function buildDispatchesForPlan(ref: string, form: CargoForm, plan: Plan): Dispatch[] {
  const shortRef = ref.split("-").pop() ?? "OP";
  const bestOption = plan.options[2] ?? plan.options[0];
  const viaText = bestOption ? bestOption.via : "Dubai Hub";

  return [
    {
      id: `DSP-${shortRef}-01`,
      dossierRef: ref,
      corridor: `${form.origin} → ${form.destination}`,
      title: `Booking request draft: ${bestOption?.name ?? "Multimodal Express"}`,
      detail: `Request priority container space via ${viaText} · Est. transit: ${bestOption?.days ?? 12} days`,
      saving: bestOption ? `Model estimate $${Math.round(bestOption.cost).toLocaleString("en-US")} (not a carrier quote)` : "Model estimate (not a carrier quote)",
      status: "pending",
      createdAt: now(),
    },
    {
      id: `DSP-${shortRef}-02`,
      dossierRef: ref,
      corridor: `${form.origin} → ${form.destination}`,
      title: `Customs pre-declaration draft (HS ${plan.customs.hsCode})`,
      detail: `Clearance dossier prepared for the ${form.destination} single window and Dubai Trade (Mirsal II); to be reviewed by a licensed customs broker before filing`,
      saving: "Draft for broker review",
      status: "pending",
      createdAt: now(),
    },
  ];
}

export async function runAgent(scenario: Scenario | null) {
  clearTimeout(timer);
  const my = ++runId;
  const form = scenario ? { ...scenario.form } : { ...state.form };
  set({
    scenario,
    form,
    running: true,
    thinking: !scenario,
    stepIndex: 0,
    completed: false,
    plan: null,
    steps: scenario ? ["Running the agent's tools…"] : ["The AI agent is choosing and calling its tools…"],
  });
  pushLog(scenario ? `▶ Demo scenario loaded: ${scenario.title}` : `▶ New cargo request: ${form.origin} → ${form.destination}`, "ok");
  toast.info("Dhow agent is reasoning…", { description: scenario?.subtitle ?? `${form.origin} → ${form.destination}` });

  let plan: Plan | null = null;
  let source: PlanSource = "tools";
  let failure: string | null = null;
  if (scenario) {
    // Presets run the real tool pipeline in the browser: no AI call, no credits, and a real trace.
    const { runToolPipeline } = await import("./agent/agent");
    const { fetchMaritimeWeather, toSeaState } = await import("./dhow-weather");
    const sea = toSeaState(await fetchMaritimeWeather().catch(() => []));
    const r = runToolPipeline(form, { hsQuery: scenario.hsQuery, sea });
    if (r.ok) plan = r.plan; else failure = r.error;
    source = "preset";
  } else {
    try {
      const r = await planShipment({ data: form });
      plan = r.plan;
      source = r.source;
      failure = r.error;
      if (r.note && r.plan) { pushLog(`ℹ ${r.note}`, "warn"); toast.warning("Ran without the AI model", { description: r.note }); }
    } catch (err) {
      // The server is unreachable: the tools still run locally, and the result says so.
      const { runToolPipeline } = await import("./agent/agent");
      const { fetchMaritimeWeather, toSeaState } = await import("./dhow-weather");
      const sea = toSeaState(await fetchMaritimeWeather().catch(() => []));
      const r = runToolPipeline(form, { sea });
      if (r.ok) plan = r.plan; else failure = r.error;
      source = "tools";
      pushLog(`⚠ AI engine unreachable (${err instanceof Error ? err.message : "connection failed"}) — ran the tool pipeline without AI`, "warn");
    }
  }

  if (my !== runId) return;
  if (!plan) {
    set({ running: false, thinking: false, completed: false, stepIndex: -1, plan: null, planSource: null });
    pushLog(`✕ ${failure ?? "Could not plan this shipment"}`, "warn");
    toast.error("Could not plan this shipment", { description: failure ?? undefined });
    return;
  }
  const finalPlan: Plan = plan;
  set({ plan: finalPlan, planSource: source, steps: finalPlan.reasoningSteps, thinking: false, stepIndex: 0, dossierRef: null });

  // Persist the dossier (Supabase) and prepare the operational drafts linked to it.
  saveDossier({ data: { origin: form.origin, destination: form.destination, cargo: form as never, plan: finalPlan as never, source } })
    .then((r) => {
      if (my === runId && r.reference) {
        set({ dossierRef: r.reference });
        pushLog(`✓ Dossier saved: ${r.reference}`, "ok");
        const newDispatches = buildDispatchesForPlan(r.reference, form, finalPlan);
        set({ dispatches: [...newDispatches, ...state.dispatches] });
        pushLog(`⚡ 2 operational drafts prepared for ${r.reference}`, "agent");
      }
    })
    .catch(() => {});

  const steps = finalPlan.reasoningSteps;
  const tick = (i: number) => {
    if (my !== runId) return;
    pushLog(steps[i]!, "agent");
    set({ stepIndex: i });
    if (i < steps.length - 1) timer = setTimeout(() => tick(i + 1), source === "ai" ? 450 : 750);
    else
      timer = setTimeout(() => {
        set({ running: false, completed: true, stepIndex: steps.length });
        pushLog(`✓ Plan complete — ${finalPlan.corridor}`, "ok");
        toast.success("Plan ready", { description: finalPlan.corridor });
      }, 500);
  };
  timer = setTimeout(() => tick(0), 200);
}

export function resolveDispatch(did: string, status: "approved" | "rejected") {
  const d = state.dispatches.find((x) => x.id === did);
  set({ dispatches: state.dispatches.map((x) => (x.id === did ? { ...x, status } : x)) });
  pushLog(`${status === "approved" ? "✓ Approved (sample action, nothing was sent)" : "✕ Rejected"} ${did}: ${d?.title}`, status === "approved" ? "ok" : "warn");
  status === "approved" ? toast.success(`${did} approved`, { description: "Sample action: nothing was sent to a carrier or customs." }) : toast(`${did} rejected`);
}

let ambientStarted = false;
/** Logs real startup information only. (The previous version looped invented "live" shipment events.) */
export function startAmbient() {
  if (ambientStarted) return;
  ambientStarted = true;
  pushLog("Dhow ready. Tools loaded: resolve_port, search_hs_code (HS-2022, 5,613 subheadings), screen_compliance, estimate_routes, estimate_landed_cost", "info");
  pushLog("Run a demo scenario or a custom cargo request: every step below is a real tool call", "info");
}
