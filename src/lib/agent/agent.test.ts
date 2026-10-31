import { describe, expect, it } from "vitest";
import { runAgentLoop, runToolPipeline, type ModelJSON } from "./agent";
import { SCENARIOS } from "../dhow-data";
import { checkDutyRate, estimateLanded, estimateRoutes, isKnownHs, resolvePort, screenCompliance, searchHS } from "./tools";

const solar = SCENARIOS[0]!;
const phones = SCENARIOS[1]!;

describe("tools", () => {
  it("finds the right HS subheading for common products", () => {
    expect(searchHS("photovoltaic modules")[0]?.code).toBe("8541.43");
    expect(searchHS("smartphones")[0]?.code).toBe("8517.13");
    expect(searchHS("lithium-ion batteries")[0]?.code).toBe("8507.60");
    expect(searchHS("excavators")[0]?.code).toBe("8429.52");
    expect(searchHS("portland cement")[0]?.code.startsWith("2523")).toBe(true);
    expect(searchHS("")).toEqual([]);
  });
  it("validates HS codes against the real nomenclature", () => {
    expect(isKnownHs("8541.43")).toBe(true);
    expect(isKnownHs("854143")).toBe(true);
    expect(isKnownHs("1234.56")).toBe(false);
  });
  it("snaps duty rates to the legal bands of the customs union", () => {
    expect(checkDutyRate("Benin", 7).rate).toBe(5);
    expect(checkDutyRate("Benin", 10)).toMatchObject({ rate: 10, snapped: false });
    expect(checkDutyRate("UAE", 12).rate).toBe(5);
    expect(checkDutyRate("Atlantis", 12)).toMatchObject({ rate: 12, bloc: null });
  });
  it("computes landed cost by plain arithmetic", () => {
    const l = estimateLanded({ declaredValue: 100000, dutyRate: 10, country: "Benin", region: "AF" });
    expect(l.cif).toBe(106000);
    expect(l.lines[0]!.amount).toBe(10600);
    expect(l.lines[1]!.amount).toBe(Math.round(((106000 + 10600) * 18) / 100));
    expect(l.totalLanded).toBe(l.cif + l.totalTaxesAndFees);
  });
  it("flags review jurisdictions and lithium batteries", () => {
    expect(screenCompliance({ origin: "Shenzhen", destination: "Tehran, Iran", cargoType: "x" }, "8517.13").verdict).toBe("review_required");
    expect(screenCompliance({ origin: "Shenzhen", destination: "Dubai", cargoType: "x" }, "8507.60").dangerousGoods).not.toBeNull();
    expect(screenCompliance({ origin: "Shenzhen", destination: "Dubai", cargoType: "x" }, "8541.43").verdict).toBe("no_red_flags");
  });
  it("does not invent ports", () => {
    expect(resolvePort("Nowhereville, ZZ").found).toBe(false);
    expect(resolvePort("Ningbo, CN").found).toBe(true);
  });
});

