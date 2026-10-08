export function validateContact(value: unknown): { nome: string; email: string; messaggio: string } | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (typeof input.nome !== "string" || typeof input.email !== "string" || typeof input.messaggio !== "string") return null;
  const nome = input.nome.trim();
  const email = input.email.trim();
  const messaggio = input.messaggio.trim();
  if (!nome || nome.length > 200 || !messaggio || messaggio.length > 5000) return null;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return { nome, email, messaggio };
}