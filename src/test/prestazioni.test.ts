import { describe, expect, it } from "vitest";
import { prestazioniDisponibili, prestazioniPerProfessione } from "@/data/prestazioni";

describe("Prestazioni consentite", () => {
  it("non offre prelievi ematici o per test rapidi per nessuna professione", () => {
    expect(prestazioniDisponibili).not.toContain("Prelievo ematico a domicilio");
    expect(prestazioniDisponibili).not.toContain("Prelievo per test rapido (tampone, urine)");
    expect(prestazioniPerProfessione.flatMap(p => p.items).filter(name => /preliev/i.test(name))).toEqual([]);
    expect(prestazioniDisponibili).toContain("Medicazione semplice");
  });
});