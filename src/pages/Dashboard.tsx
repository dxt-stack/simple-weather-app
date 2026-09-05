import { DashboardPanel } from "@/components/DashboardPanel";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  fetchWeather,
  loadLastPlace,
  loadPlaces,
  loadUnits,
  reverseGeocode,
  saveLastPlace,
  savePlaces,
  saveUnits,
  type Place,
  type Units,
  type WeatherBundle,
} from "@/lib/weather";
import { Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_PLACE: Place = {
  id: "default-tokyo",
  name: "Tokyo",
  country: "Japan",
  countryCode: "JP",
  admin1: "Tokyo",
  lat: 35.6895,
  lon: 139.6917,
};

export default function Dashboard() {
  const { user } = useAuth();
  const [units, setUnits] = useState<Units>(() => loadUnits());
  const [savedPlaces, setSavedPlaces] = useState<Place[]>(() => loadPlaces());
  const [place, setPlace] = useState<Place>(() => loadLastPlace() ?? DEFAULT_PLACE);
  const [data, setData] = useState<WeatherBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const load = useCallback(
    async (p: Place, mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const bundle = await fetchWeather(p, units);
        setData(bundle);
      } catch {
        setError(
          "Couldn't reach the weather service. Check your connection and try again.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [units],
  );

  // Fetch on mount and whenever place or units change.
  useEffect(() => {
    void load(place, "initial");
  }, [place, load]);

  // Auto-refresh every 15 minutes.
  useEffect(() => {
    const t = window.setInterval(() => void load(place, "refresh"), 15 * 60 * 1000);
    return () => window.clearInterval(t);
  }, [place, load]);

  const selectPlace = (p: Place) => {
    setPlace(p);
    saveLastPlace(p);
  };

  const toggleSaved = (p: Place) => {
    setSavedPlaces((prev) => {
      const exists = prev.some((x) => x.id === p.id);
      const next = exists ? prev.filter((x) => x.id !== p.id) : [...prev, p].slice(-8);
      savePlaces(next);
      return next;
    });
  };

  const removeSaved = (id: string) => {
    setSavedPlaces((prev) => {
      const next = prev.filter((p) => p.id !== id);
      savePlaces(next);
      return next;
    });
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation isn't available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const p = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          selectPlace(p);
          toggleSaved(p);
        } catch {
          setError("Couldn't look up your location.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setError("Location permission was denied or unavailable.");
      },
      { timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    );
  };

  const toggleUnits = () => {
    setUnits((u) => {
      const next: Units = u === "metric" ? "imperial" : "metric";
      saveUnits(next);
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // States
  // ---------------------------------------------------------------------------

  if (loading && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Sun className="size-4 animate-pulse" strokeWidth={1.25} aria-hidden="true" />
          <span className="text-sm">Reading the sky…</span>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium text-foreground">Something went wrong</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-5"
            onClick={() => void load(place, "initial")}
          >
            Try again
          </Button>
        </div>
      </main>
    );
  }

  if (!data) return null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      {error && (
        <div
          role="status"
          className="border-b border-border/70 bg-muted-soft px-5 py-2.5 text-center text-xs text-muted-foreground sm:px-8"
        >
          {error}
        </div>
      )}
      <DashboardPanel
        place={place}
        data={data}
        units={units}
        savedPlaces={savedPlaces}
        onSelectPlace={selectPlace}
        onRemoveSaved={removeSaved}
        onToggleSaved={toggleSaved}
        onUseLocation={useMyLocation}
        locating={locating}
        onToggleUnits={toggleUnits}
        onRefresh={() => void load(place, "refresh")}
        refreshing={refreshing}
      />
      {user && (
        <p className="pb-6 text-center text-[11px] text-muted-foreground/60">
          Signed in as {user.name ?? user.email}
        </p>
      )}
    </main>
  );
}
