import { describe, it, expect } from "vitest";
import { parseBookingDay, dateKey } from "@/lib/bookingDates";

describe("parseBookingDay", () => {
  it("reads the Italian day stored on bookings", () => {
    expect(dateKey(parseBookingDay("Venerdì 23 Ottobre 2026")!)).toBe("2026-10-23");
  });
  it("returns null for unreadable text", () => {
    expect(parseBookingDay("domani")).toBeNull();
  });
});
