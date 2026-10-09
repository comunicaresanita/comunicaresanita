import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { MapPin } from "lucide-react";

interface StructuredAddressInputProps {
  via: string;
  civico: string;
  cap: string;
  citta: string;
  onViaChange: (val: string) => void;
  onCivicoChange: (val: string) => void;
  onCapChange: (val: string) => void;
  onCittaChange: (val: string) => void;
  required?: boolean;
  label?: string;
  errors?: { via?: boolean; civico?: boolean; cap?: boolean; citta?: boolean };
  idPrefix?: string;
}

interface Prediction {
  place_id: string;
  description: string;
}

export function parseAddressToFields(address: string) {
  const parts = address.split(",").map((s) => s.trim());
  let via = "";
  let civico = "";
  let cap = "";
  let citta = "";

  if (parts.length >= 2) {
    const streetPart = parts[0];
    const match = streetPart.match(/^(.+?)\s+(\d+\S*)$/);
    if (match) {
      via = match[1];
      civico = match[2];
    } else {
      via = streetPart;
    }
    const capCityPart = parts.slice(1).join(", ").trim();
    const capMatch = capCityPart.match(/^(\d{5})\s+(.+)$/);
    if (capMatch) {
      cap = capMatch[1];
      citta = capMatch[2];
    } else {
      citta = capCityPart;
    }
  } else {
    via = address;
  }

  return { via, civico, cap, citta };
}

export function composeAddress(via: string, civico: string, cap: string, citta: string) {
  return `${via} ${civico}, ${cap} ${citta}`.trim();
}

const StructuredAddressInput = ({
  via,
  civico,
  cap,
  citta,
  onViaChange,
  onCivicoChange,
  onCapChange,
  onCittaChange,
  required = false,
  label = "Indirizzo",
  errors = {},
  idPrefix = "",
}: StructuredAddressInputProps) => {
  const prefix = idPrefix ? `${idPrefix}-` : "";
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        body: { action: "autocomplete", input, types: ["route"] },
      });
      if (!error && data?.predictions) {
        setPredictions(data.predictions);
        setShowDropdown(data.predictions.length > 0);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, []);

  const handleViaInputChange = (val: string) => {
    onViaChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(val), 300);
  };

  // Move a house number typed into the street field into the "civico" field.
  const splitTypedNumber = (text: string) => {
    const m = text.match(/^(.+?)[\s,]+(\d+[a-zA-Z/]*)\s*$/);
    if (m && /[a-zA-Z]/.test(m[1])) {
      if (!civico.trim()) onCivicoChange(m[2]);
      return m[1].trim();
    }
    return text;
  };

  const handleSelect = (prediction: Prediction & { street?: string; cap?: string; city?: string }) => {
    setShowDropdown(false);
    setPredictions([]);
    splitTypedNumber(via);
    onViaChange(prediction.street || prediction.description.split(",")[0].trim());
    if (prediction.cap && !cap.trim()) onCapChange(prediction.cap);
    if (prediction.city && !citta.trim()) onCittaChange(prediction.city);
  };

  const errorClass = "border-destructive ring-1 ring-destructive";

  return (
    <div className="space-y-3">
      <Label className="text-senior-sm font-semibold">{label}</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1 sm:col-span-2" ref={containerRef}>
          <Label className="text-xs text-muted-foreground">Via / Piazza *</Label>
          <div className="relative">
            <Input
              value={via}
              onChange={(e) => handleViaInputChange(e.target.value)}
              onFocus={() => predictions.length > 0 && setShowDropdown(true)}
              onBlur={() => { const cleaned = splitTypedNumber(via); if (cleaned !== via) onViaChange(cleaned); }}
              placeholder="Es. Via Roma"
              required={required}
              className={`text-senior-sm py-3 ${errors.via ? errorClass : ""}`}
              autoComplete="off"
              id={`${prefix}via-field`}
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
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Numero civico *</Label>
          <Input
            value={civico}
            onChange={(e) => onCivicoChange(e.target.value)}
            placeholder="Es. 15"
            required={required}
            className={`text-senior-sm py-3 ${errors.civico ? errorClass : ""}`}
            id={`${prefix}civico-field`}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">CAP *</Label>
          <Input
            value={cap}
            onChange={(e) => onCapChange(e.target.value)}
            placeholder="Es. 00100"
            maxLength={5}
            required={required}
            className={`text-senior-sm py-3 ${errors.cap ? errorClass : ""}`}
            id={`${prefix}cap-field`}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Città *</Label>
          <Input
            value={citta}
            onChange={(e) => onCittaChange(e.target.value)}
            placeholder="Es. Roma"
            required={required}
            className={`text-senior-sm py-3 ${errors.citta ? errorClass : ""}`}
            id={`${prefix}citta-field`}
          />
        </div>
      </div>
    </div>
  );
};

export default StructuredAddressInput;