import { describe, expect, it } from "vitest";
import { clarificationFor, findMissing, formFromExtraction, normalizeFields } from "./dhow-extract";

const full = { origin: "Ningbo", destination: "Cotonou", cargoType: "Motorcycle parts", weight: 20, volume: null, declaredValue: null };

describe("shipment extraction helpers", () => {
  it("keeps only well-formed values", () => {
    const f = normalizeFields({ origin: "  Ningbo ", destination: 5, cargoType: "", weight: "20", volume: -3, declaredValue: 1500 });
    expect(f).toEqual({ origin: "Ningbo", destination: null, cargoType: null, weight: null, volume: null, declaredValue: 1500 });
  });

  it("flags a missing weight (pallets give no weight)", () => {
    const f = { ...full, weight: null };
    expect(findMissing(f)).toEqual(["weight"]);
    expect(clarificationFor(findMissing(f))).toBe("What is the total weight, in tonnes?");
    expect(formFromExtraction(f)).toBeNull();
  });

  it("asks about the first missing field and flags everything for 'Hello'", () => {
    const f = normalizeFields({});
    expect(findMissing(f)).toEqual(["origin", "destination", "cargoType", "weight"]);
    expect(clarificationFor(findMissing(f))).toBe("Where does the shipment start (city or country)?");
  });

  it("asks nothing when the sentence is complete", () => {
    expect(findMissing(full)).toEqual([]);
    expect(clarificationFor([])).toBeNull();
  });

  it("replaces every form field, so no old value survives", () => {
    const v = formFromExtraction(full);
    expect(v).toEqual({ origin: "Ningbo", destination: "Cotonou", cargoType: "Motorcycle parts", weight: 20, volume: 0, declaredValue: 0 });
  });
});
