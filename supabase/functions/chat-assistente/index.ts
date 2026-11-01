import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERVIZI_INFERMIERISTICI = [
  "Aerosolterapia",
  "Applicazione di terapia topica: creme, pomate o gel medicati (prescrizione medica)",
  "Applicazione o sostituzione di cerotto medicato transdermico",
  "Bendaggio compressivo",
  "Bendaggio compressivo multistrato",
  "Bendaggio elastocompressivo degli arti inferiori",
  "Bendaggio semplice",
  "Cateterismo vescicale intermittente per svuotamento della vescica",
  "Clisma evacuativo mediante dispositivo tipo clisma-sac/enteroclisma",
  "Clistere evacuativo con sonda rettale",
  "Clistere evacuativo senza sonda rettale",
  "Controllo infermieristico combinato: glicemia capillare e rilevazione completa dei parametri vitali",
  "Educazione e addestramento del caregiver alla gestione del sondino nasogastrico",
  "Educazione e addestramento del caregiver alla gestione della PEG",
  "Gestione del sondino nasogastrico con somministrazione della nutrizione enterale (prescrizione medica)",
  "Gestione della PEG con somministrazione della nutrizione enterale (prescrizione medica)",
  "Gestione della colostomia",
  "Gestione della nefrostomia",
  "Gestione della nutrizione parenterale (prescrizione medica)",
  "Gestione della terapia infusionale tramite pompa",
  "Gestione della tracheostomia",
  "Gestione dell’ileostomia",
  "Gestione dell’urostomia",
  "Infusione endovenosa con accesso venoso già presente",
  "Infusione endovenosa con posizionamento dell'accesso incluso",
  "Infusione sottocutanea (ipodermoclisi)",
  "Instillazione di colliri o altri preparati oftalmici (prescrizione medica)",
  "Lavaggio vaginale (prescrizione medica)",
  "Prima valutazione infermieristica domiciliare",
  "Medicazione del Midline",
  "Medicazione del PICC",
  "Medicazione del Port-a-Cath",
  "Medicazione del catetere venoso centrale (CVC)",
  "Medicazione del sito PEG e cura della cute peristomale lesionata",
  "Medicazione della lesione da pressione, stadio 2",
  "Medicazione della lesione da pressione, stadio 3",
  "Medicazione della lesione da pressione, stadio 4",
  "Medicazione di ferita chirurgica complessa",
  "Medicazione di ferita chirurgica semplice",
  "Medicazione di ferita traumatica complessa",
  "Medicazione di ferita traumatica profonda",
  "Medicazione di ferita traumatica superficiale",
  "Misurazione della glicemia capillare",
  "Posizionamento o sostituzione di catetere vescicale maschile o femminile",
  "Preparazione settimanale della terapia orale",
  "Rilevazione completa dei parametri vitali",
  "Rimozione di graffette metalliche",
  "Rimozione di punti di sutura cutanea con filo",
  "Somministrazione di eparina a basso peso molecolare",
  "Somministrazione di farmaci per via rettale: supposte o preparati (prescrizione medica)",
  "Somministrazione di farmaci tramite PEG",
  "Somministrazione di farmaci tramite sondino nasogastrico",
  "Somministrazione di gocce auricolari",
  "Somministrazione di gocce nasali",
  "Somministrazione di insulina per via sottocutanea",
  "Somministrazione di microclisma medicato (prescrizione medica)",
  "Somministrazione di terapia mediante inalatore (prescrizione medica)",
  "Somministrazione di terapia intramuscolare",
  "Somministrazione di terapia sottocutanea",
  "Somministrazione di terapia sublinguale/orale (prescrizione medica)",
  "Somministrazione di terapia tramite PICC o Midline",
  "Somministrazione di terapia tramite catetere venoso centrale (CVC)",
  "Somministrazione di terapia vaginale: ovuli, compresse o creme vaginali (prescrizione medica)",
  "Valutazione e protezione cutanea nella lesione da pressione, stadio 1",
];

