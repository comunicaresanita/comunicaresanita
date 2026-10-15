import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { MapPin } from "lucide-react";

interface PlaceDetails {
  fullAddress: string;
  street: string;
  streetNumber: string;
  cap: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
}

interface Prediction {
  place_id: string;
  description: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (fullAddress: string) => void;
  onPlaceSelect?: (details: PlaceDetails) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  /** Suggest full addresses including the house number (professionals only). */
  withHouseNumber?: boolean;
}

const AddressAutocomplete = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Inizia a digitare il tuo indirizzo...",
  required = false,
  className = "",
  withHouseNumber = false,
}: AddressAutocompleteProps) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("places-autocomplete", {
        body: { action: "autocomplete", input, ...(withHouseNumber ? { types: ["address"] } : {}) },
      });
      if (!error && data?.predictions) {
        setPredictions(data.predictions);
        setShowDropdown(data.predictions.length > 0);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, [withHouseNumber]);

  const handleInputChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(val), 300);
  };

  const handleSelect = async (prediction: Prediction) => {
    setShowDropdown(false);
    onChange(prediction.description);
    setPredictions([]);

    try {
      const { data, error } = await supabase.functions.invoke("places-autocomplete", {
        body: { action: "details", placeId: prediction.place_id },
      });
      if (!error && data?.result) {
        const result = data.result;
        const ac = result.address_components || {};
        const fullAddress = result.formatted_address || prediction.description;
        onChange(fullAddress);

        if (onPlaceSelect) {
          onPlaceSelect({
            fullAddress,
            street: ac.street || "",
            streetNumber: ac.streetNumber || "",
            cap: ac.cap || "",
            city: ac.city || "",
            province: ac.province || "",
            lat: result.geometry?.location?.lat || 0,
            lng: result.geometry?.location?.lng || 0,
          });
        }
      }
    } catch {
      // keep the description as-is
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => predictions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        required={required}
        className={`text-senior-sm py-3 ${className}`}
        autoComplete="off"
      />
      {showDropdown && (
        <ul className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {predictions.map((p) => (
            <li
              key={p.place_id}
              className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted transition-colors text-sm"
              onMouseDown={() => handleSelect(p)}
            >
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>{p.description}</span>
            </li>
          ))}
          {loading && (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">Ricerca in corso...</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
