import { italianError } from "@/lib/italianErrors";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AuthHeader from "@/components/AuthHeader";
import Footer from "@/components/Footer";
import OpenStreetMapPicker from "@/components/OpenStreetMapPicker";
import { ArrowLeft, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const SetupPosizione = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, refreshProfile } = useAuth();
  const [mapLat, setMapLat] = useState<number | undefined>(profile?.lat ?? undefined);
  const [mapLng, setMapLng] = useState<number | undefined>(profile?.lng ?? undefined);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!profile || !mapLat || !mapLng) {
      toast({ title: "Posiziona il segnalino sulla mappa", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ lat: mapLat, lng: mapLng } as any)
      .eq("user_id", profile.user_id);
    setSaving(false);
    if (error) {
      toast({ title: "Errore", description: italianError(error, "location"), variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Posizione aggiornata" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AuthHeader />
      <main className="flex-1 bg-background md:py-12 py-0">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard-professionista")}
            className="mb-4 text-senior-sm gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Torna indietro
          </Button>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-8 h-8 text-primary" />
              <h1 className="text-senior-2xl font-bold">La tua posizione</h1>
            </div>
            <p className="text-senior-base text-muted-foreground ml-[44px]">
              Aggiorna il punto in cui gli utenti vedranno la tua posizione sulla mappa.
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-senior-lg">Mappa</CardTitle>
              <CardDescription className="text-senior-sm">
                Clicca sulla mappa o trascina il segnalino per aggiornare la tua posizione.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OpenStreetMapPicker
                onLocationSelect={(lat, lng) => {
                  setMapLat(lat);
                  setMapLng(lng);
                }}
                initialLat={mapLat}
                initialLng={mapLng}
              />
            </CardContent>
          </Card>

          <Button onClick={handleSave} className="w-full py-5 text-primary-foreground" disabled={saving}>
            {saving ? "Salvataggio..." : "Salva posizione"}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SetupPosizione;