const SERVIZI_FISIOTERAPIA = [
  "Elettrostimolazione neuromuscolare",
  "Esercizio terapeutico personalizzato",
  "Ginnastica dolce per anziani",
  "Ginnastica posturale a domicilio",
  "Kinesio taping",
  "Laserterapia",
  "Laserterapia Nd YAG",
  "Linfodrenaggio manuale",
  "Massoterapia decontratturante",
  "Onde d’urto radiali",
  "Riabilitazione del pavimento pelvico",
  "Riabilitazione neurologica",
  "Riabilitazione post frattura",
  "Riabilitazione post operatoria",
  "Riabilitazione respiratoria",
  "Riabilitazione sportiva",
  "Tecarterapia",
  "Trattamento fisioterapico di cervicalgia o lombalgia",
  "Ultrasuonoterapia",
  "Valutazione ecografica funzionale RUSI",
  "Valutazione fisioterapica iniziale",
];

const SERVIZI_OSS = [
  "Aiuto nell’alzata e trasferimento da letto a poltrona o carrozzina",
  "Assistenza al pasto e idratazione",
  "Assistenza alla deambulazione",
  "Assistenza diurna alla persona e sollievo al caregiver",
  "Assistenza notturna alla persona",
  "Compagnia, socializzazione e attività ricreative",
  "Igiene intima e cambio pannolone con vestizione e sistemazione",
  "Bagno completo in doccia, vasca o a letto",
  "Mobilizzazione e cambio postura a letto",
  "Preparazione pasti a domicilio",
  "Presenza e sorveglianza notturna",
  "Routine del mattino con igiene alzata e colazione",
  "Routine della sera con cena igiene e preparazione al riposo",
];

