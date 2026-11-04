import { describe, expect, it } from "vitest";
import { SEA_EDGES, SEA_NODES, seaNodePath, seaRoute } from "./dhow-sealanes";
import { lookupCity } from "./dhow-plan";

const city = (q: string) => lookupCity(q)!;

describe("indicative sea lanes", () => {
  it("only connects waypoints that exist", () => {
    for (const [a, b] of SEA_EDGES) {
      expect(SEA_NODES[a]).toBeDefined();
      expect(SEA_NODES[b]).toBeDefined();
    }
  });
  it("keeps Douala to Cotonou on the coast instead of crossing Nigeria", () => {
    const r = seaRoute([city("Douala"), city("Lagos"), city("Cotonou")]);
    // Every interior point is an offshore waypoint (south of the coast line), never inland.
    for (const [lng, lat] of r.slice(1, -1)) {
      if (lat > 6.0) expect(Math.abs(lng - 3.4)).toBeLessThan(0.5); // the Lagos hub itself
    }
    expect(r.length).toBeGreaterThan(4);
  });
  it("sends Asia to Europe through Malacca, the Gulf of Aden and Suez", () => {
    const r = seaRoute([city("Shenzhen"), city("Jebel Ali"), city("Rotterdam")]);
    const near = (lat: number, lng: number) => r.some(([x, y]) => Math.abs(y - lat) < 0.6 && Math.abs(x - lng) < 0.6);
    expect(near(1.9, 102.3)).toBe(true); // Strait of Malacca
    expect(near(12.65, 43.25)).toBe(true); // Bab-el-Mandeb
    expect(near(31.25, 32.32)).toBe(true); // Suez Canal, north end
  });
  it("falls back to a great-circle arc for a port the network does not serve", () => {
    expect(seaNodePath(city("Los Angeles"), city("Tokyo"))).toBeNull();
    expect(seaRoute([city("Los Angeles"), city("Tokyo")]).length).toBeGreaterThan(10);
  });
});
