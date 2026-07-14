import type { Appel, Observation, Retenue } from "@/lib/store";

export interface BilanCounts {
  travailFaitMaison: number;
  travailFaitClasse: number;
  travailFaitAutre: number;
  interroJuste: number;
  interroPartiel: number;
  bonPoint: number;
  classeurPresent: number;
  bavAucun: number;

  travailNonFaitMaison: number;
  travailNonFaitClasse: number;
  travailPartielMaison: number;
  travailPartielClasse: number;
  interroFausse: number;
  classeurOubli: number;
  materielAutreOubli: number;
  bavQuelques: number;
  bavBeaucoup: number;
  comportementMauvais: number;
  comportementMoyen: number;
  quickNegatif: number;
  retenues: number;
  absences: number;
}

export interface BilanLine {
  key: keyof BilanCounts;
  label: string;
  count: number;
  weight: number;
}

export interface BilanResult {
  positifs: BilanLine[];
  negatifs: BilanLine[];
  totalPositifs: number;
  totalNegatifs: number;
  note: number; // /20
  timeline: TimelineEntry[];
  from: string;
  to: string;
}

export type TimelineEntry =
  | { kind: "observation"; date: string; heure: string; label: string; polarity: "+" | "-" | "="; id: string }
  | { kind: "retenue"; date: string; heure: string; label: string; polarity: "-"; id: string }
  | { kind: "absence"; date: string; heure: string; label: string; polarity: "-"; id: string };

const POS_LABELS: Record<string, { label: string; weight: number }> = {
  travailFaitMaison: { label: "Exercices faits à la maison", weight: 2 },
  travailFaitClasse: { label: "Exercices faits en classe", weight: 1 },
  travailFaitAutre: { label: "Travail fait", weight: 1 },
  interroJuste: { label: "Interrogations réussies", weight: 3 },
  interroPartiel: { label: "Interrogations partiellement justes", weight: 1 },
  bonPoint: { label: "Bons points 🌟 (photos d'exercice)", weight: 2 },
  classeurPresent: { label: "Classeur présent", weight: 1 },
  bavAucun: { label: "Cours sans bavardage", weight: 1 },
};

const NEG_LABELS: Record<string, { label: string; weight: number }> = {
  travailNonFaitMaison: { label: "Exercices non faits à la maison", weight: 3 },
  travailNonFaitClasse: { label: "Exercices non faits en classe", weight: 2 },
  travailPartielMaison: { label: "Travail maison partiel", weight: 1 },
  travailPartielClasse: { label: "Travail classe partiel", weight: 1 },
  interroFausse: { label: "Interrogations fausses", weight: 2 },
  classeurOubli: { label: "Oublis de classeur", weight: 2 },
  materielAutreOubli: { label: "Oublis de matériel", weight: 1 },
  bavQuelques: { label: "Quelques bavardages", weight: 1 },
  bavBeaucoup: { label: "Beaucoup de bavardages", weight: 3 },
  comportementMauvais: { label: "Comportement mauvais", weight: 3 },
  comportementMoyen: { label: "Comportement moyen", weight: 1 },
  quickNegatif: { label: "Autres remarques (chewing-gum, s'amuse…)", weight: 1 },
  retenues: { label: "Retenues", weight: 4 },
  // Absences : suivies mais non comptées dans la note (motifs indépendants du comportement)
};

export const POS_LABELS_EXPORT = POS_LABELS;
export const NEG_LABELS_EXPORT = NEG_LABELS;

function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

function noteContains(note: string | undefined, needles: string[]) {
  if (!note) return false;
  const n = note.toLowerCase();
  return needles.some((s) => n.includes(s));
}

