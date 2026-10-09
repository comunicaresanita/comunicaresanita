import { useEffect } from "react";

// Keep native constraint validation, but never depend on the browser's language.
export default function ItalianFormValidation() {
  useEffect(() => {
    const isField = (target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
    const invalid = (event: Event) => {
      if (!isField(event.target)) return;
      const field = event.target;
      field.setCustomValidity("");
      const validity = field.validity;
      let message = "Controlla il valore inserito e riprova.";
      if (validity.valueMissing) message = field instanceof HTMLInputElement && field.type === "checkbox" ? "Seleziona questa casella per continuare." : "Compila questo campo per continuare.";
      else if (validity.typeMismatch) message = field instanceof HTMLInputElement && field.type === "email" ? "Inserisci un indirizzo email valido." : "Inserisci un valore valido.";
      else if (validity.tooShort && "minLength" in field) message = `Inserisci almeno ${field.minLength} caratteri.`;
      else if (validity.tooLong && "maxLength" in field) message = `Inserisci al massimo ${field.maxLength} caratteri.`;
      else if (validity.rangeUnderflow && field instanceof HTMLInputElement) message = `Inserisci un valore maggiore o uguale a ${field.min}.`;
      else if (validity.rangeOverflow && field instanceof HTMLInputElement) message = `Inserisci un valore minore o uguale a ${field.max}.`;
      else if (validity.badInput || validity.stepMismatch) message = "Inserisci un numero valido.";
      else if (validity.patternMismatch) message = "Rispetta il formato richiesto per questo campo.";
      field.setCustomValidity(message);
    };
    const clear = (event: Event) => {
      if (isField(event.target)) event.target.setCustomValidity("");
    };
    document.addEventListener("invalid", invalid, true);
    document.addEventListener("input", clear, true);
    document.addEventListener("change", clear, true);
    return () => {
      document.removeEventListener("invalid", invalid, true);
      document.removeEventListener("input", clear, true);
      document.removeEventListener("change", clear, true);
    };
  }, []);
  return null;
}