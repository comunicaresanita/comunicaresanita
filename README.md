# ComuniCARE_MVP

ComuniCARE MVP (Legal & Medical Ready)

Ruolo: Senior Full-Stack Developer e UX/UI Designer esperto in sistemi sanitari e GDPR. Progetto: Piattaforma "ComuniCARE" per servizi infermieristici a domicilio a Firenze.

1. Identità Visiva e UX:

Stile: Minimale, professionale, medicale.

Palette Colori: Blu Medicale (#0056b3), Celeste Chiaro (#E4F3F6) per sfondi e dettagli, Bianco puro.

Accessibilità: Ottimizzato per utenti senior (font grandi, bottoni chiari).

2. Architettura Legale e Sicurezza (GDPR):

Ruoli Utente: Implementa tramite Supabase Auth i ruoli "Paziente" e "Professionista".

Consensi Obbligatori: Inserisci nel form di registrazione checkbox obbligatorie per:

Accettazione Termini di Servizio.

Consenso al trattamento dei dati personali (GDPR).

Consenso specifico al trattamento dei dati sanitari (Dati Particolari).

Verifica Professionale: Gli infermieri devono poter caricare un documento d'identità e il certificato di iscrizione all'OPI. Questi file devono essere salvati in un bucket privato (Storage) e non essere accessibili pubblicamente.

Disclaimer Legale: Inserisci nel footer in modo visibile: "ComuniCARE è un fornitore di servizi tecnologici di intermediazione. La responsabilità della prestazione sanitaria è esclusivamente in capo al professionista abilitato."

3. Funzionalità Core:

Geolocalizzazione: Pagina di ricerca con mappa (Mapbox) centrata su Firenze. Calcola la distanza tra l'indirizzo salvato nel profilo paziente e quello del professionista.

Sistema di Prenotazione:

Infermiere: Dashboard con calendario per definire slot orari precisi.

Paziente: Selezione dello slot libero e conferma.

Pagamenti: Integrazione logica Stripe Connect (split dei pagamenti: tariffa professionista + commissione piattaforma).

4. Schema Database (Tabelle Supabase):

profiles: id, email, nome, cognome, ruolo (enum), tipo_professionista (default: infermiere), bio, foto_url, tariffa, indirizzo, lat, long, is_verified (default: false), numero_opi.

availability: id, id_professionista, inizio_slot, fine_slot, occupato (boolean).

bookings: id, id_paziente, id_professionista, id_slot, stato (in_attesa, confermato, completato), prezzo_totale.

legal_consents: id, id_utente, versione_privacy, data_accettazione (per audit legale).

5. Output Richiesto:

Genera la Homepage con la nuova palette #E4F3F6.

Crea le pagine "Termini e Condizioni" e "Privacy Policy" (testi segnaposto legali completi da far revisionare).

Crea il flusso di registrazione differenziato con caricamento documenti per l'infermiere. - togliere “Acconsento al trattamento dei dati sanitari (dati particolari ex Art. 9 GDPR) necessari per l'erogazione del servizio. * nella sezione Registrazione del professionista in Consensi obbligatori

- togliere pulsante del menù in alto a destra nella home
- in allegato ho lasciato titolo e logo ufficiale  deve essere ben visibile non piccola

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://comunicaresanita.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6d5089d8-5259-4870-a4e8-8fe8ec0a74b2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
