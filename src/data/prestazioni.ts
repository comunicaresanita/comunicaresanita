// Centralized catalog of all services offered on the platform,
// grouped by professional type. Update here to add/remove services.
import { catalogoInfermiere } from "./catalogoInfermiere";
import { catalogoFisioterapista } from "./catalogoFisioterapista";
import { catalogoOss } from "./catalogoOss";

// Nurse services come from the official catalog (names + price bands + info sheets).
export const prestazioniInfermiere: string[] = catalogoInfermiere
  .map((c) => c.nome)
  .sort((a, b) => a.localeCompare(b, "it"));

// Physiotherapy services come from the official catalog (names + price bands + info sheets).
export const prestazioniFisioterapista: string[] = catalogoFisioterapista
  .map((c) => c.nome)
  .sort((a, b) => a.localeCompare(b, "it"));

// OSS services come from the official catalog (names + price bands + info sheets).
export const prestazioniOss: string[] = catalogoOss
  .map((c) => c.nome)
  .sort((a, b) => a.localeCompare(b, "it"));

// Flat alphabetical list used by the search bar
export const prestazioniDisponibili: string[] = Array.from(
  new Set([...prestazioniInfermiere, ...prestazioniFisioterapista, ...prestazioniOss]),
).sort((a, b) => a.localeCompare(b, "it"));

export const prestazioniPerProfessione: {
  type: "infermiere" | "fisioterapista" | "oss";
  label: string;
  description: string;
  items: string[];
}[] = [
  {
    type: "infermiere",
    label: "Infermiere",
    description: "Prestazioni sanitarie infermieristiche a domicilio.",
    items: prestazioniInfermiere,
  },
  {
    type: "fisioterapista",
    label: "Fisioterapista",
    description: "Trattamenti riabilitativi e fisioterapici a domicilio.",
    items: prestazioniFisioterapista,
  },
  {
    type: "oss",
    label: "OSS",
    description: "Assistenza e supporto nella vita quotidiana.",
    items: prestazioniOss,
  },
];
