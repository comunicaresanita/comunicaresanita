import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams, Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import AuthHeader from "@/components/AuthHeader";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { MapPin, Search, Star, ShieldCheck, Stethoscope, Navigation, User, ClipboardList, ChevronRight, CalendarCheck, MousePointerClick, Calendar, ExternalLink, BriefcaseMedical } from "lucide-react";
import ChatbotWidget from "@/components/ChatbotWidget";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fuzzySearchServices, haversineKm } from "@/lib/searchUtils";
import { priceWithDistance, isLongDistance, isReachable } from "@/lib/distancePricing";
import StructuredAddressInput, { composeAddress } from "@/components/StructuredAddressInput";
import { useToast } from "@/hooks/use-toast";
import { SlidersHorizontal, RotateCcw, MoveHorizontal, ArrowUpNarrowWide, ArrowDownWideNarrow } from "lucide-react";
import { cn } from "@/lib/utils";
import { prestazioniDisponibili } from "@/data/prestazioni";
import ServiceInfoButton from "@/components/ServiceInfoButton";
import { compareServiceNames, priceUnit } from "@/lib/serviceInfo";
import { articles } from "@/data/blogArticles";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { bluePinIcon } from "@/lib/leafletPin";
import LastBookingCard from "@/components/LastBookingCard";

const patientFaqItems = [
  {
    q: "Come posso prenotare una prestazione?",
    a: "Accedi al tuo account, cerca il professionista o la prestazione che ti interessa dalla pagina 'Trova la prestazione o il professionista', seleziona data e orario disponibili e conferma la prenotazione. Verrai ricontattato al più presto dal nostro team."
  },
  {
    q: "Posso prenotare una prestazione per un familiare o un'altra persona?",
    a: "Sì. Durante la prenotazione puoi indicare se la prestazione è per te o per un familiare/assistito. Selezionando 'Per un familiare / assistito' potrai inserire l'indirizzo della persona che riceverà la prestazione: il professionista si recherà a quell'indirizzo invece che al tuo. L'indirizzo del familiare viene salvato in automatico, così alle prenotazioni successive ti basterà sceglierlo con un clic."
  },
  {
    q: "Posso cancellare una prenotazione?",
    a: "Sì, per farlo puoi contattarci su comunicaresanita@gmail.com o chiamandoci al numero +39 338 8121120 . È obbligatorio avvisare almeno 24 ore prima della prestazione."
  },
  {
    q: "Devo pagare online al momento della prenotazione?",
    a: "No, al momento non è previsto alcun pagamento online. Dopo la prenotazione verrai ricontattato dal nostro team per confermare i dettagli della prestazione."
  },
  {
    q: "Come posso modificare i miei dati personali?",
    a: "Accedi al tuo profilo cliccando sul Menu in alto a destra, poi su Profilo e infine andando a modificare le informazioni che desideri nella sezione 'Il mio profilo' (ricorda sempre di salvare)."
  },
  {
    q: "Cosa devo fare se riscontro un problema tecnico?",
    a: "Compila il modulo di contatto in questa pagina descrivendo il problema nel modo più dettagliato possibile, oppure scrivici direttamente a comunicaresanita@gmail.com. Ti risponderemo il prima possibile."
  },
  {
    q: "ComuniCARE è un'azienda sanitaria?",
    a: "No, ComuniCARE è un fornitore di servizi di intermediazione. La responsabilità della prestazione sanitaria è esclusivamente in capo al professionista abilitato."
  },
];

interface ProfessionistaData {
  profileId: string;
  nome: string;
  bio: string;
  lat: number;
  lng: number;
  zona: string;
  servizi: { name: string; price: number }[];
  valutazione: number;
  recensioni: number;
  professionalType: string;
  photoUrl: string | null;
  verified: boolean;
  radiusKm: number | null;
  serviceArea?: [number, number][] | null;
}

type SearchMode = "prestazione" | "professionista";

