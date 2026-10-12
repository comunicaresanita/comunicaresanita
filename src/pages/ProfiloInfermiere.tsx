import { italianError } from "@/lib/italianErrors";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AuthHeader from "@/components/AuthHeader";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { MapPin, Star, Clock, ArrowLeft, BadgeCheck, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import StructuredAddressInput, { parseAddressToFields, composeAddress } from "@/components/StructuredAddressInput";
import HousingInfoFields, { HousingInfoErrors } from "@/components/HousingInfoFields";
import MedicalNotesField from "@/components/MedicalNotesField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { haversineKm } from "@/lib/searchUtils";
import { priceWithDistance, isLongDistance } from "@/lib/distancePricing";

const NIGHT_START_HOUR = 20;

const BOOKING_DRAFT_KEY = "comunicare_booking_draft";

const geocode = async (address: string) => {
  try {
    const { data } = await supabase.functions.invoke("places-autocomplete", {
      body: { action: "geocode", address: `${address}, Italia` },
    });
    return (data?.location as { lat: number; lng: number } | null) ?? null;
  } catch {
    return null;
  }
};

const getSlotStartHour = (slot: string | null) => {
  if (!slot) return null;
  const [start] = slot.split("-");
  const hour = Number(start);
  return Number.isNaN(hour) ? null : hour;
};

const getBookingPricing = (basePrice: number, date: Date | null, slot: string | null) => {
  const startHour = getSlotStartHour(slot);
  const isNight = startHour !== null && startHour >= NIGHT_START_HOUR;
  const isSunday = date?.getDay() === 0;

  let surchargeRate = 0;
  let surchargeReason: string | null = null;

  if (isNight && isSunday) {
    surchargeRate = 0.6;
    surchargeReason = "Maggiorazione del 60% applicata perché la prestazione è notturna e festiva.";
  } else if (isSunday) {
    surchargeRate = 0.4;
    surchargeReason = "Maggiorazione del 40% applicata perché la prestazione è festiva.";
  } else if (isNight) {
    surchargeRate = 0.25;
    surchargeReason = "Maggiorazione del 25% applicata perché la prestazione rientra tra le prestazioni notturne.";
  }

  const finalPrice = Math.round(basePrice * (1 + surchargeRate));

  return {
    basePrice,
    finalPrice,
    surchargeRate,
    surchargeReason,
  };
};

interface ProfessionalProfile {
  id: string;
  first_name: string;
  last_name: string;
  bio: string | null;
  zona: string | null;
  numero_opi: string | null;
  numero_fnofi: string | null;
  professional_type: string | null;
  photo_url: string | null;
  verified: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

interface Availability {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

interface Review {
  id: string;
  rating: number;
  text: string | null;
  created_at: string;
  patient_id: string;
}

const dayNameToWeekday: Record<string, number> = {
  "Domenica": 0, "Lunedì": 1, "Martedì": 2, "Mercoledì": 3,
  "Giovedì": 4, "Venerdì": 5, "Sabato": 6,
};

const weekdayToDayName: Record<number, string> = {
  0: "Domenica", 1: "Lunedì", 2: "Martedì", 3: "Mercoledì",
  4: "Giovedì", 5: "Venerdì", 6: "Sabato",
};

const monthNames = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const ProfiloInfermiere = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile: userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [professional, setProfessional] = useState<ProfessionalProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const servizioFromQuery = searchParams.get("servizio");
  const [servizioSelezionato, setServizioSelezionato] = useState<string | null>(servizioFromQuery);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slotSelezionato, setSlotSelezionato] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Calendar state
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());

  const slotPanelRef = useRef<HTMLDivElement>(null);
  const [overrides, setOverrides] = useState<{ specific_date: string; start_time: string; end_time: string; is_unavailable: boolean }[]>([]);
  const [bookedSlots, setBookedSlots] = useState<{ day: string; time_slot: string }[]>([]);

  // Recipient selection: "self" = paziente stesso, "other" = familiare/assistito
  const [recipient, setRecipient] = useState<"self" | "other">("self");
  const [cgFirstName, setCgFirstName] = useState("");
  const [cgLastName, setCgLastName] = useState("");
  const [cgVia, setCgVia] = useState("");
  const [cgCivico, setCgCivico] = useState("");
  const [cgCap, setCgCap] = useState("");
  const [cgCitta, setCgCitta] = useState("");
  const [cgErrors, setCgErrors] = useState<{ firstName?: boolean; lastName?: boolean; via?: boolean; civico?: boolean; cap?: boolean; citta?: boolean }>({});
  const hasSavedCaregiverAddr = Boolean((userProfile as any)?.caregiver_address);
  const cgComplete = Boolean(
    (userProfile as any)?.caregiver_first_name && (userProfile as any)?.caregiver_last_name && (userProfile as any)?.caregiver_address
  );
  // Recipient already chosen on the search page: don't ask again
  const recipientPreset = searchParams.get("per") === "self" || searchParams.get("per") === "other";

  // "Per me" medical notes (prefilled from profile, persisted on booking)
  const [selfMedicalNotes, setSelfMedicalNotes] = useState("");

  // "Per familiare" housing + emergency + medical
  const [cgLivesInCondominio, setCgLivesInCondominio] = useState<boolean | null>(null);
  const [cgIntercomName, setCgIntercomName] = useState("");
  const [cgFloorNumber, setCgFloorNumber] = useState("");
  const [cgAccessNotes, setCgAccessNotes] = useState("");
  const [cgEmergencyName, setCgEmergencyName] = useState("");
  const [cgEmergencyPhone, setCgEmergencyPhone] = useState("");
  const [cgMedicalNotes, setCgMedicalNotes] = useState("");
  const [cgHousingErrors, setCgHousingErrors] = useState<HousingInfoErrors>({});

  // Restore a booking draft saved before the user was asked to log in / sign up
  const draftAppliedRef = useRef(false);
  useEffect(() => {
    if (draftAppliedRef.current || !id) return;
    const raw = localStorage.getItem(BOOKING_DRAFT_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.professionalId !== id || Date.now() - (d.savedAt || 0) > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(BOOKING_DRAFT_KEY);
        return;
      }
      draftAppliedRef.current = true;
      if (d.servizio) setServizioSelezionato(d.servizio);
      if (d.dateISO) {
        const dt = new Date(d.dateISO);
        setSelectedDate(dt);
        setCalendarMonth(dt.getMonth());
        setCalendarYear(dt.getFullYear());
      }
      if (d.slot) setSlotSelezionato(d.slot);
      if (d.recipient) setRecipient(d.recipient);
      setCgFirstName(d.cgFirstName || "");
      setCgLastName(d.cgLastName || "");
      setCgVia(d.cgVia || "");
      setCgCivico(d.cgCivico || "");
      setCgCap(d.cgCap || "");
      setCgCitta(d.cgCitta || "");
      setSelfMedicalNotes(d.selfMedicalNotes || "");
      setCgLivesInCondominio(d.cgLivesInCondominio ?? null);
      setCgIntercomName(d.cgIntercomName || "");
      setCgFloorNumber(d.cgFloorNumber || "");
      setCgAccessNotes(d.cgAccessNotes || "");
      setCgEmergencyName(d.cgEmergencyName || "");
      setCgEmergencyPhone(d.cgEmergencyPhone || "");
      setCgMedicalNotes(d.cgMedicalNotes || "");
      localStorage.removeItem(BOOKING_DRAFT_KEY);
    } catch {
      localStorage.removeItem(BOOKING_DRAFT_KEY);
    }
  }, [id]);

  // Prefill from saved profile (caregiver address + medical/housing/emergency)
  useEffect(() => {
    if (!userProfile || draftAppliedRef.current) return;
    const p = userProfile as any;
    const savedAddr = p.caregiver_address;
    if (savedAddr) {
      const parsed = parseAddressToFields(savedAddr);
      setCgVia(parsed.via);
      setCgCivico(parsed.civico);
      setCgCap(parsed.cap);
      setCgCitta(parsed.citta);
    }
    setCgFirstName(p.caregiver_first_name || "");
    setCgLastName(p.caregiver_last_name || "");
    setSelfMedicalNotes(p.medical_notes || "");
    if (p.caregiver_lives_in_condominio !== null && p.caregiver_lives_in_condominio !== undefined) {
      setCgLivesInCondominio(!!p.caregiver_lives_in_condominio);
    }
    setCgIntercomName(p.caregiver_intercom_name || "");
    setCgFloorNumber(p.caregiver_floor_number || "");
    setCgAccessNotes(p.caregiver_access_notes || "");
    setCgEmergencyName(p.caregiver_emergency_name || "");
    setCgEmergencyPhone(p.caregiver_emergency_phone || "");
    setCgMedicalNotes(p.caregiver_medical_notes || "");
  }, [userProfile]);

  // Recipient type from the search page (?per=self|other)
  useEffect(() => {
    const per = searchParams.get("per");
    if (!draftAppliedRef.current && (per === "self" || per === "other")) setRecipient(per);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Ripeti ultima prestazione": prefill all data from a previous booking (time is chosen again)
  const repeatId = searchParams.get("ripeti");
  useEffect(() => {
    if (!repeatId || !userProfile?.id) return;
    (async () => {
      const { data: b } = await supabase.from("bookings").select("*").eq("id", repeatId).maybeSingle();
      if (!b) return;
      const r = b as any;
      draftAppliedRef.current = true;
      setServizioSelezionato(r.service_name);
      setRecipient(r.recipient_type === "other" ? "other" : "self");
      if (r.recipient_type === "other") {
        setCgFirstName(r.recipient_first_name || "");
        setCgLastName(r.recipient_last_name || "");
        if (r.recipient_address) {
          const parsed = parseAddressToFields(r.recipient_address);
          setCgVia(parsed.via); setCgCivico(parsed.civico); setCgCap(parsed.cap); setCgCitta(parsed.citta);
        }
        setCgLivesInCondominio(r.lives_in_condominio ?? null);
        setCgIntercomName(r.intercom_name || "");
        setCgFloorNumber(r.floor_number || "");
        setCgAccessNotes(r.access_notes || "");
        setCgEmergencyName(r.emergency_contact_name || "");
        setCgEmergencyPhone(r.emergency_contact_phone || "");
        setCgMedicalNotes(r.medical_notes || "");
      } else {
        setSelfMedicalNotes(r.medical_notes || "");
      }
      toast({ title: "Dati della prestazione precedente inseriti", description: "Scegli un nuovo giorno e orario. Puoi modificare tutti i dati." });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repeatId, userProfile?.id]);

  // Distance between the recipient's address and the professional (10 km rule)
  const [recipientKm, setRecipientKm] = useState<number | null>(null);
  const cgAddressKey = recipient === "other" && cgVia && cgCitta ? composeAddress(cgVia, cgCivico, cgCap, cgCitta) : "";
  useEffect(() => {
    const prof = professional as any;
    if (!prof?.lat || !prof?.lng) { setRecipientKm(null); return; }
    let cancelled = false;
    (async () => {
      let coords: { lat: number; lng: number } | null = null;
      const up = userProfile as any;
      if (recipient === "self") {
        if (up?.lat && up?.lng) coords = { lat: up.lat, lng: up.lng };
        else if (up?.address) coords = await geocode(up.address);
      } else if (cgAddressKey) {
        coords = await geocode(cgAddressKey);
      }
      if (!cancelled) setRecipientKm(coords ? haversineKm(coords.lat, coords.lng, prof.lat, prof.lng) : null);
    })();
    return () => { cancelled = true; };
  }, [professional, recipient, cgAddressKey, userProfile]);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      const [profileRes, servicesRes, availRes, reviewsRes, overridesRes, bookingsRes] = await Promise.all([
        supabase.from("public_professionals" as any).select("*").eq("id", id).single(),
        supabase.from("services").select("*").eq("professional_id", id),
        supabase.from("availability").select("*").eq("professional_id", id),
        supabase.from("public_reviews" as any).select("*").eq("professional_id", id).order("created_at", { ascending: false }),
        supabase.from("availability_overrides").select("*").eq("professional_id", id),
        supabase.from("bookings").select("day, time_slot").eq("professional_id", id).in("status", ["pending", "confirmed"]),
      ]);

      if (profileRes.data) setProfessional(profileRes.data as unknown as ProfessionalProfile);
      if (servicesRes.data) setServices(servicesRes.data);
      if (availRes.data) setAvailability(availRes.data);
      if (reviewsRes.data) setReviews(reviewsRes.data as unknown as Review[]);
      if (overridesRes.data) setOverrides(overridesRes.data);
      if (bookingsRes.data) setBookedSlots(bookingsRes.data);

      setLoading(false);
    };
    fetchData();
  }, [id]);

  // Calendar helpers
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Get slots for a specific date (considering overrides)
  const getSlotsForDate = (date: Date) => {
    const dayName = weekdayToDayName[date.getDay()];
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const dateOverrides = overrides.filter(o => o.specific_date === dateStr);

    // Start with weekly slots
    const weeklySlots = availability
      .filter(a => a.day_of_week === dayName)
      .map(a => ({ start: a.start_time.slice(0, 5), end: a.end_time.slice(0, 5) }));

    // Apply overrides
    const result: string[] = [];
    const allHours = new Set<number>();

    // Add weekly hours
    weeklySlots.forEach(s => {
      const h = parseInt(s.start.substring(0, 2));
      allHours.add(h);
    });

    // Process overrides
    dateOverrides.forEach(o => {
      const h = parseInt(o.start_time.substring(0, 2));
      if (o.is_unavailable) {
        allHours.delete(h);
      } else {
        allHours.add(h);
      }
    });

    const sorted = Array.from(allHours).sort((a, b) => a - b);

    // Filter out booked slots
    const formatDateLabel = (d: Date) => {
      const dn = weekdayToDayName[d.getDay()];
      return `${dn} ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    };
    const dayLabel = formatDateLabel(date);

    return sorted
      .map(h => `${h}-${h + 1}`)
      .filter(slot => !bookedSlots.some(b => b.day === dayLabel && b.time_slot === slot));
  };

  const isDateAvailable = (day: number) => {
    const date = new Date(calendarYear, calendarMonth, day);
    if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return false;
    return getSlotsForDate(date).length > 0;
  };

  const handleDateClick = (day: number) => {
    if (!isDateAvailable(day)) return;
    const date = new Date(calendarYear, calendarMonth, day);
    setSelectedDate(date);
    setSlotSelezionato(null);
    // Porta in vista il pannello degli orari subito dopo la scelta del giorno
    requestAnimationFrame(() => {
      slotPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  
  const slotsForSelectedDay = selectedDate ? getSlotsForDate(selectedDate) : [];

  const prevMonth = () => {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
    else setCalendarMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
    else setCalendarMonth(m => m + 1);
  };

  const canGoPrev = calendarYear > today.getFullYear() || (calendarYear === today.getFullYear() && calendarMonth > today.getMonth());

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AuthHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen flex flex-col">
        <AuthHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-senior-xl">Profilo non trovato</p>
            <Button onClick={() => navigate("/dashboard-paziente")} className="mt-4">Torna alla ricerca</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  const selectedService = services.find(s => s.name === servizioSelezionato);
  const bookingPricing = getBookingPricing(selectedService?.price || 0, selectedDate, slotSelezionato);
  const finalPrice = priceWithDistance(bookingPricing.finalPrice, recipientKm);

  const typeLabel = professional.professional_type === "oss" ? "OSS"
    : professional.professional_type === "fisioterapista" ? "Fisioterapista"
    : "Infermiere";

  const registrationNumber = professional.professional_type === "fisioterapista"
    ? professional.numero_fnofi : professional.numero_opi;
  const registrationLabel = professional.professional_type === "fisioterapista" ? "FNOFI" : "OPI";

  const formatSelectedDate = (date: Date) => {
    const dayName = weekdayToDayName[date.getDay()];
    return `${dayName} ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handlePrenotaSenzaPagamento = async () => {
    if (!servizioSelezionato || !slotSelezionato || !selectedDate) {
      toast({ title: "Seleziona tutti i campi", description: "Scegli un giorno e uno slot orario.", variant: "destructive" });
      return;
    }
    if (!user || !userProfile?.id) {
      // Save the whole booking draft so it can be restored after login/signup
      localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify({
        professionalId: professional.id,
        servizio: servizioSelezionato,
        dateISO: selectedDate.toISOString(),
        slot: slotSelezionato,
        recipient,
        cgFirstName, cgLastName, cgVia, cgCivico, cgCap, cgCitta,
        selfMedicalNotes,
        cgLivesInCondominio, cgIntercomName, cgFloorNumber, cgAccessNotes,
        cgEmergencyName, cgEmergencyPhone, cgMedicalNotes,
        savedAt: Date.now(),
      }));
      toast({ title: "Accedi per prenotare", description: "Registrati o accedi al tuo profilo per completare la prenotazione. I dati inseriti verranno conservati." });
      navigate("/login", {
        state: {
          redirect: `${window.location.pathname}${window.location.search}`,
          message: "Per prenotare una prestazione devi accedere al tuo profilo o registrarti gratuitamente.",
        },
      });
      return;
    }

    let recipientAddress: string | null = null;
    let bookingHousing: { lives_in_condominio: boolean | null; intercom_name: string | null; floor_number: string | null; access_notes: string | null } = {
      lives_in_condominio: null, intercom_name: null, floor_number: null, access_notes: null,
    };
    let bookingEmergencyName: string | null = null;
    let bookingEmergencyPhone: string | null = null;
    let bookingMedicalNotes: string | null = null;

    if (recipient === "other") {
      const errs = {
        firstName: !cgFirstName.trim(),
        lastName: !cgLastName.trim(),
        via: !cgVia.trim(),
        civico: !cgCivico.trim(),
        cap: !cgCap.trim(),
        citta: !cgCitta.trim(),
      };
      setCgErrors(errs);
      if (Object.values(errs).some(Boolean)) {
        toast({ title: "Dati del familiare incompleti", description: "Compila nome, cognome e indirizzo dell'assistito.", variant: "destructive" });
        const firstId = errs.firstName ? "cg-first-name" : errs.lastName ? "cg-last-name" : errs.via ? "cg-via-field" : errs.civico ? "cg-civico-field" : errs.cap ? "cg-cap-field" : "cg-citta-field";
        document.getElementById(firstId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById(firstId)?.focus();
        return;
      }
      // Validate housing for caregiver
      const hErr: HousingInfoErrors = {
        livesInCondominio: cgLivesInCondominio === null,
        intercomName: cgLivesInCondominio === true && !cgIntercomName.trim(),
        floorNumber: cgLivesInCondominio === true && !cgFloorNumber.trim(),
      };
      setCgHousingErrors(hErr);
      if (Object.values(hErr).some(Boolean)) {
        toast({ title: "Informazioni abitazione mancanti", description: "Indica se l'assistito abita in un condominio e compila i campi richiesti.", variant: "destructive" });
        const firstId = hErr.livesInCondominio ? "cg-housing-cond-yes" : hErr.intercomName ? "cg-housing-intercom" : "cg-housing-floor";
        document.getElementById(firstId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById(firstId)?.focus();
        return;
      }

      recipientAddress = composeAddress(cgVia, cgCivico, cgCap, cgCitta);
      bookingHousing = {
        lives_in_condominio: cgLivesInCondominio,
        intercom_name: cgLivesInCondominio ? cgIntercomName : null,
        floor_number: cgLivesInCondominio ? cgFloorNumber : null,
        access_notes: cgLivesInCondominio ? cgAccessNotes : null,
      };
      bookingEmergencyName = cgEmergencyName || null;
      bookingEmergencyPhone = cgEmergencyPhone || null;
      bookingMedicalNotes = cgMedicalNotes || null;

      // Persist caregiver data to profile so the user can reuse it next time
      await supabase.from("profiles").update({
        caregiver_first_name: cgFirstName,
        caregiver_last_name: cgLastName,
        caregiver_address: recipientAddress,
        caregiver_lives_in_condominio: cgLivesInCondominio,
        caregiver_intercom_name: bookingHousing.intercom_name,
        caregiver_floor_number: bookingHousing.floor_number,
        caregiver_access_notes: bookingHousing.access_notes,
        caregiver_emergency_name: bookingEmergencyName,
        caregiver_emergency_phone: bookingEmergencyPhone,
        caregiver_medical_notes: bookingMedicalNotes,
      } as any).eq("user_id", user.id);
    } else {
      recipientAddress = (userProfile as any)?.address || null;
      const p = userProfile as any;
      bookingHousing = {
        lives_in_condominio: p?.lives_in_condominio ?? null,
        intercom_name: p?.intercom_name ?? null,
        floor_number: p?.floor_number ?? null,
        access_notes: p?.access_notes ?? null,
      };
      bookingMedicalNotes = selfMedicalNotes || null;
      // Persist updated medical notes back to profile
      if ((p?.medical_notes || "") !== selfMedicalNotes) {
        await supabase.from("profiles").update({ medical_notes: bookingMedicalNotes } as any).eq("user_id", user.id);
      }
    }

    setPaymentLoading(true);
    try {
      const dayStr = formatSelectedDate(selectedDate);
      const { data: newBooking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          patient_id: userProfile.id,
          professional_id: professional.id,
          service_name: servizioSelezionato,
          price: finalPrice,
          day: dayStr,
          time_slot: slotSelezionato,
          status: "pending",
          recipient_address: recipientAddress,
          recipient_type: recipient,
          recipient_first_name: recipient === "other" ? cgFirstName : null,
          recipient_last_name: recipient === "other" ? cgLastName : null,
          lives_in_condominio: bookingHousing.lives_in_condominio,
          intercom_name: bookingHousing.intercom_name,
          floor_number: bookingHousing.floor_number,
          access_notes: bookingHousing.access_notes,
          emergency_contact_name: bookingEmergencyName,
          emergency_contact_phone: bookingEmergencyPhone,
          medical_notes: bookingMedicalNotes,
        } as any)
        .select()
        .single();

      if (bookingError) throw bookingError;
      if (!newBooking) throw new Error("Impossibile creare la prenotazione.");

      const newId = (newBooking as any).id as string;
      try {
        await supabase.functions.invoke("send-booking-notifications", { body: { bookingId: newId } });
      } catch (e) {
        console.error(e);
      }
      localStorage.removeItem(BOOKING_DRAFT_KEY);
      navigate(`/prenotazione-confermata?booking=${newId}`);
    } catch (err: unknown) {
      const message = italianError(err, "booking");
      toast({ title: "Errore", description: message, variant: "destructive" });
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={`${professional.first_name} ${professional.last_name} — ${professional.professional_type || "Professionista sanitario"} a domicilio`}
        description={(professional.bio || `Prenota una prestazione a domicilio con ${professional.first_name} ${professional.last_name}${professional.zona ? ` nella zona di ${professional.zona}` : ""} su ComuniCARE.`).slice(0, 158)}
        path={`/profilo-infermiere/${professional.id}`}
        image={professional.photo_url || undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          name: `${professional.first_name} ${professional.last_name}`,
          description: professional.bio || undefined,
          image: professional.photo_url || undefined,
          areaServed: professional.zona || "Firenze",
          provider: { "@type": "Organization", name: "ComuniCARE" },
        }}
      />
      <AuthHeader />
      <main className="flex-1 bg-background md:py-12 py-0">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <Button variant="ghost" onClick={() => navigate("/dashboard-paziente")} className="mb-4 md:mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" /> Torna alla ricerca
          </Button>

          {/* Profilo */}
          <Card className="mb-6 md:mb-8">
            <CardContent className="p-4 md:p-8">
              <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-4 md:mb-6">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-2xl md:text-senior-3xl flex-shrink-0 overflow-hidden">
                  {professional.photo_url ? (
                    <img src={professional.photo_url} alt={professional.first_name} className="w-full h-full object-cover" />
                  ) : (
                    professional.first_name[0]
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-xl md:text-senior-2xl font-bold flex items-center gap-2 flex-wrap">
                    {professional.first_name} {professional.last_name}
                    {professional.verified && <BadgeCheck className="w-5 h-5 md:w-6 md:h-6 text-primary flex-shrink-0" />}
                  </h1>
                  <span className="text-xs font-medium text-primary bg-secondary px-2 py-0.5 rounded mt-1 inline-block">{typeLabel}</span>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    {avgRating > 0 && (
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        {avgRating} ({reviews.length} recensioni)
                      </span>
                    )}
                    {professional.zona && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" /> {professional.zona}
                      </span>
                    )}
                  </div>
                  {registrationNumber && (
                    <p className="text-xs text-muted-foreground mt-1">{registrationLabel}: {registrationNumber}</p>
                  )}
                </div>
              </div>
              {professional.bio && <p className="text-sm md:text-senior-base text-muted-foreground">{professional.bio}</p>}
            </CardContent>
          </Card>

          {/* Servizio selezionato (solo quello ricercato) */}
          {selectedService ? (
            <Card className="mb-6 md:mb-8">
              <CardHeader>
                <CardTitle className="text-base md:text-senior-lg flex items-center justify-between gap-2">
                  <span>Prestazione selezionata</span>
                  {services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => { setServizioSelezionato(null); setSlotSelezionato(null); }}
                      className="text-xs text-primary underline font-normal"
                    >
                      Cambia
                    </button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 md:p-4 rounded-lg border border-primary bg-secondary">
                  <span className="text-sm md:text-senior-sm font-medium">{selectedService.name}</span>
                  <span className="text-base md:text-senior-base font-bold text-primary">€{selectedService.price}</span>
                </div>
              </CardContent>
            </Card>
          ) : services.length > 0 ? (
            <Card className="mb-6 md:mb-8">
              <CardHeader>
                <CardTitle className="text-base md:text-senior-lg">Scegli la prestazione</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs md:text-sm text-muted-foreground mb-3">
                  Seleziona una prestazione per procedere con la prenotazione.
                </p>
                <div className="space-y-1.5">
                  {services.map((s) => (
                    <button
                      key={s.id ?? s.name}
                      type="button"
                      onClick={() => { setServizioSelezionato(s.name); setSlotSelezionato(null); }}
                      className="flex w-full justify-between items-start gap-2 p-3 rounded-md border border-border hover:border-primary text-xs md:text-sm text-left transition-colors"
                    >
                      <span className="break-words whitespace-normal leading-snug flex-1 min-w-0">{s.name}</span>
                      <span className="font-bold text-primary flex-shrink-0">€{s.price}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Calendario disponibilità */}
          <Card className="mb-6 md:mb-8">
            <CardHeader>
              <CardTitle className="text-base md:text-senior-lg">Scegli data e orario</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="icon" onClick={prevMonth} disabled={!canGoPrev} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold">{monthNames[calendarMonth]} {calendarYear}</span>
                <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const available = isDateAvailable(day);
                  const isSelected = selectedDate &&
                    selectedDate.getDate() === day &&
                    selectedDate.getMonth() === calendarMonth &&
                    selectedDate.getFullYear() === calendarYear;
                  const isToday = day === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear();

                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(day)}
                      disabled={!available}
                      className={`aspect-square flex items-center justify-center rounded-md text-sm transition-colors
                        ${isSelected ? "bg-primary text-primary-foreground font-bold" : ""}
                        ${!isSelected && available ? "hover:bg-secondary cursor-pointer font-medium" : ""}
                        ${!available ? "text-muted-foreground/40 cursor-default" : ""}
                        ${isToday && !isSelected ? "border border-primary" : ""}
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Time slots for selected date */}
              {selectedDate && slotsForSelectedDay.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">
                    Orari disponibili per {formatSelectedDate(selectedDate)}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {slotsForSelectedDay.map(slot => (
                      <button
                        key={slot}
                        onClick={() => setSlotSelezionato(slot)}
                        className={`flex items-center gap-1 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm transition-colors ${
                          slotSelezionato === slot
                            ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                        }`}
                      >
                        <Clock className="w-3 h-3" />{slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedDate && slotsForSelectedDay.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground text-center">Nessuno slot disponibile per questa data.</p>
              )}

              {availability.length === 0 && overrides.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Nessuna disponibilità impostata al momento.</p>
              )}
            </CardContent>
          </Card>

          {/* Per chi stai prenotando? — solo per pazienti */}
          {userProfile?.role !== "professionista" && servizioSelezionato && slotSelezionato && selectedDate && (
            <Card className="mb-6 md:mb-8">
              <CardHeader>
                <CardTitle className="text-base md:text-senior-lg">{recipientPreset ? "Prima di prenotare" : "Per chi stai prenotando?"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!recipientPreset && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRecipient("self")}
                    className={`text-left p-3 rounded-lg border-2 transition-colors ${
                      recipient === "self" ? "border-primary bg-secondary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-semibold text-sm">Per me</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {(userProfile as any)?.address || "Il tuo indirizzo di residenza"}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipient("other")}
                    className={`text-left p-3 rounded-lg border-2 transition-colors ${
                      recipient === "other" ? "border-primary bg-secondary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-semibold text-sm">Per un familiare / assistito</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {hasSavedCaregiverAddr
                        ? (userProfile as any).caregiver_address
                        : "Inserisci l'indirizzo dove recapitare la prestazione"}
                    </p>
                  </button>
                </div>
                )}

                {recipient === "other" && recipientPreset && cgComplete && (
                  <div className="p-4 rounded-lg border border-primary/30 bg-secondary/30">
                    <MedicalNotesField
                      value={cgMedicalNotes}
                      onChange={setCgMedicalNotes}
                      label="Note importanti sulla condizione del familiare / assistito (consigliato)"
                      idPrefix="cg-medical-notes"
                    />
                  </div>
                )}

                {recipient === "other" && !(recipientPreset && cgComplete) && (
                  <div className="p-4 rounded-lg border border-primary/30 bg-secondary/30 space-y-5">
                    <p className="text-sm text-muted-foreground">
                      Inserisci i dati della persona che riceverà la prestazione. Il professionista si recherà a questo indirizzo.
                      {hasSavedCaregiverAddr && " I dati saranno aggiornati per le prossime prenotazioni."}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="cg-first-name" className="text-senior-sm">
                          Nome dell'assistito <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="cg-first-name"
                          value={cgFirstName}
                          onChange={(e) => { setCgFirstName(e.target.value); setCgErrors(er => ({ ...er, firstName: false })); }}
                          placeholder="Es. Mario"
                          className={`text-senior-sm py-3 ${cgErrors.firstName ? "border-destructive" : ""}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="cg-last-name" className="text-senior-sm">
                          Cognome dell'assistito <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="cg-last-name"
                          value={cgLastName}
                          onChange={(e) => { setCgLastName(e.target.value); setCgErrors(er => ({ ...er, lastName: false })); }}
                          placeholder="Es. Rossi"
                          className={`text-senior-sm py-3 ${cgErrors.lastName ? "border-destructive" : ""}`}
                        />
                      </div>
                    </div>
                    <StructuredAddressInput
                      via={cgVia}
                      civico={cgCivico}
                      cap={cgCap}
                      citta={cgCitta}
                      onViaChange={(v) => { setCgVia(v); setCgErrors(e => ({ ...e, via: false })); }}
                      onCivicoChange={(v) => { setCgCivico(v); setCgErrors(e => ({ ...e, civico: false })); }}
                      onCapChange={(v) => { setCgCap(v); setCgErrors(e => ({ ...e, cap: false })); }}
                      onCittaChange={(v) => { setCgCitta(v); setCgErrors(e => ({ ...e, citta: false })); }}
                      label="Indirizzo del familiare / assistito"
                      errors={cgErrors}
                      idPrefix="cg"
                      required
                    />

                    <HousingInfoFields
                      livesInCondominio={cgLivesInCondominio}
                      intercomName={cgIntercomName}
                      floorNumber={cgFloorNumber}
                      accessNotes={cgAccessNotes}
                      onLivesInCondominioChange={(v) => { setCgLivesInCondominio(v); setCgHousingErrors(e => ({ ...e, livesInCondominio: false })); }}
                      onIntercomNameChange={(v) => { setCgIntercomName(v); setCgHousingErrors(e => ({ ...e, intercomName: false })); }}
                      onFloorNumberChange={(v) => { setCgFloorNumber(v); setCgHousingErrors(e => ({ ...e, floorNumber: false })); }}
                      onAccessNotesChange={setCgAccessNotes}
                      errors={cgHousingErrors}
                      idPrefix="cg-housing"
                      title="L'assistito abita in un condominio?"
                    />

                    <div className="space-y-3">
                      <p className="text-senior-sm font-semibold">Contatto di emergenza</p>
                      <p className="text-xs text-muted-foreground -mt-2">
                        Nome e numero di un familiare o caregiver di riferimento da contattare in caso di necessità.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="cg-emerg-name" className="text-senior-sm">Nome</Label>
                          <Input
                            id="cg-emerg-name"
                            value={cgEmergencyName}
                            onChange={(e) => setCgEmergencyName(e.target.value)}
                            placeholder="Es. Maria Rossi"
                            className="text-senior-sm py-3"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="cg-emerg-phone" className="text-senior-sm">Telefono</Label>
                          <Input
                            id="cg-emerg-phone"
                            type="tel"
                            value={cgEmergencyPhone}
                            onChange={(e) => setCgEmergencyPhone(e.target.value)}
                            placeholder="Es. +39 333 1234567"
                            className="text-senior-sm py-3"
                          />
                        </div>
                      </div>
                    </div>

                    <MedicalNotesField
                      value={cgMedicalNotes}
                      onChange={setCgMedicalNotes}
                      label="Note importanti sulla condizione dell'assistito (consigliato)"
                      idPrefix="cg-medical-notes"
                    />
                  </div>
                )}

                {recipient === "self" && (
                  <div className="p-4 rounded-lg border border-primary/30 bg-secondary/30">
                    <MedicalNotesField
                      value={selfMedicalNotes}
                      onChange={setSelfMedicalNotes}
                      label="Note importanti sulla tua condizione (consigliato)"
                      idPrefix="self-medical-notes"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Le modifiche verranno salvate anche nel tuo profilo per le prossime prenotazioni.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Riepilogo e prenotazione (pagamento temporaneamente disabilitato) */}
          {servizioSelezionato && slotSelezionato && selectedDate && (
            <Card className="mb-6 md:mb-8 border-primary border-2">
              <CardContent className="p-4 md:p-6">
                <h3 className="text-base md:text-senior-lg font-semibold mb-3">Riepilogo prenotazione</h3>
                <div className="space-y-2 text-sm md:text-senior-sm mb-4">
                  <p><strong>Servizio:</strong> {servizioSelezionato}</p>
                  <p><strong>Giorno:</strong> {formatSelectedDate(selectedDate)}</p>
                  <p><strong>Orario:</strong> {slotSelezionato}</p>
                  <p><strong>Tariffa base:</strong> €{bookingPricing.basePrice}</p>
                  <p><strong>Prezzo finale:</strong> €{finalPrice}</p>
                  {bookingPricing.surchargeReason && (
                    <p className="text-xs text-muted-foreground">
                      {bookingPricing.surchargeReason}
                    </p>
                  )}
                  {isLongDistance(recipientKm) && (
                    <p className="text-xs text-muted-foreground">
                      Prestazione a lunga distanza (circa {Math.round(recipientKm!)} km): maggiorazione del 10%.
                    </p>
                  )}
                </div>
                <Button size="lg" onClick={handlePrenotaSenzaPagamento} className="w-full py-5 md:py-6" disabled={paymentLoading}>
                  {paymentLoading ? "Prenotazione in corso..." : "Prenota"}
                </Button>
                {!user && (
                  <p className="text-xs md:text-sm text-primary text-center mt-2 font-medium">
                    Per proseguire con la prenotazione ti verrà richiesto l'accesso o la registrazione
                  </p>
                )}
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Riceverai una conferma via email e sarai ricontattato al più presto dal nostro team.
                </p>
                <p className="text-xs text-muted-foreground text-center mt-1 font-bold">
                  In caso di cancellazione, è obbligatorio avvisare almeno 24 ore prima della prestazione.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProfiloInfermiere;
