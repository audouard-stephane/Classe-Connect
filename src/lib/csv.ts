import Papa from "papaparse";
import { toast } from "sonner";
import { useStore, type Classe, type Eleve, type AESH, type Cours, type Day, DAYS } from "./store";
import { createClasse, getClasses } from "@/services/api/classes";
import { createEleve, findEleveByNomPrenomDate, updateEleveServeur } from "@/services/api/eleves";

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
  if (!nomParts.length && tokens.length >= 2) {
    return { nom: tokens[0], prenom: tokens.slice(1).join(" ") };
  }
  return { nom: nomParts.join(" "), prenom: prenomParts.join(" ") };
}

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/\s+/g, " ");
}

function getRowValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const normalizedKey = normalizeKey(key);
    const entry = Object.entries(row).find(
      ([k]) => normalizeKey(k) === normalizedKey,
    );
    if (entry && entry[1]?.trim()) return entry[1].trim();
  }
  return "";
}

function normalizeDate(value: string): string | undefined {
  const raw = value.trim().replace(/\u00A0/g, " ").replace(/\./g, "/").replace(/-/g, "/").replace(/\s+/g, "");
  if (!raw) return undefined;
  const parts = raw.split("/");
  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (y.length === 2) {
      y = `20${y}`;
    }
    if (d.length === 1) d = `0${d}`;
    if (m.length === 1) m = `0${m}`;
    if (/^\d{4}$/.test(y) && /^\d{1,2}$/.test(m) && /^\d{1,2}$/.test(d)) {
      return `${y}-${m}-${d}`;
    }
  }
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return undefined;
}

function collectDispositifs(row: Record<string, string>) {
  const dispositifs: Record<string, string> = {};
  const knownCodes = ["PPRE", "PAP", "PAI", "PPS", "PRE", "ULIS", "AESH"];
  const rawDispositifs = getRowValue(row, ["dispositifs", "dispositif"]);
  if (rawDispositifs) {
    const tokens = rawDispositifs.split(/[;,\/]/).map((t) => t.trim()).filter(Boolean);
    for (const token of tokens) {
      const upper = token.toUpperCase();
      const match = knownCodes.find((code) => upper.includes(code));
      if (match) dispositifs[match] = token;
    }
  }

  for (const code of knownCodes) {
    const rawValue = getRowValue(row, [code, code.toLowerCase()]);
    if (rawValue) {
      dispositifs[code] = rawValue;
    }
  }

  return Object.keys(dispositifs).length > 0 ? dispositifs : undefined;
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
    // createClasse expects an object { nom }
    try {
      classe = await createClasse({ nom: nomClasse });
      classeCreee = true;
    } catch (err) {
      throw new Error(`Impossible de créer la classe "${nomClasse}": ${err?.message || err}`);
    }
  }

  let nombreEleves = 0;
  let createdEleves = 0;
  let updatedEleves = 0;
  let ignoredRows = 0;
  const errors: string[] = [];

  for (let index = 0; index < parsed.data.length; index++) {
    const r = parsed.data[index];
    try {
      const full = (
        r["Élèves"] ??
        r["\uFEFFÉlèves"] ??
        r["Eleves"] ??
        r["Nom"] ??
        r["nom"] ??
        ""
      ).trim();

      const nomFromColumn = getRowValue(r, ["nom", "NOM", "Nom"]);
      const prenomFromColumn = getRowValue(r, ["prenom", "prénom", "PRENOM", "Prénom"]);

      if (!full && (!nomFromColumn || !prenomFromColumn)) {
        ignoredRows++;
        continue;
      }
      if (full && ["cnx ele.", "cnx resp."].includes(full.toLowerCase())) {
        ignoredRows++;
        continue;
      }

      const { nom, prenom } = nomFromColumn && prenomFromColumn
        ? { nom: nomFromColumn, prenom: prenomFromColumn }
        : splitNomPrenom(full);

      if (!nom || !prenom) {
        ignoredRows++;
        continue;
      }

      const dateNaissance = normalizeDate(
        getRowValue(r, [
          "né(e) le",
          "né le",
          "ne(e) le",
          "ne le",
          "naissance",
          "date de naissance",
          "date_naissance",
          "date naissance",
          "date",
        ]),
      );
      if (!dateNaissance) {
        ignoredRows++;
        errors.push(`Ligne ${index + 2} ignorée : date de naissance manquante pour ${nom} ${prenom}`);
        continue;
      }

      const sexe = getRowValue(r, ["sexe"]);
      const email = getRowValue(r, ["mail", "email", "courriel"]);
      const entree = getRowValue(r, ["entrée", "entree"]);
      const sortie = getRowValue(r, ["sortie"]);
      const rattachement = getRowValue(r, ["rattachement", "classe de rattachement", "classe rattachement"]);
      const tuteur = getRowValue(r, ["tuteur"]);
      const options = getRowValue(r, ["options"]);
      const regime = getRowValue(r, ["régime", "regime"]);
      const dispositifs = collectDispositifs(r);

      const existing = await findEleveByNomPrenomDate(nom, prenom, dateNaissance);
      if (existing.length > 0) {
        const eleve = existing[0];
        await updateEleveServeur(eleve.id, {
          classe_id: classe.id,
          nom,
          prenom,
          sexe: sexe || null,
          date_naissance: dateNaissance,
          email: email || null,
          entree: entree || null,
          sortie: sortie || null,
          rattachement: rattachement || null,
          tuteur: tuteur || null,
          options: options || null,
          regime: regime || null,
          dispositifs: dispositifs ?? eleve.dispositifs ?? {},
        });
        updatedEleves++;
      } else {
        // ensure classe.id is valid
        if (!classe || !classe.id) {
          throw new Error(`Classe invalide lors de la création d'élève ${nom} ${prenom}`);
        }

        await createEleve({
          classe_id: classe.id,
          nom,
          prenom,
          sexe: sexe || null,
          date_naissance: dateNaissance,
          email: email || null,
          entree: entree || null,
          sortie: sortie || null,
          rattachement: rattachement || null,
          tuteur: tuteur || null,
          options: options || null,
          regime: regime || null,
          dispositifs: dispositifs ?? {},
        });
        createdEleves++;
      }

      nombreEleves++;
    } catch (error) {
      ignoredRows++;
      errors.push(`Ligne ${index + 2} : ${error instanceof Error ? error.message : error}`);
    }
  }

  return {
    classes: classeCreee ? 1 : 0,
    eleves: nombreEleves,
    created: createdEleves,
    updated: updatedEleves,
    ignored: ignoredRows,
    errors,
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
