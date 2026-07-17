import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getClasses } from "../services/api/classes";
import { getEleves } from "../services/api/eleves";
import { upsertPlan as upsertPlanServeur, deletePlan as deletePlanServeur } from "../services/api/plans";

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export type Day = "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi";
export const DAYS: Day[] = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export interface Classe {
  id: string;
  nom: string;
  alias1?: string; // Nom EDT correspondant au Groupe 1
  alias2?: string; // Nom EDT correspondant au Groupe 2
  groupe1Nom?: string; // Libellé personnalisé du Groupe 1
  groupe2Nom?: string; // Libellé personnalisé du Groupe 2
  createdAt: number;
  source?: "manual" | "edt";
}

export interface Eleve {
  id: string;
  classeId: string;
  nom: string;
  prenom: string;
  qrCode: string;
  aeshId?: string;
  groupe?: 1 | 2;
  remarque?: string;
  dateNaissance?: string;
  sexe?: string;
  email?: string;
  entree?: string;
  sortie?: string;
  rattachement?: string;
  tuteur?: string;
  options?: string;
  regime?: string;
  dispositifs?: Partial<Record<DispositifCode, string>>;
  createdAt: number;
}

export const DISPOSITIFS = [
  { code: "PPRE", label: "Programme personnalisé de réussite éducative", placeholder: "Objectifs, actions mises en place, durée, bilan..." },
  { code: "PAP", label: "Plan d'accompagnement personnalisé", placeholder: "Aménagements pédagogiques, adaptations nécessaires..." },
  { code: "PAI", label: "Projet d'accueil individualisé", placeholder: "Informations médicales importantes, protocole particulier..." },
  { code: "PPS", label: "Projet personnalisé de scolarisation", placeholder: "Besoins spécifiques, matériel adapté, accompagnements..." },
  { code: "PRE", label: "Programme de réussite éducative", placeholder: "Actions mises en place..." },
  { code: "ULIS", label: "Unité localisée pour l'inclusion scolaire", placeholder: "Informations complémentaires sur l'accompagnement..." },
  { code: "AESH", label: "Accompagnant d'élève en situation de handicap", placeholder: "Informations sur les besoins de l'élève, missions particulières..." },
] as const;
export type DispositifCode = typeof DISPOSITIFS[number]["code"];

export interface AESH {
  id: string;
  nom: string;
  prenom: string;
  classeIds: string[];
  eleveIds: string[];
  email?: string;
  telephone?: string;
}

export interface Cours {
  id: string;
  jour: Day;
  heureDebut: string; // "HH:mm"
  heureFin: string;
  classeId: string;
  salle: string;
  date?: string; // YYYY-MM-DD (specific date, when imported from Pronote-like feeds)
  matiere?: string; // display title (e.g. "MATHÉMATIQUES")
  professeur?: string;
  groupe?: 1 | 2; // Cours réservé à un demi-groupe (déduit des alias EDT)
}

export type Presence = "present" | "absent";
export type Travail = "fait" | "partiel" | "non_fait";
export type Materiel = "present" | "oubli";
export type Comportement = "tres_bien" | "bien" | "moyen" | "mauvais";

export interface AppelEntry {
  eleveId: string;
  presence: Presence;
}

export interface AeshPresence {
  aeshId: string;
  presence: Presence;
}

export interface Appel {
  id: string;
  classeId: string;
  coursId?: string;
  date: string; // YYYY-MM-DD
  heure: string; // HH:mm
  entries: AppelEntry[];
  aeshPresences?: AeshPresence[];
  createdAt: number;
  updatedAt?: number;
}


export interface Observation {
  id: string;
  eleveId: string;
  classeId: string;
  date: string; // YYYY-MM-DD
  heure: string;
  comportement?: Comportement;
  materiel?: Materiel;
  travail?: Travail;
  note?: string;
  createdAt: number;
}

export interface Retenue {
  id: string;
  eleveId: string;
  jour: Day;
  heureDebut: string; // HH:mm
  heureFin?: string;
  motif?: string;
  createdAt: number;
}