// Limite di richieste per indirizzo IP (best effort: la memoria si azzera quando la funzione si riavvia)
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 30;
const tooMany = (ip: string) => {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return recent.length > MAX_HITS;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    if (tooMany(ip)) {
      return new Response(JSON.stringify({ reply: "Troppi messaggi inviati. Attendi qualche minuto e riprova." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const body = await req.json();
    const { recipient } = body;
    if (!body.messages || !Array.isArray(body.messages)) throw new Error("Invalid messages");
    // Sicurezza: solo ruoli "user" e "assistant", testo breve, ultimi 12 messaggi.
    // Un chiamante non può inserire istruzioni di sistema né ruoli diversi.
    const messages = body.messages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 1500) }));
    if (messages.length === 0 || messages[messages.length - 1].role !== "user") throw new Error("Invalid messages");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch professionals and their services from the database in real-time
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { data: professionals } = await sb
      .from("profiles")
      .select("id, first_name, last_name, professional_type, zona, bio, lat, lng, service_radius_km, service_area")
      .eq("role", "professionista");

    const { data: allServices } = await sb
      .from("services")
      .select("professional_id, name, price");

    // Resolve the recipient's position (self or family member)
    let refLat: number | null = typeof recipient?.lat === "number" ? recipient.lat : null;
    let refLng: number | null = typeof recipient?.lng === "number" ? recipient.lng : null;
    const refAddress = typeof recipient?.address === "string" ? recipient.address.slice(0, 200) : "";
    if ((refLat === null || refLng === null) && refAddress) {
      try {
        const g = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(refAddress)}&limit=1&lang=it`);
        const gj = await g.json();
        const c = gj?.features?.[0]?.geometry?.coordinates;
        if (c) { refLng = c[0]; refLat = c[1]; }
      } catch { /* ignore */ }
    }
    const km = (lat?: number | null, lng?: number | null) => {
      if (refLat === null || refLng === null || lat == null || lng == null) return null;
      const R = 6371, dLat = (lat - refLat) * Math.PI / 180, dLng = (lng - refLng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(refLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };
    const sortedProfs = (professionals || [])
      .map(p => ({ ...p, dist: km(p.lat, p.lng) }))
      .filter((p: any) => {
        if (refLat === null || refLng === null) return true;
        // A drawn zone replaces the range; otherwise only the chosen radius (default 10 km) counts.
        const area = p.service_area;
        if (!Array.isArray(area) || area.length < 3) {
          const radius = typeof p.service_radius_km === "number" && p.service_radius_km > 0 ? p.service_radius_km : 10;
          return p.dist === null || p.dist <= radius;
        }
        let inside = false;
        for (let i = 0, j = area.length - 1; i < area.length; j = i++) {
          const [yi, xi] = area[i], [yj, xj] = area[j];
          if ((yi > refLat) !== (yj > refLat) && refLng < ((xj - xi) * (refLat - yi)) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
      })
      .sort((a, b) => (a.dist ?? 1e9) - (b.dist ?? 1e9));
    const recipientLabel = recipient?.type === "other" ? "un familiare / assistito dell'utente" : "l'utente stesso";

    // Build a directory of professionals with their services
    let professionalsDirectory = "";
    if (professionals && professionals.length > 0) {
      professionalsDirectory = "\n\n**Professionisti attualmente disponibili sulla piattaforma:**\n";
      for (const prof of sortedProfs) {
        const profServices = allServices?.filter(s => s.professional_id === prof.id) || [];
        const typeLabel = prof.professional_type === "infermiere" ? "Infermiere" 
          : prof.professional_type === "fisioterapista" ? "Fisioterapista" 
          : prof.professional_type === "oss" ? "OSS" : prof.professional_type || "N/D";
        
        professionalsDirectory += `\n- **${prof.first_name} ${prof.last_name}** (${typeLabel})`;
        if (prof.zona) professionalsDirectory += ` — Zona: ${prof.zona}`;
        if (prof.dist !== null) professionalsDirectory += ` — Distanza: ${prof.dist.toFixed(1)} km`;
        if (profServices.length > 0) {
          professionalsDirectory += `\n  Servizi: ${profServices.map(s => `${s.name} (€${s.price})`).join(", ")}`;
        }
      }
    }

    const systemPrompt = `Sei un assistente sanitario virtuale per una piattaforma italiana che mette in contatto utenti con professionisti sanitari a domicilio (infermieri, fisioterapisti, OSS).

Il tuo compito è aiutare gli utenti a capire quale prestazione sanitaria fa al caso loro, basandoti sui sintomi o necessità che descrivono. Puoi anche consigliare un professionista specifico tra quelli disponibili.

Le prestazioni disponibili sulla piattaforma sono:

**Servizi Infermieristici:**
${SERVIZI_INFERMIERISTICI.map(p => `- ${p}`).join("\n")}

**Servizi di Fisioterapia:**
${SERVIZI_FISIOTERAPIA.map(p => `- ${p}`).join("\n")}

**Servizi OSS (Operatore Socio-Sanitario):**
${SERVIZI_OSS.map(p => `- ${p}`).join("\n")}
${professionalsDirectory}

La prestazione è per ${recipientLabel}. ${refLat !== null ? "I professionisti sono ordinati dal più vicino alla persona che riceverà la prestazione." : "La posizione della persona non è nota."}

Regole:
- Dopo aver individuato la prestazione adatta, consiglia 1-3 professionisti tra i più vicini che offrono quella prestazione (o del tipo giusto), indicando la distanza in km se nota
- Riferisciti alla persona giusta (l'utente o il suo familiare/assistito)
- Rispondi SEMPRE in italiano
- Sii empatico, chiaro e conciso (max 3-4 frasi per risposta)
- NON fare diagnosi mediche
- Suggerisci la prestazione più adatta tra quelle disponibili, specificando se è un servizio infermieristico, fisioterapico o OSS
- IMPORTANTE: Quando menzioni una prestazione specifica, mettila SEMPRE tra doppi asterischi, es: **Somministrazione di terapia intramuscolare**. Quando menzioni un professionista per nome e cognome, mettilo SEMPRE tra doppi asterischi, es: **Mario Rossi**. Questo rende il testo cliccabile per l'utente.
- Se l'utente chiede di un professionista specifico, cerca tra quelli disponibili e fornisci le informazioni
- Se non sei sicuro, chiedi dettagli
- Se il caso richiede urgenza medica, consiglia di chiamare il 118 o recarsi al pronto soccorso
- Non inventare prestazioni che non sono nella lista
- Puoi suggerire di cercare un professionista per nome nella barra di ricerca della piattaforma`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ reply: "Troppi messaggi inviati. Attendi qualche secondo e riprova." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Non sono riuscito a elaborare una risposta.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg, reply: "Si è verificato un errore. Riprova." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
