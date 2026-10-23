import { catalogoInfermiere } from "@/data/catalogoInfermiere";
import { catalogoFisioterapista } from "@/data/catalogoFisioterapista";

export interface SezioneScheda { titolo: string; testo: string }
export interface SchedaPrestazione {
  modalita: string;
  durata?: string;
  utente: SezioneScheda[];
  professionista: SezioneScheda[];
}
export type SchedeMap = Record<string, SchedaPrestazione>;
export type ServiceInfoAudience = "utente" | "professionista";

const namesWithInfo = new Set([...catalogoInfermiere, ...catalogoFisioterapista].map((c) => c.nome));

/** True when the service has an info sheet (nurse and physiotherapy services). */
export function hasServiceInfo(name: string | null | undefined): boolean {
  return !!name && namesWithInfo.has(name);
}

let cache: Promise<SchedeMap> | null = null;

/** Loads the (large) info sheets only when someone opens one. */
export function loadSchede(): Promise<SchedeMap> {
  if (!cache) {
    cache = import("@/data/schedePrestazioni.json").then((m) => (m.default ?? m) as unknown as SchedeMap);
  }
  return cache;
}

/** Alphabetical (Italian) comparison used for every list of services. */
export function compareServiceNames(a: string, b: string): number {
  return a.localeCompare(b, "it");
}
