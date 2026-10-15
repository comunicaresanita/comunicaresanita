import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Undo2, Trash2 } from "lucide-react";
import { bluePinIcon } from "@/lib/leafletPin";
import { LONG_DISTANCE_KM, type ServiceArea } from "@/lib/distancePricing";

interface Props {
  centerLat?: number;
  centerLng?: number;
  longDistanceOk: boolean;
  value: ServiceArea | null;
  onChange: (area: ServiceArea | null) => void;
}

const ServiceAreaDrawer = ({ centerLat, centerLng, longDistanceOk, value, onChange }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const valueRef = useRef<ServiceArea>(value ?? []);
  valueRef.current = value ?? [];
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [centerLat ?? 43.7696, centerLng ?? 11.2558], zoom: 11 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      changeRef.current([...valueRef.current, [e.latlng.lat, e.latlng.lng]]);
    });
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current && centerLat && centerLng) mapRef.current.setView([centerLat, centerLng], mapRef.current.getZoom());
  }, [centerLat, centerLng]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    const color = primary ? `hsl(${primary})` : "currentColor";
    if (centerLat && centerLng) {
      L.marker([centerLat, centerLng], { icon: bluePinIcon(), interactive: false }).addTo(layer);
      if (!longDistanceOk) {
        L.circle([centerLat, centerLng], { radius: LONG_DISTANCE_KM * 1000, color, weight: 1, dashArray: "6 6", fillOpacity: 0.04, interactive: false }).addTo(layer);
      }
    }
    const pts = value ?? [];
    if (pts.length >= 3) L.polygon(pts, { color, weight: 2, fillOpacity: 0.2, interactive: false }).addTo(layer);
    else if (pts.length === 2) L.polyline(pts, { color, weight: 2, interactive: false }).addTo(layer);
    pts.forEach((p) => L.circleMarker(p, { radius: 5, color, fillOpacity: 1, interactive: false }).addTo(layer));
  }, [value, centerLat, centerLng, longDistanceOk]);

  const pts = value ?? [];
  return (
    <div className="space-y-3">
      <p className="text-senior-sm text-muted-foreground">
        Facoltativo. Tocca la mappa per segnare i punti che delimitano la zona in cui vuoi lavorare (almeno 3 punti). Gli utenti fuori dalla zona disegnata non ti vedranno. Se non disegni nulla, conta solo il raggio impostato{longDistanceOk ? "" : " (cerchio tratteggiato di 10 km)"}.
      </p>
      <div ref={containerRef} className="w-full h-72 rounded-lg border z-0" />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={!pts.length} onClick={() => onChange(pts.length > 1 ? pts.slice(0, -1) : null)} className="gap-2">
          <Undo2 className="w-4 h-4" /> Annulla ultimo punto
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!pts.length} onClick={() => onChange(null)} className="gap-2">
          <Trash2 className="w-4 h-4" /> Cancella zona
        </Button>
        <span className="text-sm text-muted-foreground">
          {pts.length === 0 ? "Nessuna zona disegnata" : pts.length < 3 ? `Aggiungi ancora ${3 - pts.length} punto/i` : "Zona disegnata"}
        </span>
      </div>
    </div>
  );
};

export default ServiceAreaDrawer;
