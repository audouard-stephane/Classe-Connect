import { api } from "./client";

export type ClasseApi = {
  id: string;
  nom: string;
  alias1: string | null;
  alias2: string | null;
  groupe1_nom: string | null;
  groupe2_nom: string | null;
  source: string;
  created_at: string;
};

export function getClasses() {
  return api<ClasseApi[]>("/classes");
}

export function createClasse(nom: string, source: "manual" | "edt" = "manual") {
  return api<ClasseApi>("/classes", {
    method: "POST",
    body: JSON.stringify({ nom, source }),
  });
}
export function deleteClasseServeur(id: string) {
  return api<{ success: boolean; id: string }>(`/classes/${id}`, {
    method: "DELETE",
  });
}

