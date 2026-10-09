import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// OpenStreetMap Nominatim — free, no API key required.
const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = "ComuniCARE/1.0 (https://comunicare.lovable.app)";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

// Nominatim place identifier used as our place_id, e.g. "W123456".
const toPlaceId = (item: any) =>
  `${String(item.osm_type || "node")[0].toUpperCase()}${item.osm_id}`;

const buildComponents = (addr: any) => ({
  street: addr?.road || addr?.pedestrian || addr?.footway || addr?.residential || "",
  streetNumber: addr?.house_number || "",
  cap: addr?.postcode || "",
  city: addr?.city || addr?.town || addr?.village || addr?.municipality || "",
  province: addr?.county || addr?.state || "",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, input, placeId, address, types } = await req.json();

    if (action === "autocomplete") {
      const streetOnly = Array.isArray(types) && types.includes("route");
      // For street-only search, drop a trailing house number: it belongs in its own field.
      const q = streetOnly ? String(input || "").replace(/[\s,]+\d+\S*\s*$/, "").trim() : String(input || "").trim();
      if (q.length < 3) return json({ predictions: [] });
      const url = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=10&countrycodes=it&accept-language=it&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (!res.ok) {
        const body = await res.text();
        console.error(`Nominatim search failed [${res.status}]: ${body}`);
        return json({ predictions: [] });
      }
      const data = await res.json();
      const items = Array.isArray(data) ? data : [];
      if (streetOnly) {
        const seen = new Set<string>();
        const predictions: any[] = [];
        for (const item of items) {
          const c = buildComponents(item.address);
          if (!c.street) continue;
          const description = [c.street, [c.cap, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
          const key = `${c.street}|${c.city}`.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          predictions.push({ place_id: toPlaceId(item), description, street: c.street, cap: c.cap, city: c.city });
          if (predictions.length >= 6) break;
        }
        return json({ predictions });
      }
      const predictions = items.slice(0, 6).map((item: any) => ({
        place_id: toPlaceId(item),
        description: item.display_name || "",
      }));
      return json({ predictions });
    }

    if (action === "details") {
      if (!placeId) return json({ error: "Missing placeId" }, 400);
      const url = `${NOMINATIM}/lookup?format=jsonv2&addressdetails=1&accept-language=it&osm_ids=${encodeURIComponent(placeId)}`;
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (!res.ok) {
        const body = await res.text();
        console.error(`Nominatim lookup failed [${res.status}]: ${body}`);
        return json({ error: "Lookup failed", status: res.status, details: body }, res.status);
      }
      const data = await res.json();
      const item = Array.isArray(data) ? data[0] : null;
      if (!item) return json({ error: "Place not found" }, 404);

      return json({
        result: {
          formatted_address: item.display_name || "",
          geometry: {
            location: { lat: Number(item.lat) || 0, lng: Number(item.lon) || 0 },
          },
          address_components: buildComponents(item.address),
        },
      });
    }

    if (action === "geocode") {
      if (!address) return json({ error: "Missing address" }, 400);
      const url = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=it&accept-language=it&q=${encodeURIComponent(address)}`;
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (!res.ok) {
        const body = await res.text();
        console.error(`Nominatim geocode failed [${res.status}]: ${body}`);
        return json({ error: "Geocode failed", status: res.status, details: body }, res.status);
      }
      const data = await res.json();
      const item = Array.isArray(data) ? data[0] : null;
      if (!item) return json({ location: null });
      return json({ location: { lat: Number(item.lat), lng: Number(item.lon) } });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
