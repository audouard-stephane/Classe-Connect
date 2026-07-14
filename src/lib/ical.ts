import type { Cours, Day, Classe } from "./store";

const BYDAY_MAP: Record<string, Day> = {
  MO: "lundi", TU: "mardi", WE: "mercredi",
  TH: "jeudi", FR: "vendredi", SA: "samedi",
};
const JS_DAY_MAP: Day[] = ["lundi", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const l of raw) {
    if ((l.startsWith(" ") || l.startsWith("\t")) && out.length) {
      out[out.length - 1] += l.slice(1);
    } else out.push(l);
  }
  return out;
}

function parseDate(v: string): Date | null {
  // Accept 20250908T080000Z, 20250908T080000, 20250908
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [_, y, mo, d, hh = "0", mm = "0", ss = "0", z] = m;
  if (z === "Z") {
    return new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss));
  }
  return new Date(+y, +mo - 1, +d, +hh, +mm, +ss);
}

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export interface ParsedEvent {
  jour: Day;
  date: string; // YYYY-MM-DD (local)
  heureDebut: string;
  heureFin: string;
  summary: string;
  salle: string;
  professeur?: string;
  classe?: string;
  description?: string;
}


function unescapeICS(v: string): string {
  return v
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseICS(text: string): ParsedEvent[] {
  const lines = unfold(text);
  const events: ParsedEvent[] = [];
  let cur: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") {
      if (cur) {
        const dtstart = cur.DTSTART || cur["DTSTART;VALUE=DATE"];
        const dtend = cur.DTEND || cur["DTEND;VALUE=DATE"];
        const start = dtstart ? parseDate(dtstart) : null;
        const end = dtend ? parseDate(dtend) : null;
        if (start && end) {
          let jour: Day = JS_DAY_MAP[start.getDay()];
          const rrule = cur.RRULE || "";
          const byday = rrule.match(/BYDAY=([A-Z,]+)/)?.[1]?.split(",")[0];
          if (byday && BYDAY_MAP[byday]) jour = BYDAY_MAP[byday];
          const summary = unescapeICS(cur.SUMMARY || "");
          const description = unescapeICS(cur.DESCRIPTION || "");
          const profMatch = description.match(/(?:Professeurs?|Prof\.?|Enseignants?)[\s:]*([^\n]+)/i);
          const classeMatch =
            description.match(/(?:Classes?|Groupes?)[\s:]*([^\n]+)/i) ||
            summary.match(/(?:Classes?|Groupes?)[\s:]*([^\n]+)/i);
          let classe = classeMatch?.[1]?.trim();
          if (!classe) {
            // Fallback: look for a token like "6A", "6°A", "3EME B", "2NDE 4", "TERM S"
            const tokenRe = /\b(?:[1-6](?:ER|E|EME|ÈME|°)?\s?[A-Z0-9]{1,3}|2NDE\s?\d+|1ERE\s?[A-Z0-9]+|TERM(?:INALE)?\s?[A-Z0-9]+)\b/i;
            const fromDesc = description.match(tokenRe)?.[0];
            const fromSum = summary.match(tokenRe)?.[0];
            classe = (fromDesc || fromSum)?.trim();
          }
          events.push({
            jour,
            date: ymd(start),
            heureDebut: hhmm(start),
            heureFin: hhmm(end),
            summary,
            salle: unescapeICS(cur.LOCATION || ""),
            professeur: profMatch?.[1]?.trim(),
            classe,
            description,
          });

        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx);
    const val = line.slice(idx + 1);
    const baseKey = key.split(";")[0];
    cur[baseKey] = val;
    cur[key] = val;
  }
  return events;
}

function toICSDate(dayIdx: number, hm: string): string {
  // Build a date for next occurrence of Monday-based dayIdx (0=Mon..5=Sat)
  const [h, m] = hm.split(":").map(Number);
  const now = new Date();
  const jsToday = now.getDay(); // 0=Sun
  const targetJs = dayIdx + 1; // Mon=1..Sat=6
  const diff = (targetJs - jsToday + 7) % 7;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, h, m, 0);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

const DAY_TO_BYDAY: Record<Day, string> = {
  lundi: "MO", mardi: "TU", mercredi: "WE",
  jeudi: "TH", vendredi: "FR", samedi: "SA",
};
const DAY_IDX: Record<Day, number> = {
  lundi: 0, mardi: 1, mercredi: 2, jeudi: 3, vendredi: 4, samedi: 5,
};

export function buildICS(cours: Cours[], classes: Classe[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClasseScan//EDT//FR",
    "CALSCALE:GREGORIAN",
  ];
  for (const c of cours) {
    const classe = classes.find((x) => x.id === c.classeId);
    const summary = `${classe?.nom ?? "Cours"}${c.salle ? ` (${c.salle})` : ""}`;
    const dtstart = toICSDate(DAY_IDX[c.jour], c.heureDebut);
    const dtend = toICSDate(DAY_IDX[c.jour], c.heureFin);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${c.id}@classescan`,
      `SUMMARY:${summary}`,
      c.salle ? `LOCATION:${c.salle}` : "",
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${DAY_TO_BYDAY[c.jour]}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}
