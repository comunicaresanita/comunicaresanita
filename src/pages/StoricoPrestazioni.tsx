import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthHeader from "@/components/AuthHeader";
import Footer from "@/components/Footer";
import ServiceInfoButton from "@/components/ServiceInfoButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { italianError } from "@/lib/italianErrors";
import { canUserCancel, canMarkDone, bookingTime, compareBookingsDesc, userBookingStatus, isCancelledStatus } from "@/lib/bookingSlots";
import ReviewDialog from "@/components/ReviewDialog";
import { useSearchParams } from "react-router-dom";

const StoricoPrestazioni = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [reviewFor, setReviewFor] = useState<any | null>(null);
  const [params] = useSearchParams();

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("*, professional:professional_id(first_name, last_name)")
      .eq("patient_id", profile.id);
    // "day" è testo ("Venerdì 30 Ottobre 2026"): l'ordine cronologico si calcola sulla data vera, dalla più recente
    const list = ((data as any[]) || []).sort(compareBookingsDesc);
    setBookings(list);
    const { data: mine } = await supabase.from("reviews").select("booking_id").eq("patient_id", profile.id);
    setReviewed(new Set(((mine as any[]) || []).map((r) => r.booking_id)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile]);

  // Dal link dell'email "prenotazione effettuata": ?recensione=<id> apre la recensione
  useEffect(() => {
    const id = params.get("recensione");
    if (!id || reviewFor) return;
    const b = bookings.find((x) => x.id === id);
    if (b && userBookingStatus(b) === "done" && !reviewed.has(id)) setReviewFor(b);
  }, [bookings, reviewed]);

  const markDone = async (b: any) => {
    setMarking(b.id);
    const { error } = await (supabase.rpc as any)("complete_booking", { _booking_id: b.id });
    setMarking(null);
    if (error) {
      toast({ title: "Impossibile aggiornare", description: italianError(error, "booking"), variant: "destructive" });
      return;
    }
    toast({ title: "Prestazione effettuata", description: "Grazie! Vuoi lasciare una recensione?" });
    await load();
    setReviewFor({ ...b, status: "completed" });
  };

  const cancelBooking = async (b: any) => {
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
    try {
      await supabase.functions.invoke("send-booking-emails", { body: { bookingId: b.id, event: "cancelled" } });
    } catch (e) { console.error(e); }
    setCancelling(null);
    toast({ title: "Prenotazione annullata", description: "Il team ComuniCARE è stato avvisato." });
    load();
  };

  // Attive (in attesa o confermate) in alto, dalla più vicina; sotto concluse, annullate e scadute, dalla più recente
  const isActive = (b: any) => { const st = userBookingStatus(b); return st === "pending" || st === "confirmed"; };
  const activeList = bookings.filter(isActive).sort((a, b) => bookingTime(a) - bookingTime(b));
  const pastList = bookings.filter((b) => !isActive(b)).sort(compareBookingsDesc);
  const ordered = [...activeList, ...pastList];
  const sectionTitle = (i: number) =>
    i === 0 && activeList.length > 0 ? "Prenotazioni attive"
      : i === activeList.length && pastList.length > 0 ? "Concluse e annullate" : null;
  const cardTone = (b: any) => {
    const st = userBookingStatus(b);
    return st === "confirmed" ? "border-success/60 bg-success/5"
      : st === "pending" ? "border-primary/50"
      : st === "cancelled" || st === "rejected" || (st === "expired" && isCancelledStatus(b.status)) ? "border-destructive/50 bg-destructive/5"
      : st === "done" ? "border-success/30"
      : "opacity-80";
  };

  const formatDay = (day: string) => {
    const d = new Date(day);
    return isNaN(d.getTime()) ? day : d.toLocaleDateString("it-IT");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AuthHeader />
      <main className="flex-1 bg-background md:py-12 py-0">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard-paziente")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Indietro
          </Button>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl md:text-senior-xl flex items-center gap-2">
                <ClipboardList className="w-5 h-5" /> Storico prestazioni
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Caricamento...</p>
              ) : bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Non hai ancora effettuato prestazioni.
                </p>
              ) : (
                ordered.map((b, i) => (
                  <Fragment key={b.id}>
                  {sectionTitle(i) && (
                    <h2 className={`text-sm font-semibold uppercase tracking-wide text-muted-foreground ${i === 0 ? "" : "pt-3"}`}>{sectionTitle(i)}</h2>
                  )}
                  <Card className={`p-3 border-2 ${cardTone(b)}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-base break-words flex items-start gap-1">
                          <span className="min-w-0">{b.service_name}</span>
                          <ServiceInfoButton name={b.service_name} className="-mt-0.5" />
                        </p>
                        <p className="mt-1">
                          <span className="inline-block bg-accent text-accent-foreground rounded-md border border-primary/30 px-2 py-0.5 text-sm font-medium mr-2">
                            {formatDay(b.day)}
                          </span>
                          <span className="inline-block bg-accent text-accent-foreground rounded-md border border-primary/30 px-2 py-0.5 text-sm font-medium">
                            {b.time_slot}
                          </span>
                        </p>
                      </div>
                      {(() => {
                        const st = userBookingStatus(b);
                        const label = st === "rejected" ? "Non confermata" : st === "cancelled" ? "Annullata" : st === "done" ? "Effettuata" : st === "confirmed" ? "Confermata" : st === "expired" ? "Scaduta" : st === "pending" ? "In attesa" : b.status;
                        const cls = st === "done" || st === "confirmed" ? "bg-success/15 text-success" : st === "pending" ? "bg-primary/10 text-primary" : st === "cancelled" || st === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground";
                        return <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap font-medium flex-shrink-0 ${cls}`}>{label}</span>;
                      })()}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-base font-semibold text-primary">{b.price} €</p>
                      {canUserCancel(b) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto px-1 py-0.5 text-sm font-medium text-destructive underline underline-offset-2 hover:text-destructive hover:bg-transparent"
                              disabled={cancelling === b.id}
                            >
                              {cancelling === b.id ? "Annullamento..." : "Annulla prenotazione"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Vuoi annullare la prenotazione?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {b.service_name} del {formatDay(b.day)} alle {b.time_slot}. Se confermi, la prenotazione verrà cancellata e l'orario tornerà disponibile.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>No, torna indietro</AlertDialogCancel>
                              <AlertDialogAction onClick={() => cancelBooking(b)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Sì, annulla la prenotazione
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                    {canMarkDone(b) && (
                      <div className="mt-2 rounded-md border border-primary/30 bg-secondary p-3 text-sm space-y-2">
                        <p>La prestazione è stata effettuata?</p>
                        <Button size="sm" className="w-full h-auto min-h-9 py-2 whitespace-normal text-center" disabled={marking === b.id} onClick={() => markDone(b)}>
                          {marking === b.id ? "Salvataggio…" : "Prenotazione effettuata"}
                        </Button>
                      </div>
                    )}
                    {userBookingStatus(b) === "done" && !reviewed.has(b.id) && (
                      <Button size="sm" variant="outline" className="mt-2 w-full h-auto min-h-9 py-2 whitespace-normal text-center" onClick={() => setReviewFor(b)}>
                        Lascia una recensione
                      </Button>
                    )}
                    {(userBookingStatus(b) === "rejected" || (userBookingStatus(b) === "expired" && isCancelledStatus(b.status))) && (
                      <div className="mt-2 rounded-md border border-primary/30 bg-secondary p-3 text-sm space-y-2">
                        <p>{userBookingStatus(b) === "expired"
                          ? "Il professionista non ha risposto entro il termine e la richiesta è scaduta. Puoi scegliere un altro orario o un altro professionista."
                          : "Il professionista non può effettuare questa prestazione nell'orario scelto. Puoi scegliere un altro orario o un altro professionista."}</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            size="sm"
                            className="w-full sm:flex-1 h-auto min-h-9 py-2 whitespace-normal text-center"
                            onClick={() => navigate(`/profilo-infermiere/${b.professional_id}?servizio=${encodeURIComponent(b.service_name)}&per=${b.recipient_type === "other" ? "other" : "self"}&ripeti=${b.id}`)}
                          >
                            Scegli un altro orario
                          </Button>
                          <Button size="sm" variant="outline" className="w-full sm:flex-1 h-auto min-h-9 py-2 whitespace-normal text-center" onClick={() => navigate(`/dashboard-paziente?servizio=${encodeURIComponent(b.service_name)}`)}>
                            Cerca un altro professionista
                          </Button>
                        </div>
                      </div>
                    )}
                    {b.professional && (
                      <p className="text-xs text-muted-foreground">
                        {b.professional.first_name} {b.professional.last_name}
                      </p>
                    )}
                  </Card>
                  </Fragment>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      <ReviewDialog
        open={!!reviewFor}
        onOpenChange={(o) => { if (!o) setReviewFor(null); }}
        booking={reviewFor}
        onDone={load}
      />
    </div>
  );
};

export default StoricoPrestazioni;
