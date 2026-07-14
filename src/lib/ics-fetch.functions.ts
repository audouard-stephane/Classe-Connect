import { createServerFn } from "@tanstack/react-start";

export const fetchExternalIcs = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) => {
    if (!data || typeof data.url !== "string") throw new Error("URL manquante");
    let u = data.url.trim();
    if (u.startsWith("webcal://")) u = "https://" + u.slice("webcal://".length);
    if (!/^https?:\/\//i.test(u)) throw new Error("URL invalide");
    return { url: u };
  })
  .handler(async ({ data }) => {
    const res = await fetch(data.url, {
      headers: { Accept: "text/calendar, text/plain, */*" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.includes("BEGIN:VCALENDAR")) throw new Error("Réponse non-ICS");
    return { text };
  });
