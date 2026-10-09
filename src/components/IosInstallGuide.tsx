import { ChevronDown, Menu, PlusSquare, Share } from "lucide-react";

export default function IosInstallGuide({ safari = true }: { safari?: boolean }) {
  const steps = [
    { Icon: Menu, text: "Tocca le tre lineette del menu del browser." },
    { Icon: Share, text: "Tocca Condividi." },
    { Icon: ChevronDown, text: "Tocca Visualizza altro, con la freccia verso il basso." },
    { Icon: PlusSquare, text: "Tocca Aggiungi alla schermata Home." },
  ];
  return <>
    <p className="mt-3 text-sm text-muted-foreground">per non perderci e averci comodamente tra le app, segui questi semplici step:</p>
    {!safari && <p className="mt-3 text-sm text-muted-foreground">In Chrome apri Condividi e cerca «Aggiungi alla schermata Home». Se la voce non compare, oppure sei nell’app Google o in un altro browser, apri questo sito in Safari: dal menu scegli «Apri in Safari», se disponibile, oppure copia l’indirizzo e incollalo in Safari. Poi segui questi passaggi:</p>}
    <ol className="mt-4 space-y-3">
    {steps.map(({ Icon, text }, index) => <li key={text} className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground tabular-nums">{index + 1}.</span>
        <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <span>{text}</span>
      </li>)}
    </ol>
    <p className="mt-3 text-sm text-muted-foreground">Se Condividi è già visibile, toccalo direttamente. Se «Aggiungi alla schermata Home» è già nell’elenco, non serve «Visualizza altro». Infine conferma con «Aggiungi».</p>
  </>;
}