export type FxRates = {
  base: string;
  date: string;
  rates: Record<string, number>;
  /** true only when the rates were just fetched from the API; false for the built-in fallback table. */
  live: boolean;
};

const FALLBACK_RATES: FxRates = {
  base: "USD",
  date: "built-in fallback table (API unreachable)",
  live: false,
  rates: {
    USD: 1,
    AED: 3.6725, // Parité officielle Banque Centrale des EAU
    EUR: 0.898,
    CNY: 7.12,
    GBP: 0.752,
    JPY: 154.5,
  },
};

let cachedRates: FxRates | null = null;
let lastFetch = 0;

/** Interroge le flux de taux de change officiel en temps réel */
export async function fetchLiveFxRates(): Promise<FxRates> {
  // Cache de 10 minutes pour optimiser le réseau
  if (cachedRates && Date.now() - lastFetch < 600000) {
    return cachedRates;
  }
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) throw new Error("Status " + res.status);
    const data = (await res.json()) as { rates?: Record<string, number>; time_last_update_utc?: string };
    if (data && data.rates && typeof data.rates["AED"] === "number") {
      cachedRates = {
        base: "USD",
        date: data.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        live: true,
        rates: {
          ...data.rates,
          AED: 3.6725, // Ancrage officiel UAE Central Bank
        },
      };
      lastFetch = Date.now();
      return cachedRates;
    }
    return FALLBACK_RATES;
  } catch {
    return FALLBACK_RATES;
  }
}
