import { useEffect, useMemo, useState } from "react";
import AuthHeader from "@/components/AuthHeader";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, Settings, MapPin, Camera, Clock, User, Phone, Home, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { italianError } from "@/lib/italianErrors";
import { parseBookingDay, dateKey } from "@/lib/bookingDates";
import type { DayContentProps } from "react-day-picker";

type Booking = {
  id: string; service_name: string; price: number; day: string; time_slot: string; status: string;
  recipient_type: string | null; recipient_first_name: string | null; recipient_last_name: string | null;
  recipient_address: string | null; lives_in_condominio: boolean | null; intercom_name: string | null;
  floor_number: string | null; access_notes: string | null; emergency_contact_name: string | null;
  emergency_contact_phone: string | null; medical_notes: string | null;
  patient_first_name: string | null; patient_last_name: string | null; patient_phone: string | null;
};

const weekdayNames = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const typeLabel = (t?: string) => (t === "oss" ? "OSS" : t === "fisioterapista" ? "Fisioterapista" : "Infermiere");
const recipientName = (b: Booking) =>
  b.recipient_type === "other"
    ? `${b.recipient_first_name ?? ""} ${b.recipient_last_name ?? ""}`.trim()
    : `${b.patient_first_name ?? ""} ${b.patient_last_name ?? ""}`.trim();

