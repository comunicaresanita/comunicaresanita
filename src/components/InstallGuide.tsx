import { EllipsisVertical, ExternalLink, PlusSquare } from "lucide-react";
import IosInstallGuide from "@/components/IosInstallGuide";
import { isIosSafari, type MobileInstallPlatform } from "@/lib/installPreferences";

export default function InstallGuide({ platform }: { platform: MobileInstallPlatform }) {
  const embedded = window.self !== window.top || /lovableproject\.|^(id-preview--|preview--)/.test(location.hostname);
  return <>
    {embedded && <p className="mt-3 text-sm text-muted-foreground">Per aggiungere l’icona, apri il sito <a className="text-primary underline break-all" href="https://comunicaresanita.lovable.app" target="_blank" rel="noopener noreferrer">comunicaresanita.lovable.app</a> nel browser del telefono, fuori da questa anteprima.</p>}
    {platform === "ios" ? <IosInstallGuide safari={isIosSafari(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)} /> : <>
      <p className="mt-3 text-sm text-muted-foreground">per non perderci e averci comodamente tra le app, segui questi semplici step:</p>
      <ol className="mt-4 space-y-3">
        <li className="flex items-start gap-3 text-sm"><ExternalLink className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><span>Apri il sito in Chrome. Se sei nell’app Google, Facebook o un’altra app, usa il menu e scegli «Apri in Chrome» o «Apri nel browser». Se non c’è, copia l’indirizzo e incollalo in Chrome.</span></li>
        <li className="flex items-start gap-3 text-sm"><EllipsisVertical className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><span>Tocca i tre puntini del menu del browser.</span></li>
        <li className="flex items-start gap-3 text-sm"><PlusSquare className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><span>Scegli «Aggiungi a schermata Home» o «Installa app», poi conferma con «Aggiungi» o «Installa».</span></li>
      </ol>
      <p className="mt-3 text-sm text-muted-foreground">In Samsung Internet o Firefox cerca «Aggiungi a schermata Home» nel menu. Se la voce non è disponibile, apri il sito in Chrome e segui i passaggi qui sopra.</p>
    </>}
  </>;
}