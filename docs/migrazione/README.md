# Migrazione da Lovable Cloud a Supabase + Cloudflare

Regola d'oro: **Lovable Cloud resta acceso e invariato finché il nuovo sistema non ha superato tutte le verifiche.** Se qualcosa non va, non si passa e si lancia su Lovable.

Segreti e password (chiave del database, chiavi `service_role`, `secrets.env`) **non si incollano mai in chat**.

## A. Preparazione (in parallelo)
1. Nuovo progetto Supabase in regione UE. Salva la password del database nel gestore password.
2. Account Cloudflare (Workers & Pages) e accesso al pannello DNS di `comunicaresanita.it`.
3. Strumenti sul computer: Node.js, Supabase CLI (`npx supabase`), strumenti client PostgreSQL 16 o superiore (`pg_restore`, `psql`).
4. Chiave API Anthropic per l'assistente (oppure assistente spento).

## B. Blocco delle scritture e esportazione
1. Avvisa i tester: **da ora nessuna registrazione, prenotazione o modifica** fino alla fine del passaggio.
2. Lovable → Cloud → Overview → Advanced settings → Export project data → Database → Start export. Si può fare **una sola esportazione ogni 24 ore**. Arriva una email.
3. Cloud → Storage: scarica l'esportazione del database in una cartella protetta. Scarica anche tutti i file del bucket `profile-photos`.

## C. Nuovo database
1. Ripristina l'esportazione nel nuovo Supabase con `pg_restore`/`psql` (controlla il formato del file prima).
2. Verifica: tabelle e righe, utenti in `auth.users`, trigger e funzioni (`enforce_booking_insert`, `cancel_booking`, `respond_booking`, `complete_booking`, trigger sui profili).
3. Crea il bucket pubblico `profile-photos`, ricarica le foto, poi esegui `05-foto-profilo.sql`.
4. Esegui `04-cron.sql` (dopo aver impostato i segreti).

## D. Funzioni e segreti
1. `cp secrets.example.env secrets.env`, compila, poi `npx supabase secrets set --env-file docs/migrazione/secrets.env`.
2. `npx supabase login`, `npx supabase link --project-ref <REF>`, `npx supabase functions deploy`.

## E. Accesso e email
1. Authentication → URL Configuration: Site URL `https://comunicaresanita.it`, redirect `https://comunicaresanita.it/**` (e quello provvisorio di Cloudflare per la prova).
2. Authentication → SMTP: Resend (`smtp.resend.com`, porta 465, utente `resend`, password = chiave API), mittente `prenotazioni@comunicaresanita.it`.
3. Authentication → Email Templates: incolla i modelli in `email/` (oggetti: "Conferma la tua email", "Reimposta la password", "Conferma il nuovo indirizzo email").

## F. Sito su Cloudflare Pages
1. Collega il repository GitHub, ramo `main`. Comando di build `npm run build`, cartella `dist`. Versione Node 20 o superiore.
2. Variabili d'ambiente: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (chiave pubblica del nuovo progetto), `VITE_SUPABASE_PROJECT_ID`.
3. Prova tutto sull'indirizzo provvisorio `*.pages.dev` prima di toccare il dominio.

## G. Verifiche (tutte devono passare)
- Accesso con una **vecchia password** di un utente esistente.
- Nuova registrazione: arriva l'email di conferma in italiano e il link funziona.
- Reset password completo.
- Prenotazione completa: richiesta, email al professionista, conferma dal link, email al paziente, Telegram, Storico, prezzo corretto, annullamento. Prenotazione con meno di 24 ore rifiutata.
- Foto profilo visibili e caricamento di una nuova.
- /admin: accesso, verifica professionista, errore al sesto tentativo sbagliato.
- Assistente digitale risponde (o è spento senza errori).
- Contatti: messaggio inviato e arrivato.
- Cron: dopo l'ora piena, in `cron.job_run_details` esecuzioni riuscite e nei log delle funzioni `expire-pending-bookings` e `send-completion-reminders` senza errori.

## H. Passaggio del dominio
1. Cloudflare Pages → Custom domains: `comunicaresanita.it` (e `www`). Aggiorna i record DNS come indicato, **senza toccare** MX, SPF, DKIM e DMARC della posta.
2. Dopo la propagazione, ripeti le verifiche principali sul dominio vero.
3. Lascia Lovable Cloud acceso per almeno una settimana. Poi si può rimuovere.

## Rientro (se serve)
Finché il dominio punta ancora a Lovable (o torna a puntarci) e Lovable Cloud è acceso, nulla è perso. Dopo il passaggio, le scritture avvenute sul nuovo sistema non tornano su Lovable.
