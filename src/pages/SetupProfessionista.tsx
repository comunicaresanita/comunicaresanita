import { italianError } from "@/lib/italianErrors";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import AuthHeader from "@/components/AuthHeader";
import Footer from "@/components/Footer";
import ServiceInfoButton from "@/components/ServiceInfoButton";
import { Info, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { catalogoInfermiere } from "@/data/catalogoInfermiere";
import { catalogoFisioterapista } from "@/data/catalogoFisioterapista";
import { compareServiceNames } from "@/lib/serviceInfo";

interface ServizioBase {
  nome: string;
  prezzo: number;
  prezzoConsigliato: number;
  minPrezzo?: number;
  maxPrezzo?: number;
}

interface Servizio extends ServizioBase {
  id: string;
  attivo: boolean;
  dbId?: string;
  _min: number;
  _max: number;
}

function buildServizio(s: ServizioBase, i: number): Servizio {
  return {
    ...s,
    id: `srv-${i}`,
    attivo: false,
    _min: s.minPrezzo ?? Math.round(s.prezzoConsigliato * 0.7),
    _max: s.maxPrezzo ?? Math.round(s.prezzoConsigliato * 1.3),
  };
}

// Nurse services and price bands come from the official catalog.
const serviziInfermiere: ServizioBase[] = catalogoInfermiere.map((c) => {
  const consigliato = Math.round((c.min + c.max) / 2);
  return { nome: c.nome, prezzo: consigliato, prezzoConsigliato: consigliato, minPrezzo: c.min, maxPrezzo: c.max };
});

// Physiotherapy services and price bands come from the official catalog.
const serviziFisioterapista: ServizioBase[] = catalogoFisioterapista.map((c) => {
  const consigliato = Math.round((c.min + c.max) / 2);
  return { nome: c.nome, prezzo: consigliato, prezzoConsigliato: consigliato, minPrezzo: c.min, maxPrezzo: c.max };
});

const serviziOSS: ServizioBase[] = [
  { nome: "Igiene personale completa a letto", prezzo: 25, prezzoConsigliato: 25 },
  { nome: "Bagno assistito in vasca/doccia", prezzo: 25, prezzoConsigliato: 25 },
  { nome: "Vestizione e svestizione assistita", prezzo: 18, prezzoConsigliato: 18 },
  { nome: "Cambio pannolone e igiene intima", prezzo: 15, prezzoConsigliato: 15 },
  { nome: "Mobilizzazione e cambio postura a letto", prezzo: 20, prezzoConsigliato: 20 },
  { nome: "Trasferimento letto-carrozzina/poltrona", prezzo: 20, prezzoConsigliato: 20 },
  { nome: "Assistenza alla deambulazione", prezzo: 20, prezzoConsigliato: 20 },
  { nome: "Assistenza ai pasti e imboccamento", prezzo: 20, prezzoConsigliato: 20 },
  { nome: "Preparazione pasti a domicilio", prezzo: 18, prezzoConsigliato: 18 },
  { nome: "Compagnia e sorveglianza diurna (per ora)", prezzo: 15, prezzoConsigliato: 15 },
  { nome: "Sorveglianza notturna (per ora)", prezzo: 20, prezzoConsigliato: 20 },
  { nome: "Accompagnamento a visite mediche", prezzo: 25, prezzoConsigliato: 25 },
  { nome: "Accompagnamento a passeggiate", prezzo: 18, prezzoConsigliato: 18 },
  { nome: "Piccola spesa e commissioni", prezzo: 15, prezzoConsigliato: 15 },
  { nome: "Stimolazione cognitiva e attività ricreative", prezzo: 20, prezzoConsigliato: 20 },
  { nome: "Supporto nella gestione della casa leggera", prezzo: 18, prezzoConsigliato: 18 },
  { nome: "Assistenza continuativa diurna (per ora)", prezzo: 18, prezzoConsigliato: 18 },
  { nome: "Assistenza continuativa notturna (per ora)", prezzo: 22, prezzoConsigliato: 22 },
];

function getServiziPerTipo(tipo?: string): ServizioBase[] {
  switch (tipo) {
    case "fisioterapista": return serviziFisioterapista;
    case "oss": return serviziOSS;
    case "infermiere":
    default: return serviziInfermiere;
  }
}

function getTitoloRuolo(tipo?: string): string {
  switch (tipo) {
    case "fisioterapista": return "Fisioterapista";
    case "oss": return "OSS";
    default: return "Infermiere";
  }
}

const SetupProfessionista = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, user, loading: authLoading, refreshProfile } = useAuth();
  const tipo = profile?.professional_type;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { state: { redirect: "/setup-professionista", message: "Accedi per completare il tuo profilo da professionista." } });
    }
  }, [authLoading, user, navigate]);

  const [servizi, setServizi] = useState<Servizio[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isFirstSetup, setIsFirstSetup] = useState(true);
  const [saving, setSaving] = useState(false);

  // Safety net: if the profile is still missing a few seconds after signup, retry it
  useEffect(() => {
    if (profile || authLoading || !user) return;
    const t = setTimeout(() => { refreshProfile(); }, 5000);
    return () => clearTimeout(t);
  }, [profile, authLoading, user]);

  useEffect(() => {
    const loadServices = async () => {
      if (!profile) return;
      const serviziBase = getServiziPerTipo(profile.professional_type);
      const baseList = serviziBase.map((s, i) => buildServizio(s, i));

      const { data: savedServices } = await supabase
        .from("services")
        .select("*")
        .eq("professional_id", profile.id);

      if (savedServices && savedServices.length > 0) {
        setIsFirstSetup(false);
        setServizi(
          baseList.map((s) => {
            const saved = savedServices.find((ss) => ss.name === s.nome);
            if (saved) {
              const price = Math.min(s._max, Math.max(s._min, saved.price));
              return { ...s, attivo: true, prezzo: price, dbId: saved.id };
            }
            return s;
          })
        );
      } else {
        setServizi(baseList);
      }
      setLoadingData(false);
    };
    loadServices();
  }, [profile]);

  const toggleServizio = (id: string) => {
    setServizi((prev) =>
      prev.map((s) => (s.id === id ? { ...s, attivo: !s.attivo } : s))
    );
  };

  const updatePrezzo = (id: string, rawValue: string) => {
    const cleaned = rawValue.replace(/[^0-9]/g, '').replace(/^0+/, '') || '';
    const numValue = cleaned === '' ? 0 : parseInt(cleaned, 10);
    setServizi((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        if (numValue > s._max) return s;
        return { ...s, prezzo: numValue };
      })
    );
  };

  const clampPrezzo = (id: string) => {
    setServizi((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const clamped = Math.min(s._max, Math.max(s._min, s.prezzo));
        return { ...s, prezzo: clamped };
      })
    );
  };

  const serviziAttivi = servizi.filter((s) => s.attivo);

  const handleSalva = async () => {
    if (!profile) return;
    if (serviziAttivi.length === 0) {
      toast({
        title: "Seleziona almeno un servizio",
        description: "Devi attivare almeno un servizio per continuare.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);

    await supabase.from("services").delete().eq("professional_id", profile.id);
    
    const toInsert = serviziAttivi.map((s) => ({
      professional_id: profile.id,
      name: s.nome,
      price: s.prezzo,
    }));
    const { error } = await supabase.from("services").insert(toInsert);
    setSaving(false);

    if (error) {
      toast({ title: "Errore", description: italianError(error, "services"), variant: "destructive" });
    } else {
      toast({ title: "Servizi salvati" });
      if (isFirstSetup) {
        navigate("/setup-professionista/disponibilita");
      }
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex flex-col">
        <AuthHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </main>
        <Footer />
      </div>
    );
  }

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

          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm md:text-base">1</div>
              <h1 className="text-lg md:text-senior-2xl font-bold">I tuoi servizi — {getTitoloRuolo(tipo)}</h1>
            </div>
            <p className="text-base md:text-senior-base text-muted-foreground ml-11 md:ml-[52px]">
              Seleziona i servizi che offri e imposta i tuoi prezzi.
            </p>
          </div>

          <Card className="mb-6 md:mb-8">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-senior-lg">Servizi disponibili</CardTitle>
              <CardDescription className="text-sm md:text-senior-sm">
                Attiva i servizi che desideri offrire e personalizza il prezzo.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
              {(() => {
                const sorted = [...servizi].sort((a, b) => {
                  if (a.attivo && !b.attivo) return -1;
                  if (!a.attivo && b.attivo) return 1;
                  return compareServiceNames(a.nome, b.nome);
                });
                const attivi = sorted.filter(s => s.attivo);
                const nonAttivi = sorted.filter(s => !s.attivo);
                const renderServizio = (servizio: Servizio) => {
                  return (
                    <div
                      key={servizio.id}
                      className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg border transition-colors ${
                        servizio.attivo ? "border-primary bg-secondary/50" : "border-border"
                      }`}
                    >
                      <Checkbox
                        checked={servizio.attivo}
                        onCheckedChange={() => toggleServizio(servizio.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm md:text-senior-sm font-medium break-words whitespace-normal leading-snug">{servizio.nome}</p>
                        {servizio.attivo && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Info className="w-3 h-3" />
                            Consigliato: €{servizio.prezzoConsigliato} (min €{servizio._min} — max €{servizio._max})
                          </p>
                        )}
                      </div>
                      {servizio.attivo && (
                        <div className="flex items-center gap-1">
                          <span className="text-senior-sm">€</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={servizio.prezzo === 0 ? '' : String(servizio.prezzo)}
                            onChange={(e) => updatePrezzo(servizio.id, e.target.value)}
                            onBlur={() => clampPrezzo(servizio.id)}
                            className="w-14 md:w-16 text-center h-8 text-sm"
                          />
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              className="h-4 w-5 flex items-center justify-center rounded border border-input bg-muted hover:bg-accent text-[10px] leading-none"
                              onClick={() => {
                                if (servizio.prezzo < servizio._max) {
                                  setServizi(prev => prev.map(s => s.id === servizio.id ? { ...s, prezzo: s.prezzo + 1 } : s));
                                }
                              }}
                              aria-label="Aumenta prezzo"
                            >▲</button>
                            <button
                              type="button"
                              className="h-4 w-5 flex items-center justify-center rounded border border-input bg-muted hover:bg-accent text-[10px] leading-none"
                              onClick={() => {
                                if (servizio.prezzo > servizio._min) {
                                  setServizi(prev => prev.map(s => s.id === servizio.id ? { ...s, prezzo: s.prezzo - 1 } : s));
                                }
                              }}
                              aria-label="Diminuisci prezzo"
                            >▼</button>
                          </div>
                        </div>
                      )}
                      <ServiceInfoButton name={servizio.nome} audience="professionista" />
                    </div>
                  );
                };
                return (
                  <div className="space-y-3">
                    {attivi.map(renderServizio)}
                    {attivi.length > 0 && nonAttivi.length > 0 && (
                      <div className="flex items-center gap-3 py-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-sm text-muted-foreground">Altri servizi disponibili</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    {nonAttivi.map(renderServizio)}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {serviziAttivi.length > 0 && (
            <div className="bg-secondary/50 rounded-lg p-4 mb-8">
              <p className="text-senior-sm font-medium">
                {serviziAttivi.length} servizi selezionati
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button size="lg" onClick={handleSalva} className="px-10 py-6" disabled={saving}>
              {saving ? "Salvataggio..." : isFirstSetup ? "Salva e continua" : "Salva"}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SetupProfessionista;
