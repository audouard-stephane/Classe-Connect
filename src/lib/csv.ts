import Papa from "papaparse";
import { toast } from "sonner";
import { useStore, type Classe, type Eleve, type AESH, type Cours, type Day, DAYS } from "./store";
import { createClasse, getClasses } from "@/services/api/classes";
import { createEleve } from "@/services/api/eleves";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const genQR = () => "ELV-" + uid().toUpperCase();

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (typeof window === "undefined") return;
  if (!rows || rows.length === 0) {
    toast.error("Aucune donnée à exporter");
    return;
  }
  const csv = Papa.unparse(rows);
  // BOM so Excel opens UTF-8 (accents) correctly
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseCSV<T = Record<string, string>>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (r) => resolve(r.data),
      error: reject,
    });
  });
}

function findOrCreateClasse(nom: string, classes: Classe[], newClasses: Classe[]): string {
  const all = [...classes, ...newClasses];
  const found = all.find((c) => c.nom.toLowerCase() === nom.toLowerCase().trim());
  if (found) return found.id;
  const c: Classe = { id: uid(), nom: nom.trim(), createdAt: Date.now() };
  newClasses.push(c);
  return c.id;
}

export async function importElevesCSV(file: File) {
  const rows = await parseCSV<{ classe: string; nom: string; prenom: string }>(file);
  const state = useStore.getState();
  const newClasses: Classe[] = [];
  const newEleves: Eleve[] = [];
  for (const r of rows) {
    if (!r.classe || !r.nom || !r.prenom) continue;
    const classeId = findOrCreateClasse(r.classe, state.classes, newClasses);
    newEleves.push({
      id: uid(),
      classeId,
      nom: r.nom.trim(),
      prenom: r.prenom.trim(),
      qrCode: genQR(),
      createdAt: Date.now(),
    });
  }
  state.importBulk({ classes: newClasses, eleves: newEleves });
  return { classes: newClasses.length, eleves: newEleves.length };
}

// Split "NOM COMPOSÉ Prenom Second" -> nom = tokens en MAJUSCULES, prenom = le reste
function splitNomPrenom(full: string): { nom: string; prenom: string } {
  const tokens = full.trim().split(/\s+/);
  const nomParts: string[] = [];
  const prenomParts: string[] = [];
  let stillNom = true;
  for (const t of tokens) {
    const letters = t.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
    const isUpper = letters.length > 0 && letters === letters.toUpperCase();
    if (stillNom && isUpper) nomParts.push(t);
    else {
      stillNom = false;
      prenomParts.push(t);
    }
  }
  return { nom: nomParts.join(" "), prenom: prenomParts.join(" ") };
}

export async function importPronoteElevesCSV(file: File, classeName: string) {
  const text = await file.text();

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
  });

  const nomClasse = classeName.trim();
  const classes = await getClasses();

  let classe = classes.find(
    (c) => c.nom.trim().toLowerCase() === nomClasse.toLowerCase(),
  );

  let classeCreee = false;

  if (!classe) {
    classe = await createClasse(nomClasse);
    classeCreee = true;
  }

  let nombreEleves = 0;

  for (const r of parsed.data) {
    const full = (
      r["Élèves"] ??
      r["\uFEFFÉlèves"] ??
      r["Eleves"] ??
      ""
    ).trim();

    if (!full) continue;

    const { nom, prenom } = splitNomPrenom(full);

    if (!nom || !prenom) continue;

    await createEleve({
      classe_id: classe.id,
      nom,
      prenom,
    });

    nombreEleves++;
  }

  return {
    classes: classeCreee ? 1 : 0,
    eleves: nombreEleves,
  };
}

export async function importEdtCSV(file: File) {
  const rows = await parseCSV<{
    jour: string;
    heure_debut: string;
    heure_fin: string;
    classe: string;
    salle: string;
  }>(file);
  const state = useStore.getState();
  const newCours: Cours[] = [];
  for (const r of rows) {
    if (!r.jour || !r.classe) continue;
    const jour = r.jour.toLowerCase().trim() as Day;
    if (!DAYS.includes(jour)) continue;
    const existing = state.classes.find(
      (c) => c.nom.toLowerCase() === r.classe.toLowerCase().trim(),
    );
    if (!existing) continue;
    newCours.push({
      id: uid(),
      jour,
      heureDebut: r.heure_debut,
      heureFin: r.heure_fin,
      classeId: existing.id,
      salle: r.salle || "",
    });
  }
  state.importBulk({ cours: newCours });
  return { cours: newCours.length };
}

export async function importAeshCSV(file: File) {
  const rows = await parseCSV<{ nom: string; prenom: string; classe: string; eleve: string }>(file);
  const state = useStore.getState();
  const map = new Map<string, AESH>();
  const newClasses: Classe[] = [];
  for (const r of rows) {
    if (!r.nom || !r.prenom) continue;
    const key = `${r.nom.toLowerCase()}|${r.prenom.toLowerCase()}`;
    let aesh = map.get(key);
    if (!aesh) {
      aesh = {
        id: uid(),
        nom: r.nom.trim(),
        prenom: r.prenom.trim(),
        classeIds: [],
        eleveIds: [],
      };
      map.set(key, aesh);
    }
    if (r.classe) {
      const classeId = findOrCreateClasse(r.classe, state.classes, newClasses);
      if (!aesh.classeIds.includes(classeId)) aesh.classeIds.push(classeId);
      if (r.eleve) {
        const [n, p] = r.eleve.split(" ");
        const elv = state.eleves.find(
          (e) =>
            e.classeId === classeId &&
            e.nom.toLowerCase() === (n || "").toLowerCase() &&
            e.prenom.toLowerCase() === (p || "").toLowerCase(),
        );
        if (elv && !aesh.eleveIds.includes(elv.id)) aesh.eleveIds.push(elv.id);
      }
    }
  }
  const aeshs = Array.from(map.values());
  state.importBulk({ classes: newClasses, aeshs });
  return { classes: newClasses.length, aeshs: aeshs.length };
}
