import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import IosInstallGuide from "@/components/IosInstallGuide";
import { Button } from "@/components/ui/button";
import { canOfferNativeInstall, canShowIosGuide, INSTALL_HANDLED_KEY, IOS_DISMISSED_KEY, isIosSafari, readPreference, savePreference } from "@/lib/installPreferences";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallBanner() {
  const [mode, setMode] = useState<"native" | "ios" | null>(null);
  const [inlineGuide, setInlineGuide] = useState(false);
  const { pathname } = useLocation();
  const pendingPrompt = useRef<InstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const installed = () => standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const preview = window.self !== window.top || /^(id-preview--|preview--)/.test(location.hostname) || /(^|\.)(lovableproject\.com|lovableproject-dev\.com|beta\.lovable\.dev)$/.test(location.hostname);
    const clear = () => {
      savePreference(INSTALL_HANDLED_KEY, "true");
      pendingPrompt.current = null;
      setMode(null);
      setInlineGuide(false);
    };
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      if (preview || !canOfferNativeInstall(installed(), readPreference(INSTALL_HANDLED_KEY))) return;
      if (isIosSafari(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)) return;
      pendingPrompt.current = event as InstallPromptEvent;
      setMode("native");
    };
    const displayChanged = () => { if (installed()) clear(); };
    const preferenceChanged = () => {
      setInlineGuide(!preview && !installed() && isIosSafari(navigator.userAgent, navigator.platform, navigator.maxTouchPoints) && Boolean(readPreference(IOS_DISMISSED_KEY)) && readPreference(INSTALL_HANDLED_KEY) !== "true");
      if (readPreference(INSTALL_HANDLED_KEY) === "true") {
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
      if (!preview && isIosSafari(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)
        && readPreference(INSTALL_HANDLED_KEY) !== "true"
        && canShowIosGuide(installed(), readPreference(IOS_DISMISSED_KEY))) setMode("ios");
    }, 4000);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", clear);
      window.removeEventListener("storage", preferenceChanged);
      standalone.removeEventListener("change", displayChanged);
    };
  }, [pathname]);

  function dismiss() {
    if (mode === "ios") {
      savePreference(IOS_DISMISSED_KEY, String(Date.now()));
      setInlineGuide(true);
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

  if (!mode) {
    const target = document.getElementById("home-install-guide");
    if (!inlineGuide || !target || !["/", "/dashboard-paziente"].includes(pathname)) return null;
    return createPortal(<section aria-label="Guida installazione ComuniCARE" className="w-full rounded-lg border border-border bg-secondary p-6">
      <h2 className="text-xl font-semibold">Aggiungi ComuniCARE alla tua Home</h2>
      <IosInstallGuide />
    </section>, target);
  }
  return (
    <aside aria-label="Installazione ComuniCARE" className="fixed bottom-24 left-3 right-3 z-40 max-w-sm rounded-lg border border-border bg-background p-4 shadow-lg sm:bottom-6 sm:left-6 sm:right-auto" role="region">
      <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-9 w-9" aria-label="Chiudi avviso di installazione" title="Chiudi" onClick={dismiss}><X /></Button>
      <div className="flex items-center gap-3 pr-7">
        <img src="/icons/app-192.png" alt="" className="h-10 w-10 shrink-0 rounded-md" />
        <h2 className="text-base font-semibold">{mode === "ios" ? "Aggiungi ComuniCARE alla tua Home" : "ComuniCARE sulla tua Home"}</h2>
      </div>
      {mode === "ios" ? <>
        <IosInstallGuide />
        <div className="mt-3 flex justify-end"><Button size="sm" variant="secondary" onClick={dismiss}>Capito</Button></div>
      </> : <>
        <p className="mt-3 text-sm text-muted-foreground">Aggiungi ComuniCARE alla schermata Home.</p>
        <div className="mt-3 flex justify-end"><Button size="sm" onClick={install}><Download /> Installa</Button></div>
      </>}
    </aside>
  );
}