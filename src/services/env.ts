// Live local environment data from open, key-free APIs.
// Each domain loads independently: one failing source never blanks the whole Pulse.

export type Place = { lat: number; lon: number; name: string };

export const DEFAULT_PLACE: Place = { lat: 45.4642, lon: 9.19, name: "Milano" };

export type AirData = {
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  next24: { hour: string; aqi: number }[];
};

export type WeatherData = {
  temp: number;
  feels: number;
  humidity: number;
  code: number;
  wind: number;
  uv: number;
  isDay: boolean;
  tmax: number;
  tmin: number;
};

export type WaterData = { rain7: number; rainNext3: number; dryDays: number; daily: { day: string; mm: number }[] };

export type SoilData = { moisture: number; weekAgo: number };

export type Species = {
  id: number;
  name: string;
  common?: string;
  photo?: string;
  attribution?: string;
  count: number;
  group?: string;
};

export type NatureData = { speciesCount: number; top: Species[]; locale?: "it" | "en" };

export type Area = { id: number; name: string; title?: string; km: number };

export type Pulse = {
  place: Place;
  fetchedAt: number;
  sample: boolean;
  air?: AirData;
  weather?: WeatherData;
  water?: WaterData;
  soil?: SoilData;
  nature?: NatureData;
  areas?: Area[];
  areasStatus?: "loading" | "error";
};

const UA = "BeGreen/1.0 (hackathon prototype)";

const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

async function getJSON<T>(url: string, init?: RequestInit, timeoutMs = 15000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

export async function fetchAir(p: Place): Promise<AirData> {
  const j = await getJSON<any>(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${p.lat}&longitude=${p.lon}` +
      `&current=european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&hourly=european_aqi&forecast_days=2&timezone=auto`,
  );
  const c = j.current;
  const nowIdx = Math.max(
    0,
    (j.hourly.time as string[]).findIndex((t) => t >= c.time.slice(0, 13)),
  );
  const next24 = (j.hourly.time as string[]).slice(nowIdx, nowIdx + 24).map((t, i) => ({
    hour: t.slice(11, 13),
    aqi: j.hourly.european_aqi[nowIdx + i] ?? 0,
  }));
  return {
    aqi: Math.round(c.european_aqi),
    pm25: round(c.pm2_5, 1),
    pm10: round(c.pm10, 1),
    no2: round(c.nitrogen_dioxide, 1),
    o3: round(c.ozone),
    next24,
  };
}

export async function fetchWeatherWaterSoil(p: Place): Promise<{ weather: WeatherData; water: WaterData; soil: SoilData }> {
  const j = await getJSON<any>(
    `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,uv_index,is_day` +
      `&daily=precipitation_sum,temperature_2m_max,temperature_2m_min` +
      `&hourly=soil_moisture_0_to_1cm&past_days=7&forecast_days=4&timezone=auto`,
  );
  const c = j.current;
  const days: string[] = j.daily.time;
  const mm: number[] = j.daily.precipitation_sum.map((x: number | null) => x ?? 0);
  const todayIdx = days.findIndex((d) => d === c.time.slice(0, 10));
  const ti = todayIdx < 0 ? 7 : todayIdx;
  const past = mm.slice(0, ti);
  let dryDays = 0;
  for (let i = past.length - 1; i >= 0 && past[i] < 1; i--) dryDays++;

  const soilT: string[] = j.hourly.time;
  const soilV: (number | null)[] = j.hourly.soil_moisture_0_to_1cm;
  const hIdx = Math.max(
    0,
    soilT.findIndex((t) => t >= c.time.slice(0, 13)),
  );
  const pick = (i: number) => {
    for (let k = i; k >= 0; k--) if (soilV[k] != null) return soilV[k] as number;
    return 0;
  };

  return {
    weather: {
      temp: round(c.temperature_2m),
      feels: round(c.apparent_temperature),
      humidity: Math.round(c.relative_humidity_2m),
      code: c.weather_code,
      wind: round(c.wind_speed_10m),
      uv: round(c.uv_index, 1),
      isDay: c.is_day === 1,
      tmax: round(j.daily.temperature_2m_max[ti]),
      tmin: round(j.daily.temperature_2m_min[ti]),
    },
    water: {
      rain7: round(
        past.reduce((a, b) => a + b, 0),
        1,
      ),
      rainNext3: round(
        mm.slice(ti, ti + 3).reduce((a, b) => a + b, 0),
        1,
      ),
      dryDays,
      daily: days.slice(0, ti + 3).map((d, i) => ({ day: d, mm: mm[i] })),
    },
    soil: { moisture: round(pick(hIdx), 3), weekAgo: round(pick(Math.max(0, hIdx - 24 * 7)), 3) },
  };
}

export async function fetchNature(p: Place, locale: "it" | "en" = "en"): Promise<NatureData> {
  const d1 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const j = await getJSON<any>(
    `https://api.inaturalist.org/v1/observations/species_counts?lat=${p.lat}&lng=${p.lon}&radius=10` +
      `&d1=${d1}&quality_grade=research&per_page=12&locale=${locale}`,
  );
  return {
    speciesCount: j.total_results ?? 0,
    locale,
    top: (j.results ?? []).map((r: any) => ({
      id: r.taxon.id,
      name: r.taxon.name,
      common: r.taxon.preferred_common_name || undefined,
      photo: r.taxon.default_photo?.medium_url ?? r.taxon.default_photo?.square_url,
      attribution: r.taxon.default_photo?.attribution,
      count: r.count,
      group: r.taxon.iconic_taxon_name,
    })),
  };
}

function km(a: Place, lat: number, lon: number) {
  const R = 6371;
  const dLat = ((lat - a.lat) * Math.PI) / 180;
  const dLon = ((lon - a.lon) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export async function fetchAreas(p: Place): Promise<Area[]> {
  const q =
    `[out:json][timeout:8];(` +
    `relation["boundary"="protected_area"](around:25000,${p.lat},${p.lon});` +
    `relation["leisure"="nature_reserve"](around:25000,${p.lat},${p.lon});` +
    `);out tags center 20;`;
  // The public Overpass servers are often at capacity: try mirrors with short timeouts.
  let j: any = null;
  for (const url of OVERPASS) {
    try {
      j = await getJSON<any>(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA, Accept: "application/json" },
          body: `data=${encodeURIComponent(q)}`,
        },
        9000,
      );
      break;
    } catch {
      // next mirror
    }
  }
  if (!j) throw new Error("overpass unavailable");
  const seen = new Set<string>();
  return (j.elements ?? [])
    .filter((e: any) => e.tags?.name && e.center)
    .map((e: any) => ({
      id: e.id,
      name: e.tags.name as string,
      title: e.tags.protection_title as string | undefined,
      km: round(km(p, e.center.lat, e.center.lon), 1),
    }))
    .filter((a: Area) => (seen.has(a.name) ? false : (seen.add(a.name), true)))
    .sort((a: Area, b: Area) => a.km - b.km)
    .slice(0, 6);
}

export async function fetchPulse(place: Place, prev?: Pulse | null, locale: "it" | "en" = "en"): Promise<Pulse> {
  // Protected areas load separately (see refreshPulse): the map servers can be slow.
  const [air, wws, nature] = await Promise.allSettled([fetchAir(place), fetchWeatherWaterSoil(place), fetchNature(place, locale)]);
  const ok = <T>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : undefined);
  const pulse: Pulse = {
    place,
    fetchedAt: Date.now(),
    sample: false,
    air: ok(air),
    weather: ok(wws)?.weather,
    water: ok(wws)?.water,
    soil: ok(wws)?.soil,
    nature: ok(nature),
    // Protected areas barely change: keep the last good list for the same place.
    areas: prev && km(prev.place, place.lat, place.lon) < 2 ? prev.areas : undefined,
  };
  if (!pulse.areas) pulse.areasStatus = "loading";
  if (!pulse.air && !pulse.weather && !pulse.nature) return { ...SAMPLE_PULSE, place, sample: true };
  return pulse;
}

