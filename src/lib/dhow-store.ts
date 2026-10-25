import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { SCENARIOS, type CargoForm, type Scenario } from "./dhow-data";

export type LogEntry = { id: number; t: string; msg: string; kind: "info" | "ok" | "warn" | "agent" };
export type Dispatch = { id: string; title: string; detail: string; saving: string; status: "pending" | "approved" | "rejected" };

type State = {
  form: CargoForm;
  scenario: Scenario | null;
  running: boolean;
  stepIndex: number;
  completed: boolean;
  log: LogEntry[];
  dispatches: Dispatch[];
};

let id = 0;
const now = () => new Date().toISOString().slice(11, 19);

let state: State = {
  form: { ...SCENARIOS[0]!.form },
  scenario: null,
  running: false,
  stepIndex: -1,
  completed: false,
  log: [],
  dispatches: [
    { id: "D-1042", title: "Book 2 × 40' HC on Maersk AE-7", detail: "Ningbo → Jebel Ali, ETD Nov 2", saving: "-12% vs spot", status: "pending" },
    { id: "D-1043", title: "Reroute MSC Aurora via Cape of Good Hope", detail: "Red Sea risk index 0.71", saving: "+2d, avoids $4.1k surcharge", status: "pending" },
    { id: "D-1044", title: "Pre-file Benin customs declaration (GUCE)", detail: "HS 8541.43 — duty exemption", saving: "-3.8 days clearance", status: "pending" },
  ],
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

export function runAgent(scenario: Scenario | null) {
  clearTimeout(timer);
  const steps = scenario?.steps ?? [
    `Parsing cargo request: ${state.form.cargoType}, ${state.form.weight}t / ${state.form.volume} CBM`,
    `Querying carriers on ${state.form.origin} → ${state.form.destination}…`,
    "Scoring port congestion & disruption indices",
    "Computing 3 routing options with cost / time / CO₂ trade-offs",
    "Optimal route selected — reliability-weighted",
  ];
  set({ scenario, form: scenario ? { ...scenario.form } : state.form, running: true, stepIndex: 0, completed: false });
  pushLog(scenario ? `▶ Demo scenario loaded: ${scenario.title}` : "▶ New cargo request received", "ok");
  toast.info("Dhow agent is reasoning…", { description: scenario?.subtitle ?? `${state.form.origin} → ${state.form.destination}` });
  const tick = (i: number) => {
    pushLog(steps[i]!, "agent");
    set({ stepIndex: i });
    if (i < steps.length - 1) timer = setTimeout(() => tick(i + 1), 850);
    else
      timer = setTimeout(() => {
        set({ running: false, completed: true, stepIndex: steps.length });
        pushLog("✓ Plan complete — routing, duties and documents ready", "ok");
        toast.success("Optimal plan ready", { description: "Routing, compliance and documents generated." });
      }, 700);
  };
  timer = setTimeout(() => tick(0), 300);
  return steps;
}

export function resolveDispatch(did: string, status: "approved" | "rejected") {
  const d = state.dispatches.find((x) => x.id === did);
  set({ dispatches: state.dispatches.map((x) => (x.id === did ? { ...x, status } : x)) });
  pushLog(`${status === "approved" ? "✓ Executed" : "✕ Cancelled"} ${did}: ${d?.title}`, status === "approved" ? "ok" : "warn");
  status === "approved" ? toast.success(`${did} dispatched`, { description: d?.title }) : toast(`${did} rejected`);
}

const AMBIENT: [string, LogEntry["kind"]][] = [
  ["Analyzing weather disruption in Suez Canal…", "agent"],
  ["Matched Carrier Maersk with -12% contract rate", "ok"],
  ["Classified HS Code 8541.43 for Solar Panels", "ok"],
  ["Jebel Ali T2 berth occupancy at 82% — monitoring", "warn"],
  ["Container MSKU 771204-3 gated-in at Ningbo-Zhoushan", "info"],
  ["Re-quoting CMA CGM spot rate CN→AE: $1,940/FEU", "agent"],
  ["Cotonou port dwell time trending down (-0.6 days)", "info"],
  ["Detected bunker surcharge change (BAF +3%) — absorbing via contract", "agent"],
  ["Certificate of Origin (Form E) validated for shipment DH-2291", "ok"],
];
let ambient = 0;
let ambientStarted = false;
export function startAmbient() {
  if (ambientStarted) return;
  ambientStarted = true;
  AMBIENT.slice(0, 4).forEach(([m, k]) => pushLog(m, k));
  setInterval(() => {
    if (state.running) return;
    const [m, k] = AMBIENT[ambient++ % AMBIENT.length]!;
    pushLog(m, k);
  }, 4200);
}
