// Centralized catalog of all services offered on the platform,
// grouped by professional type. Update here to add/remove services.
import { catalogoInfermiere } from "./catalogoInfermiere";

// Nurse services come from the official catalog (names + price bands + info sheets).
export const prestazioniInfermiere: string[] = catalogoInfermiere
  .map((c) => c.nome)
  .sort((a, b) => a.localeCompare(b, "it"));

export const prestazioniFisioterapista: string[] = [
  "Elettrostimolazione",
  "Esercizio terapeutico personalizzato",
  "Ginnastica dolce per anziani",
  "Ginnastica posturale a domicilio",
  "Kinesio taping",
  "Laser terapia",
  "Laser terapia YAG",
  "Linfodrenaggio manuale",
  "Massoterapia decontratturante",
  "Mobilizzazione articolare",
  "Onde d'urto",
  "Riabilitazione motoria a domicilio",
  "Riabilitazione neurologica",
  "Riabilitazione pavimento pelvico",
  "Riabilitazione post-frattura",
  "Riabilitazione post-ictus",
  "Riabilitazione post-operatoria (protesi anca/ginocchio)",
  "Riabilitazione respiratoria",
  "Riabilitazione sportiva",
  "Rieducazione alla deambulazione",
  "Stretching terapeutico",
  "Tecar terapia",
  "Terapia manuale ortopedica",
  "Trattamento cervicalgia/lombalgia",
  "Ultrasuono",
  "Valutazione ecografica",
].sort((a, b) => a.localeCompare(b, "it"));

export const prestazioniOss: string[] = [
  "Accompagnamento a passeggiate",
  "Accompagnamento a visite mediche",
  "Assistenza ai pasti e imboccamento",
  "Assistenza alla deambulazione",
  "Assistenza continuativa diurna (per ora)",
  "Assistenza continuativa notturna (per ora)",
  "Bagno assistito in vasca/doccia",
  "Cambio pannolone e igiene intima",
  "Compagnia e sorveglianza diurna (per ora)",
  "Igiene personale completa a letto",
  "Mobilizzazione e cambio postura a letto",
  "Piccola spesa e commissioni",
  "Preparazione pasti a domicilio",
  "Sorveglianza notturna (per ora)",
  "Stimolazione cognitiva e attività ricreative",
  "Supporto nella gestione della casa leggera",
  "Trasferimento letto-carrozzina/poltrona",
  "Vestizione e svestizione assistita",
].sort((a, b) => a.localeCompare(b, "it"));

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
