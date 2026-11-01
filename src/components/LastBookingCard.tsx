import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { pickHomeBooking, userBookingStatus, type UserBookingStatus } from "@/lib/bookingSlots";

export const bookingStatusLabel = (st: UserBookingStatus, raw?: string) =>
  st === "rejected" ? "Non confermata" : st === "cancelled" ? "Annullata" : st === "done" ? "Effettuata"
    : st === "confirmed" ? "Confermata" : st === "expired" ? "Scaduta" : st === "pending" ? "In attesa" : raw ?? "";

/** Nella Home del paziente: la prossima prenotazione attiva (o, se non c'è, l'ultima), con il collegamento allo Storico. */
const LastBookingCard = () => {
  const { profile } = useAuth();
  const [b, setB] = useState<any | null>(null);

  useEffect(() => {
    if (!profile || profile.role === "professionista") return;
    let alive = true;
    supabase
      .from("bookings")
      .select("*, professional:professional_id(first_name, last_name)")
      .eq("patient_id", profile.id)
      .then(({ data }) => { if (alive) setB(pickHomeBooking((data as any[]) ?? [])); });
    return () => { alive = false; };
  }, [profile?.id]);

  if (!b) return null;
  const st = userBookingStatus(b);
  const upcoming = st === "pending" || st === "confirmed";
  return (
    <Card className="mb-4 md:mb-6 border-primary/30">
      <CardContent className="p-4 md:p-5">
        <p className="text-sm text-muted-foreground mb-1">{upcoming ? "La tua prossima prenotazione" : "La tua ultima prenotazione"}</p>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-base break-words">{b.service_name}</p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="w-4 h-4" />{b.day} · ore {b.time_slot}</p>
            {b.professional && <p className="text-sm text-muted-foreground">{b.professional.first_name} {b.professional.last_name}</p>}
          </div>
          <span className="text-xs px-2 py-1 rounded-full whitespace-nowrap font-medium bg-primary/10 text-primary flex-shrink-0">
            {bookingStatusLabel(st, b.status)}
          </span>
        </div>
        <Link to="/storico-prestazioni" className="inline-block mt-3 text-primary underline font-medium text-sm">Apri Storico</Link>
      </CardContent>
    </Card>
  );
};

export default LastBookingCard;
