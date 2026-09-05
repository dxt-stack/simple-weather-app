/**
 * Weather data layer — Open-Meteo (free for non-commercial use, no API key).
 * Docs: https://open-meteo.com/en/docs
 */

export type Units = "metric" | "imperial";

export interface Place {
  id: string;
  name: string;
  country: string;
  countryCode?: string;
  admin1?: string;
  lat: number;
  lon: number;
  timezone?: string;
}

export interface CurrentWeather {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  weatherCode: number;
  isDay: boolean;
  windSpeed: number; // km/h (metric) / mph (imperial, requested via unit)
  windDirection: number;
  pressure: number;
  uvIndex: number;
  visibility: number; // meters
  dewPoint: number;
  cloudCover: number;
}

export interface HourlyPoint {
  time: string; // ISO
  temperature: number;
  weatherCode: number;
  precipitationProbability: number;
  isDay: boolean;
  isNow: boolean;
}

export interface DailyPoint {
  date: string; // ISO date
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
  windMax: number;
}

export interface SunTimes {
  sunrise: string;
  sunset: string;
}

export interface WeatherBundle {
  current: CurrentWeather;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  timezone: string;
  utcOffsetSeconds: number;
}

// ---------------------------------------------------------------------------
// WMO weather interpretation codes (WWO)
// ---------------------------------------------------------------------------

interface WmoInfo {
  label: string;
  /** lucide icon name */
  icon: string;
}

const WMO: Record<number, WmoInfo> = {
  0: { label: "Clear sky", icon: "clear" },
  1: { label: "Mainly clear", icon: "clear" },
  2: { label: "Partly cloudy", icon: "partly-day" },
  3: { label: "Overcast", icon: "cloudy" },
  45: { label: "Fog", icon: "fog" },
  48: { label: "Freezing fog", icon: "fog" },
  51: { label: "Light drizzle", icon: "drizzle" },
  53: { label: "Drizzle", icon: "drizzle" },
  55: { label: "Dense drizzle", icon: "drizzle" },
  56: { label: "Freezing drizzle", icon: "sleet" },
  57: { label: "Freezing drizzle", icon: "sleet" },
  61: { label: "Light rain", icon: "rain" },
  63: { label: "Rain", icon: "rain" },
  65: { label: "Heavy rain", icon: "rain" },
  66: { label: "Freezing rain", icon: "sleet" },
  67: { label: "Freezing rain", icon: "sleet" },
  71: { label: "Light snow", icon: "snow" },
  73: { label: "Snow", icon: "snow" },
  75: { label: "Heavy snow", icon: "snow" },
  77: { label: "Snow grains", icon: "snow" },
  80: { label: "Light showers", icon: "showers" },
  81: { label: "Showers", icon: "showers" },
  82: { label: "Heavy showers", icon: "showers" },
  85: { label: "Snow showers", icon: "snow" },
  86: { label: "Heavy snow showers", icon: "snow" },
  95: { label: "Thunderstorm", icon: "storm" },
  96: { label: "Storm, light hail", icon: "storm" },
  99: { label: "Storm, heavy hail", icon: "storm" },
};

export function wmoLabel(code: number): string {
  return WMO[code]?.label ?? "Unknown";
}

export function wmoIcon(code: number, isDay = true): string {
  const info = WMO[code];
  if (!info) return "cloudy";
  if (info.icon === "clear") return isDay ? "clear" : "clear-night";
  if (info.icon === "partly-day") return isDay ? "partly-day" : "partly-night";
  return info.icon;
}

// ---------------------------------------------------------------------------
// Unit helpers
// ---------------------------------------------------------------------------

export function convertTemp(celsius: number, units: Units): number {
  return units === "imperial" ? celsius * 1.8 + 32 : celsius;
}

export function convertWind(kmh: number, units: Units): number {
  return units === "imperial" ? kmh * 0.621371 : kmh;
}

export function convertVisibility(meters: number, units: Units): number {
  return units === "imperial" ? meters / 1609.34 : meters / 1000;
}

export function tempUnit(units: Units): string {
  return units === "imperial" ? "°F" : "°C";
}

export function windUnit(units: Units): string {
  return units === "imperial" ? "mph" : "km/h";
}

export function visibilityUnit(units: Units): string {
  return units === "imperial" ? "mi" : "km";
}

export function formatTemp(celsius: number, units: Units, digits = 0): string {
  return `${convertTemp(celsius, units).toFixed(digits)}°`;
}

export function formatSpeed(kmh: number, units: Units): string {
  const v = convertWind(kmh, units);
  return `${v >= 10 ? Math.round(v) : v.toFixed(1)} ${windUnit(units)}`;
}

const DIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

export function windDirectionLabel(deg: number): string {
  return DIRS[Math.round(deg / 22.5) % 16] ?? "N";
}

