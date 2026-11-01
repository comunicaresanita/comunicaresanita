import { describe, expect, it } from "vitest";
import {
  buildIcs, romeOffsetHours, signAction, slotToUtc, verifyAction,
} from "../../supabase/functions/_shared/bookingEmail";

describe("slotToUtc", () => {
  it("ora solare (ottobre dopo il 25): 21-22 a Roma = 20:00 UTC", () => {
    const t = slotToUtc("Venerdì 30 Ottobre 2026", "21-22")!;
    expect(t.start.toISOString()).toBe("2026-10-30T20:00:00.000Z");
    expect(t.end.toISOString()).toBe("2026-10-30T21:00:00.000Z");
  });
  it("ora legale (luglio): 9-10 a Roma = 07:00 UTC", () => {
    expect(slotToUtc("Lunedì 6 Luglio 2026", "9-10")!.start.toISOString()).toBe("2026-07-06T07:00:00.000Z");
  });
  it("cambio ora: 25 ottobre 2026 è ancora legale in mattinata, 26 è solare", () => {
    expect(romeOffsetHours(2026, 10, 25, 12)).toBe(1);
    expect(romeOffsetHours(2026, 10, 24, 12)).toBe(2);
    expect(romeOffsetHours(2026, 3, 29, 12)).toBe(2);
    expect(romeOffsetHours(2026, 3, 28, 12)).toBe(1);
  });
  it("restituisce null se giorno o fascia non si leggono", () => {
    expect(slotToUtc("boh", "21-22")).toBeNull();
    expect(slotToUtc("Venerdì 30 Ottobre 2026", "sera")).toBeNull();
  });
});

describe("buildIcs", () => {
  it("contiene inizio, fine e luogo", () => {
    const ics = buildIcs({ id: "abc", service_name: "Prelievo", price: 30, day: "Venerdì 30 Ottobre 2026", time_slot: "21-22", recipient_address: "Via Roma 1, Firenze" }, "Prelievo", "Con Mario")!;
    expect(ics).toContain("DTSTART:20261030T200000Z");
    expect(ics).toContain("DTEND:20261030T210000Z");
    expect(ics).toContain("LOCATION:Via Roma 1\\, Firenze");
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
  });
});

describe("token di azione", () => {
  const p = { bid: "b1", act: "confirm" as const, exp: Date.now() + 60_000 };
  it("accetta un token valido", async () => {
    expect(await verifyAction("segreto", await signAction("segreto", p))).toEqual(p);
  });
  it("rifiuta firma diversa, token alterato e token scaduto", async () => {
    const t = await signAction("segreto", p);
    expect(await verifyAction("altro", t)).toBeNull();
    expect(await verifyAction("segreto", t.replace(/^./, "x"))).toBeNull();
    const old = await signAction("segreto", { ...p, exp: Date.now() - 1 });
    expect(await verifyAction("segreto", old)).toBeNull();
    expect(await verifyAction("segreto", "")).toBeNull();
  });
});

describe("token per l'azione 'effettuata'", () => {
  it("firma e verifica l'azione complete", async () => {
    const p = { bid: "b9", act: "complete" as const, exp: Date.now() + 60_000 };
    expect(await verifyAction("s", await signAction("s", p))).toEqual(p);
  });
  it("rifiuta azioni sconosciute", async () => {
    const t = await signAction("s", { bid: "b9", act: "delete" as any, exp: Date.now() + 60_000 });
    expect(await verifyAction("s", t)).toBeNull();
  });
});

describe("fine della prestazione", () => {
  it("l'ora di fine è quella della fascia, in UTC", () => {
    expect(slotToUtc("Lunedì 2 Novembre 2026", "18-19")!.end.toISOString()).toBe("2026-11-02T18:00:00.000Z");
  });
});

