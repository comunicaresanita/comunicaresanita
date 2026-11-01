import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyAction } from "../_shared/bookingEmail.ts";
import { notifyBooking } from "../_shared/notify.ts";

// Conferma o rifiuto dal link nell'email (richiede verify_jwt = false, vedi config.toml).
// Supabase non serve pagine HTML dalle funzioni (le trasforma in testo), quindi qui si parla solo JSON:
// la pagina con il pulsante è nell'app, alla rotta /azione-prenotazione.
//   POST { t, execute: false }  -> descrive la prenotazione e se l'azione è ancora possibile
//   POST { t, execute: true }   -> esegue la conferma o il rifiuto
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const secret = Deno.env.get("BOOKING_ACTION_SECRET");
  if (!secret) return json({ state: "error", message: "Servizio non configurato" }, 500);

  let body: { t?: string; execute?: boolean } = {};
  try { body = await req.json(); } catch { /* corpo vuoto */ }
  const p = await verifyAction(secret, String(body.t ?? ""));
  if (!p) return json({ state: "invalid" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: b } = await admin.from("bookings").select("*").eq("id", p.bid).single();
  if (!b) return json({ state: "missing" }, 404);
  const info = { action: p.act, service: b.service_name, day: b.day, slot: b.time_slot, bid: b.id };

  if (p.act === "complete") {
    if (b.status === "completed") return json({ state: "already_completed", ...info });
    if (!["confirmed", "paid"].includes(b.status)) return json({ state: "already_closed", ...info });
    if (!body.execute) return json({ state: "ready", ...info });
    const { data: ok, error: e } = await admin.from("bookings")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", p.bid).in("status", ["confirmed", "paid"]).select("id");
    if (e) { console.error(e.message); return json({ state: "error", ...info }, 500); }
    if (!ok?.length) return json({ state: "already_closed", ...info }, 409);
    return json({ state: "completed", ...info });
  }

  if (b.status !== "pending") {
    return json({ state: b.status === "confirmed" ? "already_confirmed" : "already_closed", ...info });
  }
  if (!body.execute) return json({ state: "ready", ...info });

  const now = new Date().toISOString();
  const patch = p.act === "confirm"
    ? { status: "confirmed", responded_at: now }
    : { status: "cancelled", cancelled_by: "professional", cancelled_at: now, cancel_reason: "rejected", responded_at: now };
  const { data: done, error } = await admin.from("bookings").update(patch).eq("id", p.bid).eq("status", "pending").select("*");
  if (error) { console.error(error.message); return json({ state: "error", ...info }, 500); }
  if (!done?.length) return json({ state: "already_closed", ...info }, 409);

  let emailsOk = true;
  try {
    const [{ data: patient }, { data: prof }] = await Promise.all([
      admin.from("profiles").select("*").eq("id", b.patient_id).single(),
      admin.from("profiles").select("*").eq("id", b.professional_id).single(),
    ]);
    await notifyBooking(admin, done[0], patient, prof, p.act === "confirm" ? "confirmed" : "rejected");
  } catch (e) { console.error(e); emailsOk = false; }

  return json({ state: p.act === "confirm" ? "confirmed" : "rejected", emailsOk, ...info });
});