export function uvLabel(uv: number): string {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very high";
  return "Extreme";
}

// ---------------------------------------------------------------------------
// Time helpers (Open-Meteo returns location-local "wall time" strings)
// ---------------------------------------------------------------------------

/**
 * Parse an Open-Meteo local wall-time string ("2026-09-05T14:00") as UTC-based
 * wall time so getUTC* reads back the location's clock. Strings that already
 * carry a zone offset are parsed as-is.
 */
export function parseWall(iso: string): Date {
  if (/(?:z|[+-]\d{2}:?\d{2})$/i.test(iso)) return new Date(iso);
  if (iso.length === 10) return new Date(`${iso}T00:00:00Z`);
  const withSeconds = iso.length === 16 ? `${iso}:00` : iso;
  return new Date(`${withSeconds}Z`);
}

/** Format a wall-time ISO string as the location's clock, e.g. "14:00" or "2 PM". */
export function formatIsoTime(
  iso: string,
  style: "short" | "hour" = "short",
): string {
  const d = parseWall(iso);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  if (style === "hour") {
    const suffix = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12} ${suffix}`;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Format a wall-time date string as the location's weekday, e.g. "Mon". */
export function formatIsoWeekday(iso: string, long = false): string {
  const d = parseWall(iso);
  return d.toLocaleDateString("en-US", {
    weekday: long ? "long" : "short",
    timeZone: "UTC",
  });
}

/** The next 24 hourly entries starting at the current hour at the location. */
export function next24Hours(hourly: HourlyPoint[]): HourlyPoint[] {
  const idx = hourly.findIndex((h) => h.isNow);
  if (idx >= 0) return hourly.slice(idx, idx + 24);
  return hourly.slice(0, 24);
}

// ---------------------------------------------------------------------------
// Geocoding
// ---------------------------------------------------------------------------

export async function searchPlaces(query: string): Promise<Place[]> {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json" +
    `&name=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Search failed");
  const data = (await res.json()) as {
    results?: Array<{
      id: number;
      name: string;
      country?: string;
      country_code?: string;
      admin1?: string;
      latitude: number;
      longitude: number;
      timezone?: string;
    }>;
  };
  return (data.results ?? []).map((r) => ({
    id: `g${r.id}`,
    name: r.name,
    country: r.country ?? "",
    countryCode: r.country_code,
    admin1: r.admin1,
    lat: r.latitude,
    lon: r.longitude,
    timezone: r.timezone,
  }));
}

// ---------------------------------------------------------------------------
// Forecast
// ---------------------------------------------------------------------------

const HOURLY_VARS = [
  "temperature_2m",
  "weather_code",
  "precipitation_probability",
  "is_day",
].join(",");

const CURRENT_VARS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "weather_code",
  "is_day",
  "wind_speed_10m",
  "wind_direction_10m",
  "surface_pressure",
  "cloud_cover",
].join(",");

const DAILY_VARS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_probability_max",
  "uv_index_max",
  "sunrise",
  "sunset",
  "wind_speed_10m_max",
].join(",");

