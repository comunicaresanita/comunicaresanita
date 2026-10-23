import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AuthHeader from "@/components/AuthHeader";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import ServiceInfoButton from "@/components/ServiceInfoButton";
import { ArrowLeft, Stethoscope, Activity, HeartHandshake } from "lucide-react";
import { prestazioniPerProfessione } from "@/data/prestazioni";

const iconForType = (type: string) => {
  if (type === "fisioterapista") return Activity;
  if (type === "oss") return HeartHandshake;
  return Stethoscope;
};

const Prestazioni = () => {
  const navigate = useNavigate();

  const handleSelect = (servizio: string) => {
    navigate(`/dashboard-paziente?servizio=${encodeURIComponent(servizio)}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Tutte le prestazioni a domicilio | ComuniCARE"
        description="Scopri tutte le prestazioni sanitarie e di assistenza disponibili a domicilio su ComuniCARE: infermieristiche, fisioterapiche e OSS."
        path="/prestazioni"
      />
      <AuthHeader />
      <main className="flex-1 bg-background py-8 md:py-12">
        <div className="container mx-auto px-4 md:px-6 max-w-5xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard-paziente")}
            className="mb-4 md:mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Torna alla ricerca
          </Button>

          <h1 className="text-2xl md:text-senior-3xl font-semibold mb-2">
            Tutte le prestazioni
          </h1>
          <p className="text-sm md:text-senior-base text-muted-foreground mb-8">
            Di seguito trovi l'elenco completo delle prestazioni offerte tramite ComuniCARE,
            suddivise per professionista. Clicca su una prestazione per cercare un professionista
            disponibile nella tua zona.
          </p>

          <div className="space-y-8">
            {prestazioniPerProfessione.map((gruppo) => {
              const Icon = iconForType(gruppo.type);
              return (
                <Card key={gruppo.type}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg md:text-senior-xl flex items-center gap-2">
                      <span
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full"
                        style={{ backgroundColor: "#0097B2", color: "white" }}
                      >
                        <Icon className="w-5 h-5" />
                      </span>
                      {gruppo.label}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{gruppo.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {gruppo.items.map((s) => (
                        <div
                          key={s}
                          className="flex items-start gap-1 rounded-lg border border-border hover:border-primary hover:bg-secondary/40 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => handleSelect(s)}
                            className="flex-1 min-w-0 text-left p-2.5 md:p-3 text-sm md:text-senior-sm break-words whitespace-normal leading-snug"
                          >
                            {s}
                          </button>
                          <ServiceInfoButton name={s} className="mt-1.5 mr-1.5" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Prestazioni;
