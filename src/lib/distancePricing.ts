// Long-distance rule: professionals farther than LONG_DISTANCE_KM from the
// recipient's address get a 10% surcharge.
export const LONG_DISTANCE_KM = 10;
export const LONG_DISTANCE_SURCHARGE = 0.1;

// Coverage chosen by each professional: max distance (km) from their map pin.
export const DEFAULT_RADIUS_KM = 10;
export const RADIUS_STEP_KM = 5;
export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 300;

export const isLongDistance = (km: number | null | undefined) =>
  typeof km === "number" && km > LONG_DISTANCE_KM;

export const priceWithDistance = (price: number, km: number | null | undefined) =>
  isLongDistance(km) ? Math.round(price * (1 + LONG_DISTANCE_SURCHARGE)) : price;

// Optional service area drawn by the professional: list of [lat, lng] vertices.
export type ServiceArea = [number, number][];

export const hasServiceArea = (area: unknown): area is ServiceArea => Array.isArray(area) && area.length >= 3;

export const isInServiceArea = (lat: number, lng: number, area: unknown) => {
  if (!hasServiceArea(area)) return true; // no drawing → only the range counts
  let inside = false;
  for (let i = 0, j = area.length - 1; i < area.length; j = i++) {
    const [yi, xi] = area[i];
    const [yj, xj] = area[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/**
 * Whether a professional appears in the list for a recipient at (lat, lng).
 * A drawn zone replaces the range; without a drawing only the chosen radius counts.
 */
export const isReachable = (opts: {
  lat: number;
  lng: number;
  km: number | null | undefined;
  radiusKm: number | null | undefined;
  area: unknown;
}) => {
  if (hasServiceArea(opts.area)) return isInServiceArea(opts.lat, opts.lng, opts.area);
  if (typeof opts.km !== "number") return true;
  const radius = typeof opts.radiusKm === "number" && opts.radiusKm > 0 ? opts.radiusKm : DEFAULT_RADIUS_KM;
  return opts.km <= radius;
};

/** Next value when pressing the up/down arrows: snaps to multiples of RADIUS_STEP_KM. */
export const stepRadius = (current: number | null, dir: 1 | -1) => {
  const base = current ?? DEFAULT_RADIUS_KM;
  const next = dir === 1
    ? Math.floor(base / RADIUS_STEP_KM) * RADIUS_STEP_KM + RADIUS_STEP_KM
    : Math.ceil(base / RADIUS_STEP_KM) * RADIUS_STEP_KM - RADIUS_STEP_KM;
  return Math.min(MAX_RADIUS_KM, Math.max(RADIUS_STEP_KM, next));
};

export const parseRadius = (value: string): number | null => {
  if (!/^\d+$/.test(value.trim())) return null;
  const n = parseInt(value, 10);
  return n >= MIN_RADIUS_KM && n <= MAX_RADIUS_KM ? n : null;
};
