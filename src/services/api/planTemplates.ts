import { api } from "./client";
import type { PlanScope } from "@/lib/store";

export type PlanTemplateApi = {
  id: string;
  name: string;
  salle: string | null;
  scope: PlanScope;
  tables: unknown[];
  rows: number;
  cols: number;
  orientation: string | null;
  created_at: string;
};

export type DefaultPlanApi = {
  tables: unknown[];
  rows: number;
  cols: number;
  orientation: string | null;
  zoom: number;
  background_image: string | null;
  updated_at: string;
};

export function getPlanTemplates() {
  return api<PlanTemplateApi[]>("/plan-templates");
}

export function createPlanTemplate(data: {
  name: string;
  salle?: string | null;
  scope: PlanScope;
  tables: unknown[];
  rows?: number;
  cols?: number;
  orientation?: string | null;
}) {
  return api<PlanTemplateApi>("/plan-templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deletePlanTemplate(templateId: string) {
  return api<{ success: boolean }>(`/plan-templates/${encodeURIComponent(templateId)}`, {
    method: "DELETE",
  });
}

export function getDefaultPlan() {
  return api<DefaultPlanApi | null>("/default-plan");
}

export function upsertDefaultPlan(data: {
  tables: unknown[];
  rows?: number;
  cols?: number;
  orientation?: string | null;
  zoom?: number;
  background_image?: string | null;
}) {
  return api<DefaultPlanApi>("/default-plan", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