const DashboardProfessionista = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [weekdays, setWeekdays] = useState<Set<string>>(new Set());
  const [extraDays, setExtraDays] = useState<Set<string>>(new Set());
  const [offDays, setOffDays] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Date | undefined>();
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (profile && profile.role !== "professionista") navigate("/");
  }, [loading, user, profile]);

  const load = async () => {
    if (!profile) return;
    const [{ data: b, error }, { data: av }, { data: ov }] = await Promise.all([
      (supabase.rpc as any)("get_professional_bookings"),
      supabase.from("availability").select("day_of_week").eq("professional_id", profile.id),
      supabase.from("availability_overrides").select("specific_date, is_unavailable").eq("professional_id", profile.id),
    ]);
    if (error) toast({ title: "Errore", description: italianError(error, "booking"), variant: "destructive" });
    setBookings((b as Booking[]) ?? []);
    setWeekdays(new Set((av ?? []).map((a: any) => a.day_of_week)));
    setExtraDays(new Set((ov ?? []).filter((o: any) => !o.is_unavailable).map((o: any) => o.specific_date)));
    const extra = new Set((ov ?? []).filter((o: any) => !o.is_unavailable).map((o: any) => o.specific_date));
    setOffDays(new Set((ov ?? []).filter((o: any) => o.is_unavailable && !extra.has(o.specific_date)).map((o: any) => o.specific_date)));
  };

  useEffect(() => { load(); }, [profile?.id]);

  const active = bookings.filter((b) => b.status !== "cancelled");
  const byDay = useMemo(() => {
    const m = new Map<string, Booking[]>();
    active.forEach((b) => {
      const d = parseBookingDay(b.day);
      if (!d) return;
      const k = dateKey(d);
      m.set(k, [...(m.get(k) ?? []), b]);
    });
    return m;
  }, [bookings]);

  const bookedDates = [...byDay.keys()].map((k) => { const [y, mo, d] = k.split("-").map(Number); return new Date(y, mo - 1, d); });
  const isAvailable = (d: Date) => {
    const k = dateKey(d);
    if (offDays.has(k)) return false;
    return extraDays.has(k) || weekdays.has(weekdayNames[d.getDay()]);
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sortedActive = [...active].sort((a, b) =>
    (parseBookingDay(a.day)?.getTime() ?? 0) - (parseBookingDay(b.day)?.getTime() ?? 0) || a.time_slot.localeCompare(b.time_slot));
  const shown = selected
    ? byDay.get(dateKey(selected)) ?? []
    : sortedActive.filter((b) => (parseBookingDay(b.day)?.getTime() ?? 0) >= today.getTime());

  const DayContent = (props: DayContentProps) => {
    const list = byDay.get(dateKey(props.date));
    const inner = (
      <span className="relative flex h-full w-full items-center justify-center">
        {props.date.getDate()}
        {list && <span className="absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary" />}
      </span>
    );
    if (!list) return inner;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent className="max-w-xs text-left">
          {list.map((b) => (
            <p key={b.id} className="text-sm">
              <strong>{b.time_slot}</strong> · {b.service_name} · {recipientName(b) || "Utente"}
            </p>
          ))}
        </TooltipContent>
      </Tooltip>
    );
  };

  const cancelBooking = async (b: Booking) => {
    setCancelling(b.id);
    const { error } = await (supabase.rpc as any)("cancel_booking", { _booking_id: b.id });
    if (error) {
      setCancelling(null);
      toast({ title: "Impossibile annullare", description: italianError(error, "cancellation"), variant: "destructive" });
      return;
    }
    try {
      await supabase.functions.invoke("send-booking-notifications", { body: { bookingId: b.id, event: "cancelled" } });
    } catch (e) { console.error(e); }
    setCancelling(null);
    toast({ title: "Prenotazione annullata", description: "Il team ComuniCARE è stato avvisato." });
    load();
  };

  const v = (x: unknown) => (x === null || x === undefined || x === "" ? "—" : String(x));

  return (
    <div className="min-h-screen flex flex-col">
      <AuthHeader />
      <main className="flex-1 bg-background md:py-12 py-4">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          {/* Foto e nome */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt="Foto profilo" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-xl md:text-senior-3xl font-bold leading-tight">
                {profile ? `${profile.first_name} ${profile.last_name}` : "Dashboard professionista"}
              </h1>
              <p className="text-base text-muted-foreground">{typeLabel(profile?.professional_type)}</p>
            </div>
          </div>

          {/* Calendario */}
          <Card className="mb-6">
            <CardContent className="p-3 md:p-6">
              <h2 className="text-lg md:text-senior-lg font-semibold mb-2">Il tuo calendario</h2>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selected}
                  onSelect={setSelected}
                  modifiers={{ available: isAvailable, booked: bookedDates }}
                  modifiersClassNames={{
                    available: "bg-secondary text-secondary-foreground font-semibold",
                    booked: "ring-2 ring-primary",
                  }}
                  components={{ DayContent }}
                  className="pointer-events-auto"
                />
              </div>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-secondary border" />Giorni disponibili</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Prenotazione ricevuta</span>
              </div>
            </CardContent>
          </Card>

          {/* Prenotazioni per esteso */}
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="text-lg md:text-senior-lg font-semibold">
              {selected ? `Prenotazioni del ${selected.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}` : "Prossime prenotazioni"}
            </h2>
            {selected && <Button variant="ghost" size="sm" onClick={() => setSelected(undefined)}>Mostra tutte</Button>}
          </div>
          <div className="space-y-4 mb-8">
            {shown.length === 0 && (
              <Card><CardContent className="p-6 text-center text-muted-foreground">
                {selected ? "Nessuna prenotazione in questo giorno." : "Non hai ancora prenotazioni in arrivo."}
              </CardContent></Card>
            )}
            {shown.map((b) => (
              <Card key={b.id} className="border-primary/30">
                <CardContent className="p-4 md:p-6 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold">{b.service_name}</p>
                      <p className="flex items-center gap-1.5 text-muted-foreground"><Clock className="w-4 h-4" />{b.day} · ore {b.time_slot}</p>
                    </div>
                    <span className="text-lg font-bold text-primary">€{b.price}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm md:text-base">
                    <p className="flex items-center gap-1.5"><User className="w-4 h-4 text-primary" />
                      {recipientName(b) || "—"}{b.recipient_type === "other" ? " (familiare / assistito)" : ""}</p>
                    <p className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-primary" />{v(b.patient_phone)}</p>
                    <p className="flex items-start gap-1.5 sm:col-span-2"><Home className="w-4 h-4 text-primary mt-0.5" />{v(b.recipient_address)}</p>
                    <p>Condominio: {b.lives_in_condominio ? "sì" : "no"}{b.lives_in_condominio ? ` · Citofono: ${v(b.intercom_name)} · Piano: ${v(b.floor_number)}` : ""}</p>
                    {b.access_notes && <p>Note accesso: {b.access_notes}</p>}
                    {(b.emergency_contact_name || b.emergency_contact_phone) && (
                      <p className="sm:col-span-2">Contatto di emergenza: {v(b.emergency_contact_name)} {b.emergency_contact_phone ?? ""}</p>
                    )}
                    {b.medical_notes && <p className="sm:col-span-2">Note sulla condizione: {b.medical_notes}</p>}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="gap-2 text-destructive border-destructive/40" disabled={cancelling === b.id}>
                        <XCircle className="w-4 h-4" />{cancelling === b.id ? "Annullamento..." : "Annulla prenotazione"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Annullare la prenotazione?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {b.service_name} del {b.day} alle {b.time_slot}. Il team ComuniCARE riceverà l'avviso di annullamento.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>No, mantienila</AlertDialogCancel>
                        <AlertDialogAction onClick={() => cancelBooking(b)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Sì, annulla
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/setup-professionista")}>
              <CardContent className="p-4 md:p-6 text-center">
                <Settings className="w-7 h-7 md:w-8 md:h-8 text-primary mx-auto mb-2 md:mb-3" />
                <h3 className="text-base md:text-senior-base font-semibold">Servizi e prezzi</h3>
                <p className="text-sm md:text-sm text-muted-foreground mt-1">Modifica i tuoi servizi</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/setup-professionista/disponibilita")}>
              <CardContent className="p-4 md:p-6 text-center">
                <CalendarIcon className="w-7 h-7 md:w-8 md:h-8 text-primary mx-auto mb-2 md:mb-3" />
                <h3 className="text-base md:text-senior-base font-semibold">Disponibilità</h3>
                <p className="text-sm md:text-sm text-muted-foreground mt-1">Gestisci il calendario</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/setup-professionista/posizione")}>
              <CardContent className="p-4 md:p-6 text-center">
                <MapPin className="w-7 h-7 md:w-8 md:h-8 text-primary mx-auto mb-2 md:mb-3" />
                <h3 className="text-base md:text-senior-base font-semibold">Posizione</h3>
                <p className="text-sm md:text-sm text-muted-foreground mt-1">Aggiorna il segnalino</p>
              </CardContent>
            </Card>
          </div>

          <div id="home-install-guide" className="empty:hidden w-full mt-6" />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DashboardProfessionista;
