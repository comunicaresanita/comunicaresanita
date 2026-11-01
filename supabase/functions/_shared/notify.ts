import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { sendMail, toBase64 } from "./mailer.ts";
import {
  buildIcs, cancelledNotice, confirmedToPatient, confirmedToProfessional, expiredToPatient, googleCalendarUrl,
  receivedByPatient, rejectedToPatient, requestToProfessional, signAction, type MailParts,
} from "./bookingEmail.ts";

export type BookingEvent = "created" | "confirmed" | "rejected" | "cancelled" | "expired";
const DAY = 24 * 3600 * 1000;

/** Invia le email dell'evento. Restituisce quante ne sono partite; lancia se qualcuna fallisce. */
export async function notifyBooking(admin: SupabaseClient, b: any, patient: any, prof: any, event: BookingEvent): Promise<number> {
  const emailOf = async (p: any) => {
    if (!p?.user_id) return p?.email ?? "";
    const { data } = await admin.auth.admin.getUserById(p.user_id);
    return data?.user?.email || p?.email || "";
  };
  const [patientEmail, profEmail] = await Promise.all([emailOf(patient), emailOf(prof)]);

  const appUrl = (Deno.env.get("APP_URL") ?? "https://comunicaresanita.it").replace(/\/$/, "");
  const secret = Deno.env.get("BOOKING_ACTION_SECRET");
  const patientName = `${patient?.first_name ?? ""} ${patient?.last_name ?? ""}`.trim() || "Paziente";
  const profName = `${prof?.first_name ?? ""} ${prof?.last_name ?? ""}`.trim() || "Il professionista";
  const storicoUrl = `${appUrl}/storico-prestazioni`;
  const dashboardUrl = `${appUrl}/dashboard-professionista`;
  const serviceQ = encodeURIComponent(b.service_name);

  // Invii in sequenza (non in parallelo) per restare sotto il limite di Resend; un errore non blocca gli altri.
  const queue: { to: string; m: MailParts; attachments?: { filename: string; content: string }[] }[] = [];
  const send = (to: string, m: MailParts, attachments?: { filename: string; content: string }[]) => {
    if (!to) console.error(`email non inviata: destinatario senza indirizzo (${m.subject})`);
    else queue.push({ to, m, attachments });
  };

  if (event === "created") {
    if (!secret) throw new Error("BOOKING_ACTION_SECRET is not configured");
    const exp = Date.now() + 7 * DAY;
    const [ct, rt] = await Promise.all([
      signAction(secret, { bid: b.id, act: "confirm", exp }),
      signAction(secret, { bid: b.id, act: "reject", exp }),
    ]);
    const who = b.recipient_type === "other" && b.recipient_first_name
      ? `${b.recipient_first_name} ${b.recipient_last_name ?? ""}`.trim() : patientName;
    send(profEmail, requestToProfessional({
      b, patientName: who, patientPhone: patient?.phone ?? "—",
      confirmUrl: `${appUrl}/azione-prenotazione?t=${ct}`, rejectUrl: `${appUrl}/azione-prenotazione?t=${rt}`, dashboardUrl,
    }));
    send(patientEmail, receivedByPatient({ b, professionalName: profName, storicoUrl }));
  } else if (event === "confirmed") {
    const title = `${b.service_name} · ComuniCARE`;
    const ics = (who: string) => {
      const s = buildIcs(b, title, `${b.service_name} con ${who}. Gestisci la prenotazione su ${appUrl}`);
      return s ? [{ filename: "prenotazione.ics", content: toBase64(s) }] : undefined;
    };
    send(patientEmail, confirmedToPatient({
      b, professionalName: profName, storicoUrl, gcalUrl: googleCalendarUrl(b, title, `Con ${profName}`),
    }), ics(profName));
    send(profEmail, confirmedToProfessional({
      b, patientName, dashboardUrl, gcalUrl: googleCalendarUrl(b, title, `Paziente: ${patientName}`),
    }), ics(patientName));
  } else if (event === "rejected") {
    send(patientEmail, rejectedToPatient({
      b,
      rebookUrl: `${appUrl}/profilo-infermiere/${b.professional_id}?servizio=${serviceQ}&per=${b.recipient_type === "other" ? "other" : "self"}&ripeti=${b.id}`,
      searchUrl: `${appUrl}/dashboard-paziente?servizio=${serviceQ}`,
    }));
  } else if (event === "expired") {
    send(patientEmail, expiredToPatient({
      b, professionalName: profName,
      rebookUrl: `${appUrl}/profilo-infermiere/${b.professional_id}?servizio=${serviceQ}&per=${b.recipient_type === "other" ? "other" : "self"}&ripeti=${b.id}`,
      searchUrl: `${appUrl}/dashboard-paziente?servizio=${serviceQ}`,
    }));
  } else {
    const by = b.cancelled_by === "patient" ? "patient" : "professional";
    if (by === "patient") {
      send(profEmail, cancelledNotice({ b, by, to: "professional", storicoUrl }));
      send(patientEmail, cancelledNotice({ b, by, to: "patient", storicoUrl })); // ricevuta per chi annulla
    } else {
      send(patientEmail, cancelledNotice({ b, by, to: "patient", storicoUrl }));
    }
  }

  let sent = 0;
  const errors: string[] = [];
  for (const j of queue) {
    try { await sendMail({ to: j.to, ...j.m, attachments: j.attachments }); sent++; }
    catch (e) { errors.push(String(e)); console.error(String(e)); }
  }
  if (errors.length) throw new Error(`Invio email non riuscito (${errors.length}/${queue.length}): ${errors.join(" | ")}`);
  return sent;
}
