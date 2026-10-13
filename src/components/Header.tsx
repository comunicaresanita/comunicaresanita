import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/comunicare-logo-header.png";

const Header = () => {
  return (
    <header className="bg-card shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl py-3 md:py-4 flex items-center justify-between gap-1.5">
        <Link to="/" className="flex items-center flex-shrink-0">
          <img src={logo} alt="ComuniCARE" className="h-10 sm:h-14 md:h-20 w-auto object-contain flex-shrink-0" />
        </Link>
        <div className="flex items-center gap-1 md:gap-2">
          <Button asChild size="sm" className="px-3 md:px-8 h-9 md:h-10 text-sm md:text-base">
            <Link to="/login">Accedi</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="px-3 md:px-8 h-9 md:h-10 text-sm md:text-base bg-card">
            <Link to="/registrazione">Registrati</Link>
          </Button>
        </div>
      </div>

    </header>
  );
};

export default Header;