describe("tool pipeline (no AI)", () => {
  it("runs both demo scenarios end to end with a real trace", () => {
    for (const s of [solar, phones]) {
      const r = runToolPipeline(s.form, { hsQuery: s.hsQuery });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.trace.filter((t) => t.kind === "tool").length).toBeGreaterThanOrEqual(6);
      expect(r.plan.trace?.length).toBe(r.trace.length);
      expect(r.plan.documents).toHaveLength(3);
      expect(r.plan.customs.totalLanded).toBeGreaterThan(0);
    }
    const r = runToolPipeline(solar.form, { hsQuery: solar.hsQuery });
    expect(r.ok && r.plan.customs.hsCode).toBe("8541.43");
  });
  it("refuses an unknown port instead of silently rerouting", () => {
    const r = runToolPipeline({ ...solar.form, origin: "Atlantis" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Atlantis");
  });
});

/** A scripted stand-in for the model: it plays a plausible sequence and records what it was shown. */
function scripted(actions: Record<string, unknown>[]): { call: ModelJSON; seen: string[] } {
  const seen: string[] = [];
  let i = 0;
  return {
    seen,
    call: async (req) => {
      seen.push(req.input);
      const a = actions[Math.min(i++, actions.length - 1)]!;
      return { thought: "", query: "", hs_code: "", duty_rate_percent: 0, hub: "", briefing: "", ...a };
    },
  };
}

describe("agent loop (model chooses the tools)", () => {
  it("lets the model drive the tools and verifies the result", async () => {
    const m = scripted([
      { thought: "Check ports", action: "resolve_port", query: "Ningbo, CN" },
      { thought: "Classify the product", action: "search_hs_code", query: "photovoltaic modules" },
      { thought: "Screen it", action: "screen_compliance", hs_code: "8541.43" },
      { thought: "Use Jebel Ali", action: "estimate_routes", hub: "Jebel Ali" },
      { thought: "Cost it", action: "estimate_landed_cost", hs_code: "8541.43", duty_rate_percent: 7 },
      { thought: "Done", action: "finish", briefing: "Route via Jebel Ali; Red Sea exposure is the main risk." },
    ]);
    const r = await runAgentLoop(solar.form, m.call);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.customs.hsCode).toBe("8541.43");
    expect(r.plan.customs.tariffs[0]!.rate).toBe("5%"); // 7% snapped to the ECOWAS band
    expect(r.plan.risks.briefing).toContain("Route via Jebel Ali");
    expect(r.trace.some((t) => t.kind === "check" && t.summary.includes("exists in the HS-2022"))).toBe(true);
    expect(m.seen[1]).toContain("observation"); // the model was shown the first observation
  });
  it("rejects an invented HS code and uses a real one", async () => {
    const m = scripted([
      { action: "search_hs_code", query: "photovoltaic modules" },
      { action: "estimate_landed_cost", hs_code: "1234.56", duty_rate_percent: 5 },
      { action: "finish" },
    ]);
    const r = await runAgentLoop(solar.form, m.call);
    expect(r.ok).toBe(true);
    if (r.ok) expect(isKnownHs(r.plan.customs.hsCode)).toBe(true);
  });
  it("completes the essentials itself if the model finishes too early", async () => {
    const r = await runAgentLoop(solar.form, scripted([{ action: "finish", briefing: "ok" }]).call);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.trace.some((t) => t.summary.startsWith("(run by the verifier)"))).toBe(true);
  });
  it("stops after the step budget even if the model never finishes", async () => {
    const r = await runAgentLoop(solar.form, scripted([{ action: "resolve_port", query: "Ningbo" }]).call, { maxSteps: 3 });
    expect(r.trace.filter((t) => t.kind === "tool" && !t.summary.startsWith("(run by")).length).toBe(3);
  });
  it("propagates a model failure so the caller can fall back", async () => {
    await expect(runAgentLoop(solar.form, async () => { throw new Error("AI unavailable (500)"); })).rejects.toThrow("AI unavailable");
    await expect(runAgentLoop(solar.form, async () => ({ nonsense: true }))).rejects.toThrow("invalid action");
  });
});

describe("live sea state", () => {
  const form = { origin: "Ningbo, China", destination: "Cotonou, Benin", cargoType: "solar panels", weight: 38000, volume: 70, declaredValue: 312000, deadline: "2026-12-30" };
  const calm = { live: true, fetchedAt: "2026-10-31T08:00:00.000Z", waves: { hormuz: 0.4, bab_el_mandeb: 0.5, malacca: 0.3 } };
  const rough = { live: true, fetchedAt: "2026-10-31T08:00:00.000Z", waves: { hormuz: 2.8, bab_el_mandeb: 3.2, malacca: 2.6 } };

  it("raises the weather index when measured waves are higher, and cites the measurement", () => {
    const a = estimateRoutes(form, undefined, calm);
    const b = estimateRoutes(form, undefined, rough);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(b.risk.weather).toBeGreaterThan(a.risk.weather);
      expect(b.risk.briefing).toContain("Open-Meteo Marine");
    }
  });

  it("falls back to the geography heuristic and says so when the API did not answer", () => {
    const r = estimateRoutes(form, undefined, { ...calm, live: false });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.risk.briefing).toContain("heuristic");
  });
});
