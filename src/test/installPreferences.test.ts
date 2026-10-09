import { describe, expect, it } from "vitest";
import { canOfferNativeInstall, canShowIosGuide, isIosSafari, mobileInstallPlatform } from "@/lib/installPreferences";

describe("Installation preferences", () => {
  it("offers Android installation only before the first handled prompt", () => {
    expect(canOfferNativeInstall(false, null)).toBe(true);
    expect(canOfferNativeInstall(false, "true")).toBe(false);
  });
  it("never offers installation in standalone mode", () => {
    expect(canOfferNativeInstall(true, null)).toBe(false);
    expect(canShowIosGuide(true, null)).toBe(false);
  });
  it("keeps the dismissed iOS guide hidden for 7 days", () => {
    const dismissed = 100000000;
    expect(canShowIosGuide(false, String(dismissed), dismissed + 7 * 86400000 - 1)).toBe(false);
    expect(canShowIosGuide(false, String(dismissed), dismissed + 7 * 86400000)).toBe(true);
  });
  it("shows the guide only for Safari on Apple mobile devices", () => {
    expect(isIosSafari("iPhone Version/18.0 Mobile Safari/604.1", "iPhone", 5)).toBe(true);
    expect(isIosSafari("Macintosh Version/18.0 Safari/605.1", "MacIntel", 5)).toBe(true);
    expect(isIosSafari("iPhone CriOS/130 Mobile Safari/604.1", "iPhone", 5)).toBe(false);
    expect(isIosSafari("Android Chrome/130 Safari/537.36", "Linux", 5)).toBe(false);
    expect(isIosSafari("Macintosh Safari/605.1", "MacIntel", 0)).toBe(false);
  });
  it("makes iOS instructions eligible for Chrome, Google and other Apple browsers too", () => {
    for (const browser of ["CriOS/130", "GSA/300", "FxiOS/130", "EdgiOS/130", "Version/18 Safari/604.1"]) {
      expect(mobileInstallPlatform(`iPhone Mobile ${browser}`, "iPhone", 5)).toBe("ios");
    }
    expect(mobileInstallPlatform("Macintosh Safari/605.1", "MacIntel", 5)).toBe("ios");
  });
  it("offers Android instructions in Google, Chrome and other browsers without a native prompt", () => {
    for (const browser of ["Chrome/130", "GSA/300", "Firefox/130", "SamsungBrowser/25"]) {
      expect(mobileInstallPlatform(`Android ${browser}`, "Linux", 5)).toBe("android");
    }
    expect(mobileInstallPlatform("Macintosh Safari/605.1", "MacIntel", 0)).toBe(null);
  });
});