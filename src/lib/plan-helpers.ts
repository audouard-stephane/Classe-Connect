import type { Appel, Eleve, Observation } from "@/lib/store";

export type Sexe = "F" | "M" | "?";

/** Détecte le sexe à partir du champ libre (F/M/Fille/Garçon/Féminin/Masculin/H). */
export function detectSexe(sexe?: string): Sexe {
  if (!sexe) return "?";
  const c = sexe.trim().charAt(0).toUpperCase();
  if (c === "F") return "F";
  if (c === "M" || c === "G" || c === "H") return "M";
  return "?";
}

export function displayName(e: Pick<Eleve, "prenom" | "nom">): string {
  const premierPrenom = e.prenom.split(/[\s\-]+/)[0];
  return `${premierPrenom} ${e.nom.charAt(0).toUpperCase()}.`;
}

export type LastAppelStatus = "absent" | "retard" | "present";

export interface LastAppelResult {
  appel: Appel;
  statusByEleve: Record<string, LastAppelStatus>;
}

/**
 * Retourne le dernier appel de la classe et un mapping élève → statut
 * (absent / retard / présent). Un retard = observation avec note "Retard"
 * horodatée au même moment que l'appel.
 */
export function getLastAppelStatus(
  classeId: string,
  appels: Appel[],
  observations: Observation[],
): LastAppelResult | null {
  const list = appels
    .filter((a) => a.classeId === classeId)
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);
  const appel = list[0];
  if (!appel) return null;

  const retards = new Set(
    observations
      .filter(
        (o) =>
          o.classeId === classeId &&
          o.date === appel.date &&
          o.heure === appel.heure &&
          o.note === "Retard",
      )
      .map((o) => o.eleveId),
  );

  const statusByEleve: Record<string, LastAppelStatus> = {};
  for (const entry of appel.entries) {
    statusByEleve[entry.eleveId] =
      entry.presence === "absent"
        ? "absent"
        : retards.has(entry.eleveId)
          ? "retard"
          : "present";
  }
  return { appel, statusByEleve };
}
