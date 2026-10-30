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

    const res = await fetch(url);
    if (!res.ok) throw new Error("Status " + res.status);

    const data = await res.json();
    const results = Array.isArray(data) ? data : [data];

    cachedWeather = CHOKEPOINTS.map((cp, idx) => {
      const current = results[idx]?.current;
      const waveHeight = typeof current?.wave_height === "number" ? current.wave_height : 0.6;
      const windWaveHeight = typeof current?.wind_wave_height === "number" ? current.wind_wave_height : 0.4;
      const { status, advisory } = computeStatus(waveHeight);

      return {
        ...cp,
        waveHeight,
        windWaveHeight,
        status,
        advisory,
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
      advisory: "Optimal Navigation",
    }));
  }
  }
    
