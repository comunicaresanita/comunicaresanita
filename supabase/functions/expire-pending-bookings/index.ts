import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { notifyBooking } from "../_shared/notify.ts";

// Da far partire ogni ora (cron). Le richieste ancora "pending" dopo 24 ore dalla creazione scadono:
// la prenotazione passa ad "annullata" con motivo "expired", lo slot torna libero e il paziente riceve un'email
// con il link per scegliere un altro orario o un altro professionista.
const DEADLINE_MS = 24 * 60 * 60 * 1000;

serve(async (req) => {
  const denied = authenticateCronRequest(req);
  if (denied) return denied;
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const cutoff = new Date(Date.now() - DEADLINE_MS).toISOString();

    const { data: list, error } = await admin.from("bookings").select("id")
      .eq("status", "pending").lt("created_at", cutoff).limit(200);
    if (error) throw error;

    let expired = 0, mailFailed = 0;
    for (const { id } of list ?? []) {
      // Aggiornamento condizionato: se nel frattempo il professionista ha risposto, non si tocca nulla.
      const { data: done, error: e } = await admin.from("bookings")
        .update({ status: "cancelled", cancel_reason: "expired", cancelled_at: new Date().toISOString() })
        .eq("id", id).eq("status", "pending").select("*");
      if (e) { console.error(`scadenza non applicata ${id}: ${e.message}`); continue; }
      if (!done?.length) continue;
      expired++;
      try {
        const b = done[0];
        const [{ data: patient }, { data: prof }] = await Promise.all([
          admin.from("profiles").select("*").eq("id", b.patient_id).single(),
          admin.from("profiles").select("*").eq("id", b.professional_id).single(),
        ]);
        await notifyBooking(admin, b, patient, prof, "expired");
      } catch (err) { mailFailed++; console.error(`email di scadenza non inviata ${id}: ${String(err)}`); }
    }
    return new Response(JSON.stringify({ expired, mailFailed }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
