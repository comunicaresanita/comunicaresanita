import { describe, expect, it } from "vitest";
import { prestazioniDisponibili, prestazioniFisioterapista, prestazioniInfermiere, prestazioniOss, prestazioniPerProfessione } from "@/data/prestazioni";
import { catalogoOss } from "@/data/catalogoOss";
import { priceUnit } from "@/lib/serviceInfo";
import { catalogoFisioterapista } from "@/data/catalogoFisioterapista";
import { catalogoInfermiere } from "@/data/catalogoInfermiere";
import schede from "@/data/schedePrestazioni.json";
import { hasServiceInfo } from "@/lib/serviceInfo";

const sorted = (list: string[]) => [...list].sort((a, b) => a.localeCompare(b, "it"));

describe("Prestazioni consentite", () => {
  it("non offre prelievi ematici o per test rapidi per nessuna professione", () => {
    expect(prestazioniPerProfessione.flatMap(p => p.items).filter(name => /preliev/i.test(name))).toEqual([]);
  });
});

describe("Catalogo infermieri", () => {
  it("contiene esattamente le 63 nuove prestazioni e nessuna di quelle vecchie", () => {
    expect(prestazioniInfermiere).toHaveLength(63);
    expect(prestazioniInfermiere).not.toContain("Medicazione semplice");
    expect(prestazioniInfermiere).not.toContain("Iniezione intramuscolare");
    expect(prestazioniInfermiere).not.toContain("ECG a domicilio");
    expect(prestazioniInfermiere).toContain("Lavaggio vaginale (prescrizione medica)");
  });

  it("usa le fasce di prezzo indicate", () => {
    const band = (n: string) => catalogoInfermiere.find(c => c.nome === n);
    expect(band("Bendaggio compressivo")).toMatchObject({ min: 35, max: 50 });
    expect(band("Medicazione della lesione da pressione, stadio 4")).toMatchObject({ min: 60, max: 85 });
    expect(band("Rimozione di punti di sutura cutanea con filo")).toMatchObject({ min: 20, max: 35 });
    expect(band("Lavaggio vaginale (prescrizione medica)")).toMatchObject({ min: 40, max: 50 });
  });

  it("ogni prestazione infermieristica ha la scheda utente e quella del professionista, senza la frase esclusa", () => {
    const all = schede as Record<string, { utente: { titolo: string }[]; professionista: { titolo: string }[] }>;
    for (const nome of prestazioniInfermiere) {
      expect(hasServiceInfo(nome)).toBe(true);
      expect(all[nome].utente.map(s => s.titolo)).toContain("Materiale da avere a casa");
      expect(all[nome].professionista.map(s => s.titolo)).toContain("Attenzioni specifiche");
    }
    expect(JSON.stringify(schede)).not.toMatch(/Figura competente/);
  });

  it("mostra le prestazioni in ordine alfabetico", () => {
    expect(prestazioniInfermiere).toEqual(sorted(prestazioniInfermiere));
    expect(prestazioniDisponibili).toEqual(sorted(prestazioniDisponibili));
    for (const gruppo of prestazioniPerProfessione) expect(gruppo.items).toEqual(sorted(gruppo.items));
  });
});

describe("Catalogo fisioterapisti", () => {
  it("contiene esattamente le 21 nuove prestazioni e nessuna di quelle vecchie", () => {
    expect(prestazioniFisioterapista).toHaveLength(21);
    expect(prestazioniFisioterapista).not.toContain("Tecar terapia");
    expect(prestazioniFisioterapista).not.toContain("Riabilitazione post-ictus");
    expect(prestazioniFisioterapista).not.toContain("Stretching terapeutico");
    expect(prestazioniFisioterapista).toContain("Valutazione fisioterapica iniziale");
  });

  it("usa le fasce di prezzo indicate", () => {
    const band = (n: string) => catalogoFisioterapista.find(c => c.nome === n);
    expect(band("Kinesio taping")).toMatchObject({ min: 30, max: 40 });
    expect(band("Riabilitazione del pavimento pelvico")).toMatchObject({ min: 60, max: 80 });
    expect(band("Valutazione ecografica funzionale RUSI")).toMatchObject({ min: 65, max: 90 });
    expect(band("Valutazione fisioterapica iniziale")).toMatchObject({ min: 55, max: 75 });
  });

  it("ogni prestazione fisioterapica ha la scheda utente e quella del professionista, senza la frase esclusa", () => {
    const all = schede as Record<string, { durata?: string; utente: { titolo: string }[]; professionista: { titolo: string }[] }>;
    for (const nome of prestazioniFisioterapista) {
      expect(hasServiceInfo(nome)).toBe(true);
      expect(all[nome].utente.map(s => s.titolo)).toContain("Di che cosa si tratta");
      expect(all[nome].professionista.map(s => s.titolo)).toContain("Competenza specifica e dotazione");
      expect(all[nome].durata).toBeTruthy();
    }
    expect(JSON.stringify(schede)).not.toMatch(/Professionista competente/);
    expect(JSON.stringify(schede)).not.toMatch(/Fasce commerciali proposte/);
  });
});

