// Catalogo prestazioni fisioterapiche con fascia di prezzo per accesso (min–max €).
// Fonte: schede ComuniCARE, revisione 23 ottobre 2026. Le schede informative sono in schedePrestazioni.json.
import type { PrestazioneCatalogo } from "./catalogoInfermiere";

export const catalogoFisioterapista: PrestazioneCatalogo[] = [
  { nome: "Kinesio taping", min: 30, max: 40 },
  { nome: "Esercizio personalizzato", min: 45, max: 65 },
  { nome: "Ginnastica dolce per anziani", min: 40, max: 55 },
  { nome: "Ginnastica posturale a domicilio", min: 45, max: 60 },
  { nome: "Riabilitazione neurologica", min: 55, max: 75 },
  { nome: "Riabilitazione post frattura", min: 50, max: 65 },
  { nome: "Riabilitazione post operatoria", min: 50, max: 70 },
  { nome: "Riabilitazione sportiva", min: 50, max: 70 },
  { nome: "Trattamento fisioterapico di cervicalgia o lombalgia", min: 45, max: 65 },
  { nome: "Riabilitazione del pavimento pelvico", min: 60, max: 80 },
  { nome: "Riabilitazione respiratoria", min: 50, max: 70 },
  { nome: "Linfodrenaggio manuale", min: 50, max: 70 },
  { nome: "Massoterapia decontratturante", min: 40, max: 60 },
  { nome: "Elettrostimolazione neuromuscolare", min: 35, max: 50 },
  { nome: "Laserterapia", min: 40, max: 55 },
  { nome: "Laserterapia Nd YAG", min: 50, max: 70 },
  { nome: "Onde d’urto radiali", min: 55, max: 80 },
  { nome: "Tecarterapia", min: 45, max: 65 },
  { nome: "Ultrasuonoterapia", min: 35, max: 50 },
  { nome: "Valutazione ecografica funzionale RUSI", min: 65, max: 90 },
  { nome: "Valutazione fisioterapica iniziale", min: 55, max: 75 },
];
