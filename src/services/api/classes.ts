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

export type UpdateClasseData = {
  nom?: string;
  alias1?: string | null;
  alias2?: string | null;
  groupe1_nom?: string | null;
  groupe2_nom?: string | null;
};

export function getClasses() {
  return api<ClasseApi[]>("/classes");
}

export function createClasse(data: {
  nom: string;
  alias1?: string;
  alias2?: string;
}) {
  return api<ClasseApi>("/classes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateClasseServeur(
  id: string,
  data: UpdateClasseData,
) {
  return api<ClasseApi>(`/classes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteClasseServeur(id: string) {
  return api<{ success: boolean }>(`/classes/${id}`, {
    method: "DELETE",
  });
}