export function computeBilan(
  eleveId: string,
  from: string,
  to: string,
  data: { observations: Observation[]; appels: Appel[]; retenues: Retenue[] },
): BilanResult {
  const counts: BilanCounts = {
    travailFaitMaison: 0,
    travailFaitClasse: 0,
    travailFaitAutre: 0,
    interroJuste: 0,
    interroPartiel: 0,
    bonPoint: 0,
    classeurPresent: 0,
    bavAucun: 0,
    travailNonFaitMaison: 0,
    travailNonFaitClasse: 0,
    travailPartielMaison: 0,
    travailPartielClasse: 0,
    interroFausse: 0,
    classeurOubli: 0,
    materielAutreOubli: 0,
    bavQuelques: 0,
    bavBeaucoup: 0,
    comportementMauvais: 0,
    comportementMoyen: 0,
    quickNegatif: 0,
    retenues: 0,
    absences: 0,
  };

  const timeline: TimelineEntry[] = [];

  const obs = data.observations.filter((o) => o.eleveId === eleveId && inRange(o.date, from, to));

  for (const o of obs) {
    const note = o.note ?? "";
    let polarity: "+" | "-" | "=" = "=";
    let label = note || "Observation";

    const isInterro = noteContains(note, ["interrogation"]);
    const isBonPoint = noteContains(note, ["bon point"]);
    const isMaison = noteContains(note, ["maison"]);
    const isClasse = noteContains(note, ["classe", "exercice"]);
    const isBav = noteContains(note, ["bavardage"]);
    const isClasseur = noteContains(note, ["classeur"]);

    if (isBonPoint) {
      counts.bonPoint++;
      polarity = "+";
      label = "Bon point 🌟 (photo)";
    } else if (isInterro) {
      if (o.travail === "fait") { counts.interroJuste++; polarity = "+"; label = "Interrogation juste"; }
      else if (o.travail === "partiel") { counts.interroPartiel++; polarity = "+"; label = "Interrogation partiellement juste"; }
      else if (o.travail === "non_fait") { counts.interroFausse++; polarity = "-"; label = "Interrogation fausse"; }
    } else if (o.travail === "fait") {
      polarity = "+";
      if (isMaison) { counts.travailFaitMaison++; label = "Exercice fait à la maison"; }
      else if (isClasse) { counts.travailFaitClasse++; label = "Exercice fait en classe"; }
      else { counts.travailFaitAutre++; label = "Travail fait"; }
    } else if (o.travail === "non_fait") {
      polarity = "-";
      if (isMaison) { counts.travailNonFaitMaison++; label = "Exercice non fait à la maison"; }
      else { counts.travailNonFaitClasse++; label = "Exercice non fait en classe"; }
    } else if (o.travail === "partiel") {
      polarity = "-";
      if (isMaison) { counts.travailPartielMaison++; label = "Travail maison partiel"; }
      else { counts.travailPartielClasse++; label = "Travail classe partiel"; }
    } else if (o.materiel === "present") {
      counts.classeurPresent++;
      polarity = "+";
      label = "Classeur présent";
    } else if (o.materiel === "oubli") {
      polarity = "-";
      if (isClasseur) { counts.classeurOubli++; label = "Oubli de classeur"; }
      else { counts.materielAutreOubli++; label = "Oubli de matériel"; }
    } else if (isBav) {
      if (noteContains(note, ["aucun"])) { counts.bavAucun++; polarity = "+"; label = "Aucun bavardage"; }
      else if (noteContains(note, ["quelques"])) { counts.bavQuelques++; polarity = "-"; label = "Quelques bavardages"; }
      else if (noteContains(note, ["beaucoup"])) { counts.bavBeaucoup++; polarity = "-"; label = "Beaucoup de bavardages"; }
    } else if (o.comportement === "tres_bien" || o.comportement === "bien") {
      // pas de bonus dédié, on ne compte pas double
    } else if (o.comportement === "moyen") {
      counts.comportementMoyen++;
      polarity = "-";
      label = "Comportement moyen";
    } else if (o.comportement === "mauvais") {
      counts.comportementMauvais++;
      polarity = "-";
      label = "Comportement mauvais";
    } else if (note) {
      // quick actions "négatives" saisies libres
      if (noteContains(note, ["oubli", "chewing", "mange", "amuse", "bavard", "non fait"])) {
        counts.quickNegatif++;
        polarity = "-";
      }
    }

    timeline.push({
      kind: "observation",
      date: o.date,
      heure: o.heure,
      label,
      polarity,
      id: o.id,
    });
  }

  // Retenues (pas de date précise → on prend createdAt)
  for (const r of data.retenues.filter((r) => r.eleveId === eleveId)) {
    const d = new Date(r.createdAt);
    const iso = d.toISOString().slice(0, 10);
    if (!inRange(iso, from, to)) continue;
    counts.retenues++;
    timeline.push({
      kind: "retenue",
      date: iso,
      heure: r.heureDebut,
      label: `Retenue ${r.jour} ${r.heureDebut}${r.heureFin ? `–${r.heureFin}` : ""}${r.motif ? ` : ${r.motif}` : ""}`,
      polarity: "-",
      id: r.id,
    });
  }

  // Absences
  for (const a of data.appels) {
    if (!inRange(a.date, from, to)) continue;
    if (a.entries.some((e) => e.eleveId === eleveId && e.presence === "absent")) {
      counts.absences++;
      timeline.push({
        kind: "absence",
        date: a.date,
        heure: a.heure,
        label: "Absence",
        polarity: "-",
        id: a.id,
      });
    }
  }

  const positifs: BilanLine[] = (Object.keys(POS_LABELS) as (keyof BilanCounts)[])
    .filter((k) => counts[k] > 0)
    .map((k) => ({ key: k, label: POS_LABELS[k].label, count: counts[k], weight: POS_LABELS[k].weight }));

  const negatifs: BilanLine[] = (Object.keys(NEG_LABELS) as (keyof BilanCounts)[])
    .filter((k) => counts[k] > 0)
    .map((k) => ({ key: k, label: NEG_LABELS[k].label, count: counts[k], weight: NEG_LABELS[k].weight }));

  const totalPositifs = positifs.reduce((s, l) => s + l.count * l.weight, 0);
  const totalNegatifs = negatifs.reduce((s, l) => s + l.count * l.weight, 0);

  const totalActivity = totalPositifs + totalNegatifs;
  const note =
    totalActivity === 0 ? 10 : Math.max(0, Math.min(20, Math.round((20 * totalPositifs) / totalActivity)));

  timeline.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.heure.localeCompare(a.heure);
  });

  return { positifs, negatifs, totalPositifs, totalNegatifs, note, timeline, from, to };
}

export interface SemesterOption {
  id: string;
  label: string;
  from: string; // YYYY-MM-DD
  to: string;
}

export function listSemesters(now: Date = new Date()): SemesterOption[] {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  // Année scolaire : sept(N) - juin(N+1)
  const currentSchoolStart = month >= 7 ? year : year - 1; // aug+ starts new year
  const prevSchoolStart = currentSchoolStart - 1;
  const build = (startYear: number): SemesterOption[] => [
    {
      id: `S1-${startYear}`,
      label: `Semestre 1 (sept. ${startYear} → janv. ${startYear + 1})`,
      from: `${startYear}-09-01`,
      to: `${startYear + 1}-01-31`,
    },
    {
      id: `S2-${startYear}`,
      label: `Semestre 2 (févr. ${startYear + 1} → juil. ${startYear + 1})`,
      from: `${startYear + 1}-02-01`,
      to: `${startYear + 1}-07-15`,
    },
  ];
  return [...build(currentSchoolStart), ...build(prevSchoolStart)];
}

export function currentSemesterId(now: Date = new Date()): string {
  const list = listSemesters(now);
  const today = now.toISOString().slice(0, 10);
  const active = list.find((s) => today >= s.from && today <= s.to);
  return (active ?? list[0]).id;
}
