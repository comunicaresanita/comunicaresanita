import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Photon (OpenStreetMap data by Komoot) — free, no API key. Nominatim blocks server IPs.
const PHOTON = "https://photon.komoot.io/api/";
const ITALY_BBOX = "6.6,35.4,18.6,47.1";
const UA = "ComuniCARE/1.0 (https://comunicaresanita.it)";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

type Comp = { street: string; streetNumber: string; cap: string; city: string; province: string };

const comps = (p: any): Comp => ({
  street: p?.type === "street" ? p?.name || "" : p?.street || "",
  streetNumber: p?.housenumber || "",
  cap: p?.postcode || "",
  city: p?.city || p?.locality || p?.district || p?.county || "",
  province: p?.county || p?.state || "",
});

const describe = (c: Comp, p: any) =>
  [c.street ? `${c.street}${c.streetNumber ? " " + c.streetNumber : ""}` : p?.name, [c.cap, c.city].filter(Boolean).join(" ")]
    .filter(Boolean).join(", ");

// place_id carries the resolved data, so "details" needs no second request.
const encodeId = (o: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const decodeId = (s: string) => JSON.parse(decodeURIComponent(escape(atob(s))));

const photon = async (q: string, limit: number, layers?: string) => {
  const url = `${PHOTON}?q=${encodeURIComponent(q)}&limit=${limit}&bbox=${ITALY_BBOX}${layers ? `&layer=${layers}` : ""}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) {
    console.error(`Photon failed [${res.status}]: ${await res.text()}`);
    return [];
  }
  const data = await res.json();
  return (data?.features || []).filter((f: any) => (f?.properties?.countrycode || "IT") === "IT");
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, input, placeId, address, types } = await req.json();

    if (action === "autocomplete") {
      const streetOnly = Array.isArray(types) && types.includes("route");
      const withNumber = Array.isArray(types) && types.includes("address");
      const typedNumber = withNumber ? (String(input || "").match(/(?:^|[\s,])(\d{1,4}[a-zA-Z]?(?:\/\w+)?)(?=[\s,]|$)/)?.[1] || "") : "";
      // For street-only search, drop house numbers: they belong in their own field.
      const raw = String(input || "").slice(0, 200);
      const q = (streetOnly ? raw.replace(/(^|[\s,])\d{1,4}[a-zA-Z]?(\/\w+)?(?=[\s,]|$)/g, " ") : raw).replace(/\s+/g, " ").trim();
      if (q.length < 3) return json({ predictions: [] });
      const features = await photon(q, 12, streetOnly ? "street" : withNumber ? "house&layer=street" : undefined);
      const seen = new Set<string>();
      const predictions: any[] = [];
      for (const f of features) {
        const p = f.properties;
        const c = comps(p);
        if (streetOnly && !c.street) continue;
        if (withNumber) {
          if (!c.street) continue;
          if (!c.streetNumber && typedNumber) c.streetNumber = typedNumber;
        }
        const description = streetOnly ? describe({ ...c, streetNumber: "" }, p) : describe(c, p);
        const key = streetOnly ? `${c.street}|${c.city}`.toLowerCase() : description.toLowerCase();
        if (!description || seen.has(key)) continue;
        seen.add(key);
        const [lng, lat] = f.geometry?.coordinates || [0, 0];
        predictions.push({
          place_id: encodeId({ d: description, c, lat, lng }),
          description,
          street: c.street, cap: c.cap, city: c.city,
        });
        if (predictions.length >= 6) break;
      }
      return json({ predictions });
    }

    if (action === "details") {
      if (!placeId) return json({ error: "Missing placeId" }, 400);
      let o: any;
      try { o = decodeId(String(placeId)); } catch { return json({ error: "Invalid placeId" }, 400); }
      return json({
        result: {
          formatted_address: o.d || "",
          geometry: { location: { lat: Number(o.lat) || 0, lng: Number(o.lng) || 0 } },
          address_components: o.c || {},
        },
      });
    }

    if (action === "geocode") {
      if (!address) return json({ error: "Missing address" }, 400);
      const [f] = await photon(String(address).slice(0, 300), 1);
      if (!f) return json({ location: null });
      const [lng, lat] = f.geometry.coordinates;
      return json({ location: { lat, lng } });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
