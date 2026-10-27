import { describe, it, expect } from "vitest";
import { priceWithDistance, isReachable, stepRadius, parseRadius } from "@/lib/distancePricing";

const square: [number, number][] = [[43.7, 11.2], [43.7, 11.3], [43.8, 11.3], [43.8, 11.2]];

describe("long distance surcharge", () => {
  it("no surcharge within 10 km", () => expect(priceWithDistance(50, 10)).toBe(50));
  it("10% surcharge beyond 10 km", () => expect(priceWithDistance(50, 10.5)).toBe(55));
});

describe("professional coverage radius", () => {
  it("hides professionals beyond their chosen radius", () =>
    expect(isReachable({ lat: 0, lng: 0, km: 12, radiusKm: 10, area: null })).toBe(false));
  it("shows professionals within their chosen radius", () =>
    expect(isReachable({ lat: 0, lng: 0, km: 14, radiusKm: 15, area: null })).toBe(true));
  it("a drawn zone replaces the radius: inside the zone is shown even if far", () =>
    expect(isReachable({ lat: 43.75, lng: 11.25, km: 40, radiusKm: 10, area: square })).toBe(true));
  it("a drawn zone replaces the radius: outside the zone is hidden even if close", () =>
    expect(isReachable({ lat: 43.85, lng: 11.25, km: 2, radiusKm: 50, area: square })).toBe(false));
  it("arrows start from 10 km and move by 5 km", () => {
    expect(stepRadius(null, 1)).toBe(15);
    expect(stepRadius(null, -1)).toBe(5);
    expect(stepRadius(15, 1)).toBe(20);
    expect(stepRadius(12, 1)).toBe(15);
    expect(stepRadius(12, -1)).toBe(10);
    expect(stepRadius(5, -1)).toBe(5);
  });
  it("radius must be a whole number of km", () => {
    expect(parseRadius("")).toBeNull();
    expect(parseRadius("0")).toBeNull();
    expect(parseRadius("abc")).toBeNull();
    expect(parseRadius("25")).toBe(25);
  });
});
