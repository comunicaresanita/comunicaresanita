import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Lock, Move } from "lucide-react";
import { bluePinIcon } from "@/lib/leafletPin";
import { LONG_DISTANCE_KM, type ServiceArea } from "@/lib/distancePricing";

interface Props {
  centerLat?: number;
  centerLng?: number;
  longDistanceOk: boolean;
  value: ServiceArea | null;
  onChange: (area: ServiceArea | null) => void;
}

const MIN_PX = 6;
const MAX_POINTS = 300;

const ServiceAreaDrawer = ({ centerLat, centerLng, longDistanceOk, value, onChange }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const strokeRef = useRef<L.Polyline | null>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const [drawing, setDrawing] = useState(false);
  const drawingRef = useRef(false);
  drawingRef.current = drawing;

  const color = () => {
    const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    return primary ? `hsl(${primary})` : "currentColor";
  };

  const fitTenKm = (map: L.Map, lat: number, lng: number) => {
    // Frame an area of ~10 km around the pin so the working radius is visible right away.
    const bounds = L.latLng(lat, lng).toBounds(LONG_DISTANCE_KM * 2);
    console.log("[fitTenKm] size:", JSON.stringify(map.getSize()), "bounds:", bounds.toBBoxString());
    map.fitBounds(bounds, { animate: false });
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [centerLat ?? 43.7696, centerLng ?? 11.2558], zoom: 11 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    if (centerLat && centerLng) fitTenKm(map, centerLat, centerLng);
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map && centerLat && centerLng) fitTenKm(map, centerLat, centerLng);
  }, [centerLat, centerLng]);

  // Lock the map while drawing so finger/mouse movements trace the zone instead of panning.
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el) return;
    const handlers = [map.dragging, map.touchZoom, map.doubleClickZoom, map.scrollWheelZoom, map.boxZoom, map.keyboard];
    if (!drawing) {
      handlers.forEach((h) => h?.enable());
      el.style.touchAction = "";
      el.style.cursor = "";
      return;
    }
    handlers.forEach((h) => h?.disable());
    el.style.touchAction = "none";
    el.style.cursor = "crosshair";

    let pts: L.LatLng[] = [];
    let lastPx: L.Point | null = null;
    let active = false;

    const toLatLng = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      return map.containerPointToLatLng(L.point(e.clientX - rect.left, e.clientY - rect.top));
    };
    const down = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      el.setPointerCapture?.(e.pointerId);
      active = true;
      pts = [toLatLng(e)];
      lastPx = map.latLngToContainerPoint(pts[0]);
      strokeRef.current?.remove();
      strokeRef.current = L.polyline(pts, { color: color(), weight: 3 }).addTo(map);
    };
    const move = (e: PointerEvent) => {
      if (!active) return;
      e.preventDefault();
      e.stopPropagation();
      const ll = toLatLng(e);
      const px = map.latLngToContainerPoint(ll);
      if (lastPx && px.distanceTo(lastPx) < MIN_PX) return;
      lastPx = px;
      pts.push(ll);
      strokeRef.current?.setLatLngs(pts);
    };
    const up = (e: PointerEvent) => {
      if (!active) return;
      e.preventDefault();
      active = false;
      strokeRef.current?.remove();
      strokeRef.current = null;
      if (pts.length >= 3) {
        const step = Math.max(1, Math.ceil(pts.length / MAX_POINTS));
        const area = pts.filter((_, i) => i % step === 0).map((p) => [p.lat, p.lng] as [number, number]);
        changeRef.current(area.length >= 3 ? area : null);
        setDrawing(false);
      }
    };
    el.addEventListener("pointerdown", down, true);
    el.addEventListener("pointermove", move, true);
    el.addEventListener("pointerup", up, true);
    el.addEventListener("pointercancel", up, true);
    return () => {
      el.removeEventListener("pointerdown", down, true);
      el.removeEventListener("pointermove", move, true);
      el.removeEventListener("pointerup", up, true);
      el.removeEventListener("pointercancel", up, true);
      strokeRef.current?.remove();
      strokeRef.current = null;
    };
  }, [drawing]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const c = color();
    if (centerLat && centerLng) {
      L.marker([centerLat, centerLng], { icon: bluePinIcon(), interactive: false }).addTo(layer);
      if (!longDistanceOk) {
        L.circle([centerLat, centerLng], { radius: LONG_DISTANCE_KM * 1000, color: c, weight: 1, dashArray: "6 6", fillOpacity: 0.04, interactive: false }).addTo(layer);
      }
    }
    if (value && value.length >= 3) L.polygon(value, { color: c, weight: 2, fillOpacity: 0.2, interactive: false }).addTo(layer);
  }, [value, centerLat, centerLng, longDistanceOk]);

  const hasArea = !!value && value.length >= 3;
  return (
    <div className="space-y-3">
      <p className="text-senior-sm text-muted-foreground">
        Facoltativo. Prima sposta e ingrandisci la mappa sulla zona che ti interessa, poi tocca «Disegna la zona»: la mappa si blocca e puoi tracciare il contorno a mano libera con il dito o il mouse. Gli utenti fuori dalla zona disegnata non ti vedranno. Se non disegni nulla, conta solo il raggio impostato{longDistanceOk ? "" : " (cerchio tratteggiato di 10 km)"}.
      </p>
      <div className={`relative rounded-lg transition-shadow ${drawing ? "ring-2 ring-primary cursor-crosshair" : ""}`}>
        {/* NB: the map container classes must never change after L.map() init — React would
            reset className and wipe Leaflet's own classes, breaking tiles and controls. */}
        <div ref={containerRef} className="w-full h-80 rounded-lg border z-0" />
        {drawing && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-sm shadow pointer-events-none">
            <Lock className="w-4 h-4" /> Mappa bloccata: traccia la zona
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {drawing ? (
          <Button type="button" variant="outline" onClick={() => setDrawing(false)} className="gap-2">
            <Move className="w-4 h-4" /> Sblocca la mappa
          </Button>
        ) : (
          <Button type="button" onClick={() => setDrawing(true)} className="gap-2 text-primary-foreground">
            <Pencil className="w-4 h-4" /> {hasArea ? "Ridisegna la zona" : "Disegna la zona"}
          </Button>
        )}
        <Button type="button" variant="outline" disabled={!hasArea} onClick={() => onChange(null)} className="gap-2">
          <Trash2 className="w-4 h-4" /> Cancella zona
        </Button>
        <span className="text-sm text-muted-foreground">{hasArea ? "Zona disegnata" : "Nessuna zona disegnata"}</span>
      </div>
    </div>
  );
};

export default ServiceAreaDrawer;
