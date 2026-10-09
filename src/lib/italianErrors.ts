/** Never expose external error text: codes/patterns select curated Italian messages. */
export type ErrorContext = "general" | "registration" | "login" | "recovery" | "password" | "booking" | "profile" | "upload" | "deletion" | "services" | "location" | "admin" | "payment";

const fallback: Record<ErrorContext, string> = {
  general: "Si è verificato un errore. Riprova tra poco.",
  registration: "Non è stato possibile completare la registrazione. Riprova tra poco.",
  login: "Non è stato possibile accedere. Riprova tra poco.",
  recovery: "Non è stato possibile inviare il link di recupero. Riprova tra poco.",
  password: "Non è stato possibile aggiornare la password. Riprova tra poco.",
  booking: "Non è stato possibile completare la prenotazione. Riprova tra poco o contattaci.",
  profile: "Non è stato possibile salvare il profilo. Riprova tra poco.",
  upload: "Non è stato possibile caricare la foto. Riprova con un'immagine diversa.",
  deletion: "Non è stato possibile eliminare l'account. Riprova tra poco o contattaci.",
  services: "Non è stato possibile salvare i servizi. Riprova tra poco.",
  location: "Non è stato possibile salvare la posizione. Riprova tra poco.",
  admin: "Accesso non riuscito. Verifica la password e riprova.",
  payment: "Non è stato possibile completare il pagamento. Riprova o contattaci.",
};

export function italianError(error: unknown, context: ErrorContext = "general"): string {
  const details = typeof error === "object" && error !== null ? error as { code?: unknown; message?: unknown; status?: unknown; statusCode?: unknown } : {};
  const code = typeof details.code === "string" ? details.code.toLowerCase() : "";
  const message = (typeof error === "string" ? error : typeof details.message === "string" ? details.message : "").toLowerCase();
  const text = `${code} ${message}`;
  const status = Number(details.status ?? details.statusCode);

  if (/invalid_credentials|invalid login credentials|invalid_grant/.test(text)) return "Email o password non corrette. Controlla i dati e riprova.";
  if (/user_already_exists|email_exists|already registered|already been registered|already exists/.test(text) && context === "registration") return "Questa email è già associata a un account. Accedi oppure recupera la password.";
  if (/weak_password|password.*(leaked|pwned|breach|compromised)/.test(text)) return "La password scelta non è abbastanza sicura. Scegli una password diversa e più sicura.";
  if (/same_password|same as the old|different from the old/.test(text)) return "La nuova password deve essere diversa da quella attuale.";
  if (/password.*(at least|too short|minimum)/.test(text)) {
    const minimum = message.match(/(?:at least|minimum(?: of)?)\s+(\d+)/)?.[1];
    return minimum ? `La password deve contenere almeno ${minimum} caratteri.` : "La password è troppo corta. Scegli una password più lunga.";
  }
  if (/email_not_confirmed|email not confirmed/.test(text)) return "Devi confermare la tua email prima di accedere. Controlla la tua casella di posta.";
  if (/email_address_invalid|email address.*invalid|invalid email/.test(text)) return "Inserisci un indirizzo email valido.";
  if (/email_address_not_authorized|email.*not authorized|email.*not allowed/.test(text)) return "Non è possibile utilizzare questo indirizzo email. Prova con un altro indirizzo.";
  if (status === 429 || /rate_limit|rate limit|too many requests|over_.*limit|security purposes.*seconds/.test(text)) return "Hai effettuato troppi tentativi ravvicinati. Attendi qualche minuto e riprova.";
  if (/signup_disabled|signups? (?:are |not )?allowed|signups? disabled/.test(text)) return "Le nuove registrazioni non sono disponibili al momento. Riprova più tardi o contattaci.";
  if (/otp_expired|token.*expired|link.*expired/.test(text)) return "Il link è scaduto o non è più valido. Richiedi un nuovo link e riprova.";
  if (/session_not_found|refresh_token|jwt expired|not authenticated|unauthorized/.test(text) || status === 401) return context === "admin" ? fallback.admin : "La sessione è scaduta. Accedi di nuovo e riprova.";
  if (/failed to fetch|fetch failed|network|networkerror|timeout|timed out|load failed/.test(text)) return "Non è stato possibile connettersi. Controlla la connessione e riprova.";
  if (context === "upload" && (status === 413 || /too large|exceeded.*size|size.*limit/.test(text))) return "La foto è troppo grande. Scegli un'immagine più piccola e riprova.";
  if (context === "upload" && /mime|content.type|file type|unsupported/.test(text)) return "Il formato della foto non è supportato. Scegli un'immagine JPEG o PNG.";
  if (/row.level security|permission denied|42501|forbidden/.test(text) || status === 403) return "Non hai i permessi necessari per questa operazione. Accedi con l'account corretto o contattaci.";
  if (context === "payment" && /card_declined|card was declined/.test(text)) return "Il pagamento è stato rifiutato. Prova con un altro metodo di pagamento.";
  if (context === "payment" && /insufficient_funds/.test(text)) return "Il pagamento non è riuscito per fondi insufficienti. Prova con un altro metodo di pagamento.";
  return fallback[context];
}