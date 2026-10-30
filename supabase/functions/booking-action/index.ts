import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { esc, verifyAction } from "../_shared/bookingEmail.ts";
import { notifyBooking } from "../_shared/notify.ts";

// Conferma o rifiuto dal link nell'email (richiede verify_jwt = false, vedi config.toml).
// GET mostra una pagina con il pulsante, così gli antivirus che aprono i link non confermano da soli;
// POST esegue l'azione.
const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f4f7f8;font-family:Arial,Helvetica,sans-serif;color:#1a2b33"><div style="max-width:480px;margin:48px auto;padding:0 16px"><div style="background:#fff;border:1px solid #dbe5e8;border-radius:12px;padding:24px">
<p style="margin:0 0 12px;color:#00879a;font-weight:bold;font-size:18px">ComuniCARE</p><h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>${body}</div></div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );

serve(async (req) => {
  const secret = Deno.env.get("BOOKING_ACTION_SECRET");
  if (!secret) return page("Servizio non configurato", "<p>Riprova più tardi.</p>", 500);

  const u = new URL(req.url);
  const token = req.method === "POST" ? String((await req.formData()).get("t") ?? "") : u.searchParams.get("t") ?? "";
  const p = await verifyAction(secret, token);
  if (!p) return page("Link non valido o scaduto", "<p>Apri la tua dashboard su ComuniCARE per gestire la prenotazione.</p>", 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: b } = await admin.from("bookings").select("*").eq("id", p.bid).single();
  if (!b) return page("Prenotazione non trovata", "<p>Potrebbe essere stata eliminata.</p>", 404);
  const label = `${esc(b.service_name)}, ${esc(b.day)} ore ${esc(b.time_slot)}`;
  const verb = p.act === "confirm" ? "Conferma" : "Rifiuta";

  if (b.status !== "pending") {
    const stato = b.status === "confirmed" ? "già confermata" : "già annullata o rifiutata";
    return page("Nessuna azione necessaria", `<p>Questa prenotazione risulta ${stato}.<br>${label}</p>`);
  }

  if (req.method !== "POST") {
    return page(`${verb} la prenotazione?`, `<p>${label}</p>
<form method="POST" action="${esc(u.pathname)}"><input type="hidden" name="t" value="${esc(token)}">
<button type="submit" style="background:${p.act === "confirm" ? "#00879a" : "#8a3b3b"};color:#fff;border:0;border-radius:8px;padding:12px 20px;font-size:16px;font-weight:bold;cursor:pointer">${verb}</button></form>`);
  }

  const now = new Date().toISOString();
  const patch = p.act === "confirm"
    ? { status: "confirmed", responded_at: now }
    : { status: "cancelled", cancelled_by: "professional", cancelled_at: now, cancel_reason: "rejected", responded_at: now };
  const { data: done, error } = await admin.from("bookings").update(patch).eq("id", p.bid).eq("status", "pending").select("*");
  if (error || !done?.length) return page("Impossibile completare", "<p>La prenotazione non è più in attesa. Controlla la dashboard.</p>", 409);

  try {
    const [{ data: patient }, { data: prof }] = await Promise.all([
      admin.from("profiles").select("*").eq("id", b.patient_id).single(),
      admin.from("profiles").select("*").eq("id", b.professional_id).single(),
    ]);
    await notifyBooking(admin, done[0], patient, prof, p.act === "confirm" ? "confirmed" : "rejected");
  } catch (e) { console.error(e); }

  return page(p.act === "confirm" ? "Prenotazione confermata" : "Prenotazione rifiutata",
    `<p>${label}</p><p>${p.act === "confirm" ? "Il paziente riceverà la conferma via email e la prenotazione compare nella tua dashboard." : "L'orario è di nuovo libero e il paziente potrà sceglierne un altro."}</p>`);
});
