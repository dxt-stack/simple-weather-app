import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchPlaces, type Place } from "@/lib/weather";
import { cn } from "@/lib/utils";
import { Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface PlaceSearchProps {
  onSelect: (place: Place) => void;
  onUseLocation?: () => void;
  locating?: boolean;
}

export function PlaceSearch({ onSelect, onUseLocation, locating }: PlaceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      setBusy(false);
      return;
    }
    setBusy(true);
    setSearchError(null);
    const t = window.setTimeout(async () => {
      try {
        const r = await searchPlaces(q);
        setResults(r);
        setHighlight(r.length > 0 ? 0 : -1);
        setOpen(true);
      } catch {
        setResults([]);
        setSearchError("Search is unavailable right now.");
        setOpen(true);
      } finally {
        setBusy(false);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const choose = (p: Place) => {
    onSelect(p);
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = highlight >= 0 ? highlight : 0;
      if (results[idx]) choose(results[idx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search any city…"
          aria-label="Search for a city"
          role="combobox"
          aria-expanded={open}
          aria-controls="place-search-listbox"
          aria-autocomplete="list"
          className="h-10 rounded-md border-border/80 bg-card pl-9 pr-9 text-sm placeholder:text-muted-foreground/70"
        />
        {busy && (
          <Loader2
            className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      {onUseLocation && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onUseLocation}
          disabled={locating}
          aria-label="Use my current location"
          title="Use my current location"
          className="absolute -right-11 top-0 size-10 rounded-md border-border/80 text-muted-foreground hover:text-foreground"
        >
          {locating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <LocateFixed className="size-4" aria-hidden="true" />
          )}
        </Button>
      )}

      {open && (
        <div
          role="listbox"
          id="place-search-listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-auto rounded-md border border-border bg-popover py-1 shadow-sm"
        >
          {searchError && (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">{searchError}</p>
          )}
          {!searchError && results.length === 0 && !busy && (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">
              No matches. Try a different spelling.
            </p>
          )}
          {results.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={i === highlight}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => choose(p)}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors",
                i === highlight ? "bg-muted-soft text-foreground" : "text-foreground/90",
              )}
            >
              <MapPin
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="truncate">
                {p.name}
                {(p.admin1 || p.country) && (
                  <span className="text-muted-foreground">
                    {p.admin1 ? `, ${p.admin1}` : ""}
                    {p.country ? ` — ${p.country}` : ""}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
