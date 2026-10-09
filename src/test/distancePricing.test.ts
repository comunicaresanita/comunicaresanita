import { describe, it, expect } from "vitest";
import { priceWithDistance, isReachable } from "@/lib/distancePricing";

describe("long distance rule", () => {
  it("no surcharge within 10 km", () => expect(priceWithDistance(50, 10)).toBe(50));
  it("10% surcharge beyond 10 km", () => expect(priceWithDistance(50, 10.5)).toBe(55));
  it("hides far professionals who did not accept", () => expect(isReachable(12, false)).toBe(false));
  it("shows far professionals who accepted", () => expect(isReachable(12, true)).toBe(true));
  it("always shows nearby professionals", () => expect(isReachable(4, false)).toBe(true));
});
