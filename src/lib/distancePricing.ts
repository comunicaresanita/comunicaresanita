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
