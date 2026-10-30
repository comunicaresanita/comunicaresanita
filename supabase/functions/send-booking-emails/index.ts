import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { notifyBooking, type BookingEvent } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorizzato" }, 401);
    const { bookingId, event } = await req.json();
    if (typeof bookingId !== "string" || !["created", "confirmed", "rejected", "cancelled"].includes(event)) {
      return json({ error: "Richiesta non valida" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Sessione scaduta" }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: b } = await admin.from("bookings").select("*").eq("id", bookingId).single();
    if (!b) return json({ error: "Prenotazione non trovata" }, 404);
    const [{ data: patient }, { data: prof }] = await Promise.all([
      admin.from("profiles").select("*").eq("id", b.patient_id).single(),
      admin.from("profiles").select("*").eq("id", b.professional_id).single(),
    ]);

    // Solo le due parti della prenotazione possono far partire le email
    const isPatient = patient?.user_id === user.id;
    const isProfessional = prof?.user_id === user.id;
    if (!isPatient && !isProfessional) return json({ error: "Non autorizzato" }, 403);

    // E solo se lo stato nel database corrisponde all'evento dichiarato
    const ok =
      (event === "created" && b.status === "pending" && isPatient) ||
      (event === "confirmed" && b.status === "confirmed" && isProfessional) ||
      (event === "rejected" && b.status === "cancelled" && b.cancel_reason === "rejected" && isProfessional) ||
      (event === "cancelled" && b.status === "cancelled" && b.cancel_reason !== "rejected");
    if (!ok) return json({ error: "Stato non coerente con l'evento" }, 409);

    const sent = await notifyBooking(admin, b, patient, prof, event as BookingEvent);
    return json({ success: true, sent });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(msg);
    return json({ error: msg }, 500);
  }
});
