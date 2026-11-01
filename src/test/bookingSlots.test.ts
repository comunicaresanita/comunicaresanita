import { describe, it, expect } from "vitest";
import { freeSlots, canUserCancel, userBookingStatus, canMarkDone, compareBookingsDesc, pickHomeBooking } from "@/lib/bookingSlots";

const day = "Giovedì 22 Ottobre 2026";

describe("booking slots", () => {
  it("an active booking takes its slot", () => {
    expect(freeSlots(["17-18", "18-19"], [{ day, time_slot: "17-18", status: "pending" }], day)).toEqual(["18-19"]);
  });
  it("a cancelled booking frees its slot again", () => {
    expect(freeSlots(["17-18", "18-19"], [{ day, time_slot: "17-18", status: "cancelled" }], day)).toEqual(["17-18", "18-19"]);
  });
});

describe("user cancellation", () => {
  const now = new Date(2026, 9, 20, 19, 0);
  it("allows cancelling an upcoming booking", () => {
    expect(canUserCancel({ status: "pending", day }, now)).toBe(true);
  });
  it("does not offer cancelling an already cancelled booking", () => {
    expect(canUserCancel({ status: "cancelled", day }, now)).toBe(false);
  });
  it("does not offer cancelling a past booking", () => {
    expect(canUserCancel({ status: "pending", day: "Lunedì 19 Ottobre 2026" }, now)).toBe(false);
  });
});

describe("user booking status", () => {
  const now = new Date(2026, 9, 20, 19, 0);
  it("a request never confirmed whose day has passed is shown as expired", () => {
    expect(userBookingStatus({ status: "pending", day: "Lunedì 19 Ottobre 2026" }, now)).toBe("expired");
  });
  it("confirmed stays confirmed after its day until the patient marks it done", () => {
    expect(userBookingStatus({ status: "confirmed", day: "Lunedì 19 Ottobre 2026" }, now)).toBe("confirmed");
    expect(userBookingStatus({ status: "completed", day: "Lunedì 19 Ottobre 2026" }, now)).toBe("done");
  });
  it("the patient can mark done only a confirmed booking of today or earlier", () => {
    expect(canMarkDone({ status: "confirmed", day: "Martedì 20 Ottobre 2026" }, now)).toBe(true);
    expect(canMarkDone({ status: "confirmed", day: "Mercoledì 21 Ottobre 2026" }, now)).toBe(false);
    expect(canMarkDone({ status: "pending", day: "Lunedì 19 Ottobre 2026" }, now)).toBe(false);
    expect(canMarkDone({ status: "completed", day: "Lunedì 19 Ottobre 2026" }, now)).toBe(false);
  });
  it("a cancelled booking stays cancelled after its day", () => {
    expect(userBookingStatus({ status: "cancelled", day: "Lunedì 19 Ottobre 2026" }, now)).toBe("cancelled");
  });
  it("today's booking is not yet done", () => {
    expect(userBookingStatus({ status: "pending", day: "Martedì 20 Ottobre 2026" }, now)).toBe("pending");
  });
  it("a booking refused by the professional is reported as rejected", () => {
    expect(userBookingStatus({ status: "cancelled", cancel_reason: "rejected", day: "Martedì 20 Ottobre 2026" }, now)).toBe("rejected");
  });
});

describe("ordering", () => {
  it("sorts from the most recent to the least recent, by real date and not by text", () => {
    const list = [
      { day: "Lunedì 2 Novembre 2026", time_slot: "9-10" },
      { day: "Venerdì 30 Ottobre 2026", time_slot: "21-22" },
      { day: "Lunedì 2 Novembre 2026", time_slot: "18-19" },
      { day: "Sabato 7 Novembre 2026", time_slot: "8-9" },
    ];
    expect([...list].sort(compareBookingsDesc).map((b) => `${b.day.split(" ")[1]} ${b.time_slot}`)).toEqual([
      "7 8-9", "2 18-19", "2 9-10", "30 21-22",
    ]);
  });
});

describe("carta della Home", () => {
  const now = new Date(2026, 9, 20, 12, 0);
  const mk = (dayLabel: string, slot: string, status: string, extra: object = {}) => ({ day: dayLabel, time_slot: slot, status, ...extra });
  it("mostra la prossima prenotazione attiva, non la più recente creata", () => {
    const list = [
      mk("Martedì 27 Ottobre 2026", "10-11", "confirmed"),
      mk("Giovedì 22 Ottobre 2026", "9-10", "pending"),
      mk("Lunedì 12 Ottobre 2026", "9-10", "completed"),
    ];
    expect(pickHomeBooking(list, now)!.day).toBe("Giovedì 22 Ottobre 2026");
  });
  it("senza prenotazioni attive mostra l'ultima in ordine di data", () => {
    const list = [
      mk("Lunedì 12 Ottobre 2026", "9-10", "completed"),
      mk("Venerdì 16 Ottobre 2026", "9-10", "cancelled"),
    ];
    expect(pickHomeBooking(list, now)!.day).toBe("Venerdì 16 Ottobre 2026");
  });
  it("una richiesta mai confermata e già passata non conta come prossima", () => {
    const list = [mk("Lunedì 19 Ottobre 2026", "9-10", "pending"), mk("Giovedì 15 Ottobre 2026", "9-10", "completed")];
    expect(pickHomeBooking(list, now)!.day).toBe("Lunedì 19 Ottobre 2026");
    expect(pickHomeBooking([], now)).toBeNull();
  });
});

