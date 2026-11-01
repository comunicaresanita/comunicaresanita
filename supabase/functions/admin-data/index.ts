import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AdminRequest = {
  password?: string;
  action?: "delete" | "deleteBooking" | "setVerified";
  userId?: string;
  bookingId?: string;
  verified?: boolean;
};

const ADMIN_EMAIL = "msm446@gmail.com";

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Limite ai tentativi sbagliati: massimo 5 per IP e 30 in totale ogni 15 minuti. I tentativi sono nella tabella
// admin_access_log (non in memoria), quindi il limite regge anche se la funzione si riavvia.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_PER_IP = 5;
const MAX_FAILED_TOTAL = 30;

const clientIp = (req: Request) =>
  (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim().slice(0, 64) || "unknown";

// Confronto a tempo costante (si confrontano gli hash, che hanno sempre la stessa lunghezza)
const sha256 = async (v: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)));
const safeEqual = async (a: string, b: string) => {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
};

const ensureNoError = (error: { message: string } | null, message: string) => {
  if (error) {
    throw new Error(`${message}: ${error.message}`);
  }
};

const deleteUserEverywhere = async (supabase: ReturnType<typeof createClient>, userId: string) => {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  ensureNoError(profileError, "Impossibile leggere il profilo utente");

  if (profile) {
    ensureNoError(
      (await supabase.from("reviews").delete().or(`patient_id.eq.${profile.id},professional_id.eq.${profile.id}`)).error,
      "Impossibile eliminare le recensioni collegate"
    );

    ensureNoError(
      (await supabase.from("bookings").delete().or(`patient_id.eq.${profile.id},professional_id.eq.${profile.id}`)).error,
      "Impossibile eliminare le prenotazioni collegate"
    );

    ensureNoError(
      (await supabase.from("services").delete().eq("professional_id", profile.id)).error,
      "Impossibile eliminare i servizi collegati"
    );

    ensureNoError(
      (await supabase.from("availability").delete().eq("professional_id", profile.id)).error,
      "Impossibile eliminare le disponibilità settimanali"
    );

    ensureNoError(
      (await supabase.from("availability_overrides").delete().eq("professional_id", profile.id)).error,
      "Impossibile eliminare le eccezioni di disponibilità"
    );

    const storage = supabase.storage.from("profile-photos");
    const { data: files, error: listFilesError } = await storage.list(userId);
    ensureNoError(listFilesError, "Impossibile leggere le foto profilo");

    if (files && files.length > 0) {
      ensureNoError(
        (await storage.remove(files.map((file) => `${userId}/${file.name}`))).error,
        "Impossibile eliminare le foto profilo"
      );
    }

    ensureNoError(
      (await supabase.from("profiles").delete().eq("user_id", userId)).error,
      "Impossibile eliminare il profilo"
    );
  }

  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId, false);
  ensureNoError(deleteAuthError, "Impossibile eliminare le credenziali utente");

  const { data: deletedProfileCheck, error: deletedProfileCheckError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  ensureNoError(deletedProfileCheckError, "Impossibile verificare l'eliminazione del profilo");

  if (deletedProfileCheck) {
    throw new Error("Eliminazione incompleta: il profilo risulta ancora presente nel database");
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { password, action, userId, bookingId, verified }: AdminRequest = await req.json();
    const adminPassword = Deno.env.get("ADMIN_PASSWORD");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const ip = clientIp(req);

    // Il registro non deve mai bloccare l'admin se la tabella non c'è ancora: in caso di errore si va avanti e si segnala nei log.
    const logAccess = async (act: string, success: boolean, detail?: string) => {
      try {
        const { error } = await supabase.from("admin_access_log").insert({ ip, action: act, success, detail: detail?.slice(0, 200) ?? null });
        if (error) console.error(`registro accessi: ${error.message}`);
      } catch (e) { console.error(`registro accessi: ${String(e)}`); }
    };
    const failedSince = async (byIp: boolean) => {
      try {
        let q = supabase.from("admin_access_log").select("id", { count: "exact", head: true })
          .eq("success", false).gte("created_at", new Date(Date.now() - WINDOW_MS).toISOString());
        if (byIp) q = q.eq("ip", ip);
        const { count, error } = await q;
        if (error) { console.error(`limite tentativi: ${error.message}`); return 0; }
        return count ?? 0;
      } catch (e) { console.error(`limite tentativi: ${String(e)}`); return 0; }
    };

    if ((await failedSince(true)) >= MAX_FAILED_PER_IP || (await failedSince(false)) >= MAX_FAILED_TOTAL) {
      return jsonResponse({ error: "Troppi tentativi. Riprova tra 15 minuti." }, 429);
    }

    const act = action ?? "login";
    if (!adminPassword || typeof password !== "string" || !(await safeEqual(password, adminPassword))) {
      await logAccess(act, false);
      return jsonResponse({ error: "Password non valida" }, 401);
    }
    await logAccess(act, true, action === "delete" ? userId : action === "deleteBooking" ? bookingId : action === "setVerified" ? `${userId} -> ${verified}` : undefined);

    if (action === "deleteBooking") {
      if (!bookingId) return jsonResponse({ error: "Prenotazione non specificata" }, 400);
      ensureNoError((await supabase.from("reviews").delete().eq("booking_id", bookingId)).error, "Impossibile eliminare le recensioni collegate");
      ensureNoError((await supabase.from("bookings").delete().eq("id", bookingId)).error, "Impossibile eliminare la prenotazione");
      return jsonResponse({ success: true });
    }

    if (action === "setVerified") {
      if (!userId || typeof verified !== "boolean") return jsonResponse({ error: "Richiesta non valida" }, 400);
      const { data: done, error } = await supabase.from("profiles").update({ verified })
        .eq("user_id", userId).eq("role", "professionista").select("id");
      if (error) return jsonResponse({ error: error.message }, 500);
      if (!done?.length) return jsonResponse({ error: "Professionista non trovato" }, 404);
      return jsonResponse({ success: true, verified });
    }

    if (action === "delete") {
      if (!userId) {
        return jsonResponse({ error: "Utente non specificato" }, 400);
      }

      await deleteUserEverywhere(supabase, userId);
      return jsonResponse({ success: true });
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    const { data: contacts, error: contactsError } = await supabase
      .from("contact_submissions")
      .select("id, created_at, nome, email, messaggio")
      .order("created_at", { ascending: false })
      .limit(100);
    if (contactsError) return jsonResponse({ error: "Impossibile leggere i messaggi di contatto" }, 500);

    const { data: bookingRows, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, created_at, service_name, price, day, time_slot, status, patient_id, professional_id")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (bookingsError) return jsonResponse({ error: "Impossibile leggere le prenotazioni" }, 500);
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const bookings = (bookingRows ?? []).map((b: any) => {
      const pat: any = byId.get(b.patient_id);
      const pro: any = byId.get(b.professional_id);
      return {
        id: b.id, created_at: b.created_at, service_name: b.service_name, price: b.price,
        day: b.day, time_slot: b.time_slot, status: b.status,
        patient_first_name: pat?.first_name ?? null, patient_last_name: pat?.last_name ?? null, patient_email: pat?.email ?? null,
        professional_first_name: pro?.first_name ?? null, professional_last_name: pro?.last_name ?? null,
        professional_type: pro?.professional_type ?? null,
      };
    });
    return jsonResponse({ profiles, contacts, bookings });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Errore sconosciuto";
    return jsonResponse({ error: errorMessage }, 500);
  }
});
