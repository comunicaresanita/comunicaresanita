import { parseBookingDay } from "@/lib/bookingDates";

const CANCELLED = ["cancelled", "cancellato"];
const DONE = ["completed", "completato"];

export const isCancelledStatus = (status: string | null | undefined) => CANCELLED.includes(status ?? "");

/** Slots of a day still free: cancelled bookings never occupy a slot. */
export function freeSlots(
  slots: string[],
  booked: { day: string; time_slot: string; status?: string | null }[],
  dayLabel: string,
): string[] {
  return slots.filter(
    (slot) => !booked.some((b) => !isCancelledStatus(b.status) && b.day === dayLabel && b.time_slot === slot),
  );
}

/** The user can cancel a booking that is still active and not in the past. */
export function canUserCancel(b: { status: string; day: string }, now = new Date()): boolean {
  if (isCancelledStatus(b.status) || DONE.includes(b.status)) return false;
  const d = parseBookingDay(b.day);
  if (!d) return true;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return d.getTime() >= today.getTime();
}

const CONFIRMED = ["paid", "confermato", "confirmed"];
const startOfToday = (now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate());

export type UserBookingStatus = "cancelled" | "rejected" | "done" | "confirmed" | "pending" | "expired" | "other";

/**
 * Stato mostrato al paziente. "done" (Effettuata) solo dopo che il paziente l'ha segnata come effettuata;
 * "confirmed" solo se il professionista ha confermato; una richiesta mai confermata il cui giorno è passato è "expired".
 */
export function userBookingStatus(
  b: { status: string; day: string; cancel_reason?: string | null },
  now = new Date(),
): UserBookingStatus {
  if (isCancelledStatus(b.status)) return b.cancel_reason === "rejected" ? "rejected" : "cancelled";
  if (DONE.includes(b.status)) return "done";
  if (CONFIRMED.includes(b.status)) return "confirmed";
  if (b.status === "pending") {
    const d = parseBookingDay(b.day);
    return d && d.getTime() < startOfToday(now).getTime() ? "expired" : "pending";
  }
  return "other";
}

/** Il paziente può segnare "prenotazione effettuata" se il professionista ha confermato e il giorno è oggi o passato. */
export function canMarkDone(b: { status: string; day: string }, now = new Date()): boolean {
  if (!CONFIRMED.includes(b.status)) return false;
  const d = parseBookingDay(b.day);
  return !!d && d.getTime() <= startOfToday(now).getTime();
}

/** Chiave temporale (giorno + ora d'inizio) per ordinare le prenotazioni. */
export function bookingTime(b: { day: string; time_slot: string }): number {
  const d = parseBookingDay(b.day)?.getTime() ?? 0;
  const h = Number(b.time_slot?.match(/(\d{1,2})/)?.[1] ?? 0);
  return d + h * 3600_000;
}

/** Dalla più recente alla meno recente. */
export const compareBookingsDesc = (a: { day: string; time_slot: string }, b: { day: string; time_slot: string }) =>
  bookingTime(b) - bookingTime(a);

/** Per la Home: la prossima prenotazione attiva (in attesa o confermata, da oggi in poi); se non c'è, la più recente. */
export function pickHomeBooking<T extends { status: string; day: string; time_slot: string; cancel_reason?: string | null }>(
  list: T[],
  now = new Date(),
): T | null {
  if (!list.length) return null;
  const upcoming = list
    .filter((b) => {
      const st = userBookingStatus(b, now);
      return st === "pending" || st === "confirmed";
    })
    .filter((b) => {
      const d = parseBookingDay(b.day);
      return !!d && d.getTime() >= startOfToday(now).getTime();
    })
    .sort((a, b) => bookingTime(a) - bookingTime(b));
  if (upcoming.length) return upcoming[0];
  return [...list].sort(compareBookingsDesc)[0];
}
