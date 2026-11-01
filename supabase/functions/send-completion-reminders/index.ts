import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { sendMail } from "../_shared/mailer.ts";
import { completionReminder, signAction, slotToUtc } from "../_shared/bookingEmail.ts";

// Da far partire ogni ora (cron). Per le prenotazioni confermate la cui prestazione è finita da almeno 1 ora
// (e da meno di 3 giorni) scrive al paziente "La prestazione è stata effettuata?" con il pulsante e l'invito a recensire.
const WAIT_MS = 60 * 60 * 1000;
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

serve(async (req) => {
  const denied = authenticateCronRequest(req);
  if (denied) return denied;
  try {
    const secret = Deno.env.get("BOOKING_ACTION_SECRET");
    if (!secret) throw new Error("BOOKING_ACTION_SECRET is not configured");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const appUrl = (Deno.env.get("APP_URL") ?? "https://comunicaresanita.lovable.app").replace(/\/$/, "");

    const { data: list, error } = await admin.from("bookings").select("*")
      .in("status", ["confirmed", "paid"]).is("reminder_sent_at", null);
    if (error) throw error;

    const now = Date.now();
    let sent = 0, failed = 0;
    for (const b of list ?? []) {
      const t = slotToUtc(b.day, b.time_slot);
      if (!t) continue;
      const since = now - t.end.getTime();
      if (since < WAIT_MS || since > MAX_AGE_MS) continue;

      const [{ data: patient }, { data: prof }] = await Promise.all([
        admin.from("profiles").select("*").eq("id", b.patient_id).single(),
        admin.from("profiles").select("first_name, last_name").eq("id", b.professional_id).single(),
      ]);
      let email = patient?.email ?? "";
      if (patient?.user_id) {
        const { data: au } = await admin.auth.admin.getUserById(patient.user_id);
        email = au?.user?.email || email;
      }
      if (!email) { console.error(`promemoria non inviato: ${b.id} senza email`); continue; }

      try {
        const token = await signAction(secret, { bid: b.id, act: "complete", exp: now + 14 * 24 * 3600 * 1000 });
        await sendMail({ to: email, ...completionReminder({
          b, professionalName: `${prof?.first_name ?? ""} ${prof?.last_name ?? ""}`.trim() || "il professionista",
          doneUrl: `${appUrl}/azione-prenotazione?t=${token}`, storicoUrl: `${appUrl}/storico-prestazioni`,
        }) });
        await admin.from("bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", b.id);
        sent++;
      } catch (e) { failed++; console.error(String(e)); }
    }
    return new Response(JSON.stringify({ sent, failed }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
