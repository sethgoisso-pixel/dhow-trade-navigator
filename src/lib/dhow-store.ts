import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { SCENARIOS, type CargoForm, type Scenario } from "./dhow-data";
import { type Plan, type PlanSource } from "./dhow-plan";
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
      title: `Slot Allocation & Booking: ${bestOption?.name ?? "Multimodal Express"}`,
      detail: `Lock priority container space on ${viaText} corridor · Est. transit: ${bestOption?.days ?? 12} days`,
      saving: `-$${Math.round((form.declaredValue * 0.03) + 1200).toLocaleString()} vs Spot Rate`,
      status: "pending",
      createdAt: now(),
    },
    {
      id: `DSP-${shortRef}-02`,
      dossierRef: ref,
      corridor: `${form.origin} → ${form.destination}`,
      title: `Pre-file Customs Declaration (HS ${plan.customs.hsCode})`,
      detail: `Submit digital clearance dossier via Dubai Trade Mirsal II & ${form.destination} single window`,
      saving: "Zero dwell demurrage guarantee",
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
    steps: scenario
      ? scenario.steps
      : [
          "Analyzing trade route & carrier schedules…",
          "Checking tariff codes & customs duties…",
          "Synthesizing multimodal options via Dubai…",
        ],
  });
  pushLog(scenario ? `▶ Demo scenario loaded: ${scenario.title}` : `▶ New cargo request: ${form.origin} → ${form.destination}`, "ok");
  toast.info("Dhow agent is reasoning…", { description: scenario?.subtitle ?? `${form.origin} → ${form.destination}` });

  let plan: Plan;
  let source: PlanSource;
  try {
    const r = await planShipment({ data: form });
    plan = r.plan;
    source = r.source;
    if (r.note) { pushLog(`ℹ ${r.note}`, "info"); }
  } catch (err) {
    set({ running: false, thinking: false });
    const msg = err instanceof Error ? err.message : "Connection failed";
    pushLog(`✕ AI Engine error: ${msg}`, "warn");
    toast.error("AI Agent Error", { description: "Unable to reach the AI model. Check your credits or try again." });
    return;
  }

  if (my !== runId) return;
  set({ plan, planSource: source, steps: plan.reasoningSteps, thinking: false, stepIndex: 0, dossierRef: null });

  // Sauvegarde réelle du dossier
  saveDossier({ data: { origin: form.origin, destination: form.destination, cargo: form as never, plan: plan as never, source } })
    .then((r) => {
      if (my === runId && r.reference) {
        set({ dossierRef: r.reference });
        pushLog(`✓ Dossier saved: ${r.reference}`, "ok");

        // Création des ordres d'opération réels pour l'Autonomous Dispatch
        const newDispatches = buildDispatchesForPlan(r.reference, form, plan);
        set({ dispatches: [...newDispatches, ...state.dispatches] });
        pushLog(`⚡ 2 operational dispatches generated for ${r.reference}`, "agent");
      }
    })
    .catch(() => {});

  const steps = plan.reasoningSteps;
  const tick = (i: number) => {
    if (my !== runId) return;
    pushLog(steps[i]!, "agent");
    set({ stepIndex: i });
    if (i < steps.length - 1) timer = setTimeout(() => tick(i + 1), source === "ai" ? 450 : 750);
    else
      timer = setTimeout(() => {
        set({ running: false, completed: true, stepIndex: steps.length });
        pushLog(`✓ Plan complete — ${plan.corridor}`, "ok");
        toast.success("Optimal plan ready", { description: plan.corridor });
      }, 500);
  };
  timer = setTimeout(() => tick(0), 200);
}

export function resolveDispatch(did: string, status: "approved" | "rejected") {
  const d = state.dispatches.find((x) => x.id === did);
  set({ dispatches: state.dispatches.map((x) => (x.id === did ? { ...x, status } : x)) });
  pushLog(`${status === "approved" ? "✓ Executed" : "✕ Cancelled"} ${did}: ${d?.title}`, status === "approved" ? "ok" : "warn");
  status === "approved" ? toast.success(`${did} dispatched`, { description: d?.title }) : toast(`${did} rejected`);
}

export function startAmbient() {
  // Désactivé : aucune fausse activité en arrière-plan
}
