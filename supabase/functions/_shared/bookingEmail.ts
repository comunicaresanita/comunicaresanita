// Helper puri (nessuna dipendenza da Deno) per le email di prenotazione: testabili con vitest.

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

export type EmailBooking = {
  id: string; service_name: string; price: number | string; day: string; time_slot: string;
  recipient_address?: string | null;
};

export const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** "Venerdì 30 Ottobre 2026" o "2026-10-30" -> {y, m (1-12), d} */
export function parseDay(day: string): { y: number; m: number; d: number } | null {
  const iso = day.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return { y: +iso[1], m: +iso[2], d: +iso[3] };
  const m = day.toLowerCase().match(/(\d{1,2})\s+([a-zà-ù]+)\s+(\d{4})/);
  if (!m) return null;
  const mi = MONTHS.indexOf(m[2]);
  return mi < 0 ? null : { y: +m[3], m: mi + 1, d: +m[1] };
}

const lastSunday = (y: number, month0: number) => {
  const d = new Date(Date.UTC(y, month0 + 1, 0));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.getUTCDate();
};

/** Offset di Europe/Rome rispetto a UTC, in ore, per un'ora locale (ora legale: ultima domenica di marzo -> ultima di ottobre, alle 01:00 UTC). */
export function romeOffsetHours(y: number, m: number, d: number, h: number): number {
  const start = Date.UTC(y, 2, lastSunday(y, 2), 1);
  const end = Date.UTC(y, 9, lastSunday(y, 9), 1);
  const utcIfWinter = Date.UTC(y, m - 1, d, h - 1);
  return utcIfWinter >= start && utcIfWinter < end ? 2 : 1;
}

/** Inizio e fine dell'appuntamento in UTC, dall'etichetta del giorno e dalla fascia ("17-18"). */
export function slotToUtc(day: string, slot: string): { start: Date; end: Date } | null {
  const dd = parseDay(day);
  const s = slot.match(/(\d{1,2})(?::\d{2})?\s*-\s*(\d{1,2})(?::\d{2})?/);
  if (!dd || !s) return null;
  const h1 = +s[1], h2 = +s[2];
  const off = romeOffsetHours(dd.y, dd.m, dd.d, h1);
  const start = new Date(Date.UTC(dd.y, dd.m - 1, dd.d, h1 - off));
  const end = new Date(Date.UTC(dd.y, dd.m - 1, dd.d, (h2 <= h1 ? h1 + 1 : h2) - off));
  return { start, end };
}

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export function buildIcs(b: EmailBooking, summary: string, description: string): string | null {
  const t = slotToUtc(b.day, b.time_slot);
  if (!t) return null;
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ComuniCARE//Prenotazioni//IT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.id}@comunicaresanita.it`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(t.start)}`,
    `DTEND:${stamp(t.end)}`,
    `SUMMARY:${icsText(summary)}`,
    `DESCRIPTION:${icsText(description)}`,
    ...(b.recipient_address ? [`LOCATION:${icsText(b.recipient_address)}`] : []),
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

export function googleCalendarUrl(b: EmailBooking, title: string, details: string): string | null {
  const t = slotToUtc(b.day, b.time_slot);
  if (!t) return null;
  const q = new URLSearchParams({
    action: "TEMPLATE", text: title, dates: `${stamp(t.start)}/${stamp(t.end)}`, details,
    ...(b.recipient_address ? { location: b.recipient_address } : {}),
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

// --- Token firmati per Conferma/Rifiuta dal link email ---
const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const hmac = async (secret: string, data: string) => {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
};

export type ActionPayload = { bid: string; act: "confirm" | "reject" | "complete"; exp: number };

export async function signAction(secret: string, p: ActionPayload): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(p)));
  return `${body}.${await hmac(secret, body)}`;
}

export async function verifyAction(secret: string, token: string, now = Date.now()): Promise<ActionPayload | null> {
  const [body, sig] = (token ?? "").split(".");
  if (!body || !sig) return null;
  const expected = await hmac(secret, body);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const p = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/"))) as ActionPayload;
    if (!p.bid || !["confirm", "reject", "complete"].includes(p.act) || typeof p.exp !== "number" || p.exp < now) return null;
    return p;
  } catch { return null; }
}

