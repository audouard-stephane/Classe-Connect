import { api } from "./client";

export type EleveApi = {
  id: string;
  classe_id: string;
  aesh_id: string | null;
  nom: string;
  prenom: string;
  qr_code: string;
  groupe: 1 | 2 | null;
  remarque: string | null;
  sexe: string | null;
  dispositifs: Record<string, string>;
  date_naissance: string | null;
  email: string | null;
  entree: string | null;
  sortie: string | null;
  rattachement: string | null;
  tuteur: string | null;
  options: string | null;
  regime: string | null;
  created_at: string;
};

export type CreateEleveData = {
  classe_id: string;
  nom: string;
  prenom: string;
  aesh_id?: string | null;
  groupe?: 1 | 2 | null;
  remarque?: string | null;
  sexe?: string | null;
  dispositifs?: Record<string, string>;
  date_naissance?: string | null;
  email?: string | null;
  entree?: string | null;
  sortie?: string | null;
  rattachement?: string | null;
  tuteur?: string | null;
  options?: string | null;
  regime?: string | null;
};

export type UpdateEleveData = {
  classe_id?: string;
  aesh_id?: string | null;
  nom?: string;
  prenom?: string;
  groupe?: 1 | 2 | null;
  remarque?: string | null;
  sexe?: string | null;
  dispositifs?: Record<string, string>;
  date_naissance?: string | null;
  email?: string | null;
  entree?: string | null;
  sortie?: string | null;
  rattachement?: string | null;
  tuteur?: string | null;
  options?: string | null;
  regime?: string | null;
};

export function getEleves() {
  return api<EleveApi[]>("/eleves");
}

export function findEleveByNomPrenomDate(nom: string, prenom: string, date_naissance: string) {
  return api<EleveApi[]>(
    `/eleves?nom=${encodeURIComponent(nom.trim())}&prenom=${encodeURIComponent(prenom.trim())}&date_naissance=${encodeURIComponent(date_naissance.trim())}`,
  );
}

export function createEleve(data: CreateEleveData) {
  return api<EleveApi>("/eleves", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateEleveServeur(id: string, data: UpdateEleveData) {
  return api<EleveApi>(`/eleves/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteEleveServeur(id: string) {
  return api<{ success: boolean }>(`/eleves/${id}`, {
    method: "DELETE",
  });
}