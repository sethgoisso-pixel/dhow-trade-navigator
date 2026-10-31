export type ChokepointWeather = {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lon: number;
  waveHeight: number;
  windWaveHeight: number;
  status: "Calm" | "Moderate" | "Rough";
  advisory: string;
  /** true only when the value was measured by the API just now; false for the built-in fallback value. */
  live: boolean;
  fetchedAt: string;
};

const CHOKEPOINTS = [
  {
    id: "hormuz",
    name: "Strait of Hormuz",
    zone: "Persian Gulf · Dubai Entry",
    lat: 26.5,
    lon: 56.5,
  },
  {
    id: "bab_el_mandeb",
    name: "Bab-el-Mandeb",
    zone: "Red Sea · Suez Access",
    lat: 12.6,
    lon: 43.3,
  },
  {
    id: "malacca",
    name: "Strait of Malacca",
    zone: "Singapore · Asia Gateway",
    lat: 2.5,
    lon: 101.5,
  },
];

let cachedWeather: ChokepointWeather[] | null = null;
let lastFetch = 0;

function computeStatus(waveHeight: number): { status: "Calm" | "Moderate" | "Rough"; advisory: string } {
  if (waveHeight < 1.0) {
    return { status: "Calm", advisory: "Optimal Navigation" };
  }
  if (waveHeight < 2.2) {
    return { status: "Moderate", advisory: "Nominal Transit" };
  }
  return { status: "Rough", advisory: "High Swell · Sea-Air Preferred" };
}

/** Récupère la météo marine en direct des 3 goulets stratégiques mondiaux (Open-Meteo Copernicus) */
export async function fetchMaritimeWeather(): Promise<ChokepointWeather[]> {
  // Cache de 5 minutes pour préserver les requêtes réseau
  if (cachedWeather && Date.now() - lastFetch < 300000) {
    return cachedWeather;
  }

  try {
    const lats = CHOKEPOINTS.map((c) => c.lat).join(",");
    const lons = CHOKEPOINTS.map((c) => c.lon).join(",");
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lats}&longitude=${lons}&current=wave_height,wind_wave_height`;

    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error("Status " + res.status);

    const data = await res.json();
    const results = Array.isArray(data) ? data : [data];

    cachedWeather = CHOKEPOINTS.map((cp, idx) => {
      const current = results[idx]?.current;
      const measured = typeof current?.wave_height === "number";
      const waveHeight = measured ? current.wave_height : 0.6;
      const windWaveHeight = typeof current?.wind_wave_height === "number" ? current.wind_wave_height : 0.4;
      const { status, advisory } = computeStatus(waveHeight);

      return {
        ...cp,
        waveHeight,
        windWaveHeight,
        status,
        advisory,
        live: measured,
        fetchedAt: new Date().toISOString(),
      };
    });

    lastFetch = Date.now();
    return cachedWeather;
  } catch {
    // Secours standard déterministe en cas de coupure réseau
    return CHOKEPOINTS.map((cp) => ({
      ...cp,
      waveHeight: 0.8,
      windWaveHeight: 0.5,
      status: "Calm",
      advisory: "Fallback value (API unreachable)",
      live: false,
      fetchedAt: new Date().toISOString(),
    }));
  }
  }

/** Compact sea state for the agent's risk model (see src/lib/agent/tools.ts). */
export function toSeaState(points: ChokepointWeather[]): { live: boolean; fetchedAt: string; waves: { hormuz: number; bab_el_mandeb: number; malacca: number } } {
  const wave = (id: string) => points.find((p) => p.id === id)?.waveHeight ?? 0;
  return {
    live: points.length === 3 && points.every((p) => p.live),
    fetchedAt: points[0]?.fetchedAt ?? new Date().toISOString(),
    waves: { hormuz: wave("hormuz"), bab_el_mandeb: wave("bab_el_mandeb"), malacca: wave("malacca") },
  };
}
