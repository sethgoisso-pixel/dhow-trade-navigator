import { describe, expect, it } from "vitest";
import { runAgentLoop, runToolPipeline, type ModelJSON } from "./agent";
import { SCENARIOS } from "../dhow-data";
import { checkDutyRate, estimateLanded, estimateRoutes, isKnownHs, resolvePort, screenCompliance, searchHS } from "./tools";
import { buildValuation, parseFredTxt, seriesForHs, toUsdPerTonne } from "../dhow-reference";
import { HOLDOUT, TUNING } from "./benchmark";

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
  it("drops a model briefing that invents a date or a number no tool produced", async () => {
    const steps = (briefing: string) => scripted([
      { action: "search_hs_code", query: "photovoltaic modules" },
      { action: "estimate_routes", hub: "Jebel Ali" },
      { action: "estimate_landed_cost", hs_code: "8541.43", duty_rate_percent: 5 },
      { action: "finish", briefing },
    ]).call;
    const a = await runAgentLoop(solar.form, steps("Book before the December 5 deadline."));
    const b = await runAgentLoop(solar.form, steps("Transit takes 99 days."));
    const c = await runAgentLoop(solar.form, steps("Route via Jebel Ali is the safest."));
    for (const r of [a, b]) {
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.plan.risks.briefing).not.toContain("deadline");
        expect(r.plan.risks.briefing).not.toContain("99 days");
        expect(r.trace.some((t) => t.summary.startsWith("Model briefing dropped"))).toBe(true);
      }
    }
    if (c.ok) expect(c.plan.risks.briefing).toContain("Route via Jebel Ali");
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

describe("chokepoint exposure", () => {
  const cargo = { weight: 20, volume: 40, declaredValue: 20000, cargoType: "bananas" };
  it("does not flag the Red Sea for a West Africa coastal leg via a West African hub", () => {
    const r = estimateRoutes({ origin: "Douala, Cameroon", destination: "Cotonou, BJ", ...cargo } as never, "Lom\u00e9");
    if (!r.ok) throw new Error("unexpected");
    expect(r.exposure).toEqual([]);
  });
  it("still flags Suez or Cape when Asia is shipped to Europe or West Africa", () => {
    const r = estimateRoutes({ origin: "Shenzhen, China", destination: "Lagos, Nigeria", ...cargo } as never);
    if (!r.ok) throw new Error("unexpected");
    expect(r.exposure.some((x: string) => x.includes("Red Sea"))).toBe(true);
  });
});

describe("hub detour guard", () => {
  const cargo = { weight: 20, volume: 40, declaredValue: 20000, cargoType: "bananas" };
  it("replaces a hub beyond the destination on a short African leg", () => {
    const r = estimateRoutes({ origin: "Douala, Cameroon", destination: "Cotonou, BJ", ...cargo } as never, "Tema");
    if (!r.ok) throw new Error("unexpected");
    expect(r.hub.name).toBe("Lagos");
    expect(r.hubNote).toContain("Tema");
    expect(r.distanceKm).toBeLessThan(1000);
  });
  it("keeps a sensible hub and long-haul defaults untouched", () => {
    const a = estimateRoutes({ origin: "Douala, Cameroon", destination: "Cotonou, BJ", ...cargo } as never, "Lagos");
    if (!a.ok) throw new Error("unexpected");
    expect(a.hubNote).toBeNull();
    const b = estimateRoutes({ origin: "Shenzhen, China", destination: "Lagos, Nigeria", ...cargo } as never);
    if (!b.ok) throw new Error("unexpected");
    expect(b.hub.name).toBe("Jebel Ali");
  });
});

