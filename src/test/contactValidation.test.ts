import { expect, it } from "vitest";
import { validateContact } from "../../supabase/functions/send-contact-email/validation";

it("accepts a complete contact submission and trims input", () => {
  expect(validateContact({ nome: " Test ", email: " test@example.com ", messaggio: " Ciao " }))
    .toEqual({ nome: "Test", email: "test@example.com", messaggio: "Ciao" });
});
it("rejects incomplete or invalid submissions", () => {
  expect(validateContact({ nome: " ", email: "test@example.com", messaggio: "Ciao" })).toBeNull();
  expect(validateContact({ nome: "Test", email: "invalid", messaggio: "Ciao" })).toBeNull();
  expect(validateContact({ nome: "Test", email: "test@example.com", messaggio: " " })).toBeNull();
});