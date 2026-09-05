import { PlaceSearch } from "@/components/PlaceSearch";
import { WeatherIcon } from "@/components/WeatherIcon";
import { Button } from "@/components/ui/button";
import {
  convertTemp,
  convertVisibility,
  formatIsoTime,
  formatIsoWeekday,
  formatSpeed,
  next24Hours,
  tempUnit,
  uvLabel,
  visibilityUnit,
  windDirectionLabel,
  wmoLabel,
  type Place,
  type Units,
  type WeatherBundle,
} from "@/lib/weather";
import { cn } from "@/lib/utils";
import {
  Bookmark,
  Droplets,
  Eye,
  Gauge,
  Navigation,
  RefreshCw,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Umbrella,
  Wind,
  X,
} from "lucide-react";
import { useMemo } from "react";

interface DashboardPanelProps {
  place: Place;
  data: WeatherBundle;
  units: Units;
  savedPlaces: Place[];
  onSelectPlace: (place: Place) => void;
  onRemoveSaved: (id: string) => void;
  onToggleSaved: (place: Place) => void;
  onUseLocation: () => void;
  locating: boolean;
  onToggleUnits: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function precipitationHint(
  hours: { time: string; precipitationProbability: number }[],
  units: Units,
): string | null {
  for (let i = 1; i < Math.min(hours.length, 25); i++) {
    if (hours[i].precipitationProbability >= 50) {
      const t = formatIsoTime(hours[i].time, "hour").toLowerCase();
      return `Rain likely around ${t}`;
    }
  }
  return null;
}

function trendLabel(
  hours: { temperature: number }[],
  units: Units,
): string | null {
  if (hours.length < 6) return null;
  const delta = hours[5].temperature - hours[0].temperature;
  if (delta >= 2.5) return `Warming — up ${Math.round(convertTemp(Math.abs(delta), units))}° over 6 h`;
  if (delta <= -2.5) return `Cooling — down ${Math.round(convertTemp(Math.abs(delta), units))}° over 6 h`;
  return null;
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3.5 sm:px-5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
        <span className="text-[11px] font-medium uppercase tracking-[0.08em]">
          {label}
        </span>
      </div>
      <div className="tabular-nums-tight text-lg leading-6 text-foreground">
        {value}
      </div>
      {sub && (
        <div className="text-xs leading-4 text-muted-foreground/80">{sub}</div>
      )}
    </div>
  );
}

