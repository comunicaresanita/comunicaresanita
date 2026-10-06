import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TELEGRAM_CHAT_ID = "-5497164506";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { bookingId } = await req.json();
    if (!bookingId || typeof bookingId !== "string") return json({ error: "Missing bookingId" }, 400);

    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: b, error } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
    if (error || !b) return json({ error: "Booking not found" }, 404);

    const [{ data: patient }, { data: prof }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", b.patient_id).single(),
      supabase.from("profiles").select("first_name, last_name, role").eq("id", b.professional_id).single(),
    ]);

    let email = patient?.email ?? "";
    if (patient?.user_id) {
      const { data: au } = await supabase.auth.admin.getUserById(patient.user_id);
      email = au?.user?.email || email;
    }

    const v = (x: unknown) => (x === null || x === undefined || x === "" ? "—" : String(x));
    const lines = [
      "🆕 NUOVA PRENOTAZIONE",
      "",
      `👤 Utente: ${v(patient?.first_name)} ${v(patient?.last_name)}`,
      `📧 Email: ${v(email)}`,
      `📞 Telefono: ${v(patient?.phone)}`,
      "",
      `🩺 Prestazione: ${v(b.service_name)}`,
      `👩‍⚕️ Professionista: ${v(prof?.first_name)} ${v(prof?.last_name)}`,
      `📅 Data: ${v(b.day)}  ⏰ Ora: ${v(b.time_slot)}`,
      `💶 Prezzo: €${v(b.price)}`,
      "",
      `Per: ${b.recipient_type === "other" ? `familiare/assistito (${v(b.recipient_first_name)} ${v(b.recipient_last_name)})` : "sé stesso"}`,
      `📍 Indirizzo: ${v(b.recipient_address)}`,
      `Condominio: ${b.lives_in_condominio ? "sì" : "no"} | Citofono: ${v(b.intercom_name)} | Piano: ${v(b.floor_number)}`,
      `Note accesso: ${v(b.access_notes)}`,
      `🚨 Contatto emergenza: ${v(b.emergency_contact_name)} ${v(b.emergency_contact_phone)}`,
      `📝 Note condizione: ${v(b.medical_notes)}`,
    ];
    const text = lines.join("\n");

    const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${encodeURIComponent(TELEGRAM_CHAT_ID)}&text=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const body = await res.text();
    if (!res.ok) {
      console.error(`Telegram error [${res.status}]: ${body}`);
      return json({ error: "Telegram request failed", status: res.status, details: body }, 502);
    }
    return json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(msg);
    return json({ error: msg }, 500);
  }
});
