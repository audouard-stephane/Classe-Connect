import { api } from "./client";

export type PlanApi = {
  id: string;
  classe_id: string;
  scope: "all" | "g1" | "g2";
  background_image: string | null;
  tables: unknown[];
  zoom: number;
  updated_at: string;
};

export type UpsertPlanData = {
  classe_id: string;
  scope: "all" | "g1" | "g2";
  background_image?: string | null;
  tables: unknown[];
  zoom?: number;
};

export async function getPlan(classeId: string, scope: "all" | "g1" | "g2") {
  return api<PlanApi | null>(`/plans?classe_id=${encodeURIComponent(classeId)}&scope=${encodeURIComponent(scope)}`);
}

export async function upsertPlan(data: UpsertPlanData) {
  return api<PlanApi>(`/plans`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deletePlan(classeId: string, scope: "all" | "g1" | "g2") {
  return api<{ success: boolean }>(`/plans?classe_id=${encodeURIComponent(classeId)}&scope=${encodeURIComponent(scope)}`, {
    method: "DELETE",
  });
}
