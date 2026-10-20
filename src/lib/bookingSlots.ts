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

/** Status shown to the user: an active booking whose day has passed counts as done. */
export function userBookingStatus(b: { status: string; day: string }, now = new Date()):
  "cancelled" | "done" | "confirmed" | "pending" | "other" {
  if (isCancelledStatus(b.status)) return "cancelled";
  if (DONE.includes(b.status)) return "done";
  const d = parseBookingDay(b.day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d && d.getTime() < today.getTime()) return "done";
  if (["paid", "confermato", "confirmed"].includes(b.status)) return "confirmed";
  if (b.status === "pending") return "pending";
  return "other";
}
