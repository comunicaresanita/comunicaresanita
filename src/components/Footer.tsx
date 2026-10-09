import { Link } from "react-router-dom";
import { Mail, MapPin, Facebook } from "lucide-react";
import logo from "@/assets/comunicare-logo-footer.png";

const Footer = () => {
  return (
    <footer className="bg-medical-dark text-primary-foreground">
      <div className="container mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-24 lg:max-w-6xl">
        <div className="flex flex-col items-center gap-6 text-center lg:grid lg:grid-cols-3 lg:items-start lg:gap-8">
          <div className="flex flex-col items-center lg:order-2 lg:pt-1">
            <Link to="/"><img src={logo} alt="ComuniCARE" className="h-12 md:h-14 mb-4 w-auto object-contain" /></Link>
            <p className="md:text-senior-sm opacity-80 text-base text-center">
              ​Qualità, professionalità 
              e cura direttamente a casa tua.
            </p>
          </div>
          <nav aria-label="Link utili" className="lg:order-3">
            <h4 className="hidden lg:block text-senior-lg font-semibold mb-4">Link utili</h4>
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm md:text-senior-sm lg:flex-col lg:gap-3">
              <li><Link to="/termini" className="opacity-80 hover:opacity-100 transition-opacity">Termini e Condizioni</Link></li>
              <li><Link to="/privacy" className="opacity-80 hover:opacity-100 transition-opacity">Privacy Policy</Link></li>
              <li className="hidden lg:block"><Link to="/prestazioni" className="opacity-80 hover:opacity-100 transition-opacity">Tutti i servizi</Link></li>
              <li className="hidden lg:block"><a href="/#faq" className="opacity-80 hover:opacity-100 transition-opacity">FAQ</a></li>
            </ul>
          </nav>
          <div className="min-w-0 lg:order-1">
            <h4 className="text-base md:text-senior-lg font-semibold mb-3 md:mb-4">Contatti</h4>
            <ul className="space-y-3 text-sm md:text-senior-sm opacity-80">
              <li className="flex items-center justify-center gap-2"><Mail className="w-4 h-4 flex-shrink-0" /><a href="mailto:comunicaresanita@gmail.com" className="break-all">comunicaresanita@gmail.com</a></li>
              <li className="flex items-center justify-center gap-2"><MapPin className="w-4 h-4 flex-shrink-0" /> Firenze, Italia</li>
              <li className="flex items-center justify-center gap-2"><a
                href="https://www.facebook.com/profile.php?id=61594047286315"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  const url = "https://www.facebook.com/profile.php?id=61594047286315";
                  const win = window.open(url, "_blank", "noopener,noreferrer");
                  if (!win) window.location.href = url;
                }}
                className="inline-flex items-center gap-2 hover:opacity-100 transition-opacity"
                aria-label="ComuniCARE su Facebook (si apre in una nuova scheda)"><Facebook className="w-5 h-5 flex-shrink-0" aria-hidden="true" /> Facebook</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-primary-foreground/20">
          <p className="text-xs md:text-senior-sm text-center opacity-90 font-medium leading-relaxed">
            ComuniCARE è un fornitore di servizi di intermediazione. La responsabilità della prestazione sanitaria è esclusivamente in capo al professionista abilitato.
          </p>
          <p className="text-xs md:text-sm text-center opacity-60 mt-3 md:mt-4">
            © {new Date().getFullYear()} ComuniCARE
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