export async function fetchWeather(
  place: Pick<Place, "lat" | "lon">,
  units: Units,
): Promise<WeatherBundle> {
  const tempUnitParam = "celsius";
  const windUnitParam = "kmh";
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
    `&current=${CURRENT_VARS}&hourly=${HOURLY_VARS}&daily=${DAILY_VARS}` +
    `&timezone=auto&forecast_days=8` +
    `&temperature_unit=${tempUnitParam}&wind_speed_unit=${windUnitParam}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather service unavailable");
  const data = (await res.json()) as {
    timezone: string;
    utc_offset_seconds: number;
    current: {
      time: string;
      temperature_2m: number;
      apparent_temperature: number;
      relative_humidity_2m: number;
      weather_code: number;
      is_day: number;
      wind_speed_10m: number;
      wind_direction_10m: number;
      surface_pressure: number;
      cloud_cover: number;
    };
    hourly: {
      time: string[];
      temperature_2m: number[];
      weather_code: number[];
      precipitation_probability: (number | null)[];
      is_day: number[];
    };
    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: (number | null)[];
      uv_index_max: (number | null)[];
      sunrise: string[];
      sunset: string[];
      wind_speed_10m_max: number[];
    };
  };

  // Visibility + dew point + UV come from separate lightweight endpoints so the
  // main call stays simple and cacheable.
  const [vis, dew, uv] = await Promise.all([
    fetchVisibility(place),
    fetchDewPoint(place),
    fetchCurrentUv(place),
  ]);

  const utcOffset = data.utc_offset_seconds;
  const nowWall = new Date(Date.now() + utcOffset * 1000);
  const nowKey = nowWall.toISOString().slice(0, 10);
  const nowHour = nowWall.getUTCHours();

  const hourly: HourlyPoint[] = data.hourly.time.map((t, i) => {
    const w = parseWall(t);
    return {
      time: t,
      temperature: data.hourly.temperature_2m[i],
      weatherCode: data.hourly.weather_code[i],
      precipitationProbability: data.hourly.precipitation_probability[i] ?? 0,
      isDay: data.hourly.is_day[i] === 1,
      isNow: w.toISOString().slice(0, 10) === nowKey && w.getUTCHours() === nowHour,
    };
  });

  const daily: DailyPoint[] = data.daily.time.map((d, i) => ({
    date: d,
    weatherCode: data.daily.weather_code[i],
    tempMax: data.daily.temperature_2m_max[i],
    tempMin: data.daily.temperature_2m_min[i],
    precipitationProbability: data.daily.precipitation_probability_max[i] ?? 0,
    uvIndexMax: data.daily.uv_index_max[i] ?? 0,
    sunrise: data.daily.sunrise[i],
    sunset: data.daily.sunset[i],
    windMax: data.daily.wind_speed_10m_max[i],
  }));

  return {
    current: {
      time: data.current.time,
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      weatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      pressure: data.current.surface_pressure,
      uvIndex: uv,
      visibility: vis,
      dewPoint: dew,
      cloudCover: data.current.cloud_cover,
    },
    hourly,
    daily,
    timezone: data.timezone,
    utcOffsetSeconds: utcOffset,
  };
}

async function fetchVisibility(place: Pick<Place, "lat" | "lon">): Promise<number> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
      `&current=visibility&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return 20000;
    const data = (await res.json()) as { current?: { visibility?: number } };
    return data.current?.visibility ?? 20000;
  } catch {
    return 20000;
  }
}

async function fetchDewPoint(place: Pick<Place, "lat" | "lon">): Promise<number> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
      `&current=dew_point_2m&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = (await res.json()) as { current?: { dew_point_2m?: number } };
    return data.current?.dew_point_2m ?? 0;
  } catch {
    return 0;
  }
}

async function fetchCurrentUv(place: Pick<Place, "lat" | "lon">): Promise<number> {
  try {
    const url =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.lat}&longitude=${place.lon}` +
      `&current=uv_index&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = (await res.json()) as { current?: { uv_index?: number } };
    return data.current?.uv_index ?? 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Saved places (localStorage)
// ---------------------------------------------------------------------------

const PLACES_KEY = "fairweather.places.v1";
const UNITS_KEY = "fairweather.units.v1";
const LAST_KEY = "fairweather.last.v1";

export function loadPlaces(): Place[] {
  try {
    const raw = localStorage.getItem(PLACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Place[];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function savePlaces(places: Place[]): void {
  try {
    localStorage.setItem(PLACES_KEY, JSON.stringify(places.slice(0, 8)));
  } catch {
    // ignore quota errors
  }
}

export function loadUnits(): Units {
  try {
    const raw = localStorage.getItem(UNITS_KEY);
    return raw === "imperial" ? "imperial" : "metric";
  } catch {
    return "metric";
  }
}

export function saveUnits(units: Units): void {
  try {
    localStorage.setItem(UNITS_KEY, units);
  } catch {
    // ignore
  }
}

export function loadLastPlace(): Place | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    return raw ? (JSON.parse(raw) as Place) : null;
  } catch {
    return null;
  }
}

export function saveLastPlace(place: Place): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(place));
  } catch {
    // ignore
  }
}

export function reverseGeocode(lat: number, lon: number): Promise<Place> {
  // Open-Meteo has no reverse geocoding; approximate with BigDataCloud's free
  // client endpoint, falling back to coordinates.
  return fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
  )
    .then((r) => (r.ok ? r.json() : null))
    .then(
      (d: {
        city?: string;
        locality?: string;
        principalSubdivision?: string;
        countryName?: string;
        countryCode?: string;
      } | null) => {
        const name = d?.city || d?.locality || d?.principalSubdivision;
        if (name) {
          return {
            id: `geo-${lat.toFixed(3)},${lon.toFixed(3)}`,
            name,
            country: d?.countryName ?? "",
            countryCode: d?.countryCode,
            admin1: d?.principalSubdivision,
            lat,
            lon,
          } satisfies Place;
        }
        return {
          id: `geo-${lat.toFixed(3)},${lon.toFixed(3)}`,
          name: "My location",
          country: "",
          lat,
          lon,
        } satisfies Place;
      },
    )
    .catch(
      () =>
        ({
          id: `geo-${lat.toFixed(3)},${lon.toFixed(3)}`,
          name: "My location",
          country: "",
          lat,
          lon,
        }) satisfies Place,
    );
}
