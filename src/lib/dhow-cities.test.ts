import { describe, expect, it } from "vitest";
import { lookupCity, suggestCities, unknownCityMessage } from "./dhow-plan";
import { runAgentLoop, runToolPipeline } from "./agent/agent";
import { checkDutyRate, estimateRoutes, vatFor } from "./agent/tools";

describe("city lookup", () => {
  it("knows the ports judges are likely to type", () => {
    for (const q of ["Bangkok", "Accra, Ghana", "Nairobi", "Kinshasa", "Hanoi", "Manila", "Delhi", "Dhaka", "Kampala", "Port Harcourt", "Cape Town", "Yiwu", "Istanbul"]) {
      expect(lookupCity(q), q).not.toBeNull();
    }
  });
  it("understands other names and accents", () => {
    expect(lookupCity("Bombay")?.code).toBe("INNSA");
    expect(lookupCity("Saigon")?.code).toBe("VNSGN");
    expect(lookupCity("Lomé, Togo")?.code).toBe("TGLFW");
    expect(lookupCity("São Paulo, BR")?.code).toBe("BRSAO");
    expect(lookupCity("Lagos (Apapa), NG")?.code).toBe("NGAPP");
    expect(lookupCity("Port of Cotonou")?.code).toBe("BJCOO");
    expect(lookupCity("Jebel Ali Port")?.code).toBe("AEJEA");
    expect(lookupCity("Dubai Logistics City, AE")?.code).toBe("AEDWC");
  });
  it("keeps the name the user typed", () => {
    expect(lookupCity("Bombay, India")?.name).toBe("Bombay");
  });
  it("matches whole words only", () => {
    expect(lookupCity("Atlantis")).toBeNull();
    expect(lookupCity("Parisian Village")).toBeNull();
    expect(lookupCity("Lima")?.code).toBe("PELIM");
    expect(lookupCity("Dalian")?.code).toBe("CNDLC");
  });
  it("suggests close names for typos", () => {
    expect(suggestCities("Mombassa")[0]).toContain("Mombasa");
    expect(suggestCities("Rotterdamm")[0]).toContain("Rotterdam");
    expect(suggestCities("Nairobbi")[0]).toContain("Nairobi");
    expect(suggestCities("xx")).toEqual([]);
  });
  it("writes a helpful message", () => {
    const m = unknownCityMessage(["Cotonuo"]);
    expect(m).toContain("Did you mean Cotonou (Benin)");
    expect(unknownCityMessage(["Atlantis"])).not.toContain("Did you mean");
  });
});

describe("new cities in the tools", () => {
  const base = { cargoType: "Rice", weight: 25, volume: 50, declaredValue: 15000 };
  it("plans Bangkok to Accra end to end", () => {
    const r = runToolPipeline({ ...base, origin: "Bangkok", destination: "Accra" });
    expect(r.ok).toBe(true);
  });
  it("plans an inland destination without choosing it as hub", () => {
    const r = estimateRoutes({ ...base, origin: "Mombasa", destination: "Dar es Salaam" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(["Nairobi", "Kampala", "Kigali", "Addis Ababa", "Kinshasa"]).not.toContain(r.hub.name);
    const k = estimateRoutes({ ...base, origin: "Mombasa", destination: "Kampala" });
    expect(k.ok).toBe(true);
    if (k.ok) expect(k.hub.name).not.toBe("Kampala");
  });
  it("applies the right customs bloc and VAT to new countries", () => {
    expect(checkDutyRate("Uganda", 10).bloc).toContain("EAC");
    expect(checkDutyRate("Gabon", 10).bloc).toContain("CEMAC");
    expect(checkDutyRate("Qatar", 5).bloc).toContain("GCC");
    expect(vatFor("Uganda", "AF").rate).toBe(18);
    expect(vatFor("Qatar", "ME").rate).toBe(0);
  });
});

describe("unknown cities cost nothing", () => {
  it("refuses before calling the model", async () => {
    let calls = 0;
    const r = await runAgentLoop({ origin: "Atlantis", destination: "Cotonou", cargoType: "Rice", weight: 25, volume: 50, declaredValue: 15000 }, async () => { calls++; return {}; });
    expect(r.ok).toBe(false);
    expect(calls).toBe(0);
    if (!r.ok) expect(r.error).toContain("Atlantis");
  });
});