describe("Nomi e schede delle prestazioni", () => {
  const tutte = prestazioniPerProfessione.flatMap(p => p.items);

  it("indica la prescrizione con «(prescrizione medica)» invece di «prescritto»", () => {
    expect(tutte.filter(n => /prescritt/i.test(n))).toEqual([]);
    expect(prestazioniInfermiere).toContain("Lavaggio vaginale (prescrizione medica)");
    expect(prestazioniInfermiere).toContain("Somministrazione di microclisma medicato (prescrizione medica)");
  });

  it("non usa la parola «terapeutico» nei nomi", () => {
    expect(tutte.filter(n => /terapeutico/i.test(n))).toEqual([]);
    expect(prestazioniFisioterapista).toContain("Esercizio personalizzato");
  });

  it("nessuna scheda mostra la voce «Modalità»", () => {
    expect(Object.values(schede as Record<string, object>).filter(s => "modalita" in s)).toEqual([]);
  });

  it("ogni prestazione con scheda ha un nome presente nel catalogo", () => {
    expect(Object.keys(schede).sort()).toEqual([...prestazioniInfermiere, ...prestazioniFisioterapista, ...prestazioniOss].sort());
  });
});

describe("Catalogo OSS", () => {
  it("contiene esattamente le 16 nuove prestazioni e nessuna di quelle vecchie", () => {
    expect(prestazioniOss).toHaveLength(16);
    expect(prestazioniOss).not.toContain("Bagno assistito in vasca/doccia");
    expect(prestazioniOss).not.toContain("Sorveglianza notturna (per ora)");
    expect(prestazioniOss).toContain("Routine del mattino con igiene alzata e colazione");
    expect(prestazioniOss).toEqual(sorted(prestazioniOss));
  });

  it("usa le fasce di prezzo indicate, a ora o per intervento", () => {
    const band = (n: string) => catalogoOss.find(c => c.nome === n);
    expect(band("Accompagnamento per visite commissioni e uscite")).toMatchObject({ min: 30, max: 35, perOra: true });
    expect(band("Compagnia socializzazione e attività ricreative")).toMatchObject({ min: 20, max: 25, perOra: true });
    expect(band("Routine della sera con cena igiene e preparazione al riposo")).toMatchObject({ min: 40, max: 50 });
    expect(priceUnit("Assistenza notturna alla persona")).toBe("/ora");
    expect(priceUnit("Mobilizzazione e cambio postura a letto")).toBe("");
  });

  it("ogni prestazione OSS ha la scheda utente e quella del professionista, senza la frase esclusa né numeri di rimando", () => {
    const all = schede as Record<string, { utente: { titolo: string; testo: string }[]; professionista: { titolo: string; testo: string }[] }>;
    for (const nome of prestazioniOss) {
      expect(hasServiceInfo(nome)).toBe(true);
      expect(all[nome].utente.map(s => s.titolo)).toContain("A che cosa serve");
      expect(all[nome].professionista.map(s => s.titolo)).toContain("Attenzioni e limiti");
      for (const s of [...all[nome].utente, ...all[nome].professionista]) expect(s.testo).not.toMatch(/codic[ei] \d|scegli \d/);
    }
    expect(JSON.stringify(schede)).not.toMatch(/Figura competente/);
  });
});
