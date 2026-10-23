import { describe, expect, it } from "vitest";
import { prestazioniDisponibili, prestazioniFisioterapista, prestazioniInfermiere, prestazioniPerProfessione } from "@/data/prestazioni";
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
    expect(prestazioniInfermiere).toContain("Lavaggio vaginale terapeutico prescritto");
  });

  it("usa le fasce di prezzo indicate", () => {
    const band = (n: string) => catalogoInfermiere.find(c => c.nome === n);
    expect(band("Bendaggio compressivo")).toMatchObject({ min: 35, max: 50 });
    expect(band("Medicazione della lesione da pressione, stadio 4")).toMatchObject({ min: 60, max: 85 });
    expect(band("Rimozione di punti di sutura cutanea con filo")).toMatchObject({ min: 20, max: 35 });
    expect(band("Lavaggio vaginale terapeutico prescritto")).toMatchObject({ min: 40, max: 50 });
  });

  it("ogni prestazione infermieristica ha la scheda utente e quella del professionista, senza la frase esclusa", () => {
    const all = schede as Record<string, { utente: { titolo: string }[]; professionista: { titolo: string }[] }>;
    for (const nome of prestazioniInfermiere) {
      expect(hasServiceInfo(nome)).toBe(true);
      expect(all[nome].utente.map(s => s.titolo)).toContain("Materiali da preparare");
      expect(all[nome].professionista.map(s => s.titolo)).toContain("Dotazione specifica");
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