// --- Template email ---
const shell = (title: string, inner: string) => `<!doctype html><html lang="it"><body style="margin:0;background:#f4f7f8;font-family:Arial,Helvetica,sans-serif;color:#1a2b33">
<div style="max-width:560px;margin:0 auto;padding:24px 16px"><div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #dbe5e8">
<p style="margin:0 0 12px;color:#00879a;font-weight:bold;font-size:18px">ComuniCARE</p>
<h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>${inner}
<p style="margin:24px 0 0;font-size:12px;color:#6b7c85">Messaggio automatico di ComuniCARE. Per assistenza rispondi a questa email.</p></div></div></body></html>`;

const row = (k: string, v: string) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7c85;vertical-align:top">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`;
const btn = (href: string, label: string, color = "#00879a") =>
  `<a href="${esc(href)}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;margin:4px 8px 4px 0">${esc(label)}</a>`;

export type MailParts = { subject: string; html: string; text: string };

export function requestToProfessional(a: {
  b: EmailBooking; patientName: string; patientPhone: string; confirmUrl: string; rejectUrl: string; dashboardUrl: string;
}): MailParts {
  const { b } = a;
  const html = shell("Nuova richiesta di prenotazione", `
<p>Hai ricevuto una richiesta da confermare.</p>
<table style="font-size:15px;border-collapse:collapse">${row("Prestazione", b.service_name)}${row("Data", b.day)}${row("Orario", b.time_slot)}${row("Paziente", a.patientName)}${row("Telefono", a.patientPhone)}${row("Indirizzo", b.recipient_address ?? "—")}${row("Compenso", `€${b.price}`)}</table>
<p style="margin:20px 0 8px">Finché non rispondi, l'orario resta riservato.</p>
<p>${btn(a.confirmUrl, "Conferma")}${btn(a.rejectUrl, "Rifiuta", "#8a3b3b")}</p>
<p style="font-size:13px;color:#6b7c85">Gli altri dettagli (note di accesso, contatto di emergenza) sono nella tua <a href="${esc(a.dashboardUrl)}">dashboard</a>.</p>`);
  const text = `Nuova richiesta di prenotazione\n${b.service_name}\n${b.day} ore ${b.time_slot}\nPaziente: ${a.patientName} (${a.patientPhone})\nIndirizzo: ${b.recipient_address ?? "—"}\n\nConferma: ${a.confirmUrl}\nRifiuta: ${a.rejectUrl}\nDashboard: ${a.dashboardUrl}`;
  return { subject: `Nuova richiesta: ${b.service_name}, ${b.day} ore ${b.time_slot}`, html, text };
}

export function receivedByPatient(a: { b: EmailBooking; professionalName: string; storicoUrl: string }): MailParts {
  const { b } = a;
  const html = shell("Richiesta inviata", `
<p>Abbiamo inviato la tua richiesta a ${esc(a.professionalName)}. Riceverai un'email appena avrà risposto.</p>
<table style="font-size:15px;border-collapse:collapse">${row("Prestazione", b.service_name)}${row("Data", b.day)}${row("Orario", b.time_slot)}${row("Prezzo", `€${b.price}`)}</table>
<p style="margin-top:20px">${btn(a.storicoUrl, "Vedi le tue prenotazioni")}</p>`);
  return { subject: `Richiesta inviata: ${b.service_name}`, html, text: `Richiesta inviata a ${a.professionalName}.\n${b.service_name}, ${b.day} ore ${b.time_slot}.\nTi scriveremo appena risponde.\n${a.storicoUrl}` };
}

export function confirmedToPatient(a: { b: EmailBooking; professionalName: string; gcalUrl: string | null; storicoUrl: string }): MailParts {
  const { b } = a;
  const html = shell("Prenotazione confermata", `
<p>${esc(a.professionalName)} ha confermato la tua prenotazione.</p>
<table style="font-size:15px;border-collapse:collapse">${row("Prestazione", b.service_name)}${row("Data", b.day)}${row("Orario", b.time_slot)}${row("Prezzo", `€${b.price}`)}</table>
<p style="margin-top:20px">${a.gcalUrl ? btn(a.gcalUrl, "Aggiungi a Google Calendar") : ""}${btn(a.storicoUrl, "Le tue prenotazioni", "#4a6670")}</p>
<p style="font-size:13px;color:#6b7c85">In allegato trovi il file per aggiungerla a qualsiasi calendario.</p>`);
  return { subject: `Prenotazione confermata: ${b.day} ore ${b.time_slot}`, html, text: `Prenotazione confermata da ${a.professionalName}.\n${b.service_name}, ${b.day} ore ${b.time_slot}.\n${a.storicoUrl}` };
}

