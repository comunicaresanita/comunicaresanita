import { describe, it, expect } from "vitest";
import { freeSlots, canUserCancel } from "@/lib/bookingSlots";

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
