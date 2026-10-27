import { italianError } from "@/lib/italianErrors";
import { useState } from "react";
import { useSearchParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import ServiceAreaDrawer from "@/components/ServiceAreaDrawer";
import ServiceRadiusInput from "@/components/ServiceRadiusInput";
import { parseRadius, type ServiceArea } from "@/lib/distancePricing";
import StructuredAddressInput, { composeAddress } from "@/components/StructuredAddressInput";
import HousingInfoFields, { HousingInfoErrors } from "@/components/HousingInfoFields";
import { User, Stethoscope, Upload, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Ruolo = "paziente" | "professionista";
type TipoProfessionista = "infermiere" | "oss" | "fisioterapista";

const Registrazione = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const redirectAfterSignup = (location.state as { redirect?: string } | null)?.redirect || null;
  const ruoloParam = searchParams.get("ruolo");
  const initialRole = ruoloParam === "professionista" ? "professionista" : ruoloParam === "paziente" ? "paziente" : null;
  const [ruolo, setRuolo] = useState<Ruolo | null>(initialRole);
  const [tipoProfessionista, setTipoProfessionista] = useState<TipoProfessionista | null>(null);
  const [consensoTermini, setConsensoTermini] = useState(false);
  const [consensoPrivacy, setConsensoPrivacy] = useState(false);
  const [consensoSanitario, setConsensoSanitario] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [indirizzo, setIndirizzo] = useState("");
  const [via, setVia] = useState("");
  const [civico, setCivico] = useState("");
  const [cap, setCap] = useState("");
  const [citta, setCitta] = useState("");
  const [isCaregiver, setIsCaregiver] = useState(false);
  const [caregiverVia, setCaregiverVia] = useState("");
  const [caregiverCivico, setCaregiverCivico] = useState("");
  const [caregiverCap, setCaregiverCap] = useState("");
  const [caregiverCitta, setCaregiverCitta] = useState("");
  const [bio, setBio] = useState("");
  const [numeroOpi, setNumeroOpi] = useState("");
  const [numeroFnofi, setNumeroFnofi] = useState("");
  const [partitaIva, setPartitaIva] = useState("");
  const [phone, setPhone] = useState("");
  const [livesInCondominio, setLivesInCondominio] = useState<boolean | null>(null);
  const [intercomName, setIntercomName] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [housingErrors, setHousingErrors] = useState<HousingInfoErrors>({});
  const [radius, setRadius] = useState("");
  const [radiusError, setRadiusError] = useState(false);
  const [mapLat, setMapLat] = useState<number | null>(null);
  const [mapLng, setMapLng] = useState<number | null>(null);
  const [serviceArea, setServiceArea] = useState<ServiceArea | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();


  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setEmailError("Inserisci un indirizzo email valido (es. nome@dominio.it).");
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Le password non corrispondono", description: "Assicurati che le due password siano identiche.", variant: "destructive" });
      return;
    }

    if (!consensoTermini || !consensoPrivacy) {
      toast({ title: "Consensi obbligatori", description: "Devi accettare tutti i consensi obbligatori per procedere.", variant: "destructive" });
      return;
    }

    if (ruolo === "paziente" && !consensoSanitario) {
      toast({ title: "Consenso obbligatorio", description: "Devi acconsentire al trattamento dei dati sanitari per procedere.", variant: "destructive" });
      return;
    }

    // Validate caregiver address if caregiver is checked
    if (ruolo === "paziente" && isCaregiver && (!caregiverVia.trim() || !caregiverCivico.trim() || !caregiverCap.trim() || !caregiverCitta.trim())) {
      toast({ title: "Indirizzo assistito incompleto", description: "Compila tutti i campi dell'indirizzo del familiare/assistito.", variant: "destructive" });
      const firstId = !caregiverVia.trim() ? "caregiver-via-field" : !caregiverCivico.trim() ? "caregiver-civico-field" : !caregiverCap.trim() ? "caregiver-cap-field" : "caregiver-citta-field";
      document.getElementById(firstId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById(firstId)?.focus();
      return;
    }

    if (!phone.trim()) {
      toast({ title: "Cellulare obbligatorio", description: "Inserisci il tuo numero di cellulare.", variant: "destructive" });
      document.getElementById("phone")?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("phone")?.focus();
      return;
    }

    // Validate housing info for patients
    if (ruolo === "paziente") {
      const housingErr: HousingInfoErrors = {
        livesInCondominio: livesInCondominio === null,
        intercomName: livesInCondominio === true && !intercomName.trim(),
        floorNumber: livesInCondominio === true && !floorNumber.trim(),
      };
      setHousingErrors(housingErr);
      if (Object.values(housingErr).some(Boolean)) {
        toast({ title: "Informazioni abitazione mancanti", description: "Indica se abiti in un condominio e compila i campi richiesti.", variant: "destructive" });
        const firstId = housingErr.livesInCondominio ? "reg-housing-cond-yes" : housingErr.intercomName ? "reg-housing-intercom" : "reg-housing-floor";
        document.getElementById(firstId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById(firstId)?.focus();
        return;
      }
    }

    if (ruolo === "professionista" && !parseRadius(radius)) {
      setRadiusError(true);
      toast({ title: "Distanza obbligatoria", description: "Indica quanti km vuoi coprire dal tuo segnalino.", variant: "destructive" });
      document.getElementById("service-radius")?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("service-radius")?.focus();
      return;
    }

    if (ruolo === "professionista" && !mapLat) {
      toast({ title: "Posizione obbligatoria", description: "Indica sulla mappa il punto in cui vuoi essere visibile.", variant: "destructive" });
      return;
    }

    if (ruolo === "professionista" && tipoProfessionista === "infermiere" && !numeroOpi) {
      toast({ title: "OPI obbligatorio", description: "Il numero di iscrizione OPI è obbligatorio per gli infermieri.", variant: "destructive" });
      return;
    }

    if (ruolo === "professionista" && tipoProfessionista === "fisioterapista" && !numeroFnofi) {
      toast({ title: "FNOFI obbligatorio", description: "Il numero di iscrizione FNOFI è obbligatorio per i fisioterapisti.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const metadata: Record<string, string> = {
      role: ruolo!,
      first_name: capitalize(nome),
      last_name: capitalize(cognome),
      address: ruolo === "paziente" ? composeAddress(via, civico, cap, citta) : indirizzo,
      bio: bio || "",
      numero_opi: numeroOpi || "",
      numero_fnofi: numeroFnofi || "",
      partita_iva: partitaIva || "",
      phone: phone,
    };
    if (ruolo === "professionista") {
      metadata.professional_type = tipoProfessionista || "infermiere";
      if (mapLat && mapLng) {
        metadata.lat = String(mapLat);
        metadata.lng = String(mapLng);
      }
    }
    const { error } = await signUp(email, password, metadata);
    setLoading(false);

    if (error) {
      toast({ title: "Errore di registrazione", description: italianError(error, "registration"), variant: "destructive" });
      return;
    }

    // Persist extra fields after signup (not handled by trigger)
    const { data: { user: signedUser } } = await supabase.auth.getUser();
    if (signedUser && ruolo === "paziente") {
      const caregiverAddress = isCaregiver && caregiverVia.trim()
        ? composeAddress(caregiverVia, caregiverCivico, caregiverCap, caregiverCitta)
        : null;
      await supabase
        .from("profiles")
        .update({
          lives_in_condominio: livesInCondominio,
          intercom_name: livesInCondominio ? intercomName : null,
          floor_number: livesInCondominio ? floorNumber : null,
          access_notes: livesInCondominio ? accessNotes : null,
          is_caregiver: isCaregiver,
          ...(caregiverAddress ? { caregiver_address: caregiverAddress } : {}),
        } as any)
        .eq("user_id", signedUser.id);
    }
    if (signedUser && ruolo === "professionista") {
      await supabase.from("profiles").update({ service_radius_km: parseRadius(radius), service_area: serviceArea && serviceArea.length >= 3 ? serviceArea : null } as any).eq("user_id", signedUser.id);
    }

    toast({ title: "Registrazione completata!", description: "Il tuo account è stato creato con successo." });

    if (ruolo === "professionista") {
      navigate("/setup-professionista");
    } else {
      navigate(redirectAfterSignup || "/dashboard-paziente");
    }
  };

  // Step 1: Choose role
  if (!ruolo) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-background py-8 md:py-16">
          <div className="container mx-auto px-4 md:px-6 max-w-2xl">
            <h1 className="text-xl md:text-senior-3xl font-bold text-center mb-3 md:mb-4">
              Crea il tuo account
            </h1>
            <p className="text-sm md:text-senior-base text-muted-foreground text-center mb-6 md:mb-10">
              Seleziona il tuo profilo per iniziare la registrazione.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <Card className="cursor-pointer border-2 hover:border-primary hover:shadow-lg transition-all" onClick={() => setRuolo("paziente")}>
                <CardContent className="p-5 md:p-8 text-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4 md:mb-5">
                    <User className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                  </div>
                  <h3 className="text-base md:text-senior-xl font-semibold mb-2">Utente</h3>
                  <p className="text-xs md:text-senior-sm text-muted-foreground">Cerca e prenota servizi sanitari a domicilio.</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer border-2 hover:border-primary hover:shadow-lg transition-all" onClick={() => setRuolo("professionista")}>
                <CardContent className="p-5 md:p-8 text-center">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4 md:mb-5">
                    <Stethoscope className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                  </div>
                  <h3 className="text-base md:text-senior-xl font-semibold mb-2">Professionista</h3>
                  <p className="text-xs md:text-senior-sm text-muted-foreground">Offri i tuoi servizi sanitari sulla piattaforma.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Step 2: Choose professional type (only for professionista)
  if (ruolo === "professionista" && !tipoProfessionista) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-background py-8 md:py-16">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <Button variant="ghost" className="mb-4 md:mb-6 text-sm md:text-senior-sm" onClick={() => (initialRole === "professionista" ? navigate("/") : setRuolo(null))}>
              ← Torna indietro
            </Button>
            <h1 className="text-xl md:text-senior-3xl font-bold text-center mb-3 md:mb-4">
              Che tipo di professionista sei?
            </h1>
            <p className="text-sm md:text-senior-base text-muted-foreground text-center mb-2">
              Seleziona la tua categoria professionale.
            </p>
            <p className="text-sm md:text-senior-base text-muted-foreground text-center mb-6 md:mb-10">
              Se sei già registrato, clicca il pulsante <span className="font-semibold text-foreground">Accedi</span> in alto a destra.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
              <Card className="cursor-pointer border-2 hover:border-primary hover:shadow-lg transition-all" onClick={() => setTipoProfessionista("infermiere")}>
                <CardContent className="p-6 text-center">
                  <h3 className="text-senior-lg font-semibold mb-2">🩺 Infermiere</h3>
                  <p className="text-sm text-muted-foreground">Iscritto all'OPI</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer border-2 hover:border-primary hover:shadow-lg transition-all" onClick={() => setTipoProfessionista("oss")}>
                <CardContent className="p-6 text-center">
                  <h3 className="text-senior-lg font-semibold mb-2">🤝 OSS</h3>
                  <p className="text-sm text-muted-foreground">Operatore Socio Sanitario</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer border-2 hover:border-primary hover:shadow-lg transition-all" onClick={() => setTipoProfessionista("fisioterapista")}>
                <CardContent className="p-6 text-center">
                  <h3 className="text-senior-lg font-semibold mb-2">💪 Fisioterapista</h3>
                  <p className="text-sm text-muted-foreground">Iscritto alla FNOFI</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const tipoProfLabel = tipoProfessionista === "oss" ? "OSS" : tipoProfessionista === "fisioterapista" ? "fisioterapista" : "infermiere";

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Registrazione — ComuniCARE"
        description="Crea il tuo account ComuniCARE come utente o professionista sanitario per prenotare o offrire prestazioni a domicilio a Firenze."
        path="/registrazione"
      />
      <Header />
      <main className="flex-1 bg-background md:py-12 py-0">
        <div className="container mx-auto px-4 md:px-6 max-w-2xl">
          <Button variant="ghost" className="mb-6 text-senior-sm" onClick={() => {
            if (ruolo === "professionista") {
              setTipoProfessionista(null);
            } else {
              setRuolo(null);
            }
          }}>
            ← Torna indietro
          </Button>
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-senior-xl">
                Registrazione {ruolo === "paziente" ? "utente" : tipoProfLabel}
              </CardTitle>
              <CardDescription className="text-senior-sm">
                {ruolo === "paziente" ? "Inserisci i tuoi dati per cercare e prenotare servizi." : "Inserisci i tuoi dati professionali per offrire servizi."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome" className="text-senior-sm">Nome *</Label>
                    <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Il tuo nome" required className="text-senior-sm py-3" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cognome" className="text-senior-sm">Cognome *</Label>
                    <Input id="cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} placeholder="Il tuo cognome" required className="text-senior-sm py-3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-senior-sm">Email *</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(""); }} placeholder="email@esempio.it" required className="text-senior-sm py-3" />
                  {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-senior-sm">Password *</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))} onKeyDown={(e) => { if (e.key === " ") e.preventDefault(); }} placeholder="Minimo 8 caratteri" required minLength={8} className="text-senior-sm py-3 pr-12" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="text-senior-sm">Conferma password *</Label>
                  <div className="relative">
                    <Input id="confirm_password" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value.replace(/\s/g, ""))} onKeyDown={(e) => { if (e.key === " ") e.preventDefault(); }} placeholder="Riscrivi la password" required minLength={8} className="text-senior-sm py-3 pr-12" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-sm text-destructive">Le password non corrispondono.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-senior-sm">Numero di cellulare *</Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Es. +39 333 1234567" required className="text-senior-sm py-3" />
                </div>
                {ruolo === "paziente" ? (
                  <>
                    <StructuredAddressInput
                      via={via}
                      civico={civico}
                      cap={cap}
                      citta={citta}
                      onViaChange={setVia}
                      onCivicoChange={setCivico}
                      onCapChange={setCap}
                      onCittaChange={setCitta}
                      required
                      label="Indirizzo di residenza *"
                    />
                    <HousingInfoFields
                      livesInCondominio={livesInCondominio}
                      intercomName={intercomName}
                      floorNumber={floorNumber}
                      accessNotes={accessNotes}
                      onLivesInCondominioChange={(v) => { setLivesInCondominio(v); setHousingErrors(e => ({ ...e, livesInCondominio: false })); }}
                      onIntercomNameChange={(v) => { setIntercomName(v); setHousingErrors(e => ({ ...e, intercomName: false })); }}
                      onFloorNumberChange={(v) => { setFloorNumber(v); setHousingErrors(e => ({ ...e, floorNumber: false })); }}
                      onAccessNotesChange={setAccessNotes}
                      errors={housingErrors}
                      idPrefix="reg-housing"
                    />
                    <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-muted/30">
                      <Checkbox
                        id="caregiver_reg"
                        checked={isCaregiver}
                        onCheckedChange={(checked) => setIsCaregiver(checked === true)}
                        className="mt-0.5"
                      />
                      <div>
                        <Label htmlFor="caregiver_reg" className="text-senior-sm font-medium cursor-pointer">Sono un caregiver</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Un caregiver è una persona che si prende cura di un familiare o conoscente. Seleziona questa opzione se stai cercando cure per qualcun altro.
                        </p>
                      </div>
                    </div>
                    {isCaregiver && (
                      <div className="p-4 rounded-lg border border-primary/30 bg-secondary/50">
                        <p className="text-sm text-muted-foreground mb-3">
                          Inserisci l'indirizzo della persona che riceverà le cure. I professionisti si recheranno a questo indirizzo, non al tuo indirizzo di registrazione.
                        </p>
                        <StructuredAddressInput
                          via={caregiverVia}
                          civico={caregiverCivico}
                          cap={caregiverCap}
                          citta={caregiverCitta}
                          onViaChange={setCaregiverVia}
                          onCivicoChange={setCaregiverCivico}
                          onCapChange={setCaregiverCap}
                          onCittaChange={setCaregiverCitta}
                          required
                          label="Indirizzo del familiare / assistito *"
                          idPrefix="caregiver"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="indirizzo" className="text-senior-sm">Indirizzo *</Label>
                    <AddressAutocomplete
                      withHouseNumber
                      value={indirizzo}
                      onChange={(val) => setIndirizzo(val)}
                      onPlaceSelect={(details) => {
                        setIndirizzo(details.fullAddress);
                        if (details.lat && details.lng) {
                          setMapLat(details.lat);
                          setMapLng(details.lng);
                        }
                      }}
                      required
                    />
                  </div>
                )}

                {ruolo === "professionista" && (
                  <>
                    <div className="border-t pt-6">
                      <h3 className="text-senior-lg font-semibold mb-4">Dati professionali</h3>

                      <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 mb-4">
                        <p className="text-senior-sm text-amber-800">
                          ⚠️ <strong>Assicurazione obbligatoria:</strong> per operare sulla piattaforma è necessario essere in possesso di un'assicurazione professionale valida.
                        </p>
                      </div>

                      <div className="space-y-4">
                        {/* OPI for infermiere */}
                        {tipoProfessionista === "infermiere" && (
                          <div className="space-y-2">
                            <Label htmlFor="numero_opi" className="text-senior-sm">Numero iscrizione OPI *</Label>
                            <Input id="numero_opi" value={numeroOpi} onChange={(e) => setNumeroOpi(e.target.value)} placeholder="Es. FI-12345" required className="text-senior-sm py-3" />
                          </div>
                        )}

                        {/* FNOFI for fisioterapista */}
                        {tipoProfessionista === "fisioterapista" && (
                          <div className="space-y-2">
                            <Label htmlFor="numero_fnofi" className="text-senior-sm">Numero iscrizione FNOFI *</Label>
                            <Input id="numero_fnofi" value={numeroFnofi} onChange={(e) => setNumeroFnofi(e.target.value)} placeholder="Es. 12345" required className="text-senior-sm py-3" />
                          </div>
                        )}

                        {/* No albo required for OSS */}

                        <div className="space-y-2">
                          <Label htmlFor="partita_iva" className="text-senior-sm">Partita IVA</Label>
                          <Input id="partita_iva" value={partitaIva} onChange={(e) => setPartitaIva(e.target.value)} placeholder="Es. 12345678901" className="text-senior-sm py-3" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bio" className="text-senior-sm">Bio / specializzazioni</Label>
                          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Descrivi la tua esperienza e le tue specializzazioni..." className="text-senior-sm" rows={3} />
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-6">
                      <h3 className="text-senior-lg font-semibold mb-4">Area da coprire *</h3>
                      <ServiceRadiusInput value={radius} onChange={(v) => { setRadius(v); setRadiusError(false); }} error={radiusError} />
                    </div>
                    <div className="border-t pt-6">
                      <h3 className="text-senior-lg font-semibold mb-2">Posizione e zona sulla mappa *</h3>
                      <ServiceAreaDrawer
                        centerLat={mapLat ?? undefined}
                        centerLng={mapLng ?? undefined}
                        onLocationChange={(lat, lng) => { setMapLat(lat); setMapLng(lng); }}
                        radiusKm={parseRadius(radius)}
                        value={serviceArea}
                        onChange={setServiceArea}
                      />
                      <p className="text-sm text-muted-foreground mt-2">Potrai modificare segnalino, distanza e zona anche dopo, dalla pagina «La tua posizione».</p>
                    </div>
                    <div className="border-t pt-6">
                      <h3 className="text-senior-lg font-semibold mb-4">Documenti di verifica</h3>
                      <p className="text-senior-sm text-muted-foreground mb-4">Carica i documenti richiesti per la verifica del tuo profilo.</p>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="doc_identita" className="text-senior-sm">{tipoProfessionista === "infermiere" ? "Documento d'identità" : "Documento d'identità *"}</Label>
                          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <Input id="doc_identita" type="file" accept=".pdf,.jpg,.jpeg,.png" required={tipoProfessionista !== "infermiere"} className="text-senior-sm" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="border-t pt-6">
                  <h3 className="text-senior-lg font-semibold mb-4">Consensi obbligatori</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox id="consenso_termini" checked={consensoTermini} onCheckedChange={(c) => setConsensoTermini(c === true)} className="mt-1" />
                      <Label htmlFor="consenso_termini" className="text-senior-sm leading-relaxed cursor-pointer">
                        Accetto i <Link to="/termini" className="text-primary underline font-medium" target="_blank">termini e condizioni</Link> del servizio. *
                      </Label>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Checkbox id="consenso_privacy" checked={consensoPrivacy} onCheckedChange={(c) => setConsensoPrivacy(c === true)} className="mt-1" />
                      <Label htmlFor="consenso_privacy" className="text-senior-sm leading-relaxed cursor-pointer">
                        Acconsento al trattamento dei miei dati personali ai sensi del <Link to="/privacy" className="text-primary underline font-medium" target="_blank">GDPR (Reg. UE 2016/679)</Link>. *
                      </Label>
                    </div>
                    {ruolo === "paziente" && (
                      <div className="flex items-start space-x-3">
                        <Checkbox id="consenso_sanitario" checked={consensoSanitario} onCheckedChange={(c) => setConsensoSanitario(c === true)} className="mt-1" />
                        <Label htmlFor="consenso_sanitario" className="text-senior-sm leading-relaxed cursor-pointer">
                          Acconsento al trattamento dei dati sanitari (dati particolari ex Art. 9 GDPR) necessari per l'erogazione del servizio. *
                        </Label>
                      </div>
                    )}
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full text-senior-base font-semibold py-6 text-primary-foreground" disabled={loading}>
                  {loading ? "Registrazione in corso..." : "Completa registrazione"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Registrazione;
