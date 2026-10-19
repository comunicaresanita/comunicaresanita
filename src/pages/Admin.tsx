import { italianError } from "@/lib/italianErrors";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Lock, Users, UserCheck, Activity, TrendingUp, Trash2, Download, X } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

type Profile = {
  id: string;
  user_id: string;
  role: string;
  first_name: string;
  last_name: string;
  email: string;
  address: string | null;
  bio: string | null;
  numero_opi: string | null;
  numero_fnofi: string | null;
  partita_iva: string | null;
  phone: string | null;
  photo_url: string | null;
  professional_type: string | null;
  age: number | null;
  additional_info: string | null;
  is_caregiver: boolean | null;
  zona: string | null;
  lat: number | null;
  lng: number | null;
  verified: boolean;
  created_at: string;
};

type ContactSubmission = {
  id: string;
  created_at: string;
  nome: string;
  email: string;
  messaggio: string;
};

type AdminBooking = {
  id: string; created_at: string; service_name: string; price: number; day: string; time_slot: string; status: string;
  patient_first_name: string | null; patient_last_name: string | null; patient_email: string | null;
  professional_first_name: string | null; professional_last_name: string | null; professional_type: string | null;
};

const COLORS = ["#0097B2", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6"];

const professionalTypeLabel = (type: string | null) => {
  switch (type) {
    case "infermiere": return "Infermiere";
    case "oss": return "OSS";
    case "fisioterapista": return "Fisioterapista";
    default: return type || "N/A";
  }
};

const Admin = () => {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [hiddenBookingIds, setHiddenBookingIds] = useState<Set<string>>(new Set());
  const deleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const visibleBookings = bookings.filter(b => !hiddenBookingIds.has(b.id));
  const activeBookings = visibleBookings.filter(b => b.status !== "cancelled");
  const cancelledBookings = visibleBookings.filter(b => b.status === "cancelled");

  const unhideBooking = (id: string) => setHiddenBookingIds(prev => { const n = new Set(prev); n.delete(id); return n; });

  const handleRemoveBooking = (b: AdminBooking) => {
    setHiddenBookingIds(prev => new Set(prev).add(b.id));
    const timer = setTimeout(async () => {
      deleteTimers.current.delete(b.id);
      const { data, error: fnError } = await supabase.functions.invoke("admin-data", {
        body: { password, action: "deleteBooking", bookingId: b.id },
      });
      if (fnError || data?.error) {
        unhideBooking(b.id);
        toast.error("Impossibile cancellare la prenotazione", { description: italianError(data?.error || fnError, "admin") });
        return;
      }
      setBookings(prev => prev.filter(x => x.id !== b.id));
      unhideBooking(b.id);
    }, 6000);
    deleteTimers.current.set(b.id, timer);
    toast("Prenotazione cancellata dal registro", {
      duration: 6000,
      action: {
        label: "Annulla",
        onClick: () => {
          const t = deleteTimers.current.get(b.id);
          if (t) clearTimeout(t);
          deleteTimers.current.delete(b.id);
          unhideBooking(b.id);
        },
      },
    });
  };
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("admin-data", {
        body: { password },
      });
      if (fnError || data?.error) {
        setError(italianError(data?.error || fnError, "admin"));
        return;
      }
      setProfiles(data.profiles);
      setContacts(data.contacts ?? []);
      setBookings(data.bookings ?? []);
      setAuthenticated(true);
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("admin-data", {
        body: { password, action: "delete", userId: deleteTarget.user_id },
      });
      if (fnError || data?.error) {
        toast.error(italianError(data?.error || fnError, "deletion"));
        return;
      }
      setProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setSelectedUser(null);
      setDeleteTarget(null);
      toast.success("Utente eliminato con successo");
    } catch {
      toast.error("Errore di connessione");
    } finally {
      setDeleting(false);
    }
  };

  const downloadPDF = async () => {
    const element = document.getElementById("admin-dashboard-content");
    if (!element) return;
    toast.info("Generazione PDF in corso...");
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;
      let position = 0;

      while (position < scaledHeight) {
        if (position > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -position, pdfWidth, scaledHeight);
        position += pdfHeight;
      }

      const pdfBlob = pdf.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = "Report_Iscritti.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(pdfUrl);
      toast.success("PDF scaricato!");
    } catch (error) {
      console.error("Errore generazione PDF admin:", error);
      toast.error("Errore durante la generazione del PDF");
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="w-12 h-12 mx-auto mb-3 text-primary" />
            <CardTitle className="text-2xl">Admin ComuniCARE</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Password amministratore"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button onClick={handleLogin} disabled={loading} className="w-full">
              {loading ? "Accesso..." : "Accedi"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const utenti = profiles.filter((p) => p.role === "paziente");
  const professionisti = profiles.filter((p) => p.role === "professionista");
  const infermieri = professionisti.filter((p) => p.professional_type === "infermiere");
  const oss = professionisti.filter((p) => p.professional_type === "oss");
  const fisioterapisti = professionisti.filter((p) => p.professional_type === "fisioterapista");

  const pieData = [
    { name: "Utenti", value: utenti.length },
    { name: "Infermieri", value: infermieri.length },
    { name: "OSS", value: oss.length },
    { name: "Fisioterapisti", value: fisioterapisti.length },
  ].filter((d) => d.value > 0);

  const timelineMap: Record<string, number> = {};
  profiles.forEach((p) => {
    const month = format(parseISO(p.created_at), "yyyy-MM");
    timelineMap[month] = (timelineMap[month] || 0) + 1;
  });
  const timelineData = Object.entries(timelineMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      month: format(parseISO(month + "-01"), "MMM yyyy", { locale: it }),
      iscritti: count,
    }));

  let cumulative = 0;
  const cumulativeData = Object.entries(timelineMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => {
      cumulative += count;
      return {
        month: format(parseISO(month + "-01"), "MMM yyyy", { locale: it }),
        totale: cumulative,
      };
    });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div id="admin-dashboard-content" className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-bold text-2xl">Dashboard admin</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadPDF}>
              <Download className="w-4 h-4 mr-1" /> Scarica PDF
            </Button>
            <Button variant="outline" onClick={() => { setAuthenticated(false); setPassword(""); }}>
              Esci
            </Button>
          </div>
        </div>

        <section className="space-y-4" aria-labelledby="contact-messages-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="contact-messages-heading" className="text-lg font-bold">Messaggi dai contatti</h2>
            <Button variant="outline" onClick={handleLogin} disabled={loading}>Aggiorna</Button>
          </div>
          {contacts.length === 0 ? <p className="text-muted-foreground">Nessun messaggio ricevuto.</p> : contacts.map(contact => (
            <Card key={contact.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold break-words">{contact.nome}</p>
                  <time className="text-sm text-muted-foreground">{format(parseISO(contact.created_at), "dd/MM/yyyy HH:mm", { locale: it })}</time>
                </div>
                <a href={`mailto:${contact.email}`} className="text-primary underline break-all">{contact.email}</a>
                <p className="whitespace-pre-wrap break-words">{contact.messaggio}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Totale Iscritti", value: profiles.length, icon: Users, color: "text-primary" },
            { label: "Utenti", value: utenti.length, icon: UserCheck, color: "text-amber-500" },
            { label: "Infermieri", value: infermieri.length, icon: Activity, color: "text-emerald-500" },
            { label: "OSS", value: oss.length, icon: Activity, color: "text-red-500" },
            { label: "Fisioterapisti", value: fisioterapisti.length, icon: Activity, color: "text-violet-500" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <stat.icon className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuzione Utenti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Iscrizioni nel tempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timelineData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Bar dataKey="iscritti" fill="#0097B2" radius={[6, 6, 0, 0]} name="Nuovi iscritti" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cumulative chart - Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Crescita totale iscritti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeData}>
                  <defs>
                    <linearGradient id="gradientTotale" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="totale" stroke="#10B981" strokeWidth={3} fill="url(#gradientTotale)" name="Totale iscritti" dot={{ r: 5, fill: "#10B981" }} activeDot={{ r: 7 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-4" aria-labelledby="bookings-heading">
          <h2 id="bookings-heading" className="text-lg font-bold">Prenotazioni</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Prenotazioni effettuate</p><p className="text-2xl font-bold text-primary">{activeBookings.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Prenotazioni annullate</p><p className="text-2xl font-bold text-destructive">{cancelledBookings.length}</p></CardContent></Card>
          </div>
          <details className="group rounded-lg border bg-card">
            <summary className="cursor-pointer select-none p-4 font-medium text-primary">Ulteriori dettagli</summary>
            <div className="p-4 pt-0 space-y-3">
              {visibleBookings.length === 0 ? <p className="text-muted-foreground">Nessuna prenotazione.</p> : visibleBookings.map(b => (
                <Card key={b.id}>
                  <CardContent className="p-4 space-y-1 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-semibold">{b.service_name}</p>
                      <div className="flex flex-col items-end gap-1">
                        <span className={b.status === "cancelled" ? "text-destructive font-medium" : "text-primary font-medium"}>
                          {b.status === "cancelled" ? "Annullata" : b.status === "completed" ? "Eseguita" : "Prenotata"}
                        </span>
                        <button type="button" onClick={() => handleRemoveBooking(b)} aria-label="Cancella dal registro" title="Cancella dal registro" className="text-destructive hover:opacity-70 p-1">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-muted-foreground">{b.day} · {b.time_slot}</p>
                    <p><span className="font-medium">Utente:</span> {[b.patient_first_name, b.patient_last_name].filter(Boolean).join(" ") || "Account eliminato"}{b.patient_email ? <> · <a href={`mailto:${b.patient_email}`} className="text-primary underline break-all">{b.patient_email}</a></> : null}</p>
                    <p><span className="font-medium">Professionista:</span> {[b.professional_first_name, b.professional_last_name].filter(Boolean).join(" ") || "Account eliminato"} · {professionalTypeLabel(b.professional_type)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </details>
        </section>

        {/* Users table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tutti gli iscritti ({profiles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data iscrizione</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted">
                      <TableCell className="font-medium" onClick={() => setSelectedUser(p)}>{p.first_name} {p.last_name}</TableCell>
                      <TableCell onClick={() => setSelectedUser(p)}>{p.email}</TableCell>
                      <TableCell onClick={() => setSelectedUser(p)}>{p.role === "professionista" ? "Professionista" : "Utente"}</TableCell>
                      <TableCell onClick={() => setSelectedUser(p)}>{p.role === "professionista" ? professionalTypeLabel(p.professional_type) : "—"}</TableCell>
                      <TableCell onClick={() => setSelectedUser(p)}>{format(parseISO(p.created_at), "dd/MM/yyyy HH:mm", { locale: it })}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* User detail dialog */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{selectedUser?.first_name} {selectedUser?.last_name}</DialogTitle>
              <DialogDescription>Dettagli profilo utente</DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-3 text-sm">
                {[
                  ["Email", selectedUser.email],
                  ["Telefono", selectedUser.phone],
                  ["Ruolo", selectedUser.role === "professionista" ? "Professionista" : "Utente"],
                  ["Tipo professionista", selectedUser.role === "professionista" ? professionalTypeLabel(selectedUser.professional_type) : null],
                  ["Indirizzo", selectedUser.address],
                  ["Zona", selectedUser.zona],
                  ["Età", selectedUser.age],
                  ["Bio", selectedUser.bio],
                  ["Partita IVA", selectedUser.partita_iva],
                  ["Numero OPI", selectedUser.numero_opi],
                  ["Numero FNOFI", selectedUser.numero_fnofi],
                  ["Caregiver", selectedUser.is_caregiver ? "Sì" : "No"],
                  ["Info aggiuntive", selectedUser.additional_info],
                  ["Verificato", selectedUser.verified ? "Sì" : "No"],
                  ["Coordinate", selectedUser.lat && selectedUser.lng ? `${selectedUser.lat}, ${selectedUser.lng}` : null],
                  ["Data iscrizione", format(parseISO(selectedUser.created_at), "dd/MM/yyyy HH:mm", { locale: it })],
                ].filter(([, val]) => val !== null && val !== undefined && val !== "").map(([label, val]) => (
                  <div key={label as string} className="flex justify-between border-b pb-2">
                    <span className="font-medium text-muted-foreground">{label}</span>
                    <span className="text-right max-w-[60%]">{String(val)}</span>
                  </div>
                ))}
                {selectedUser.photo_url && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-2">Foto profilo</p>
                    <img src={selectedUser.photo_url} alt="Foto" className="w-24 h-24 rounded-full object-cover" />
                  </div>
                )}
                <Button variant="destructive" className="w-full mt-4" onClick={() => { setDeleteTarget(selectedUser); }}>
                  <Trash2 className="w-4 h-4 mr-2" /> Elimina utente
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicuro di voler eliminare <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong> ({deleteTarget?.email})?
                Questa azione è irreversibile e cancellerà tutti i dati associati.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting ? "Eliminazione..." : "Elimina"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Admin;