export interface Settings {
  alerteAbsences: 3 | 5 | 10;
}

export type PlanScope = "all" | "g1" | "g2";
export type TableOrientation = "h" | "v";
export type TableRotation = 0 | 90 | 180 | 270;
export interface SeatTable {
  id: string;
  x: number; // percent 0..100 (center of table)
  y: number;
  w?: number; // per-table width override (percent of container)
  h?: number; // per-table height override (percent of container)
  orientation?: TableOrientation; // default "h"
  rotation?: TableRotation; // default 0 (visual rotation applied on top)
  leftEleveId?: string;
  rightEleveId?: string;
}

// Fixed rectangular table dimensions (percent of container) — 2 seats side by side.
// Horizontal orientation: wide & short. Vertical: same table rotated 90°.
export const TABLE_H_W = 16;
export const TABLE_H_H = 8;
export const TABLE_V_W = 8;
export const TABLE_V_H = 16;
export interface SeatingPlan {
  id: string; // `${classeId}:${scope}`
  classeId: string;
  scope: PlanScope;
  backgroundImage?: string; // data URL
  tables: SeatTable[];
  zoom?: number; // zoom global du plan (1 = 100%)
  updatedAt: number;
}


interface State {
  classes: Classe[];
  eleves: Eleve[];
  aeshs: AESH[];
  cours: Cours[];
  appels: Appel[];
  observations: Observation[];
  retenues: Retenue[];
  seatingPlans: SeatingPlan[];
  settings: Settings;



  addClasse: (nom: string, source?: "manual" | "edt") => Classe;
  updateClasse: (id: string, patch: Partial<Pick<Classe, "nom" | "alias1" | "alias2" | "groupe1Nom" | "groupe2Nom">>) => void;
  deleteClasse: (id: string) => void;

  addEleve: (e: Omit<Eleve, "id" | "qrCode" | "createdAt"> & { qrCode?: string }) => Eleve;
  updateEleve: (id: string, patch: Partial<Eleve>) => void;
  deleteEleve: (id: string) => void;

  addAesh: (a: Omit<AESH, "id">) => AESH;
  updateAesh: (id: string, patch: Partial<AESH>) => void;
  deleteAesh: (id: string) => void;

  addCours: (c: Omit<Cours, "id">) => Cours;
  updateCours: (id: string, patch: Partial<Cours>) => void;
  deleteCours: (id: string) => void;
  replaceCours: (list: Omit<Cours, "id">[]) => void;

  saveAppel: (a: Omit<Appel, "id" | "createdAt">) => Appel;
  updateAppel: (id: string, patch: Partial<Pick<Appel, "entries" | "aeshPresences" | "coursId">>) => void;
  deleteAppel: (id: string) => void;


  addObservation: (o: Omit<Observation, "id" | "createdAt">) => Observation;
  updateObservation: (id: string, patch: Partial<Omit<Observation, "id" | "createdAt">>) => void;
  deleteObservation: (id: string) => void;

  addRetenue: (r: Omit<Retenue, "id" | "createdAt">) => Retenue;
  updateRetenue: (id: string, patch: Partial<Retenue>) => void;
  deleteRetenue: (id: string) => void;

  upsertSeatingPlan: (classeId: string, scope: PlanScope, patch: Partial<Omit<SeatingPlan, "id" | "classeId" | "scope" | "updatedAt">>) => SeatingPlan;
  deleteSeatingPlan: (classeId: string, scope: PlanScope) => void;

  setAlerte: (n: 3 | 5 | 10) => void;


  importBulk: (data: Partial<Pick<State, "classes" | "eleves" | "aeshs" | "cours">>) => void;
  resetAll: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const genQR = () => "ELV-" + uid().toUpperCase();

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      classes: [],
      eleves: [],
      aeshs: [],
      cours: [],
      appels: [],
      observations: [],
      retenues: [],
      seatingPlans: [],
      settings: { alerteAbsences: 5 },



