import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import Registrazione from "./pages/Registrazione.tsx";
import Termini from "./pages/Termini.tsx";
import Privacy from "./pages/Privacy.tsx";
import NotFound from "./pages/NotFound.tsx";
import SetupProfessionista from "./pages/SetupProfessionista.tsx";
import SetupDisponibilita from "./pages/SetupDisponibilita.tsx";
import DashboardProfessionista from "./pages/DashboardProfessionista.tsx";
import DashboardPaziente from "./pages/DashboardPaziente.tsx";
import ProfiloInfermiere from "./pages/ProfiloInfermiere.tsx";
import Login from "./pages/Login.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import PrenotazioneConfermata from "./pages/PrenotazioneConfermata.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import Profilo from "./pages/Profilo.tsx";
import SetupPosizione from "./pages/SetupPosizione.tsx";
import Contatti from "./pages/Contatti.tsx";
import StoricoPrestazioni from "./pages/StoricoPrestazioni.tsx";
import Prestazioni from "./pages/Prestazioni.tsx";

import BlogArticolo from "./pages/BlogArticolo.tsx";
import Admin from "./pages/Admin.tsx";
import ScrollToTop from "./components/ScrollToTop";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<DashboardPaziente />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registrazione" element={<Registrazione />} />
            <Route path="/termini" element={<Termini />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/setup-professionista" element={<SetupProfessionista />} />
            <Route path="/setup-professionista/disponibilita" element={<SetupDisponibilita />} />
            <Route path="/setup-professionista/posizione" element={<SetupPosizione />} />
            <Route path="/dashboard-professionista" element={<DashboardProfessionista />} />
            <Route path="/dashboard-paziente" element={<DashboardPaziente />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/profilo-infermiere/:id" element={<ProfiloInfermiere />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/prenotazione-confermata" element={<PrenotazioneConfermata />} />
            <Route path="/pagamento-successo" element={<PrenotazioneConfermata />} />
            <Route path="/profilo" element={<Profilo />} />
            <Route path="/storico-prestazioni" element={<StoricoPrestazioni />} />
            <Route path="/prestazioni" element={<Prestazioni />} />
            <Route path="/contatti" element={<Contatti />} />
            
            <Route path="/blog/:slug" element={<BlogArticolo />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
