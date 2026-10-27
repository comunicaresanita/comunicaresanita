import { italianError } from "@/lib/italianErrors";
import { useState, useEffect, useMemo } from "react";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AuthHeader from "@/components/AuthHeader";
import Footer from "@/components/Footer";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import StructuredAddressInput, { parseAddressToFields, composeAddress } from "@/components/StructuredAddressInput";
import HousingInfoFields, { HousingInfoErrors } from "@/components/HousingInfoFields";
import MedicalNotesField from "@/components/MedicalNotesField";
import ServiceRadiusInput from "@/components/ServiceRadiusInput";
import { parseRadius } from "@/lib/distancePricing";


import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, ArrowLeft, Trash2 } from "lucide-react";

const Profilo = () => {
  const { user, profile, loading: authLoading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [via, setVia] = useState("");
  const [civico, setCivico] = useState("");
  const [cap, setCap] = useState("");
  const [citta, setCitta] = useState("");
  const [bio, setBio] = useState("");
  const [radius, setRadius] = useState("");
  const [radiusError, setRadiusError] = useState(false);
  const [numeroOpi, setNumeroOpi] = useState("");
  const [numeroFnofi, setNumeroFnofi] = useState("");
  const [partitaIva, setPartitaIva] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isCaregiver, setIsCaregiver] = useState(false);
  const [caregiverVia, setCaregiverVia] = useState("");
  const [caregiverCivico, setCaregiverCivico] = useState("");
  const [caregiverCap, setCaregiverCap] = useState("");
  const [caregiverCitta, setCaregiverCitta] = useState("");
  const [caregiverFirstName, setCaregiverFirstName] = useState("");
  const [caregiverLastName, setCaregiverLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [addressErrors, setAddressErrors] = useState<{ via?: boolean; civico?: boolean; cap?: boolean; citta?: boolean }>({});
  const [caregiverErrors, setCaregiverErrors] = useState<{ via?: boolean; civico?: boolean; cap?: boolean; citta?: boolean }>({});
  const [livesInCondominio, setLivesInCondominio] = useState<boolean | null>(null);
  const [intercomName, setIntercomName] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [housingErrors, setHousingErrors] = useState<HousingInfoErrors>({});
  const [deleting, setDeleting] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);
  const currentSnapshot = useMemo(() => JSON.stringify({
    firstName, lastName, address, via, civico, cap, citta, bio, radius, numeroOpi, numeroFnofi,
    partitaIva, phone, age, additionalInfo, livesInCondominio, intercomName, floorNumber, accessNotes, medicalNotes,
    isCaregiver, caregiverFirstName, caregiverLastName, caregiverVia, caregiverCivico, caregiverCap, caregiverCitta,
  }), [firstName, lastName, address, via, civico, cap, citta, bio, radius, numeroOpi, numeroFnofi,
    partitaIva, phone, age, additionalInfo, livesInCondominio, intercomName, floorNumber, accessNotes, medicalNotes,
    isCaregiver, caregiverFirstName, caregiverLastName, caregiverVia, caregiverCivico, caregiverCap, caregiverCitta]);
  const [snapshotPending, setSnapshotPending] = useState(false);
  useEffect(() => {
    if (snapshotPending) { setInitialSnapshot(currentSnapshot); setSnapshotPending(false); }
  }, [snapshotPending, currentSnapshot]);
  const isDirty = initialSnapshot !== null && currentSnapshot !== initialSnapshot;

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setAddress((profile as any).address || "");
      // Parse address into structured fields for patients
      if (profile.role === "paziente") {
        const parsed = parseAddressToFields((profile as any).address || "");
        setVia(parsed.via);
        setCivico(parsed.civico);
        setCap(parsed.cap);
        setCitta(parsed.citta);
      }
      setBio(profile.bio || "");
      setNumeroOpi(profile.numero_opi || "");
      setNumeroFnofi((profile as any).numero_fnofi || "");
      setPartitaIva((profile as any).partita_iva || "");
      setPhotoUrl((profile as any).photo_url || "");
      setPhone((profile as any).phone || "");
      setAge((profile as any).age ? String((profile as any).age) : "");
      setAdditionalInfo((profile as any).additional_info || "");
      setIsCaregiver((profile as any).is_caregiver || false);
      setRadius((profile as any).service_radius_km ? String((profile as any).service_radius_km) : "");
      setLivesInCondominio(
        (profile as any).lives_in_condominio === null || (profile as any).lives_in_condominio === undefined
          ? null
          : !!(profile as any).lives_in_condominio,
      );
      setIntercomName((profile as any).intercom_name || "");
      setFloorNumber((profile as any).floor_number || "");
      setAccessNotes((profile as any).access_notes || "");
      setMedicalNotes((profile as any).medical_notes || "");
      setCaregiverFirstName((profile as any).caregiver_first_name || "");
      setCaregiverLastName((profile as any).caregiver_last_name || "");
      // Parse caregiver address if available
      const caregiverAddr = (profile as any).caregiver_address || "";
      if (caregiverAddr) {
        const cParsed = parseAddressToFields(caregiverAddr);
        setCaregiverVia(cParsed.via);
        setCaregiverCivico(cParsed.civico);
        setCaregiverCap(cParsed.cap);
        setCaregiverCitta(cParsed.citta);
      }
      setSnapshotPending(true);
    }
  }, [profile]);

  const handleBack = () => guard(() => {
    if (profile?.role === "professionista") {
      navigate("/dashboard-professionista");
    } else {
      navigate("/");
    }
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Errore nel caricamento", description: italianError(error, "upload"), variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("profile-photos").getPublicUrl(path);
    setPhotoUrl(publicUrl);

    await supabase.from("profiles").update({ photo_url: publicUrl } as any).eq("user_id", user.id);
    await refreshProfile();
    setUploading(false);
    toast({ title: "Foto aggiornata" });
  };

  const handleSave = async (): Promise<boolean> => {
    if (!profile) return false;

    // Validate required address fields for patients
    if (profile.role === "paziente") {
      const addrErr = {
        via: !via.trim(),
        civico: !civico.trim(),
        cap: !cap.trim(),
        citta: !citta.trim(),
      };
      setAddressErrors(addrErr);

      const hasAddrError = Object.values(addrErr).some(Boolean);

      if (hasAddrError) {
        toast({ title: "Campi obbligatori mancanti", description: "Compila tutti i campi dell'indirizzo prima di salvare.", variant: "destructive" });
        const firstErrorId = addrErr.via ? "via-field" : addrErr.civico ? "civico-field" : addrErr.cap ? "cap-field" : "citta-field";
        document.getElementById(firstErrorId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById(firstErrorId)?.focus();
        return false;
      }
    }

    // Validate phone for all roles
    if (!phone.trim()) {
      toast({ title: "Cellulare obbligatorio", description: "Inserisci il tuo numero di cellulare.", variant: "destructive" });
      document.getElementById("phone-field")?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("phone-field")?.focus();
      return false;
    }

    // Validate housing info for patients
    if (profile.role === "paziente") {
      const housingErr: HousingInfoErrors = {
        livesInCondominio: livesInCondominio === null,
        intercomName: livesInCondominio === true && !intercomName.trim(),
        floorNumber: livesInCondominio === true && !floorNumber.trim(),
      };
      setHousingErrors(housingErr);
      if (Object.values(housingErr).some(Boolean)) {
        toast({ title: "Informazioni abitazione mancanti", description: "Indica se abiti in un condominio e compila i campi richiesti.", variant: "destructive" });
        const firstId = housingErr.livesInCondominio ? "housing-cond-yes" : housingErr.intercomName ? "housing-intercom" : "housing-floor";
        document.getElementById(firstId)?.scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById(firstId)?.focus();
        return false;
      }
      if (isCaregiver) {
        const cgErr = { via: !caregiverVia.trim(), civico: !caregiverCivico.trim(), cap: !caregiverCap.trim(), citta: !caregiverCitta.trim() };
        setCaregiverErrors(cgErr);
        if (!caregiverFirstName.trim() || !caregiverLastName.trim() || Object.values(cgErr).some(Boolean)) {
          toast({ title: "Dati del familiare mancanti", description: "Compila nome, cognome e indirizzo completo del familiare.", variant: "destructive" });
          document.getElementById("is_caregiver_profile")?.scrollIntoView({ behavior: "smooth", block: "center" });
          return false;
        }
      }
    }

    if (profile.role === "professionista" && !parseRadius(radius)) {
      setRadiusError(true);
      toast({ title: "Distanza obbligatoria", description: "Indica quanti km vuoi coprire dal tuo segnalino.", variant: "destructive" });
      document.getElementById("service-radius")?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("service-radius")?.focus();
      return false;
    }

    setSaving(true);
    const updates: any = {
      first_name: firstName,
      last_name: lastName,
      address: profile.role === "paziente" ? composeAddress(via, civico, cap, citta) : address,
      bio,
    };
    updates.phone = phone;
    if (profile.role === "professionista") {
      updates.service_radius_km = parseRadius(radius);
      updates.numero_opi = numeroOpi;
      updates.numero_fnofi = numeroFnofi;
      updates.partita_iva = partitaIva;
    }
    if (profile.role === "paziente") {
      updates.age = age ? parseInt(age) : null;
      updates.additional_info = additionalInfo;
      updates.lives_in_condominio = livesInCondominio;
      updates.intercom_name = livesInCondominio ? intercomName : null;
      updates.floor_number = livesInCondominio ? floorNumber : null;
      updates.access_notes = livesInCondominio ? accessNotes : null;
      updates.medical_notes = medicalNotes || null;
      updates.is_caregiver = isCaregiver;
      if (isCaregiver) {
        updates.caregiver_first_name = caregiverFirstName.trim() || null;
        updates.caregiver_last_name = caregiverLastName.trim() || null;
        updates.caregiver_address = composeAddress(caregiverVia, caregiverCivico, caregiverCap, caregiverCitta);
      }
    }
    const { error } = await supabase.from("profiles").update(updates).eq("user_id", user!.id);
    setSaving(false);
    if (error) {
      toast({ title: "Errore", description: italianError(error, "profile"), variant: "destructive" });
      return false;
    }
    setInitialSnapshot(currentSnapshot);
    await refreshProfile();
    toast({ title: "Profilo aggiornato" });
    return true;
  };

    const { guard, dialog: unsavedDialog } = useUnsavedChangesGuard(isDirty, handleSave);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("delete-account", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      await signOut();
      navigate("/");
      toast({ title: "Account eliminato", description: "Tutti i tuoi dati sono stati rimossi." });
    } catch (err: any) {
      toast({ title: "Errore", description: italianError(err, "deletion"), variant: "destructive" });
    }
    setDeleting(false);
  };

  if (authLoading || !profile) {
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

  const professionalType = (profile as any).professional_type || "infermiere";

  return (
    <div className="min-h-screen flex flex-col">
      <AuthHeader />
      {unsavedDialog}
      <main className="flex-1 bg-background md:py-12 py-0">
        <div className="container mx-auto px-4 md:px-6 max-w-2xl">
          <Button variant="ghost" onClick={handleBack} className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Torna indietro
          </Button>
          <h1 className="text-xl md:text-senior-3xl font-bold mb-4">Il mio profilo</h1>

          {(

          <Card className="border-0 shadow-lg">
            <CardContent className="space-y-6 pt-6">
              {profile.role === "professionista" && (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {photoUrl ? (
                      <img src={photoUrl} alt="Foto profilo" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <span className="text-sm text-primary underline">{uploading ? "Caricamento..." : "Cambia foto"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                  </label>
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    Consigliato: una foto professionale con il tuo camice, ben illuminata e con sfondo bianco.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-senior-sm">Nome</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="text-senior-sm py-3" />
                </div>
                <div className="space-y-2">
                  <Label className="text-senior-sm">Cognome</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="text-senior-sm py-3" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-senior-sm">Email</Label>
                <Input value={profile.email} disabled className="text-senior-sm py-3 bg-muted" />
              </div>

              <div className="space-y-2">
                <Label className="text-senior-sm">Numero di cellulare *</Label>
                <Input id="phone-field" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Es. +39 333 1234567" className="text-senior-sm py-3" />
              </div>

              {profile.role === "paziente" ? (
                <>
                  <StructuredAddressInput
                    via={via}
                    civico={civico}
                    cap={cap}
                    citta={citta}
                    onViaChange={(v) => { setVia(v); setAddressErrors(e => ({ ...e, via: false })); }}
                    onCivicoChange={(v) => { setCivico(v); setAddressErrors(e => ({ ...e, civico: false })); }}
                    onCapChange={(v) => { setCap(v); setAddressErrors(e => ({ ...e, cap: false })); }}
                    onCittaChange={(v) => { setCitta(v); setAddressErrors(e => ({ ...e, citta: false })); }}
                    label="Indirizzo di residenza"
                    errors={addressErrors}
                  />
                  <div className="space-y-2">
                    <Label className="text-senior-sm">Età</Label>
                    <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Es. 72" className="text-senior-sm py-3" min="1" max="120" />
                  </div>
                  <div className="space-y-4 p-3 rounded-lg border">
                    <div className="flex items-start space-x-3">
                      <Checkbox id="is_caregiver_profile" checked={isCaregiver} onCheckedChange={(c) => setIsCaregiver(c === true)} className="mt-1" />
                      <Label htmlFor="is_caregiver_profile" className="text-senior-sm leading-relaxed cursor-pointer">
                        Sono un caregiver (assisto un familiare)
                      </Label>
                    </div>
                    {isCaregiver && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="cg-first" className="text-senior-sm">Nome del familiare</Label>
                            <Input id="cg-first" value={caregiverFirstName} onChange={(e) => setCaregiverFirstName(e.target.value)} className="text-senior-sm py-3" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cg-last" className="text-senior-sm">Cognome del familiare</Label>
                            <Input id="cg-last" value={caregiverLastName} onChange={(e) => setCaregiverLastName(e.target.value)} className="text-senior-sm py-3" />
                          </div>
                        </div>
                        <StructuredAddressInput
                          via={caregiverVia}
                          civico={caregiverCivico}
                          cap={caregiverCap}
                          citta={caregiverCitta}
                          onViaChange={(v) => { setCaregiverVia(v); setCaregiverErrors(e => ({ ...e, via: false })); }}
                          onCivicoChange={(v) => { setCaregiverCivico(v); setCaregiverErrors(e => ({ ...e, civico: false })); }}
                          onCapChange={(v) => { setCaregiverCap(v); setCaregiverErrors(e => ({ ...e, cap: false })); }}
                          onCittaChange={(v) => { setCaregiverCitta(v); setCaregiverErrors(e => ({ ...e, citta: false })); }}
                          label="Indirizzo del familiare"
                          errors={caregiverErrors}
                          idPrefix="caregiver"
                        />
                      </div>
                    )}
                  </div>


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
                    idPrefix="housing"
                  />

                  <MedicalNotesField
                    value={medicalNotes}
                    onChange={setMedicalNotes}
                    label="Note importanti sulla mia condizione (opzionale)"
                    idPrefix="my-medical-notes"
                  />

                </>
              ) : (
                <div className="space-y-2">
                  <Label className="text-senior-sm">Indirizzo</Label>
                  <AddressAutocomplete
                    value={address}
                    onChange={(val) => setAddress(val)}
                    onPlaceSelect={(details) => setAddress(details.fullAddress)}
                  />
                </div>
              )}

              {profile.role === "professionista" && (
                <>
                  <div className="p-3 rounded-lg border">
                    <ServiceRadiusInput value={radius} onChange={(v) => { setRadius(v); setRadiusError(false); }} error={radiusError} />
                  </div>
                  {professionalType === "infermiere" && (
                    <div className="space-y-2">
                      <Label className="text-senior-sm">Numero iscrizione OPI</Label>
                      <Input value={numeroOpi} onChange={(e) => setNumeroOpi(e.target.value)} className="text-senior-sm py-3" />
                    </div>
                  )}
                  {professionalType === "fisioterapista" && (
                    <div className="space-y-2">
                      <Label className="text-senior-sm">Numero iscrizione FNOFI</Label>
                      <Input value={numeroFnofi} onChange={(e) => setNumeroFnofi(e.target.value)} className="text-senior-sm py-3" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-senior-sm">Partita IVA</Label>
                    <Input value={partitaIva} onChange={(e) => setPartitaIva(e.target.value)} maxLength={11} className="text-senior-sm py-3" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-senior-sm">Bio / specializzazioni</Label>
                    <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="text-senior-sm" rows={3} />
                  </div>
                </>
              )}

              {isDirty && (
                <Button onClick={handleSave} className="w-full py-5 text-primary-foreground" disabled={saving}>
                  {saving ? "Salvataggio..." : "Salva modifiche"}
                </Button>
              )}

              <div className="h-16" />

              {/* Delete account section */}
              <div className="border-t border-border pt-5 mx-2 pb-5">
                <h3 className="text-base font-semibold text-destructive mb-1.5">Cancella account</h3>
                <p className="text-xs text-foreground mb-3">
                  Eliminando il tuo account, tutti i tuoi dati verranno rimossi permanentemente dal server, inclusi profilo, prenotazioni, recensioni e servizi. Questa azione è irreversibile.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-1.5 h-8 px-3 text-xs" disabled={deleting}>
                      <Trash2 className="w-3 h-3" />
                      {deleting ? "Eliminazione..." : "Elimina il mio account"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tutti i tuoi dati verranno eliminati permanentemente dal server. Questa azione non può essere annullata.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>No, torna indietro</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Sì, elimina definitivamente
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profilo;
