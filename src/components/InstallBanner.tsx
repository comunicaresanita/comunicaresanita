import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import InstallGuide from "@/components/InstallGuide";
import { Button } from "@/components/ui/button";
import { canOfferNativeInstall, canShowIosGuide, INSTALL_HANDLED_KEY, IOS_DISMISSED_KEY, mobileInstallPlatform, readPreference, savePreference } from "@/lib/installPreferences";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallBanner() {
  const [mode, setMode] = useState<"native" | "ios" | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [guideTarget, setGuideTarget] = useState<HTMLElement | null>(null);
  const platform = mobileInstallPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
  const { pathname } = useLocation();
  const pendingPrompt = useRef<InstallPromptEvent | null>(null);

  useEffect(() => {
    const updateTarget = () => setGuideTarget(document.getElementById("home-install-guide"));
    updateTarget();
    const observer = new MutationObserver(updateTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const installed = () => standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const preview = window.self !== window.top || /^(id-preview--|preview--)/.test(location.hostname) || /(^|\.)(lovableproject\.com|lovableproject-dev\.com|beta\.lovable\.dev)$/.test(location.hostname);
    const clear = () => {
      savePreference(INSTALL_HANDLED_KEY, "true");
      pendingPrompt.current = null;
      setMode(null);
      setIsInstalled(true);
    };
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      if (preview || !canOfferNativeInstall(installed(), readPreference(INSTALL_HANDLED_KEY))) return;
      if (platform === "ios") return;
      pendingPrompt.current = event as InstallPromptEvent;
      setMode("native");
    };
    const displayChanged = () => { if (installed()) clear(); };
    const preferenceChanged = () => {
      setIsInstalled(installed());
      if (installed()) {
        setMode(null);
      } else if (platform !== "ios" && readPreference(INSTALL_HANDLED_KEY) === "true") {
        pendingPrompt.current = null;
        setMode(null);
      } else if (!canShowIosGuide(installed(), readPreference(IOS_DISMISSED_KEY))) {
        setMode(current => current === "ios" ? null : current);
      }
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", clear);
    window.addEventListener("storage", preferenceChanged);
    standalone.addEventListener("change", displayChanged);
    preferenceChanged();
    if (installed()) clear();
    const timer = window.setTimeout(() => {
      if (platform === "ios"
        && canShowIosGuide(installed(), readPreference(IOS_DISMISSED_KEY))) setMode("ios");
    }, 4000);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", clear);
      window.removeEventListener("storage", preferenceChanged);
      standalone.removeEventListener("change", displayChanged);
    };
  }, [platform]);

  function dismiss() {
    if (mode === "ios") {
      savePreference(IOS_DISMISSED_KEY, String(Date.now()));
    }
    else savePreference(INSTALL_HANDLED_KEY, "true");
    pendingPrompt.current = null;
    setMode(null);
  }

  async function install() {
    const event = pendingPrompt.current;
    if (!event || !canOfferNativeInstall(false, readPreference(INSTALL_HANDLED_KEY))) return;
    savePreference(INSTALL_HANDLED_KEY, "true");
    pendingPrompt.current = null;
    setMode(null);
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      // A closed or unavailable native prompt is never automatically repeated.
    }
  }

  const inlineGuide = platform && !isInstalled && guideTarget && ["/", "/dashboard-paziente", "/dashboard-professionista"].includes(pathname)
    ? createPortal(<section aria-label="Guida installazione ComuniCARE" className="w-full rounded-lg border border-border bg-secondary p-6">
      <h2 className="text-xl font-semibold">Aggiungi ComuniCARE alla tua Home</h2>
      <InstallGuide platform={platform} />
    </section>, guideTarget) : null;
  return <>{inlineGuide}{mode && (
    <aside aria-label="Installazione ComuniCARE" className="fixed bottom-24 left-3 right-3 z-40 max-h-[calc(100dvh-8rem)] max-w-sm overflow-y-auto rounded-lg border border-border bg-background p-4 shadow-lg sm:bottom-6 sm:left-6 sm:right-auto" role="region">
      <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-9 w-9" aria-label="Chiudi avviso di installazione" title="Chiudi" onClick={dismiss}><X /></Button>
      <div className="flex items-center gap-3 pr-7">
        <img src="/icons/app-192.png" alt="" className="h-10 w-10 shrink-0 rounded-md" />
        <h2 className="text-base font-semibold">{mode === "ios" ? "Aggiungi ComuniCARE alla tua Home" : "ComuniCARE sulla tua Home"}</h2>
      </div>
      {mode === "ios" ? <>
        <InstallGuide platform="ios" />
        <div className="mt-3 flex justify-end"><Button size="sm" variant="secondary" onClick={dismiss}>Capito</Button></div>
      </> : <>
        <p className="mt-3 text-sm text-muted-foreground">Aggiungi ComuniCARE alla schermata Home.</p>
        <div className="mt-3 flex justify-end"><Button size="sm" onClick={install}><Download /> Installa</Button></div>
      </>}
    </aside>
  )}</>;
}