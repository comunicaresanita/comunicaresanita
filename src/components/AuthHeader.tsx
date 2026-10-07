import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/comunicare-logo-header.png";
import { Menu, LogOut, Phone, Home, User, HelpCircle, ClipboardList, BriefcaseMedical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AuthHeader = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const logoTarget = user
    ? profile?.role === "professionista"
      ? "/dashboard-professionista"
      : "/"
    : "/";

  const requireAuth = (to: string, message: string) => {
    navigate("/login", { state: { redirect: to, message } });
  };

  const isProfessionista = profile?.role === "professionista";

  return (
    <header className="bg-card shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl py-3 md:py-4 flex items-center justify-between gap-1.5 md:gap-2">
        <Link to={logoTarget} className="flex items-center flex-shrink-0">
          <img src={logo} alt="ComuniCARE" className="h-10 sm:h-14 md:h-20 w-auto object-contain flex-shrink-0" />
        </Link>

        {user ? (
          <div className="flex items-center gap-1 md:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 px-2 md:px-3 h-9 md:h-10">
                  <Menu className="w-4 h-4" />
                  <span className="text-sm md:text-base">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isProfessionista && (
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard-professionista" className="cursor-pointer">
                      <Home className="w-4 h-4 mr-2" />Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/profilo" className="cursor-pointer"><User className="w-4 h-4 mr-2" />Profilo</Link>
                </DropdownMenuItem>
                {!isProfessionista && (
                  <DropdownMenuItem asChild>
                    <Link to="/storico-prestazioni" className="cursor-pointer"><ClipboardList className="w-4 h-4 mr-2" />Storico</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/contatti" className="cursor-pointer"><Phone className="w-4 h-4 mr-2" />Contatti</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={isProfessionista ? "/dashboard-professionista" : "/registrazione?ruolo=professionista"} className="cursor-pointer">
                    <BriefcaseMedical className="w-4 h-4 mr-2" />Professionisti
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/contatti#faq" className="cursor-pointer"><HelpCircle className="w-4 h-4 mr-2" />FAQ</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Esci
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-1 md:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 px-2 md:px-3 h-9 md:h-10">
                  <Menu className="w-4 h-4" />
                  <span className="text-sm md:text-base">Menu</span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <button
                    onClick={() => requireAuth("/profilo", "Accedi o registrati per visualizzare il tuo profilo.")}
                    className="w-full text-left cursor-pointer"
                  >
                    <User className="w-4 h-4 mr-2" />Profilo
                  </button>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <button
                    onClick={() => requireAuth("/storico-prestazioni", "Accedi o registrati per visualizzare lo storico delle tue prestazioni.")}
                    className="w-full text-left cursor-pointer"
                  >
                    <ClipboardList className="w-4 h-4 mr-2" />Storico
                  </button>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/contatti" className="cursor-pointer"><Phone className="w-4 h-4 mr-2" />Contatti</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/registrazione?ruolo=professionista" className="cursor-pointer">
                    <BriefcaseMedical className="w-4 h-4 mr-2" />Professionisti
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/contatti#faq" className="cursor-pointer"><HelpCircle className="w-4 h-4 mr-2" />FAQ</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild size="sm" className="px-3 md:px-6 h-9 md:h-10 text-sm md:text-base">
              <Link to="/login">Accedi</Link>
            </Button>

          </div>
        )}
      </div>
    </header>
  );
};

export default AuthHeader;
