import { useNavigate } from "react-router-dom";
import AuthHeader from "@/components/AuthHeader";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Termini = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Termini e Condizioni — ComuniCARE"
        description="Termini e condizioni d'uso della piattaforma ComuniCARE: ruoli, responsabilità, prenotazioni, pagamenti e foro competente."
        path="/termini"
      />
      <AuthHeader />
      <main className="flex-1 bg-background py-12">
        <div className="container mx-auto px-6 max-w-3xl">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Torna indietro
          </Button>
          <h1 className="text-senior-2xl md:text-senior-3xl font-bold mb-8">Termini e Condizioni</h1>
          <p className="text-senior-sm text-muted-foreground mb-8 italic">
            Ultimo aggiornamento: Aprile 2026 — Documento segnaposto da far revisionare da un legale.
          </p>

          <div className="prose prose-lg max-w-none space-y-8 text-senior-sm text-foreground">
            <section>
              <h2 className="text-senior-xl font-semibold mb-3">1. Premessa e Definizioni</h2>
              <p>ComuniCARE (di seguito "la Piattaforma") è un servizio tecnologico di intermediazione che mette in contatto pazienti e professionisti sanitari (infermieri) abilitati all'esercizio della professione nella zona di Firenze. La Piattaforma non eroga direttamente prestazioni sanitarie.</p>
              <p><strong>"Utente"</strong>: qualsiasi persona fisica che si registra sulla Piattaforma come Paziente o Professionista.</p>
              <p><strong>"Paziente"</strong>: utente che ricerca e prenota servizi infermieristici.</p>
              <p><strong>"Professionista"</strong>: infermiere regolarmente iscritto all'OPI che offre servizi sulla Piattaforma.</p>
            </section>

            <section>
              <h2 className="text-senior-xl font-semibold mb-3">2. Natura del Servizio</h2>
              <p>ComuniCARE agisce esclusivamente come intermediario tecnologico. La responsabilità della prestazione sanitaria è esclusivamente in capo al professionista abilitato che la eroga. La Piattaforma non verifica la qualità delle prestazioni erogate e non è responsabile per eventuali danni derivanti dalle stesse.</p>
            </section>

            <section>
              <h2 className="text-senior-xl font-semibold mb-3">3. Registrazione e Account</h2>
              <p>Per utilizzare la Piattaforma è necessario creare un account fornendo dati veritieri e completi. L'utente è responsabile della custodia delle proprie credenziali di accesso. I Professionisti devono fornire documentazione comprovante l'iscrizione all'OPI e un documento d'identità valido, che saranno sottoposti a verifica.</p>
            </section>

            <section>
              <h2 className="text-senior-xl font-semibold mb-3">4. Obblighi del Professionista</h2>
              <p>Il Professionista garantisce di: (a) essere regolarmente iscritto all'OPI; (b) possedere copertura assicurativa per responsabilità civile professionale; (c) erogare le prestazioni secondo le migliori pratiche professionali; (d) mantenere aggiornati i propri dati sulla Piattaforma.</p>
            </section>

            <section>
              <h2 className="text-senior-xl font-semibold mb-3">5. Prenotazioni e Pagamenti</h2>
              <p>Le prenotazioni sono gestite attraverso la Piattaforma. Al momento non è previsto alcun pagamento online sulla Piattaforma: dopo la prenotazione l'utente viene ricontattato dal team ComuniCARE, che concorda i dettagli e le modalità di pagamento della prestazione. Le politiche di cancellazione sono specificate al momento della prenotazione.</p>
            </section>

            <section>
              <h2 className="text-senior-xl font-semibold mb-3">6. Limitazione di Responsabilità</h2>
              <p>ComuniCARE non è responsabile per: (a) la qualità o l'esito delle prestazioni sanitarie; (b) danni diretti o indiretti derivanti dall'uso della Piattaforma; (c) la veridicità delle informazioni fornite dagli utenti; (d) interruzioni temporanee del servizio.</p>
            </section>

            <section>
              <h2 className="text-senior-xl font-semibold mb-3">7. Proprietà Intellettuale</h2>
              <p>Tutti i contenuti della Piattaforma (marchi, loghi, testi, grafica) sono di proprietà di ComuniCARE o dei rispettivi titolari e sono protetti dalle leggi sulla proprietà intellettuale.</p>
            </section>

            <section>
              <h2 className="text-senior-xl font-semibold mb-3">8. Legge Applicabile e Foro Competente</h2>
              <p>I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia sarà competente il Foro di Firenze.</p>
            </section>

            <section>
              <h2 className="text-senior-xl font-semibold mb-3">9. Modifiche ai Termini</h2>
              <p>ComuniCARE si riserva il diritto di modificare i presenti Termini in qualsiasi momento. Le modifiche saranno comunicate agli utenti tramite la Piattaforma o via email con adeguato preavviso.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Termini;