const DashboardPaziente = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [prestazioneSelezionata, setPrestazioneSelezionata] = useState("");
  const [professionistaSelezionato, setProfessionistaSelezionato] = useState<ProfessionistaData | null>(null);
  const [ricerca, setRicerca] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("prestazione");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("recentServiceSearches");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [recentProfSearches, setRecentProfSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("recentProfessionalSearches");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Load recent searches from the user's profile (persists across logout / devices)
  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("recent_service_searches, recent_professional_searches")
        .eq("id", profile.id)
        .maybeSingle();
      if (cancelled || !data) return;
      const svc = (data as any).recent_service_searches as string[] | null;
      const prof = (data as any).recent_professional_searches as string[] | null;
      if (svc && svc.length) {
        setRecentSearches(svc);
        try { localStorage.setItem("recentServiceSearches", JSON.stringify(svc)); } catch { /* ignore */ }
      }
      if (prof && prof.length) {
        setRecentProfSearches(prof);
        try { localStorage.setItem("recentProfessionalSearches", JSON.stringify(prof)); } catch { /* ignore */ }
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.id]);

  const persistToProfile = (column: "recent_service_searches" | "recent_professional_searches", values: string[]) => {
    if (!profile?.id) return;
    supabase.from("profiles").update({ [column]: values } as any).eq("id", profile.id).then(() => {}, () => {});
  };

  const addRecentSearch = (term: string) => {
    setRecentSearches((prev) => {
      const next = [term, ...prev.filter((t) => t !== term)].slice(0, 3);
      try {
        localStorage.setItem("recentServiceSearches", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      persistToProfile("recent_service_searches", next);
      return next;
    });
  };

  const addRecentProfSearch = (term: string) => {
    setRecentProfSearches((prev) => {
      const next = [term, ...prev.filter((t) => t !== term)].slice(0, 3);
      try {
        localStorage.setItem("recentProfessionalSearches", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      persistToProfile("recent_professional_searches", next);
      return next;
    });
  };
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [professionisti, setProfessionisti] = useState<ProfessionistaData[]>([]);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Fetch booking history
  useEffect(() => {
    const fetchBookings = async () => {
      if (!profile || profile.role === "professionista") return;
      setLoadingBookings(true);
      const { data } = await supabase
        .from("bookings")
        .select("*, professional:professional_id(first_name, last_name)")
        .eq("patient_id", profile.id)
        .order("day", { ascending: false });
      setBookings(data || []);
      setLoadingBookings(false);
    };
    fetchBookings();
  }, [profile]);

  // Fuzzy search for services
  const prestazioniFiltrate = useMemo(
    () => (searchMode === "prestazione" ? [...fuzzySearchServices(ricerca, prestazioniDisponibili)].sort(compareServiceNames) : []),
    [ricerca, searchMode],
  );

  // Fuzzy search for professional names
  const professionistiSuggeriti = useMemo(() => {
    if (searchMode !== "professionista" || !ricerca.trim()) return [];
    const q = ricerca.toLowerCase().trim();
    return professionisti.filter((p) => p.nome.toLowerCase().includes(q)).slice(0, 10);
  }, [ricerca, searchMode, professionisti]);

  // Who the search is for, and the address used to measure distance
  const [searchFor, setSearchFor] = useState<"self" | "other" | null>(null);
  const [caregiverAddress, setCaregiverAddress] = useState<string>("");
  const [caregiverCoords, setCaregiverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [askCaregiverAddr, setAskCaregiverAddr] = useState(false);
  const [cgVia, setCgVia] = useState("");
  const [cgCivico, setCgCivico] = useState("");
  const [cgCap, setCgCap] = useState("");
  const [cgCitta, setCgCitta] = useState("");
  const [savingCg, setSavingCg] = useState(false);
  const [sortBy, setSortBy] = useState<"distanza" | "prezzo">("distanza");
  const [priceDir, setPriceDir] = useState<"asc" | "desc">("asc");
  const [showSort, setShowSort] = useState(false);
  const [repeatEmptyMsg, setRepeatEmptyMsg] = useState(false);

  useEffect(() => {
    setCaregiverAddress(((profile as any)?.caregiver_address as string) || "");
  }, [profile]);

  const geocodeAddress = async (address: string) => {
    try {
      const { data } = await supabase.functions.invoke("places-autocomplete", {
        body: { action: "geocode", address: `${address}, Italia` },
      });
      return (data?.location as { lat: number; lng: number } | null) ?? null;
    } catch {
      return null;
    }
  };

  const chooseSearchFor = async (who: "self" | "other") => {
    if (who === "other" && !caregiverAddress) {
      setAskCaregiverAddr(true);
      setSearchFor(null);
      return;
    }
    setAskCaregiverAddr(false);
    setSearchFor(who);
    if (who === "other") setCaregiverCoords(await geocodeAddress(caregiverAddress));
  };

  const saveCaregiverAddress = async () => {
    if (!cgVia.trim() || !cgCivico.trim() || !cgCap.trim() || !cgCitta.trim()) {
      toast({ title: "Indirizzo incompleto", description: "Compila via, numero civico, CAP e città.", variant: "destructive" });
      return;
    }
    setSavingCg(true);
    const addr = composeAddress(cgVia, cgCivico, cgCap, cgCitta);
    if (profile?.id) {
      await supabase.from("profiles").update({ caregiver_address: addr, is_caregiver: true } as any).eq("id", profile.id);
    }
    setCaregiverAddress(addr);
    setCaregiverCoords(await geocodeAddress(addr));
    setSavingCg(false);
    setAskCaregiverAddr(false);
    setSearchFor("other");
  };

  const handleRepeatLast = () => {
    if (!user) {
      navigate("/login", { state: { redirect: "/", message: "Accedi per ripetere la tua ultima prestazione." } });
      return;
    }
    const last = [...bookings].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0];
    if (!last) {
      setRepeatEmptyMsg(true);
      return;
    }
    navigate(
      `/profilo-infermiere/${last.professional_id}?servizio=${encodeURIComponent(last.service_name)}&per=${last.recipient_type === "other" ? "other" : "self"}&ripeti=${last.id}`,
    );
  };

  const refCoords = searchFor === "other" ? caregiverCoords : userCoords;
  const showList = Boolean(user && searchFor);

  // Filter professionals by selected service, coverage (drawn zone, else chosen radius) and sort
  const professionistiFiltrati = useMemo(() => {
    if (!prestazioneSelezionata) return [];
    let filtered = professionisti.filter((p) => p.servizi.some((s) => s.name === prestazioneSelezionata));
    if (refCoords) {
      filtered.forEach((p: any) => {
        p._distKm = haversineKm(refCoords.lat, refCoords.lng, p.lat, p.lng);
      });
      filtered = filtered.filter((p: any) => isReachable({ lat: refCoords.lat, lng: refCoords.lng, km: p._distKm, radiusKm: p.radiusKm, area: p.serviceArea }));
    } else {
      filtered.forEach((p: any) => { delete p._distKm; });
    }
    const priceOf = (p: any) =>
      priceWithDistance(p.servizi.find((s: any) => s.name === prestazioneSelezionata)?.price ?? 0, p._distKm);
    const dist = (p: any) => p._distKm ?? 999;
    filtered.sort((a: any, b: any) => {
      if (sortBy === "distanza") return dist(a) - dist(b);
      const diff = (priceOf(a) - priceOf(b)) * (priceDir === "asc" ? 1 : -1);
      if (diff !== 0) return diff;
      // Same price: better reviews first, then closer
      const ratingDiff = (b.valutazione || 0) - (a.valutazione || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return dist(a) - dist(b);
    });
    return filtered;
  }, [prestazioneSelezionata, professionisti, refCoords, sortBy, priceDir]);

  // When switching mode, reset selections
  const handleModeSwitch = (mode: SearchMode) => {
    setSearchMode(mode);
    setRicerca("");
    setPrestazioneSelezionata("");
    setProfessionistaSelezionato(null);
  };

  const scrollToResult = (id: string) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }, 120);
  };

  const handleSelectProfessionista = (p: ProfessionistaData) => {
    setProfessionistaSelezionato(p);
    setRicerca(p.nome);
    setPrestazioneSelezionata("");
    addRecentProfSearch(p.nome);
    scrollToResult("prof-card-selected");
  };

  const handleSelectPrestazione = (p: string) => {
    setPrestazioneSelezionata(p);
    setRicerca(p);
    setProfessionistaSelezionato(null);
    addRecentSearch(p);
    scrollToResult("results-by-service");
  };

  // Pre-select a service when arriving with ?servizio= in the URL
  // (used by the "Tutte le prestazioni" page and the chatbot).
  useEffect(() => {
    const fromUrl = searchParams.get("servizio");
    if (!fromUrl) return;
    setSearchMode("prestazione");
    handleSelectPrestazione(fromUrl);
    searchParams.delete("servizio");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);




  // --- Map (OpenStreetMap via Leaflet — no API key required) ---
  useEffect(() => {
    setMapsLoaded(true);
  }, []);

  useEffect(() => {
    if (!profile?.address) return;
    if (profile.lat && profile.lng) {
      setUserCoords({ lat: profile.lat, lng: profile.lng });
      return;
    }
    let cancelled = false;
    const geocode = async () => {
      try {
        const { data } = await supabase.functions.invoke("places-autocomplete", {
          body: { action: "geocode", address: `${profile.address}, Italia` },
        });
        if (cancelled) return;
        setUserCoords(data?.location ?? { lat: 43.7696, lng: 11.2558 });
      } catch {
        if (!cancelled) setUserCoords({ lat: 43.7696, lng: 11.2558 });
      }
    };
    geocode();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  useEffect(() => {
    const fetchProfessionisti = async () => {
      const { data: professionalsRaw } = await supabase
        .from("public_professionals" as any)
        .select("id, first_name, last_name, bio, lat, lng, zona, professional_type, photo_url, verified, service_radius_km, service_area");
      const professionals = (professionalsRaw as any[] | null);

      if (!professionals || professionals.length === 0) return;
      const profIds = professionals.map((p) => p.id);

      const [{ data: services }, { data: reviewsRaw }] = await Promise.all([
        supabase.from("services").select("professional_id, name, price").in("professional_id", profIds),
        supabase.from("public_reviews" as any).select("professional_id, rating").in("professional_id", profIds),
      ]);
      const reviews = (reviewsRaw as unknown as { professional_id: string; rating: number }[] | null);

      const mapped: ProfessionistaData[] = professionals
        .filter((p) => p.lat && p.lng)
        .map((p) => {
          const profServices = (services || []).filter((s) => s.professional_id === p.id);
          const profReviews = (reviews || []).filter((r) => r.professional_id === p.id);
          const avg =
            profReviews.length > 0
              ? Math.round((profReviews.reduce((sum, r) => sum + r.rating, 0) / profReviews.length) * 10) / 10
              : 0;
          return {
            profileId: p.id,
            nome: `${p.first_name} ${p.last_name}`,
            bio: p.bio || "",
            lat: p.lat!,
            lng: p.lng!,
            zona: p.zona || "",
            servizi: profServices.map((s) => ({ name: s.name, price: s.price })).sort((a, b) => compareServiceNames(a.name, b.name)),
            valutazione: avg,
            recensioni: profReviews.length,
            professionalType: (p as any).professional_type || "infermiere",
            photoUrl: (p as any).photo_url || null,
            verified: (p as any).verified || false,
            radiusKm: (p as any).service_radius_km ?? null,
            serviceArea: (p as any).service_area ?? null,
          };
        });
      setProfessionisti(mapped);
    };
    fetchProfessionisti();
  }, []);

  // Professionals to show on map
  // The map is only illustrative: it always shows every professional on the platform.
  const mapProfessionals = professionisti;

  // Map rendering (Leaflet + OpenStreetMap tiles)
  useEffect(() => {
    if (!mapRef.current) return;

    const center: [number, number] = userCoords
      ? [userCoords.lat, userCoords.lng]
      : [43.7696, 11.2558];

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, { center, zoom: 11, scrollWheelZoom: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);
    }

    const map: L.Map = mapInstanceRef.current;

    markersRef.current.forEach((m: L.Marker) => m.remove());
    markersRef.current = [];

    mapProfessionals.forEach((p) => {
      // Marker is informational only — not clickable.
      const marker = L.marker([p.lat, p.lng], {
        icon: bluePinIcon(),
        interactive: true,
        keyboard: false,
      })
        .addTo(map)
        .bindTooltip(p.nome, { direction: "top" });
      markersRef.current.push(marker);
    });

    // Center on the user's address and zoom to ~20 km radius.
    // No marker on the user's own position (privacy + clarity).
    if (userCoords) {
      map.setView([userCoords.lat, userCoords.lng], 10);
    } else if (mapProfessionals.length > 0) {
      const bounds = L.latLngBounds(mapProfessionals.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    }
  }, [mapProfessionals, userCoords, prestazioneSelezionata]);

  const typeLabel = (t: string) => (t === "oss" ? "OSS" : t === "fisioterapista" ? "Fisioterapista" : "Infermiere");

  const isPaziente = profile?.role !== "professionista";
  // Professionals never see the patient search page: their Home is the dashboard
  if (profile?.role === "professionista") return <Navigate to="/dashboard-professionista" replace />;


  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Trova la prestazione — ComuniCARE assistenza a domicilio"
        description="Cerca infermieri, OSS e fisioterapisti per prestazioni sanitarie a domicilio a Firenze: confronta professionisti verificati e prenota online."
        path="/"
      />
      <AuthHeader />
      <main className="flex-1 bg-background md:py-12 py-0">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <h1 className="md:text-senior-3xl mb-2 font-semibold text-xl font-sans">Trova la prestazione o il professionista</h1>

          <LastBookingCard />

          <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-stretch lg:mb-6">
          <div className="mb-6 md:mb-8 lg:mb-0 lg:flex lg:flex-col">

          <Card className="flex flex-col flex-1">

            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-lg md:text-senior-lg flex items-center gap-2">
                <Search className="w-5 h-5" /> Cerca per
              </CardTitle>
              <div className="flex gap-2 mt-2 text-sm">
                <button
                  onClick={() => handleModeSwitch("prestazione")}
                  className={`px-3 py-1.5 rounded-full text-sm md:text-sm font-medium transition-colors flex items-center gap-1 ${
                    searchMode === "prestazione"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Stethoscope className="w-3.5 h-3.5" /> Prestazione
                </button>
                <button
                  onClick={() => handleModeSwitch("professionista")}
                  className={`px-3 py-1.5 rounded-full text-sm md:text-sm font-medium transition-colors flex items-center gap-1 ${
                    searchMode === "professionista"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="w-3.5 h-3.5" /> Professionista
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
              <div className="relative">
                <input
                  type="text"
                  value={ricerca}
                  onChange={(e) => {
                    const value = e.target.value;
                    setRicerca(value);
                    if (searchMode === "professionista") setProfessionistaSelezionato(null);
                    // Typing again after choosing a service starts a new search, so suggestions show up while typing
                    else if (prestazioneSelezionata && value !== prestazioneSelezionata) setPrestazioneSelezionata("");
                  }}
                  placeholder={
                    searchMode === "prestazione" ? "Cerca una prestazione..." : "Cerca per nome e cognome..."
                  }
                  className="w-full border rounded-md p-3 text-sm md:text-senior-sm bg-background mb-4"
                />
                {/* Name autocomplete dropdown */}
                {searchMode === "professionista" &&
                  ricerca.trim() &&
                  !professionistaSelezionato &&
                  professionistiSuggeriti.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-12 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {professionistiSuggeriti.map((p) => (
                        <button
                          key={p.profileId}
                          onClick={() => handleSelectProfessionista(p)}
                          className="w-full text-left px-4 py-2.5 hover:bg-secondary flex items-center gap-3 text-sm border-b last:border-b-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {p.photoUrl ? (
                              <img src={p.photoUrl} alt={p.nome} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <span className="font-medium">{p.nome}</span>
                            <span className="text-xs text-muted-foreground ml-2">{typeLabel(p.professionalType)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
              </div>

              {/* Service suggestions (only when typing) */}
              {searchMode === "prestazione" &&
                ricerca.trim() &&
                !prestazioneSelezionata &&
                prestazioniFiltrate.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 md:max-h-64 overflow-y-auto mt-2">
                    {prestazioniFiltrate.map((p) => (
                      <div
                        key={p}
                        className="flex items-start gap-1 rounded-lg border border-border hover:border-primary/50 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectPrestazione(p)}
                          className="flex-1 min-w-0 text-left p-2.5 md:p-3 text-sm md:text-senior-sm break-words whitespace-normal leading-snug"
                        >
                          {p}
                        </button>
                        <ServiceInfoButton name={p} className="mt-1.5 mr-1.5" />
                      </div>
                    ))}
                  </div>
                )}
              {prestazioneSelezionata && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-primary font-medium break-words">
                    Prestazione selezionata: {prestazioneSelezionata}
                  </span>
                  <ServiceInfoButton name={prestazioneSelezionata} />
                  <button
                    onClick={() => {
                      setPrestazioneSelezionata("");
                      setRicerca("");
                    }}
                    className="text-xs text-muted-foreground underline hover:text-foreground flex-shrink-0"
                  >
                    Cambia
                  </button>
                </div>
              )}

              {/* Recent searches */}
              {searchMode === "prestazione" && !prestazioneSelezionata && recentSearches.some((r) => prestazioniDisponibili.includes(r)) && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1.5">Ultime ricerche:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.filter((r) => prestazioniDisponibili.includes(r)).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleSelectPrestazione(r)}
                        className="px-2.5 py-1 rounded-full bg-secondary text-xs md:text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors break-words text-left max-w-full"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent professional searches */}
              {searchMode === "professionista" && !professionistaSelezionato && recentProfSearches.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1.5">Ultime ricerche:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {recentProfSearches.map((r) => {
                      const found = professionisti.find((p) => p.nome === r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            if (found) {
                              handleSelectProfessionista(found);
                            } else {
                              setRicerca(r);
                            }
                          }}
                          className="px-2.5 py-1 rounded-full bg-secondary text-xs md:text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors break-words text-left max-w-full"
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* "Tutti i servizi" link – always visible at the bottom of the card */}
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1">
              <button
                type="button"
                onClick={() => navigate("/prestazioni")}
                className="inline-flex items-center gap-1 px-1 py-2 text-primary hover:underline transition-colors"
                aria-label="Vai alla pagina con tutte le prestazioni offerte"
              >
                <span className="text-sm md:text-senior-sm font-medium">Tutti i servizi</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRepeatLast}
                className="inline-flex items-center gap-1 px-1 py-2 text-primary hover:underline transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-sm md:text-senior-sm font-medium">Ripeti ultima prestazione</span>
              </button>
              </div>
              {repeatEmptyMsg && (
                <p className="text-sm text-muted-foreground mt-1">
                  Questa sezione è ancora vuota: apparirà quando avrai eseguito la tua prima prestazione.
                </p>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-sm md:text-base text-muted-foreground/70 mt-3 mb-4 lg:mb-0 px-2">
            Non sai che prestazione scegliere? Nessun problema: chiedi al nostro Assistente digitale nel pulsante in basso a destra
          </p>
          </div>

          {/* Map always visible */}
          <div ref={mapRef} className="w-full h-56 md:h-80 lg:h-full lg:min-h-0 rounded-lg overflow-hidden border mb-4 md:mb-6 lg:mb-0 bg-secondary relative z-0">
            {!mapsLoaded && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-primary mx-auto mb-3" />
                  <p className="text-senior-sm text-muted-foreground">Caricamento mappa...</p>
                </div>
              </div>
            )}
          </div>
          </div>

          {/* === "Come prenotare in 3 passi" — reminder, non-promotional === */}
          {!prestazioneSelezionata && !professionistaSelezionato && (
            <section
              aria-labelledby="come-prenotare-title"
              className="mt-6 md:mt-8 rounded-xl border bg-secondary/30 p-6 md:p-10"
            >
              <h2
                id="come-prenotare-title"
                className="text-lg md:text-senior-xl font-semibold mb-2"
              >
                Come prenotare in 3 passi
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8">
                La prossima volta ci vorrà meno di un minuto
              </p>
              <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {[
                  {
                    n: 1,
                    title: "Cerca la prestazione",
                    body:
                      "Usa la barra di ricerca qui sopra per trovare la prestazione di cui hai bisogno oppure cerca direttamente un professionista per nome e cognome.",
                    Icon: Search,
                  },
                  {
                    n: 2,
                    title: "Scegli data e orario",
                    body:
                      "Visualizza il calendario del professionista e seleziona tra le disponibilità lo slot che ti è più comodo, alla data e all'orario che preferisci.",
                    Icon: MousePointerClick,
                  },
                  {
                    n: 3,
                    title: "Conferma la prenotazione",
                    body:
                      "Controlla il riepilogo e conferma. Riceverai subito un'email di conferma e il nostro team ti ricontatterà al più presto.",
                    Icon: CalendarCheck,
                  },
                ].map(({ n, title, body, Icon }) => (
                  <li
                    key={n}
                    className="bg-background rounded-lg border p-5 md:p-6 flex flex-col min-h-[180px] md:min-h-[240px] gap-4"
                  >
                    {/* Header row: number left, icon right — uniform across all 3 boxes */}
                    <div className="flex items-center justify-between h-10">
                      <span
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white text-base font-semibold flex-shrink-0"
                        style={{ backgroundColor: "#0097B2" }}
                        aria-hidden="true"
                      >
                        {n}
                      </span>
                      <Icon className="w-8 h-8 md:w-9 md:h-9 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <h3 className="text-base md:text-senior-base font-semibold leading-tight">
                      Passo {n}: {title}
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed flex-1">
                      {body}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div>


          {/* === Results: by service === */}
          {prestazioneSelezionata && !professionistaSelezionato && (
            <>
              <h2 id="results-by-service" className="text-base md:text-senior-xl font-semibold mb-4 scroll-mt-24">
                Professionisti disponibili per: <span className="text-primary">{prestazioneSelezionata}</span>
              </h2>
              {!authLoading && !user && (
                <Card className="mb-4 border-2 border-primary/40">
                  <CardContent className="p-5 md:p-6 text-center space-y-3">
                    <p className="text-sm md:text-senior-base font-semibold">Accedi o registrati per vedere i professionisti</p>
                    <p className="text-sm text-muted-foreground">
                      È richiesto per garantirti i professionisti più vicini a te, in base al tuo indirizzo di residenza.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button onClick={() => navigate("/login", { state: { redirect: `/?servizio=${encodeURIComponent(prestazioneSelezionata)}`, message: "Accedi per vedere i professionisti più vicini a te." } })}>
                        Accedi
                      </Button>
                      <Button variant="outline" onClick={() => navigate("/registrazione", { state: { redirect: `/?servizio=${encodeURIComponent(prestazioneSelezionata)}` } })}>
                        Registrati
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {user && !searchFor && !askCaregiverAddr && (
                <Card className="mb-4 border-2 border-primary/40">
                  <CardContent className="p-5 md:p-6 space-y-3">
                    <p className="text-sm md:text-senior-base font-semibold">Per chi cerchi questa prestazione?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button type="button" onClick={() => chooseSearchFor("self")} className="text-left p-3 rounded-lg border-2 border-border hover:border-primary">
                        <p className="font-semibold text-sm">Per me</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{profile?.address || "Il tuo indirizzo di residenza"}</p>
                      </button>
                      <button type="button" onClick={() => chooseSearchFor("other")} className="text-left p-3 rounded-lg border-2 border-border hover:border-primary">
                        <p className="font-semibold text-sm">Per un familiare / assistito</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{caregiverAddress || "Indirizzo del familiare"}</p>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {user && askCaregiverAddr && (
                <Card className="mb-4 border-2 border-primary/40">
                  <CardContent className="p-5 md:p-6 space-y-4">
                    <p className="text-sm text-muted-foreground">Inserisci l'indirizzo di residenza del tuo familiare: lo salveremo per le prossime ricerche.</p>
                    <StructuredAddressInput
                      via={cgVia} civico={cgCivico} cap={cgCap} citta={cgCitta}
                      onViaChange={setCgVia} onCivicoChange={setCgCivico} onCapChange={setCgCap} onCittaChange={setCgCitta}
                      label="Indirizzo del familiare" idPrefix="search-cg" required
                    />
                    <div className="flex gap-2">
                      <Button onClick={saveCaregiverAddress} disabled={savingCg}>{savingCg ? "Salvataggio..." : "Salva e mostra i professionisti"}</Button>
                      <Button variant="ghost" onClick={() => { setAskCaregiverAddr(false); setSearchFor(null); }}>Annulla</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {showList && (
                <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
                  <span className="text-muted-foreground">
                    Ordinati per {sortBy === "distanza" ? "distanza" : priceDir === "asc" ? "prezzo (dal più basso)" : "prezzo (dal più alto)"} dall'indirizzo {searchFor === "other" ? "del familiare" : "di residenza"}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setShowSort((s) => !s)} className="gap-1">
                    <SlidersHorizontal className="w-4 h-4" /> Filtra
                  </Button>
                  {showSort && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant={sortBy === "distanza" ? "default" : "outline"} onClick={() => { setSortBy("distanza"); setShowSort(false); }} className="w-28 justify-center gap-1.5">
                        <MoveHorizontal className="w-4 h-4" aria-hidden="true" /> Distanza
                      </Button>
                      <Button size="sm" variant={sortBy === "prezzo" && priceDir === "asc" ? "default" : "outline"} onClick={() => { setSortBy("prezzo"); setPriceDir("asc"); setShowSort(false); }} className="w-28 justify-center gap-1.5" title="Prezzo dal più basso al più alto">
                        <ArrowUpNarrowWide className="w-4 h-4" aria-hidden="true" /> Prezzo
                      </Button>
                      <Button size="sm" variant={sortBy === "prezzo" && priceDir === "desc" ? "default" : "outline"} onClick={() => { setSortBy("prezzo"); setPriceDir("desc"); setShowSort(false); }} className="w-28 justify-center gap-1.5" title="Prezzo dal più alto al più basso">
                        <ArrowDownWideNarrow className="w-4 h-4" aria-hidden="true" /> Prezzo
                      </Button>
                    </div>
                  )}
                  <button type="button" onClick={() => { setSearchFor(null); setAskCaregiverAddr(false); }} className="text-xs underline text-muted-foreground">
                    Cambia (per me / familiare)
                  </button>
                </div>
              )}
              {showList && (
              <div className="space-y-4">
                {professionistiFiltrati.map((p) => {
                  const servizio = p.servizi.find((s) => s.name === prestazioneSelezionata);
                  const distKm = (p as any)._distKm as number | undefined;
                  return (
                    <Card
                      id={`prof-card-${p.profileId}`}
                      key={p.profileId}
                      className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                      onClick={() =>
                        navigate(
                          `/profilo-infermiere/${p.profileId}?servizio=${encodeURIComponent(prestazioneSelezionata)}&per=${searchFor || "self"}`,
                        )
                      }
                    >
                      <CardContent className="p-4 md:p-6 flex items-start md:items-center gap-3 md:gap-6">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {p.photoUrl ? (
                            <img src={p.photoUrl} alt={p.nome} className="w-full h-full object-cover" />
                          ) : (
                            <Stethoscope className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm md:text-senior-lg font-semibold">{p.nome}</h3>
                            {p.verified && (
                              <span
                                className="inline-flex items-center gap-0.5 text-white text-xs font-medium px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: "#0097B2" }}
                              >
                                <ShieldCheck className="w-3 h-3" /> Verificato
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-medium text-primary bg-secondary px-2 py-0.5 rounded">
                              {typeLabel(p.professionalType)}
                            </span>
                            {p.valutazione > 0 && (
                              <span className="flex items-center gap-0.5 text-sm">
                                <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                                {p.valutazione}
                              </span>
                            )}
                          </div>
                          <p className="text-xs md:text-senior-sm text-muted-foreground truncate mt-1">{p.bio}</p>
                          {(p.zona || distKm !== undefined) && (
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              {p.zona && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" /> {p.zona}
                                </span>
                              )}
                              {distKm !== undefined && (
                                <span className="flex items-center gap-1 font-medium text-primary">
                                  <Navigation className="w-3.5 h-3.5" /> ~
                                  {distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${Math.round(distKm)} km`}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {servizio && (
                          <div className="text-right flex-shrink-0 max-w-[45%]">
                            <p className="text-base md:text-senior-lg font-bold text-primary">€{priceWithDistance(servizio.price, distKm)}{priceUnit(prestazioneSelezionata)}</p>
                            {isLongDistance(distKm) ? (
                              <p className="text-xs md:text-sm text-muted-foreground">
                                +10% prestazione a lunga distanza (oltre 10 km)
                              </p>
                            ) : (
                              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                                per questa prestazione
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {professionistiFiltrati.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-senior-base text-muted-foreground">
                      Nessun professionista disponibile per questa prestazione al momento.
                    </p>
                  </div>
                )}
              </div>
              )}
            </>
          )}

          {/* === Results: by professional name === */}
          {professionistaSelezionato && (
            <Card id="prof-card-selected" className="transition-shadow border-2 hover:border-primary">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start md:items-center gap-3 md:gap-6 mb-4">
                  <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {professionistaSelezionato.photoUrl ? (
                      <img
                        src={professionistaSelezionato.photoUrl}
                        alt={professionistaSelezionato.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Stethoscope className="w-7 h-7 md:w-10 md:h-10 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base md:text-senior-xl font-semibold">{professionistaSelezionato.nome}</h3>
                      {professionistaSelezionato.verified && (
                        <span
                          className="inline-flex items-center gap-0.5 text-white text-xs font-medium px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "#0097B2" }}
                        >
                          <ShieldCheck className="w-3 h-3" /> Verificato
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium text-primary bg-secondary px-2 py-0.5 rounded">
                        {typeLabel(professionistaSelezionato.professionalType)}
                      </span>
                      {professionistaSelezionato.valutazione > 0 && (
                        <span className="flex items-center gap-0.5 text-sm">
                          <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />{" "}
                          {professionistaSelezionato.valutazione}
                        </span>
                      )}
                    </div>
                    {professionistaSelezionato.bio && (
                      <p className="text-xs md:text-senior-sm text-muted-foreground mt-1">
                        {professionistaSelezionato.bio}
                      </p>
                    )}
                    {professionistaSelezionato.zona && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-4 h-4" /> {professionistaSelezionato.zona}
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="text-sm md:text-senior-base font-semibold mb-2 mt-2">Prestazioni offerte:</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Seleziona una prestazione per accedere al calendario delle disponibilità.
                </p>
                <div className="space-y-1.5">
                  {professionistaSelezionato.servizi.map((s) => (
                    <div key={s.name} className="flex items-start gap-1 rounded-md bg-secondary/50 transition-colors hover:bg-secondary">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/profilo-infermiere/${professionistaSelezionato.profileId}?servizio=${encodeURIComponent(s.name)}`,
                          )
                        }
                        className="flex flex-1 min-w-0 justify-between items-start gap-2 p-2 text-xs md:text-sm text-left"
                      >
                        <span className="break-words whitespace-normal leading-snug flex-1 min-w-0">{s.name}</span>
                        <span className="font-bold text-primary flex-shrink-0">€{s.price}{priceUnit(s.name)}</span>
                      </button>
                      <ServiceInfoButton name={s.name} className="mt-0.5 mr-1" />
                    </div>
                  ))}
                  {professionistaSelezionato.servizi.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nessuna prestazione configurata.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          </div>

        </div>

        {/* FAQ + Professionisti + Ultimi articoli — affiancati su desktop */}
        <div className="container mx-auto px-4 md:px-6 max-w-6xl mt-12 md:mt-16 grid lg:grid-cols-2 gap-6 items-stretch">
          {/* FAQ */}
          <div id="faq" className="flex flex-col scroll-mt-24">
            <h2 className="text-xl md:text-2xl font-bold mb-6">&nbsp; &nbsp; &nbsp; Domande frequenti (FAQ)</h2>
            <Card className="flex-1">
              <CardContent className="pt-6">
                <Accordion type="single" collapsible className="w-full">
                  {patientFaqItems.map((item, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-left text-sm md:text-base">{item.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Professionisti + Ultimi articoli */}
          <div className="flex flex-col gap-6 lg:contents">
            {/* Sei un professionista? */}
            <Card className="w-full lg:mt-14 lg:h-auto">
              <CardContent className="p-6 flex flex-col gap-3 items-center text-center lg:h-full lg:justify-center lg:gap-6 lg:p-8">
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 justify-center">
                  <BriefcaseMedical className="w-6 h-6 text-primary" aria-hidden="true" />
                  Sei un professionista?
                </h2>
                <p className="text-sm md:text-base text-muted-foreground">
                  Se sei un infermiere, un OSS o un fisioterapista, registrati su ComuniCARE per offrire le tue prestazioni a domicilio. Hai già un account? Accedi dal pulsante in alto a destra per gestire la tua dashboard professionista.
                </p>
                <Button asChild variant="outline" className="w-full sm:w-auto gap-2">
                  <Link to="/registrazione?ruolo=professionista">
                    <BriefcaseMedical className="w-4 h-4" aria-hidden="true" />
                    Registrati
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <div id="home-install-guide" className="empty:hidden w-full lg:col-span-2" />

            {/* Ultimi articoli */}
            <div className="flex flex-col min-h-0 flex-1 lg:col-span-2">
              <h2 className="text-xl md:text-2xl font-bold mb-6">&nbsp; &nbsp; &nbsp;Ultimi articoli</h2>
              <div className="flex-1 min-h-0">
                <div className="grid gap-6 lg:grid-cols-2">
                  {articles.map((article, index) => (
                    <Link to={`/blog/${article.slug}`} key={article.slug} className={cn("h-full", index >= 3 ? "hidden lg:block" : "block")}>
                      <Card className="h-full flex flex-col hover:border-primary transition-colors cursor-pointer overflow-hidden">
                        {article.imageUrl && (
                          <div className="w-full h-48 overflow-hidden">
                            <img src={article.imageUrl} alt={article.imageAlt} loading="lazy" width={1200} height={800} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <CardHeader>
                          <CardTitle className="text-base md:text-lg leading-snug">{article.title}</CardTitle>
                          <CardDescription className="flex items-center gap-1.5 text-xs">
                            <Calendar className="w-3.5 h-3.5" /> {article.date}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 flex-1">
                          <p className="text-sm text-muted-foreground leading-relaxed">{article.summary}</p>
                          <span className="mt-auto inline-flex items-center gap-1.5 text-xs text-primary font-medium">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Fonte: {article.source}
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <ChatbotWidget
        onSelectService={(service) => {
          setSearchMode("prestazione");
          setRicerca(service);
          setPrestazioneSelezionata(service);
          setProfessionistaSelezionato(null);
          scrollToResult("results-by-service");
        }}
        professionals={professionisti.map((p) => ({ profileId: p.profileId, nome: p.nome }))}
      />
      <Footer />
    </div>
  );
};

export default DashboardPaziente;
