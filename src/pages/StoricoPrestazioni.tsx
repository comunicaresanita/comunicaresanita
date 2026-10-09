import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthHeader from "@/components/AuthHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const StoricoPrestazioni = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
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
    fetch();
  }, [profile]);

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
              {loading ? (
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
                        <p className="text-sm text-foreground">
                          📅 {(() => { const d = new Date(b.day); return isNaN(d.getTime()) ? b.day : d.toLocaleDateString("it-IT"); })()} — 🕒 {b.time_slot}
                        </p>
                        <p className="text-sm font-medium text-foreground">€ {b.price}</p>
                        {b.professional && (
                          <p className="text-xs text-muted-foreground">
                            {b.professional.first_name} {b.professional.last_name}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap font-medium ${
                        b.status === "paid" || b.status === "confermato" ? "bg-primary/10 text-primary" :
                        b.status === "completato" ? "bg-emerald-100 text-emerald-700" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {b.status === "paid" || b.status === "confermato" ? "Confermato" :
                         b.status === "completato" ? "Completato" :
                         b.status === "pending" ? "In attesa" :
                         b.status === "cancelled" || b.status === "cancellato" ? "Cancellato" :
                         b.status}
                      </span>
                    </div>
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