export function confirmedToProfessional(a: { b: EmailBooking; patientName: string; gcalUrl: string | null; dashboardUrl: string }): MailParts {
  const { b } = a;
  const html = shell("Hai confermato la prenotazione", `
<table style="font-size:15px;border-collapse:collapse">${row("Prestazione", b.service_name)}${row("Data", b.day)}${row("Orario", b.time_slot)}${row("Paziente", a.patientName)}${row("Indirizzo", b.recipient_address ?? "—")}</table>
<p style="margin-top:20px">${a.gcalUrl ? btn(a.gcalUrl, "Aggiungi a Google Calendar") : ""}${btn(a.dashboardUrl, "Apri la dashboard", "#4a6670")}</p>
<p style="font-size:13px;color:#6b7c85">In allegato il file per il tuo calendario personale.</p>`);
  return { subject: `Confermata: ${b.service_name}, ${b.day} ore ${b.time_slot}`, html, text: `Hai confermato: ${b.service_name}, ${b.day} ore ${b.time_slot}, paziente ${a.patientName}.\n${a.dashboardUrl}` };
}

export function rejectedToPatient(a: { b: EmailBooking; rebookUrl: string; searchUrl: string }): MailParts {
  const { b } = a;
  const html = shell("Prenotazione non confermata", `
<p>Il professionista non può effettuare questa prestazione nell'orario scelto (${esc(b.day)}, ore ${esc(b.time_slot)}). Puoi scegliere un altro orario o un altro professionista.</p>
<p>${btn(a.rebookUrl, "Scegli un altro orario")}${btn(a.searchUrl, "Cerca un altro professionista", "#4a6670")}</p>`);
  return { subject: "Prenotazione non confermata: scegli un altro orario", html, text: `Il professionista non può effettuare la prestazione (${b.service_name}, ${b.day} ore ${b.time_slot}).\nAltro orario: ${a.rebookUrl}\nAltro professionista: ${a.searchUrl}` };
}

export function cancelledNotice(a: { b: EmailBooking; by: "patient" | "professional"; to: "patient" | "professional"; storicoUrl: string }): MailParts {
  const { b } = a;
  const who = a.by === "patient" ? "dal paziente" : "dal professionista";
  const own = a.by === "patient" && a.to === "patient"; // ricevuta per chi ha annullato
  const html = shell(own ? "Hai annullato la prenotazione" : "Prenotazione annullata", `
<p>${own ? "Abbiamo registrato l'annullamento. L'orario è tornato disponibile." : `La prenotazione è stata annullata ${who}.`}</p>
<table style="font-size:15px;border-collapse:collapse">${row("Prestazione", b.service_name)}${row("Data", b.day)}${row("Orario", b.time_slot)}</table>
${a.to === "patient" ? `<p style="margin-top:20px">${btn(a.storicoUrl, "Prenota di nuovo")}</p>` : ""}`);
  return {
    subject: own ? `Hai annullato la prenotazione: ${b.day} ore ${b.time_slot}` : `Prenotazione annullata: ${b.day} ore ${b.time_slot}`,
    html,
    text: own ? `Hai annullato la prenotazione: ${b.service_name}, ${b.day} ore ${b.time_slot}.` : `Prenotazione annullata ${who}: ${b.service_name}, ${b.day} ore ${b.time_slot}.`,
  };
}

export function completionReminder(a: { b: EmailBooking; professionalName: string; doneUrl: string; storicoUrl: string }): MailParts {
  const { b } = a;
  const html = shell("La prestazione è stata effettuata?", `
<p>Oggi era prevista la tua prestazione con ${esc(a.professionalName)}.</p>
<table style="font-size:15px;border-collapse:collapse">${row("Prestazione", b.service_name)}${row("Data", b.day)}${row("Orario", b.time_slot)}</table>
<p style="margin-top:20px">${btn(a.doneUrl, "Prenotazione effettuata")}</p>
<p style="font-size:13px;color:#6b7c85">Dopo la conferma potrai lasciare una recensione. Se la prestazione non c'è stata, scrivici rispondendo a questa email o apri lo <a href="${esc(a.storicoUrl)}">storico</a>.</p>`);
  return {
    subject: `È andata bene? ${b.service_name}, ${b.day}`,
    html,
    text: `La prestazione con ${a.professionalName} è stata effettuata?\n${b.service_name}, ${b.day} ore ${b.time_slot}\nConferma: ${a.doneUrl}\nStorico: ${a.storicoUrl}`,
  };
}
