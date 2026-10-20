import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthHeader from "@/components/AuthHeader";
import Footer from "@/components/Footer";
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
import { canUserCancel } from "@/lib/bookingSlots";

const StoricoPrestazioni = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("*, professional:professional_id(first_name, last_name)")
      .eq("patient_id", profile.id)
      .order("day", { ascending: false });
    setBookings(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile]);

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
    setCancelling(null);
    toast({ title: "Prenotazione annullata", description: "Il team ComuniCARE è stato avvisato." });
    load();
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
                bookings.map((b) => (
                  <Card key={b.id} className="p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-base break-words">{b.service_name}</p>
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
                        const label = st === "cancelled" ? "Annullata" : st === "done" ? "Effettuata" : st === "confirmed" ? "Confermato" : st === "pending" ? "In attesa" : b.status;
                        const cls = st === "done" ? "bg-success/15 text-success" : st === "confirmed" || st === "pending" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground";
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
                    {b.professional && (
                      <p className="text-xs text-muted-foreground">
                        {b.professional.first_name} {b.professional.last_name}
                      </p>
                    )}
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StoricoPrestazioni;
