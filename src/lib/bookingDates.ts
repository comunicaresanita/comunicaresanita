const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

/** Parses booking day strings like "Venerdì 23 Ottobre 2026" (or ISO "2026-10-23") into a local Date. */
export function parseBookingDay(day: string | null | undefined): Date | null {
  if (!day) return null;
  const iso = day.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const m = day.toLowerCase().match(/(\d{1,2})\s+([a-zà-ù]+)\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2]);
  if (month < 0) return null;
  return new Date(+m[3], month, +m[1]);
}

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
