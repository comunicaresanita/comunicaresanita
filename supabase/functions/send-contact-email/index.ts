import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { validateContact } from "./validation.ts";

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 20000) return json({ error: "Messaggio troppo lungo" }, 400);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return json({ error: "Richiesta non valida" }, 400); }
    const contact = validateContact(body);
    if (!contact) return json({ error: "Controlla nome, email e messaggio" }, 400);
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Servizio temporaneamente non disponibile" }, 503);
    const db = createClient(url, key);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}:${contact.email.toLowerCase()}`));
    const fingerprint = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    const { count, error: countError } = await db.from("contact_submissions")
      .select("id", { count: "exact", head: true }).eq("request_fingerprint", fingerprint)
      .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());
    if (countError) throw new Error("contact_rate_limit_unavailable");
    if ((count ?? 0) >= 5) return json({ error: "Troppi messaggi. Riprova tra 15 minuti." }, 429);
    const { data, error } = await db.from("contact_submissions")
      .insert({ ...contact, request_fingerprint: fingerprint }).select("id").single();
    if (error || !data) throw new Error("contact_save_failed");
    // No sender domain is configured. The team reads saved messages in its admin page.
    // Do not claim email delivery or silently discard submissions.
    return json({ success: true, submissionId: data.id, emailSent: false });
  } catch {
    console.error("Contact submission could not be saved");
    return json({ error: "Impossibile ricevere il messaggio. Riprova più tardi." }, 500);
  }
});