describe("sourced reference prices", () => {
  const sample = `Title:               Global price of Bananas
Series ID:           PBANSOPUSDM
Source:              International Monetary Fund
Frequency:           Monthly
Units:               U.S. Dollars per Metric Ton
Date Range:          2010-05-01 to 2026-09-01

DATE       VALUE
2026-07-01  1167.4273469344430
2026-08-01  1104.9723830450150
2026-09-01  1135.1080211292610
`;
  it("parses the latest row and the units from a FRED text file", () => {
    const p = parseFredTxt(sample);
    expect(p?.date).toBe("2026-09-01");
    expect(p?.units).toContain("Metric Ton");
    expect(toUsdPerTonne(p!.value, p!.units)).toBeCloseTo(1135.108, 2);
  });
  it("converts cents per pound and refuses unknown units", () => {
    expect(toUsdPerTonne(100, "U.S. Cents per Pound")).toBeCloseTo(2204.62, 1);
    expect(toUsdPerTonne(5, "Index")).toBeNull();
  });
  it("maps HS codes to series only for listed commodities", () => {
    expect(seriesForHs("0803.90")?.id).toBe("PBANSOPUSDM");
    expect(seriesForHs("8541.43")).toBeNull();
  });
  const ref = { seriesId: "PBANSOPUSDM", label: "Bananas", title: "Global price of Bananas", usdPerTonne: 1135, asOf: "2026-09-01", url: "https://fred.stlouisfed.org/series/PBANSOPUSDM" };
  it("estimates the value of 20 t when none is entered, and says so", () => {
    const v = buildValuation({ enteredUsd: 0, tonnes: 20, ref });
    expect(v?.basis).toBe("reference");
    expect(v?.valueUsd).toBe(22700);
    expect(v?.note).toContain("replace this with your real one");
  });
  it("flags an invoice far below the benchmark and accepts a consistent one", () => {
    expect(buildValuation({ enteredUsd: 5000, tonnes: 20, ref })?.flag).toBe("low");
    expect(buildValuation({ enteredUsd: 24000, tonnes: 20, ref })?.flag).toBeNull();
    expect(buildValuation({ enteredUsd: 90000, tonnes: 20, ref })?.flag).toBe("high");
    expect(buildValuation({ enteredUsd: 24000, tonnes: 20, ref: null })).toBeNull();
  });
});

describe("natural product descriptions", () => {
  it("ignores quantities and picks the commodity, not a lookalike", () => {
    expect(searchHS("20 tonnes of fresh bananas")[0]?.code).toBe("0803.90");
    expect(searchHS("50t Green Coffee Beans")[0]?.code).toBe("0901.11");
    expect(searchHS("yellow maize")[0]?.code).toBe("1005.90");
    expect(searchHS("wheat")[0]?.code).toBe("1001.99");
    expect(searchHS("wheat flour")[0]?.code.startsWith("1101")).toBe(true);
    expect(searchHS("cotton")[0]?.code).toBe("5201.00");
  });
});

describe("typo tolerance", () => {
  it("still finds the product when a word is misspelled", () => {
    expect(searchHS("20t banananas", 1)[0]?.code).toBe("0803.90");
    expect(searchHS("bananna", 1)[0]?.code).toBe("0803.90");
    expect(searchHS("green cofee beans", 1)[0]?.code).toBe("0901.11");
    expect(searchHS("raw cottton", 1)[0]?.code).toBe("5201.00");
  });
  it("does not change correctly spelled queries", () => {
    expect(searchHS("fresh bananas", 1)[0]?.code).toBe("0803.90");
    expect(searchHS("qwxzvkj", 1)).toEqual([]);
  });
});

describe("HS search benchmark (retrieval of the expected subheading)", () => {
  const score = (cases: [string, string][]) => {
    let top1 = 0, top5 = 0;
    for (const [q, want] of cases) {
      const i = searchHS(q, 5).findIndex((h) => h.code === want);
      if (i === 0) top1++;
      if (i >= 0) top5++;
    }
    return { n: cases.length, top1: top1 / cases.length, top5: top5 / cases.length };
  };
  it("keeps recall@5 at or above the measured floors", () => {
    const a = score(TUNING);
    const b = score(HOLDOUT);
    expect(a.top5).toBeGreaterThanOrEqual(0.9);
    expect(a.top1).toBeGreaterThanOrEqual(0.7);
    expect(b.top5).toBeGreaterThanOrEqual(0.85);
    expect(b.top1).toBeGreaterThanOrEqual(0.7);
  });
});
