export const INSTALL_HANDLED_KEY = "comunicare_install_handled";
export const IOS_DISMISSED_KEY = "comunicare_ios_install_dismissed";
export const IOS_DISMISS_DAYS = 30;
const memory = new Map<string, string>();

export function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

export function savePreference(key: string, value: string) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    // Keep the choice for this page session if storage is unavailable.
  }
}

export function canOfferNativeInstall(installed: boolean, handled: string | null) {
  return !installed && handled !== "true";
}

export function canShowIosGuide(installed: boolean, dismissedAt: string | null, now = Date.now()) {
  if (installed) return false;
  if (!dismissedAt) return true;
  const timestamp = Number(dismissedAt);
  return !Number.isFinite(timestamp) || now - timestamp >= IOS_DISMISS_DAYS * 86400000;
}

export function isIosSafari(userAgent: string, platform: string, touchPoints: number) {
  const appleMobile = /iPhone|iPad|iPod/.test(userAgent) || (platform === "MacIntel" && touchPoints > 1);
  return appleMobile && /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/.test(userAgent);
}