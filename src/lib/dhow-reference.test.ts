import { describe, it, expect } from "vitest";
import { buildValuation, fetchReferencePriceDiag, REF_SERIES } from "./dhow-reference";

const rice = REF_SERIES.find((s) => s.id === "PRICENPQUSDM")!;
const FILE = "Title: Global price of Rice, Thailand, 5% broken\nUnits: U.S. Dollars per Metric Ton\n\nDATE VALUE\n2026-08-01 410.5\n2026-09-01 420.0\n";

describe("reference price when the live source fails", () => {
  it("shows the last retrieved price, marked as stale, instead of nothing", async () => {
    const realFetch = globalThis.fetch;
    const realNow = Date.now;
    try {
      globalThis.fetch = (async () => new Response(FILE, { status: 200 })) as typeof fetch;
      const first = await fetchReferencePriceDiag(rice);
      expect(first.ref?.usdPerTonne).toBe(420);
      expect(first.ref?.stale).toBeUndefined();

      // 13 hours later the cache is expired and FRED answers HTTP 520.
      const later = realNow() + 13 * 3600 * 1000;
      Date.now = () => later;
      globalThis.fetch = (async () => new Response("down", { status: 520 })) as typeof fetch;
      const second = await fetchReferencePriceDiag(rice);
      expect(second.ref?.usdPerTonne).toBe(420);
      expect(second.ref?.stale).toBe(true);
      expect(second.why).toBeNull();

      const v = buildValuation({ enteredUsd: 0, tonnes: 10, ref: second.ref });
      expect(v?.valueUsd).toBe(4200);
      expect(v?.note).toContain("last price retrieved");
      expect(v?.note).toContain("2026-09-01");
    } finally {
      globalThis.fetch = realFetch;
      Date.now = realNow;
    }
  });
});
