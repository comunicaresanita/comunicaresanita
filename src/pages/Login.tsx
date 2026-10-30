import { italianError } from "@/lib/italianErrors";
import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { redirect?: string; message?: string } | null;
  const gateMessage = state?.message;
  const redirectTo = state?.redirect;
  const { toast } = useToast();
  const { signIn, resetPassword } = useAuth();

  // Sicurezza: in passato la password veniva salvata in chiaro nel browser ("Ricordami").
  // Ora la sessione resta attiva grazie al token di Supabase; qui cancelliamo ogni residuo.
  useEffect(() => {
    try { localStorage.removeItem("comunicare_remember"); } catch { /* ignore */ }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({ title: "Errore di accesso", description: italianError(error, "login"), variant: "destructive" });
      return;
    }

    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
        if (profile?.role === "professionista") {
          navigate("/dashboard-professionista");
        } else {
          navigate(redirectTo || "/");
        }
      }
    }, 300);
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      toast({ title: "Errore", description: italianError(error, "recovery"), variant: "destructive" });
    } else {
      toast({ title: "Email inviata", description: "Controlla la tua casella email per il link di recupero." });
      setIsRecovery(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Accedi — ComuniCARE"
        description="Accedi al tuo account ComuniCARE per gestire prenotazioni e profilo sulla piattaforma di assistenza sanitaria a domicilio."
        path="/login"
      />
      <Header />
      <main className="flex-1 bg-background py-16 flex items-center justify-center">
        <Card className="w-full max-w-md mx-6 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-start">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1 px-2 text-senior-sm"
                onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
              >
                <ArrowLeft className="w-4 h-4" /> Indietro
              </Button>
            </div>
            <CardTitle className="text-senior-xl">
              {isRecovery ? "Recupera password" : "Accedi"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {gateMessage && !isRecovery && (
              <div className="mb-4 rounded-md border border-primary/30 bg-secondary p-3 text-senior-sm text-foreground">
                {gateMessage}
              </div>
            )}
            {isRecovery ? (
              <form onSubmit={handleRecovery} className="space-y-4">
                <Input type="email" placeholder="La tua email" value={email} onChange={(e) => setEmail(e.target.value)} required className="text-senior-sm py-3" />
                <Button type="submit" className="w-full py-5" disabled={loading}>
                  {loading ? "Invio in corso..." : "Invia link di recupero"}
                </Button>
                <button type="button" onClick={() => setIsRecovery(false)} className="text-primary text-senior-sm w-full text-center underline">
                  Torna al login
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="text-senior-sm py-3" />
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="text-senior-sm py-3 pr-12" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <Button type="submit" className="w-full py-5" disabled={loading}>
                  {loading ? "Accesso in corso..." : "Accedi"}
                </Button>
                <button type="button" onClick={() => setIsRecovery(true)} className="text-primary text-senior-sm w-full text-center underline">
                  Password dimenticata?
                </button>
                <p className="text-center text-senior-sm text-muted-foreground">
                  Non hai un account?{" "}
                  <Link to="/registrazione" state={redirectTo ? { redirect: redirectTo } : undefined} className="text-primary underline font-medium">Registrati</Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