function TemperatureCurve({
  hours,
  units,
}: {
  hours: { time: string; temperature: number }[];
  units: Units;
}) {
  const temps = hours.map((h) => convertTemp(h.temperature, units));
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = Math.max(max - min, 4);

  const W = 720;
  const H = 92;
  const pad = 10;
  const x = (i: number) => (i / Math.max(temps.length - 1, 1)) * (W - pad * 2) + pad;
  const y = (t: number) => H - 10 - ((t - min) / span) * (H - 20);

  const line = temps.map((t, i) => `${x(i).toFixed(1)},${y(t).toFixed(1)}`).join(" ");
  const area = `M ${x(0)},${H} L ${temps
    .map((t, i) => `${x(i).toFixed(1)},${y(t).toFixed(1)}`)
    .join(" L ")} L ${x(temps.length - 1)},${H} Z`;

  const minIdx = temps.indexOf(min);
  const maxIdx = temps.indexOf(max);
  const showLabels = span >= 4.2;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-20 w-full"
        role="img"
        aria-label={`Temperature over the next ${hours.length} hours, from ${Math.round(min)} to ${Math.round(max)} degrees${tempUnit(units)}`}
      >
        <defs>
          <linearGradient id="fw-curve-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.10" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#fw-curve-grad)" className="text-foreground" />
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.65"
          vectorEffect="non-scaling-stroke"
          className="text-foreground"
        />
        <circle cx={x(0)} cy={y(temps[0])} r="2.5" className="fill-foreground text-foreground" />
        {showLabels && (
          <>
            <text
              x={x(maxIdx)}
              y={y(max) - 8}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="10"
              fontWeight="500"
            >
              {Math.round(max)}°
            </text>
            <text
              x={x(minIdx)}
              y={Math.min(y(min) + 14, H - 2)}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="10"
              fontWeight="500"
            >
              {Math.round(min)}°
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

function DailyForecast({
  daily,
  units,
}: {
  daily: WeatherBundle["daily"];
  units: Units;
}) {
  const week = daily.slice(0, 7);
  const weekMin = Math.min(...week.map((d) => d.tempMin));
  const weekMax = Math.max(...week.map((d) => d.tempMax));
  const span = Math.max(weekMax - weekMin, 1);

  return (
    <div role="list" aria-label="7-day forecast">
      {week.map((d, i) => {
        const lo = convertTemp(d.tempMin, units);
        const hi = convertTemp(d.tempMax, units);
        const left = ((d.tempMin - weekMin) / span) * 100;
        const width = Math.max(((d.tempMax - d.tempMin) / span) * 100, 6);
        return (
          <div
            key={d.date}
            role="listitem"
            className="flex items-center gap-3 border-b border-border/70 py-2.5 last:border-b-0 sm:gap-4"
          >
            <span
              className={cn(
                "w-12 shrink-0 text-sm sm:w-16",
                i === 0 ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {i === 0 ? "Today" : formatIsoWeekday(d.date)}
            </span>
            <WeatherIcon
              code={d.weatherCode}
              isDay
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span
              className={cn(
                "w-9 shrink-0 text-right text-xs tabular-nums-tight",
                d.precipitationProbability >= 20
                  ? "text-foreground/80"
                  : "text-muted-foreground/40",
              )}
              title={`${d.precipitationProbability}% chance of precipitation`}
            >
              {d.precipitationProbability >= 20
                ? `${Math.round(d.precipitationProbability)}%`
                : "—"}
            </span>
            <span className="w-9 shrink-0 text-right text-sm tabular-nums-tight text-muted-foreground">
              {Math.round(lo)}°
            </span>
            <span className="relative h-1 min-w-8 flex-1 rounded-full bg-border/60">
              <span
                className="absolute inset-y-0 rounded-full bg-foreground/70"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            </span>
            <span className="w-9 shrink-0 text-sm font-medium tabular-nums-tight text-foreground">
              {Math.round(hi)}°
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function DashboardPanel({
  place,
  data,
  units,
  savedPlaces,
  onSelectPlace,
  onRemoveSaved,
  onToggleSaved,
  onUseLocation,
  locating,
  onToggleUnits,
  onRefresh,
  refreshing,
}: DashboardPanelProps) {
  const { current, daily } = data;
  const hours = useMemo(() => next24Hours(data.hourly), [data.hourly]);
  const hint = useMemo(() => precipitationHint(hours, units), [hours, units]);
  const trend = useMemo(() => trendLabel(hours, units), [hours, units]);
  const today = daily[0];
  const placeLabel = [place.admin1, place.country].filter(Boolean).join(", ");
  const isSaved = savedPlaces.some((p) => p.id === place.id);

  const stats: Array<{
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    label: string;
    value: string;
    sub?: string;
  }> = [
    {
      icon: Thermometer,
      label: "Feels like",
      value: `${Math.round(convertTemp(current.apparentTemperature, units))}°`,
      sub: `Dew point ${Math.round(convertTemp(current.dewPoint, units))}°`,
    },
    {
      icon: Droplets,
      label: "Humidity",
      value: `${Math.round(current.humidity)}%`,
      sub: `Cloud cover ${Math.round(current.cloudCover)}%`,
    },
    {
      icon: Wind,
      label: "Wind",
      value: formatSpeed(current.windSpeed, units),
      sub: `From ${windDirectionLabel(current.windDirection)}`,
    },
    {
      icon: Umbrella,
      label: "Precipitation",
      value: `${Math.round(today?.precipitationProbability ?? 0)}%`,
      sub: "Chance, next 24 h",
    },
    {
      icon: Sun,
      label: "UV index",
      value: `${current.uvIndex.toFixed(1)}`,
      sub: uvLabel(current.uvIndex),
    },
    {
      icon: Eye,
      label: "Visibility",
      value: `${convertVisibility(current.visibility, units).toFixed(
        units === "imperial" ? 1 : 0,
      )} ${visibilityUnit(units)}`,
      sub: "Horizontal range",
    },
    {
      icon: Gauge,
      label: "Pressure",
      value: `${Math.round(current.pressure)} hPa`,
      sub: "Sea-level equivalent",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      {/* Search row */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Stratus
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing}
              className="size-7 rounded-full p-0 text-muted-foreground hover:text-foreground"
              aria-label="Refresh forecast"
              title="Refresh"
            >
              <RefreshCw
                className={cn("size-3.5", refreshing && "animate-spin")}
                aria-hidden="true"
              />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleUnits}
              className="h-7 gap-1 rounded-full border border-border/70 px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              aria-label="Switch temperature units"
            >
              {units === "metric" ? "°C" : "°F"}
              <span className="text-muted-foreground/50">/</span>
              {units === "metric" ? "°F" : "°C"}
            </Button>
          </div>
        </div>
        <PlaceSearch
          onSelect={onSelectPlace}
          onUseLocation={onUseLocation}
          locating={locating}
        />
      </div>

      {/* Saved places */}
      {savedPlaces.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {savedPlaces.map((p) => (
            <span
              key={p.id}
              className={cn(
                "group inline-flex h-7 items-center gap-1.5 rounded-full border pr-1.5 pl-3 text-xs transition-colors",
                p.id === place.id
                  ? "border-foreground/30 bg-muted-soft text-foreground"
                  : "border-border/80 text-muted-foreground hover:border-foreground/25 hover:text-foreground",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectPlace(p)}
                className="cursor-pointer font-medium"
                title={`Show weather for ${p.name}`}
              >
                {p.name}
              </button>
              <button
                type="button"
                onClick={() => onRemoveSaved(p.id)}
                aria-label={`Remove ${p.name} from saved places`}
                className="flex size-4 cursor-pointer items-center justify-center rounded-full text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Hero */}
      <section
        className="stagger-in mt-10 sm:mt-14"
        aria-label={`Current weather in ${place.name}`}
      >
        <div className="flex flex-col-reverse items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="truncate text-2xl font-medium tracking-tight">
                {place.name}
              </h1>
              <button
                type="button"
                onClick={() => onToggleSaved(place)}
                aria-label={isSaved ? `Remove ${place.name} from saved places` : `Save ${place.name}`}
                title={isSaved ? "Saved — click to remove" : "Save this place"}
                className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
              >
                {isSaved ? (
                  <Star className="size-4 fill-foreground" aria-hidden="true" />
                ) : (
                  <Bookmark className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {placeLabel || data.timezone.replace(/_/g, " ")}
            </p>

            <p className="mt-5 text-lg font-medium text-foreground">
              {wmoLabel(current.weatherCode)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Feels like {Math.round(convertTemp(current.apparentTemperature, units))}°.{" "}
              {hint ?? trend ?? "Steady conditions over the next few hours."}
            </p>
          </div>

          <div className="flex items-end gap-4 sm:gap-5">
            <WeatherIcon
              code={current.weatherCode}
              isDay={current.isDay}
              className="mb-3 size-12 text-muted-foreground sm:size-14"
              strokeWidth={1}
            />
            <div
              className="font-serif-display tabular-nums-tight text-[5.5rem] leading-[0.85] tracking-tight sm:text-[7rem]"
              aria-label={`${Math.round(convertTemp(current.temperature, units))} degrees${tempUnit(units)}`}
            >
              {Math.round(convertTemp(current.temperature, units))}
              <span className="text-[0.45em] align-top text-muted-foreground">
                {tempUnit(units)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 h-px bg-border" aria-hidden="true" />

      {/* Hourly curve */}
      <section className="mt-6" aria-label="Hourly forecast for the next 24 hours">
        <TemperatureCurve hours={hours} units={units} />
        <div className="mt-3 flex items-center justify-between text-[11px] font-medium tracking-wide text-muted-foreground">
          <span>NOW</span>
          <span>
            {formatIsoTime(hours[Math.min(5, hours.length - 1)]?.time ?? "", "hour")}
          </span>
          <span>
            {formatIsoTime(hours[Math.min(11, hours.length - 1)]?.time ?? "", "hour")}
          </span>
          <span>
            {formatIsoTime(hours[Math.min(17, hours.length - 1)]?.time ?? "", "hour")}
          </span>
          <span>
            {formatIsoTime(hours[Math.min(23, hours.length - 1)]?.time ?? "", "hour")}
          </span>
        </div>
      </section>

      <div className="mt-6 h-px bg-border" aria-hidden="true" />

      {/* Stats */}
      <section aria-label="Current conditions in detail" className="mt-2">
        <div className="grid grid-cols-2 gap-px sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="border-b border-border/70">
              <Stat {...s} />
            </div>
          ))}
        </div>

        {/* Sun times */}
        {today && (
          <div className="grid grid-cols-2 gap-px border-b border-border/70">
            <Stat
              icon={Sunrise}
              label="Sunrise"
              value={formatIsoTime(today.sunrise, "short")}
              sub={formatIsoWeekday(today.date, false) + " morning"}
            />
            <Stat
              icon={Sunset}
              label="Sunset"
              value={formatIsoTime(today.sunset, "short")}
              sub={`Max wind ${formatSpeed(today.windMax, units)}`}
            />
          </div>
        )}
      </section>

      <div className="mt-6 h-px bg-border" aria-hidden="true" />

      {/* 7-day forecast */}
      <section className="mt-8" aria-label="7-day forecast">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          7-day forecast
        </h2>
        <div className="mt-3">
          <DailyForecast daily={daily} units={units} />
        </div>
      </section>

      {/* Footer note */}
      <p className="mt-8 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
        <Navigation className="size-3" aria-hidden="true" />
        {data.timezone.replace(/_/g, " ")} · Updated{" "}
        {formatIsoTime(current.time, "short")} local time · Data by Open-Meteo
      </p>
    </div>
  );
}
