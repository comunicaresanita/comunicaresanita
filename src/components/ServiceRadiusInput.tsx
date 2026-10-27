import { ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_RADIUS_KM, MAX_RADIUS_KM, parseRadius, stepRadius } from "@/lib/distancePricing";

interface Props {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  error?: boolean;
}

/** Required km field: placeholder 10, arrows move by 5 km, free typing allowed. */
const ServiceRadiusInput = ({ value, onChange, id = "service-radius", error }: Props) => {
  const step = (dir: 1 | -1) => onChange(String(stepRadius(parseRadius(value), dir)));
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-senior-sm">Distanza massima che vuoi coprire (km) *</Label>
      <div className="flex items-stretch gap-2 max-w-xs">
        <div className="relative flex-1">
          <Input
            id={id}
            inputMode="numeric"
            pattern="[0-9]*"
            required
            value={value}
            placeholder={String(DEFAULT_RADIUS_KM)}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") { e.preventDefault(); step(1); }
              if (e.key === "ArrowDown") { e.preventDefault(); step(-1); }
            }}
            aria-invalid={error || undefined}
            className={`text-senior-sm py-3 pr-12 ${error ? "border-destructive" : ""}`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-senior-sm text-muted-foreground pointer-events-none">km</span>
        </div>
        <div className="flex flex-col">
          <button type="button" aria-label="Aumenta di 5 km" onClick={() => step(1)} className="flex-1 px-3 rounded-t-md border border-b-0 bg-background hover:bg-secondary">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Diminuisci di 5 km" onClick={() => step(-1)} className="flex-1 px-3 rounded-b-md border bg-background hover:bg-secondary">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Gli utenti più lontani di questa distanza dal tuo segnalino non ti vedranno nell'elenco (massimo {MAX_RADIUS_KM} km). Se disegni una zona sulla mappa, conta solo la zona disegnata. Oltre 10 km il prezzo ha una maggiorazione del 10%.
      </p>
    </div>
  );
};

export default ServiceRadiusInput;
