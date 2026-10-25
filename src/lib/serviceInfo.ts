import { catalogoInfermiere } from "@/data/catalogoInfermiere";
import { catalogoFisioterapista } from "@/data/catalogoFisioterapista";
import { catalogoOss } from "@/data/catalogoOss";

export interface SezioneScheda { titolo: string; testo: string }
export interface SchedaPrestazione {
  /** Short note on how the price/time is agreed (OSS services). */
  nota?: string;
  durata?: string;
  utente: SezioneScheda[];
  professionista: SezioneScheda[];
}
export type SchedeMap = Record<string, SchedaPrestazione>;
export type ServiceInfoAudience = "utente" | "professionista";

const catalogoCompleto = [...catalogoInfermiere, ...catalogoFisioterapista, ...catalogoOss];
const namesWithInfo = new Set(catalogoCompleto.map((c) => c.nome));
const hourlyNames = new Set(catalogoCompleto.filter((c) => c.perOra).map((c) => c.nome));

/** "/ora" for services priced per hour, "" for services priced per visit. */
export function priceUnit(name: string | null | undefined): string {
  return name && hourlyNames.has(name) ? "/ora" : "";
}

/** True when the service has an info sheet (nurse, physiotherapy and OSS services). */
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