// Offline fallback, clearly flagged as sample data in the UI.
export const SAMPLE_PULSE: Pulse = {
  place: DEFAULT_PLACE,
  fetchedAt: Date.now(),
  sample: true,
  air: {
    aqi: 64,
    pm25: 31.2,
    pm10: 44.0,
    no2: 52.3,
    o3: 18,
    next24: Array.from({ length: 24 }, (_, i) => ({
      hour: String((8 + i) % 24).padStart(2, "0"),
      aqi: Math.round(48 + 18 * Math.sin((i / 24) * Math.PI * 2 + 1) + (i % 5)),
    })),
  },
  weather: { temp: 12, feels: 10, humidity: 78, code: 3, wind: 6, uv: 1.2, isDay: true, tmax: 14, tmin: 7 },
  water: {
    rain7: 0.4,
    rainNext3: 0,
    dryDays: 6,
    daily: Array.from({ length: 10 }, (_, i) => ({ day: `d${i}`, mm: i === 0 ? 0.4 : 0 })),
  },
  soil: { moisture: 0.14, weekAgo: 0.22 },
  nature: {
    speciesCount: 287,
    top: [
      { id: 1, name: "Sciurus carolinensis", common: "Eastern Gray Squirrel", count: 26, group: "Mammalia" },
      { id: 2, name: "Columba palumbus", common: "Common Wood Pigeon", count: 19, group: "Aves" },
      { id: 3, name: "Hedera helix", common: "Common Ivy", count: 14, group: "Plantae" },
    ],
  },
  areas: [
    { id: 1, name: "Parco Nord Milano", title: "Parco regionale", km: 9.1 },
    { id: 2, name: "Parco Agricolo Sud Milano", title: "Parco regionale", km: 11.4 },
  ],
};
