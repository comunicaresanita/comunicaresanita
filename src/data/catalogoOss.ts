// Catalogo prestazioni OSS con fascia di prezzo (min–max €), a ora o per intervento.
// Fonte: schede ComuniCARE, verifica 23 ottobre 2026. Le schede informative sono in schedePrestazioni.json.
import type { PrestazioneCatalogo } from "./catalogoInfermiere";

export const catalogoOss: PrestazioneCatalogo[] = [
  { nome: "Accompagnamento per visite commissioni e uscite", min: 30, max: 35, perOra: true },
  { nome: "Piccola spesa e commissioni per conto della persona", min: 25, max: 30, perOra: true },
  { nome: "Preparazione pasti a domicilio", min: 25, max: 35 },
  { nome: "Supporto nella gestione leggera della casa", min: 25, max: 35 },
  { nome: "Assistenza al pasto e idratazione", min: 25, max: 35, perOra: true },
  { nome: "Assistenza diurna alla persona e sollievo al caregiver", min: 25, max: 30, perOra: true },
  { nome: "Assistenza notturna alla persona", min: 30, max: 40, perOra: true },
  { nome: "Presenza e sorveglianza notturna", min: 25, max: 30, perOra: true },
  { nome: "Compagnia, socializzazione e attività ricreative", min: 20, max: 25, perOra: true },
  { nome: "Igiene personale completa in doccia, vasca o a letto", min: 35, max: 40, perOra: true },
  { nome: "Igiene intima e cambio pannolone con vestizione e sistemazione", min: 25, max: 35 },
  { nome: "Routine del mattino con igiene alzata e colazione", min: 40, max: 50 },
  { nome: "Routine della sera con cena igiene e preparazione al riposo", min: 40, max: 50 },
  { nome: "Assistenza alla deambulazione", min: 25, max: 35 },
  { nome: "Aiuto nell’alzata e trasferimento da letto a poltrona o carrozzina", min: 25, max: 35 },
  { nome: "Mobilizzazione e cambio postura a letto", min: 25, max: 35 },
].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
