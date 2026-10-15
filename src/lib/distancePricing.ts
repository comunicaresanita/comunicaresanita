// Long-distance rule: professionals farther than LONG_DISTANCE_KM from the
// recipient's address get a 10% surcharge, and only appear if they accepted it.
export const LONG_DISTANCE_KM = 10;
export const LONG_DISTANCE_SURCHARGE = 0.1;

export const isLongDistance = (km: number | null | undefined) =>
  typeof km === "number" && km > LONG_DISTANCE_KM;

export const priceWithDistance = (price: number, km: number | null | undefined) =>
  isLongDistance(km) ? Math.round(price * (1 + LONG_DISTANCE_SURCHARGE)) : price;

export const isReachable = (km: number | null | undefined, longDistanceOk: boolean) =>
  !isLongDistance(km) || longDistanceOk;

// Optional service area drawn by the professional: list of [lat, lng] vertices.
export type ServiceArea = [number, number][];

export const isInServiceArea = (lat: number, lng: number, area: unknown) => {
  if (!Array.isArray(area) || area.length < 3) return true; // no drawing → only the range counts
  let inside = false;
  for (let i = 0, j = area.length - 1; i < area.length; j = i++) {
    const [yi, xi] = area[i] as [number, number];
    const [yj, xj] = area[j] as [number, number];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