      addClasse: (nom, source) => {
        const c: Classe = { id: uid(), nom: nom.trim(), createdAt: Date.now(), source: source ?? "manual" };
        set((s) => ({ classes: [...s.classes, c] }));
        return c;
      },
      updateClasse: (id, patch) =>
        set((s) => ({ classes: s.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteClasse: (id) =>
        set((s) => ({
          classes: s.classes.filter((c) => c.id !== id),
          eleves: s.eleves.filter((e) => e.classeId !== id),
          cours: s.cours.filter((co) => co.classeId !== id),
        })),

      addEleve: (e) => {
        const eleve: Eleve = {
          id: uid(),
          qrCode: e.qrCode || genQR(),
          classeId: e.classeId,
          nom: e.nom.trim(),
          prenom: e.prenom.trim(),
          aeshId: e.aeshId,
          remarque: e.remarque,
          createdAt: Date.now(),
        };
        set((s) => ({
          eleves: [...s.eleves, eleve],
          aeshs: eleve.aeshId
            ? s.aeshs.map((a) =>
                a.id === eleve.aeshId && !a.eleveIds.includes(eleve.id)
                  ? { ...a, eleveIds: [...a.eleveIds, eleve.id] }
                  : a,
              )
            : s.aeshs,
        }));
        return eleve;
      },
      updateEleve: (id, patch) =>
        set((s) => {
          const eleves = s.eleves.map((e) => (e.id === id ? { ...e, ...patch } : e));
          let aeshs = s.aeshs;
          if ("aeshId" in patch) {
            const newAeshId = patch.aeshId;
            aeshs = s.aeshs.map((a) => {
              const has = a.eleveIds.includes(id);
              if (a.id === newAeshId && !has) return { ...a, eleveIds: [...a.eleveIds, id] };
              if (a.id !== newAeshId && has) return { ...a, eleveIds: a.eleveIds.filter((x) => x !== id) };
              return a;
            });
          }
          return { eleves, aeshs };
        }),
      deleteEleve: (id) =>
        set((s) => ({
          eleves: s.eleves.filter((e) => e.id !== id),
          aeshs: s.aeshs.map((a) => ({ ...a, eleveIds: a.eleveIds.filter((x) => x !== id) })),
        })),

      addAesh: (a) => {
        const aesh: AESH = { id: uid(), ...a };
        set((s) => ({
          aeshs: [...s.aeshs, aesh],
          eleves: s.eleves.map((e) =>
            aesh.eleveIds.includes(e.id) ? { ...e, aeshId: aesh.id } : e,
          ),
        }));
        return aesh;
      },
      updateAesh: (id, patch) =>
        set((s) => {
          const aeshs = s.aeshs.map((a) => (a.id === id ? { ...a, ...patch } : a));
          let eleves = s.eleves;
          if ("eleveIds" in patch && patch.eleveIds) {
            const newSet = new Set(patch.eleveIds);
            eleves = s.eleves.map((e) => {
              if (newSet.has(e.id) && e.aeshId !== id) return { ...e, aeshId: id };
              if (!newSet.has(e.id) && e.aeshId === id) return { ...e, aeshId: undefined };
              return e;
            });
          }
          return { aeshs, eleves };
        }),
      deleteAesh: (id) =>
        set((s) => ({
          aeshs: s.aeshs.filter((a) => a.id !== id),
          eleves: s.eleves.map((e) => (e.aeshId === id ? { ...e, aeshId: undefined } : e)),
        })),

      addCours: (c) => {
        const cours: Cours = { id: uid(), ...c };
        set((s) => ({ cours: [...s.cours, cours] }));
        return cours;
      },
      updateCours: (id, patch) =>
        set((s) => ({ cours: s.cours.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCours: (id) => set((s) => ({ cours: s.cours.filter((c) => c.id !== id) })),
      replaceCours: (list) =>
        set(() => ({ cours: list.map((c) => ({ id: uid(), ...c })) })),

      saveAppel: (a) => {
        const appel: Appel = { id: uid(), createdAt: Date.now(), ...a };
        set((s) => ({ appels: [...s.appels, appel] }));
        return appel;
      },
      updateAppel: (id, patch) =>
        set((s) => ({
          appels: s.appels.map((a) =>
            a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a,
          ),
        })),
      deleteAppel: (id) => set((s) => ({ appels: s.appels.filter((a) => a.id !== id) })),


      addObservation: (o) => {
        const obs: Observation = { id: uid(), createdAt: Date.now(), ...o };
        set((s) => ({ observations: [...s.observations, obs] }));
        return obs;
      },
      updateObservation: (id, patch) =>
        set((s) => ({
          observations: s.observations.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),
      deleteObservation: (id) =>
        set((s) => ({ observations: s.observations.filter((o) => o.id !== id) })),

      addRetenue: (r) => {
        const ret: Retenue = { id: uid(), createdAt: Date.now(), ...r };
        set((s) => ({ retenues: [...s.retenues, ret] }));
        return ret;
      },
      updateRetenue: (id, patch) =>
        set((s) => ({ retenues: s.retenues.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRetenue: (id) =>
        set((s) => ({ retenues: s.retenues.filter((r) => r.id !== id) })),

      upsertSeatingPlan: (classeId, scope, patch) => {
        const id = `${classeId}:${scope}`;
        const now = Date.now();
        const existing = get().seatingPlans.find((p) => p.id === id);
        const next: SeatingPlan = existing
          ? { ...existing, ...patch, updatedAt: now }
          : { id, classeId, scope, tables: [], ...patch, updatedAt: now };
        set((s) => ({
          seatingPlans: existing
            ? s.seatingPlans.map((p) => (p.id === id ? next : p))
            : [...s.seatingPlans, next],
        }));
        void upsertPlanServeur({
          classe_id: classeId,
          scope,
          tables: next.tables,
          zoom: next.zoom ?? 1,
          background_image: next.backgroundImage ?? null,
        }).catch((error) => {
          console.error("Échec de la sauvegarde du plan sur le serveur", error);
        });
        return next;
      },
      deleteSeatingPlan: (classeId, scope) => {
        const id = `${classeId}:${scope}`;
        set((s) => ({ seatingPlans: s.seatingPlans.filter((p) => p.id !== id) }));
        void deletePlanServeur(classeId, scope).catch((error) => {
          console.error("Échec de la suppression du plan sur le serveur", error);
        });
      },

      setAlerte: (n) => set((s) => ({ settings: { ...s.settings, alerteAbsences: n } })),


      importBulk: (data) =>
        set((s) => ({
          classes: data.classes ? [...s.classes, ...data.classes] : s.classes,
          eleves: data.eleves ? [...s.eleves, ...data.eleves] : s.eleves,
          aeshs: data.aeshs ? [...s.aeshs, ...data.aeshs] : s.aeshs,
          cours: data.cours ? [...s.cours, ...data.cours] : s.cours,
        })),

      resetAll: () =>
        set({
          classes: [],
          eleves: [],
          aeshs: [],
          cours: [],
          appels: [],
          observations: [],
          retenues: [],
          seatingPlans: [],
        }),

    }),
    {
      name: "classescan-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : (noopStorage as unknown as Storage),
      ),
      skipHydration: true,
    },
  ),
);

// Hydrate synchronously on the client as soon as the module loads so that
// pages reading from the store always see persisted data on first render.
if (typeof window !== "undefined") {
  void Promise.resolve(useStore.persist.rehydrate()).then(() => {
    // Réconcilie les liens AESH ↔ Élève dans les deux sens (données existantes).
    const s = useStore.getState();
    const eleveById = new Map(s.eleves.map((e) => [e.id, e]));
    const aeshById = new Map(s.aeshs.map((a) => [a.id, a]));

    // 1) Pour chaque aesh.eleveIds, forcer eleve.aeshId = aesh.id
    const eleveAesh = new Map<string, string>();
    for (const a of s.aeshs) {
      for (const eid of a.eleveIds) {
        if (eleveById.has(eid)) eleveAesh.set(eid, a.id);
      }
    }
    // 2) Pour chaque eleve.aeshId, s'assurer que l'aesh contient l'élève
    for (const e of s.eleves) {
      if (e.aeshId && aeshById.has(e.aeshId) && !eleveAesh.has(e.id)) {
        eleveAesh.set(e.id, e.aeshId);
      }
    }

    const newEleves = s.eleves.map((e) => {
      const target = eleveAesh.get(e.id);
      return e.aeshId === target ? e : { ...e, aeshId: target };
    });
    const newAeshs = s.aeshs.map((a) => {
      const ids = s.eleves.filter((e) => eleveAesh.get(e.id) === a.id).map((e) => e.id);
      const same = ids.length === a.eleveIds.length && ids.every((x) => a.eleveIds.includes(x));
      return same ? a : { ...a, eleveIds: ids };
    });

    const changed =
      newEleves.some((e, i) => e !== s.eleves[i]) || newAeshs.some((a, i) => a !== s.aeshs[i]);
    if (changed) useStore.setState({ eleves: newEleves, aeshs: newAeshs });
  });
}
export async function chargerElevesDepuisServeur() {
  const donnees = await getEleves();

  const eleves: Eleve[] = donnees.map((eleve) => ({
    id: eleve.id,
    classeId: eleve.classe_id,
    aeshId: eleve.aesh_id ?? undefined,
    nom: eleve.nom,
    prenom: eleve.prenom,
    qrCode: eleve.qr_code,
    groupe: eleve.groupe ?? undefined,
    remarque: eleve.remarque ?? undefined,
    dateNaissance: eleve.date_naissance ?? undefined,
    sexe: eleve.sexe ?? undefined,
    email: eleve.email ?? undefined,
    entree: eleve.entree ?? undefined,
    sortie: eleve.sortie ?? undefined,
    rattachement: eleve.rattachement ?? undefined,
    tuteur: eleve.tuteur ?? undefined,
    options: eleve.options ?? undefined,
    regime: eleve.regime ?? undefined,
    dispositifs: eleve.dispositifs ?? undefined,
    createdAt: new Date(eleve.created_at).getTime(),
  }));

  useStore.setState({ eleves });
}

export const countAbsences = (eleveId: string, appels: Appel[]) =>
  appels.reduce(
    (acc, a) => acc + (a.entries.find((e) => e.eleveId === eleveId)?.presence === "absent" ? 1 : 0),
    0,
  );

export const fmtDate = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fmtTime = (d: Date = new Date()) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export const todayDay = (): Day => {
  const map: Day[] = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "lundi"];
  // JS: 0=dim, 1=lun ... 6=sam
  const js = new Date().getDay();
  if (js === 0) return "lundi";
  return map[js - 1];
};


export async function chargerClassesDepuisServeur() {
  const donnees = await getClasses();

  const classes: Classe[] = donnees.map((classe) => ({
    id: classe.id,
    nom: classe.nom,
    alias1: classe.alias1 ?? undefined,
    alias2: classe.alias2 ?? undefined,
    groupe1Nom: classe.groupe1_nom ?? undefined,
    groupe2Nom: classe.groupe2_nom ?? undefined,
    createdAt: new Date(classe.created_at).getTime(),
    source: classe.source === "edt" ? "edt" : "manual",
  }));

  useStore.setState({ classes });
}

if (typeof window !== "undefined") {
  chargerClassesDepuisServeur().catch((error) => {
    console.error("Impossible de charger les classes du serveur :", error);
  });
  // Charge aussi la liste des élèves au démarrage pour que les compteurs
  // affichés sur la page d'accueil soient corrects.
  chargerElevesDepuisServeur().catch((error) => {
    console.error("Impossible de charger les élèves du serveur :", error);
  });
}
