/**
 * Pure helpers for the "Describe your shipment" box.
 * The model only reads the sentence. What is missing, and what the form receives,
 * is decided here in code so that a value the user did not give is never invented
 * and an old value is never reused by mistake.
 */

export type ExtractedFields = {
  origin: string | null;
  destination: string | null;
  cargoType: string | null;
  weight: number | null;
  volume: number | null;
  declaredValue: number | null;
};

export const REQUIRED_FIELDS = ["origin", "destination", "cargoType", "weight"] as const;
export type RequiredField = (typeof REQUIRED_FIELDS)[number];

const QUESTIONS: Record<RequiredField, string> = {
  origin: "Where does the shipment start (city or country)?",
  destination: "Where is it going (city or country)?",
  cargoType: "What goods are you shipping?",
  weight: "What is the total weight, in tonnes?",
};

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : null);
const positive = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

/** Keeps only well-formed values from the model's JSON. */
export function normalizeFields(parsed: Record<string, unknown>): ExtractedFields {
  return {
    origin: text(parsed["origin"]),
    destination: text(parsed["destination"]),
    cargoType: text(parsed["cargoType"]),
    weight: positive(parsed["weight"]),
    volume: positive(parsed["volume"]),
    declaredValue: positive(parsed["declaredValue"]),
  };
}

/** Required fields the sentence did not give. */
export function findMissing(f: ExtractedFields): RequiredField[] {
  return REQUIRED_FIELDS.filter((k) => f[k] === null);
}

/** One short question about the first missing field, or null when nothing is missing. */
export function clarificationFor(missing: readonly RequiredField[]): string | null {
  const first = missing[0];
  return first ? QUESTIONS[first] : null;
}

export type FormValues = {
  origin: string;
  destination: string;
  cargoType: string;
  weight: number;
  volume: number;
  declaredValue: number;
};

/**
 * Values to copy into the form once the user confirms.
 * Every field is replaced: a value that was not in the sentence becomes empty (0),
 * never the value left over from an earlier request.
 * Returns null while a required field is missing.
 */
export function formFromExtraction(f: ExtractedFields): FormValues | null {
  if (findMissing(f).length > 0) return null;
  return {
    origin: f.origin ?? "",
    destination: f.destination ?? "",
    cargoType: f.cargoType ?? "",
    weight: f.weight ?? 0,
    volume: f.volume ?? 0,
    declaredValue: f.declaredValue ?? 0,
  };
}
