import { describe, it, expect } from "vitest";
import { isInServiceArea } from "@/lib/distancePricing";

const square: [number, number][] = [[43.7, 11.2], [43.7, 11.3], [43.8, 11.3], [43.8, 11.2]];
describe("service area", () => {
  it("without drawing everyone in range is reachable", () => expect(isInServiceArea(45, 9, null)).toBe(true));
  it("inside the drawn zone is reachable", () => expect(isInServiceArea(43.75, 11.25, square)).toBe(true));
  it("outside the drawn zone is hidden", () => expect(isInServiceArea(43.85, 11.25, square)).toBe(false));
});
