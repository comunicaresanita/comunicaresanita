// Invio via Resend (https://resend.com). Segreti richiesti: RESEND_API_KEY. Opzionali: EMAIL_FROM, EMAIL_REPLY_TO.
export type Attachment = { filename: string; content: string }; // content in base64

export async function sendMail(opts: {
  to: string; subject: string; html: string; text: string; attachments?: Attachment[];
}): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  const from = Deno.env.get("EMAIL_FROM") ?? "ComuniCARE <prenotazioni@comunicaresanita.it>";
  const replyTo = Deno.env.get("EMAIL_REPLY_TO");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

export const toBase64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
