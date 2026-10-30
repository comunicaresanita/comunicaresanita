import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Info } from "lucide-react";

type ActionInfo = { state: string; action?: "confirm" | "reject"; service?: string; day?: string; slot?: string; emailsOk?: boolean };

const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-action`;

const call = async (t: string, execute: boolean): Promise<ActionInfo> => {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ t, execute }),
  });
  try { return await res.json(); } catch { return { state: "error" }; }
};

/** Pagina aperta dai pulsanti Conferma/Rifiuta delle email: mostra il riepilogo e chiede un ultimo tocco. */
const AzioneEmail = () => {
  const [params] = useSearchParams();
  const t = params.get("t") ?? "";
  const [info, setInfo] = useState<ActionInfo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!t) { setInfo({ state: "invalid" }); return; }
    call(t, false).then(setInfo).catch(() => setInfo({ state: "error" }));
  }, [t]);

  const run = async () => {
    setBusy(true);
    try { setInfo(await call(t, true)); } catch { setInfo({ state: "error" }); }
    setBusy(false);
  };

  const label = info?.service ? `${info.service}, ${info.day} ore ${info.slot}` : "";
  const confirm = info?.action === "confirm";

  let icon = <Info className="w-14 h-14 text-primary mx-auto mb-4" />;
  let title = "Un momento…";
  let text: React.ReactNode = null;
  let showButton = false;

  switch (info?.state) {
    case "ready":
      title = confirm ? "Confermare la prenotazione?" : "Rifiutare la prenotazione?";
      text = <p>{label}</p>;
      showButton = true;
      break;
    case "confirmed":
      icon = <CheckCircle className="w-14 h-14 text-primary mx-auto mb-4" />;
      title = "Prenotazione confermata";
      text = <><p>{label}</p><p className="mt-2">Il paziente riceverà la conferma via email e la prenotazione compare nella tua dashboard.{info.emailsOk === false ? " Non siamo riusciti a inviare l'email di conferma: controlla la dashboard." : ""}</p></>;
      break;
    case "rejected":
      icon = <XCircle className="w-14 h-14 text-primary mx-auto mb-4" />;
      title = "Prenotazione rifiutata";
      text = <><p>{label}</p><p className="mt-2">L'orario è di nuovo libero e il paziente potrà sceglierne un altro.</p></>;
      break;
    case "already_confirmed":
      title = "Già confermata";
      text = <p>{label}</p>;
      break;
    case "already_closed":
      title = "Nessuna azione necessaria";
      text = <><p>{label}</p><p className="mt-2">Questa prenotazione è già stata annullata o rifiutata.</p></>;
      break;
    case "invalid":
      title = "Link non valido o scaduto";
      text = <p>Apri la tua dashboard su ComuniCARE per gestire la prenotazione.</p>;
      break;
    case "missing":
      title = "Prenotazione non trovata";
      break;
    case "error":
      title = "Qualcosa non ha funzionato";
      text = <p>Riprova tra poco o apri la tua dashboard su ComuniCARE.</p>;
      break;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background py-16 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 md:mx-6 text-center">
          <CardContent className="p-6 md:p-8">
            {icon}
            <h1 className="text-xl md:text-senior-2xl font-bold mb-2">{title}</h1>
            <div className="text-base text-muted-foreground mb-6">{text}</div>
            {showButton && (
              <Button className="w-full py-5 mb-3" onClick={run} disabled={busy}>
                {busy ? "Invio…" : confirm ? "Conferma" : "Rifiuta"}
              </Button>
            )}
            <Link to="/dashboard-professionista"><Button variant="outline" className="w-full py-5">Vai alla dashboard</Button></Link>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default AzioneEmail;
