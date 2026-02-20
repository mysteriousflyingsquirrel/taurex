import { useState, useRef, useEffect, useCallback } from "react";

interface NominatimAddress {
  road?: string;
  house_number?: string;
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  country?: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: NominatimAddress;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, lat: number, lng: number) => void;
  disabled?: boolean;
}

function formatAddress(addr: NominatimAddress): string {
  const street = addr.road ?? "";
  const number = addr.house_number ?? "";
  const zip = addr.postcode ?? "";
  const city =
    addr.city || addr.town || addr.village || addr.municipality || "";

  const streetPart = number ? `${street} ${number}` : street;
  const cityPart = zip ? `${zip} ${city}` : city;

  return [streetPart, cityPart].filter(Boolean).join(", ");
}

export default function AddressAutocomplete({
  value,
  onChange,
  disabled,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: NominatimResult[] = await res.json();
      const filtered = data.filter(
        (r) =>
          r.address &&
          (r.address.road ||
            r.address.city ||
            r.address.town ||
            r.address.village)
      );
      setResults(filtered.length > 0 ? filtered : data);
      setOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 400);
  };

  const handleSelect = (result: NominatimResult) => {
    const formatted = result.address
      ? formatAddress(result.address)
      : result.display_name;
    const address = formatted || result.display_name;
    setQuery(address);
    setOpen(false);
    setResults([]);
    onChange(address, parseFloat(result.lat), parseFloat(result.lon));
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        disabled={disabled}
        placeholder="Search address…"
        className="block w-full rounded-lg border border-input px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none disabled:bg-surface-alt disabled:text-muted"
      />
      {loading && (
        <div className="absolute right-3 top-2.5">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {open && results.length > 0 && !disabled && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface shadow-lg">
          {results.map((r, i) => {
            const formatted = r.address ? formatAddress(r.address) : null;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-surface-alt"
                >
                  <span className="font-medium text-foreground">
                    {formatted || r.display_name}
                  </span>
                  {formatted && formatted !== r.display_name && (
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {r.display_name}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
