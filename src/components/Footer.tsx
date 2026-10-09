import { Link } from "react-router-dom";
import { Mail, MapPin } from "lucide-react";
import logo from "@/assets/comunicare-logo-footer.png";

const Footer = () => {
  return (
    <footer className="bg-medical-dark text-primary-foreground">
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <Link to="/"><img src={logo} alt="ComuniCARE" className="h-12 md:h-14 mb-4 w-auto object-contain" /></Link>
            <p className="md:text-senior-sm opacity-80 text-base mx-[10px] text-left">
              ​Qualità, professionalità 
              e cura direttamente a casa tua.
            </p>
          </div>
          <div>
            <h4 className="text-base md:text-senior-lg font-semibold mb-3 md:mb-4">{"\n"}</h4>
            <ul className="space-y-2 text-sm md:text-senior-sm">
              <li><Link to="/termini" className="opacity-80 hover:opacity-100 transition-opacity">Termini e Condizioni</Link></li>
              <li><Link to="/privacy" className="opacity-80 hover:opacity-100 transition-opacity">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-base md:text-senior-lg font-semibold mb-3 md:mb-4">Contatti</h4>
            <ul className="space-y-3 text-sm md:text-senior-sm opacity-80">
              <li className="flex items-center gap-2"><Mail className="w-4 h-4 flex-shrink-0" /> comunicaresanita@gmail.com</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4 flex-shrink-0" /> Firenze, Italia</li>
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
