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
  created_at: string;
};

export function getEleves() {
  return api<EleveApi[]>("/eleves");
}

export function createEleve(data: {
  classe_id: string;
  nom: string;
  prenom: string;
}) {
  return api<EleveApi>("/eleves", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteEleveServeur(id: string) {
  return api<{ success: boolean }>(`/eleves/${id}`, {
    method: "DELETE",
  });
}