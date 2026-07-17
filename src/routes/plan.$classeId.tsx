import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ClassPlanBoard } from "@/components/ClassPlanBoard";
import { SeatLabel } from "@/components/SeatLabel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


import { useStore, type PlanScope, type SeatTable, type TableOrientation, type TableRotation, TABLE_H_W, TABLE_H_H, TABLE_V_W, TABLE_V_H } from "@/lib/store";
import {
  getPlan,
  upsertPlan as upsertPlanServer,
  deletePlan as deletePlanServer,
} from "@/services/api/plans";
import { getPlanTemplates, createPlanTemplate, deletePlanTemplate as deletePlanTemplateServer, getDefaultPlan, upsertDefaultPlan } from "@/services/api/planTemplates";
import { toast } from "sonner";
import { Trash2, Grid3x3, Users, ScanLine, RotateCw, X, Magnet, Plus, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Move, Save } from "lucide-react";

import { detectSexe, displayName } from "@/lib/plan-helpers";

const searchSchema = z.object({
  scope: z.enum(["all", "g1", "g2"]).optional(),
});

export const Route = createFileRoute("/plan/$classeId")({
  validateSearch: searchSchema,
  component: PlanEditorPage,
});

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export type PlanTemplate = {
  id: string;
  name: string;
  salle?: string;
  scope: PlanScope;
  tables: Array<Omit<SeatTable, "id">>;
  createdAt: number;
};

const asTableStructure = (value: unknown): Array<Omit<SeatTable, "id">> => {
  if (!Array.isArray(value)) return [];
  return value as Array<Omit<SeatTable, "id">>;
};

const mapApiTemplate = (template: {
  id: string;
  name: string;
  salle: string | null;
  scope: PlanScope;
  tables: unknown[];
  created_at: string;
}) => ({
  id: template.id,
  name: template.name,
  salle: template.salle ?? undefined,
  scope: template.scope,
  tables: asTableStructure(template.tables),
  createdAt: new Date(template.created_at).getTime(),
});

const mapDefaultPlan = (plan: {
  tables: unknown[];
  rows?: number | string | null;
  cols?: number | string | null;
  orientation?: string | null;
  zoom?: number | string | null;
  background_image?: string | null;
}) => ({
  tables: asTableStructure(plan.tables),
  rows: typeof plan.rows === "number" ? plan.rows : Number(plan.rows) || 0,
  cols: typeof plan.cols === "number" ? plan.cols : Number(plan.cols) || 0,
  orientation: plan.orientation ?? null,
  zoom: typeof plan.zoom === "number" ? plan.zoom : Number(plan.zoom) || 1,
  backgroundImage: plan.background_image ?? undefined,
});

// Disposition par défaut : tables positionnées selon l’image fournie.
const DEFAULT_LAYOUT: Array<Omit<SeatTable, "id">> = [
  { x: 13, y: 12, orientation: "h", w: 30, h: 8 },
  { x: 51, y: 12, orientation: "h", w: 30, h: 8 },
  { x: 89, y: 12, orientation: "h", w: 30, h: 8 },
  { x: 13, y: 23, orientation: "h", w: 30, h: 8 },
  { x: 49, y: 23, orientation: "h", w: 30, h: 8 },
  { x: 85, y: 23, orientation: "h", w: 30, h: 8 },
  { x: 13, y: 36, orientation: "h", w: 30, h: 8 },
  { x: 49, y: 36, orientation: "v", w: 8, h: 30 },
  { x: 85, y: 36, orientation: "h", w: 30, h: 8 },
  { x: 14, y: 57, orientation: "h", w: 30, h: 8 },
  { x: 14, y: 69, orientation: "h", w: 30, h: 8 },
  { x: 64, y: 57, orientation: "h", w: 30, h: 8 },
  { x: 64, y: 69, orientation: "h", w: 30, h: 8 },
  { x: 88, y: 57, orientation: "h", w: 30, h: 8 },
];



function scopeLabel(scope: PlanScope, classeName: string, g1?: string, g2?: string): string {
  if (scope === "all") return `Classe entière (${classeName})`;
  if (scope === "g1") return g1?.trim() || "Groupe 1";
  return g2?.trim() || "Groupe 2";
}

function PlanEditorPage() {
  const { classeId } = Route.useParams();
  const { scope: scopeSearch } = Route.useSearch();
  const scope: PlanScope = scopeSearch ?? "all";

  const classes = useStore((s) => s.classes);
  const allEleves = useStore((s) => s.eleves);
  const plans = useStore((s) => s.seatingPlans);
  const upsertPlanLocal = useStore((s) => s.upsertSeatingPlan);
  const deletePlanLocal = useStore((s) => s.deleteSeatingPlan);
  const updateEleve = useStore((s) => s.updateEleve);


  const classe = useMemo(() => classes.find((c) => c.id === classeId), [classes, classeId]);
  const plan = useMemo(
    () => plans.find((p) => p.classeId === classeId && p.scope === scope),
    [plans, classeId, scope],
  );

  const eleves = useMemo(
    () =>
      allEleves
        .filter((e) => e.classeId === classeId)
        .filter((e) => {
          if (scope === "all") return true;
          if (scope === "g1") return e.groupe === 1;
          return e.groupe === 2;
        })
        .sort((a, b) => a.nom.localeCompare(b.nom)),
    [allEleves, classeId, scope],
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const draggingRef = useRef<{ id: string; offX: number; offY: number } | null>(null);

  const [editingSeat, setEditingSeat] = useState<string | null>(null);
  const [seatDialogOpen, setSeatDialogOpen] = useState(false);

  const [snap, setSnap] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [dimensionDraft, setDimensionDraft] = useState<{ tableId: string; w: string; h: string } | null>(null);
  const [nudgeStep, setNudgeStep] = useState(0.5);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateSalle, setTemplateSalle] = useState("");
  const [defaultPlanTables, setDefaultPlanTables] = useState<Array<Omit<SeatTable, "id">>>([]);
  const [defaultPlanLoaded, setDefaultPlanLoaded] = useState(false);
  const [serverPlanLoaded, setServerPlanLoaded] = useState(false);
  const holdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hydrated || serverPlanLoaded) return;
    if (!classeId) return;

    let mounted = true;
    void (async () => {
      try {
        const serverPlan = await getPlan(classeId, scope);
        if (!mounted || !serverPlan) return;

        upsertPlanLocal(classeId, scope, {
          tables: Array.isArray(serverPlan.tables)
            ? (serverPlan.tables as SeatTable[]).map((table) => ({
                ...table,
                id: table.id || uid(),
              }))
            : [],
          zoom: typeof serverPlan.zoom === "number" ? serverPlan.zoom : Number(serverPlan.zoom) || 1,
          backgroundImage: serverPlan.background_image ?? undefined,
        });
      } catch (error) {
        console.error("Erreur chargement du plan serveur", error);
      } finally {
        if (mounted) setServerPlanLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [hydrated, classeId, scope, serverPlanLoaded, upsertPlanLocal]);

  // Recharge le bon plan lors d'un changement de classe ou de groupe.
  useEffect(() => {
    setServerPlanLoaded(false);
  }, [classeId, scope]);

  // Sauvegarde automatique dans PostgreSQL.
  // Le délai évite une requête à chaque pixel pendant le déplacement d'une table.
  useEffect(() => {
    if (!hydrated || !serverPlanLoaded || !plan) return;

    const timer = window.setTimeout(() => {
      void upsertPlanServer({
        classe_id: classeId,
        scope,
        tables: plan.tables,
        zoom: plan.zoom ?? 1,
        background_image: plan.backgroundImage ?? null,
      }).catch((error) => {
        console.error("Erreur sauvegarde automatique du plan", error);
        toast.error("Le plan n'a pas pu être sauvegardé sur le serveur.");
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    hydrated,
    serverPlanLoaded,
    classeId,
    scope,
    plan?.tables,
    plan?.zoom,
    plan?.backgroundImage,
  ]);

  useEffect(() => {
    const finish = () => {
      // Migration unique : réinitialise tous les plans existants pour appliquer
      // les nouvelles tailles rectangulaires et repartir d'un plan vide.
      try {
        const MIGRATION_KEY = "plan-reset-rect-v1";
        if (typeof window !== "undefined" && !window.localStorage.getItem(MIGRATION_KEY)) {
          const st = useStore.getState();
          st.seatingPlans.forEach((p) => st.deleteSeatingPlan(p.classeId, p.scope));
          window.localStorage.setItem(MIGRATION_KEY, "1");
        }
      } catch {
        /* ignore */
      }
      setHydrated(true);
    };
    if (useStore.persist.hasHydrated()) {
      finish();
      return;
    }
    let mounted = true;
    Promise.resolve(useStore.persist.rehydrate()).then(() => {
      if (mounted) finish();
    });
    return () => {
      mounted = false;
    };
  }, []);

  const GRID_STEP = 5;
  const snapValue = (v: number) => Math.round(v / GRID_STEP) * GRID_STEP;

  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      const d = draggingRef.current;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!d || !rect) return;
      const zoom = plan?.zoom ?? 1;
      let x = (((ev.clientX - rect.left) / rect.width) - 0.5) * 100 / zoom + 50 - d.offX;
      let y = (((ev.clientY - rect.top) / rect.height) - 0.5) * 100 / zoom + 50 - d.offY;
      x = Math.max(0, Math.min(100, x));
      y = Math.max(0, Math.min(100, y));
      if (snap) {
        x = snapValue(x);
        y = snapValue(y);
      }
      const cur = useStore.getState().seatingPlans.find((p) => p.classeId === classeId && p.scope === scope);
      if (!cur) return;
      upsertPlanLocal(classeId, scope, {
        tables: cur.tables.map((t) => (t.id === d.id ? { ...t, x, y } : t)),
      });
    };
    const onUp = () => {
      draggingRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [classeId, scope, upsertPlanLocal, snap, plan?.zoom]);

  const getDefaultTables = (): SeatTable[] => {
    if (defaultPlanTables.length > 0) {
      return defaultPlanTables.map((t) => ({
        ...t,
        id: uid(),
        leftEleveId: undefined,
        rightEleveId: undefined,
      }));
    }

    const st = useStore.getState();
    const ref = st.classes.find((c) => {
      const nom = c.nom.trim().toLowerCase();
      return nom === "4a" || nom === "4c";
    });
    if (ref) {
      const refPlan = st.seatingPlans.find(
        (p) => p.classeId === ref.id && p.scope === "all",
      );
      if (refPlan && refPlan.tables.length > 0) {
        return refPlan.tables.map((t) => ({
          ...t,
          id: uid(),
          leftEleveId: undefined,
          rightEleveId: undefined,
        }));
      }
    }
    return DEFAULT_LAYOUT.map((t) => ({ ...t, id: uid() }));
  };

  useEffect(() => {
    if (!hydrated || !defaultPlanLoaded) return;
    if (!plan) {
      upsertPlanLocal(classeId, scope, { tables: getDefaultTables() });
    }
  }, [hydrated, defaultPlanLoaded, plan, classeId, scope, upsertPlanLocal, defaultPlanTables]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const result = await getPlanTemplates();
        if (!mounted) return;
        setTemplates(result.map(mapApiTemplate));
      } catch (error) {
        console.error("Erreur chargement des modèles de plan", error);
      }
    })();

    void (async () => {
      try {
        const serverDefault = await getDefaultPlan();
        if (!mounted) return;
        if (serverDefault) {
          setDefaultPlanTables(mapDefaultPlan(serverDefault).tables);
        }
      } catch (error) {
        console.error("Erreur chargement du plan par défaut", error);
      } finally {
        if (mounted) setDefaultPlanLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const resetToDefault = () => {
    upsertPlanLocal(classeId, scope, { tables: getDefaultTables() });
    toast.success("Disposition de 4C appliquée");
  };

  const saveTemplate = async () => {
    if (!plan) {
      toast.error("Aucun plan à enregistrer.");
      return;
    }
    const name = templateName.trim() || classe?.nom || `Modèle ${new Date().toLocaleDateString()}`;
    try {
      const result = await createPlanTemplate({
        name,
        salle: templateSalle.trim() || null,
        scope,
        tables: plan.tables.map((t) => ({
          x: t.x,
          y: t.y,
          w: t.w ?? (t.orientation === "h" ? TABLE_H_W : TABLE_V_W),
          h: t.h ?? (t.orientation === "h" ? TABLE_H_H : TABLE_V_H),
          orientation: t.orientation ?? "h",
          rotation: t.rotation,
        })),
        rows: 0,
        cols: 0,
        orientation: null,
      });

      const saved = mapApiTemplate(result);
      setTemplates((current) => [saved, ...current]);
      setTemplateName("");
      setTemplateSalle("");
      toast.success("Modèle enregistré");
    } catch (error) {
      console.error("Erreur sauvegarde du modèle de plan", error);
      toast.error("Impossible d'enregistrer le modèle.");
    }
  };

  const loadTemplate = (template: PlanTemplate) => {
    upsertPlanLocal(classeId, scope, {
      tables: template.tables.map((t) => ({
        ...t,
        id: uid(),
        leftEleveId: undefined,
        rightEleveId: undefined,
      })),
    });
    toast.success(`Modèle « ${template.name} » appliqué à cette classe`);
  };

  const removeTemplate = async (id: string) => {
    try {
      await deletePlanTemplateServer(id);
      setTemplates((current) => current.filter((t) => t.id !== id));
      toast.success("Modèle supprimé");
    } catch (error) {
      console.error("Erreur suppression du modèle de plan", error);
      toast.error("Impossible de supprimer le modèle.");
    }
  };





  const tables: SeatTable[] = plan?.tables ?? [];
  const editingTable = tables.find((t) => t.id === editingSeat);

  useEffect(() => {
    if (!editingTable) {
      setDimensionDraft(null);
      return;
    }

    const orient: TableOrientation = editingTable.orientation ?? "h";
    const defW = orient === "h" ? TABLE_H_W : TABLE_V_W;
    const defH = orient === "h" ? TABLE_H_H : TABLE_V_H;
    setDimensionDraft({
      tableId: editingTable.id,
      w: String(Math.round(editingTable.w ?? defW)),
      h: String(Math.round(editingTable.h ?? defH)),
    });
  }, [editingTable?.id, editingTable?.orientation, editingTable?.w, editingTable?.h]);

  if (!classe) {
    return (
      <AppShell title="Classe introuvable">
        <Link to="/" className="underline">Retour</Link>
      </AppShell>
    );
  }

  const toggleOrientation = (id: string) => {
    upsertPlanLocal(classeId, scope, {
      tables: tables.map((t) =>
        t.id === id
          ? { ...t, orientation: (t.orientation ?? "h") === "h" ? "v" : "h" }
          : t,
      ),
    });
  };

  const removeTable = (id: string) => {
    upsertPlanLocal(classeId, scope, { tables: tables.filter((t) => t.id !== id) });
  };

  const updateTable = (id: string, patch: Partial<SeatTable>) => {
    upsertPlanLocal(classeId, scope, {
      tables: tables.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  };

  const beginDrag = (ev: RPE<HTMLDivElement>, table: SeatTable) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    ev.preventDefault();
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
    const zoom = plan?.zoom ?? 1;
    const px = (((ev.clientX - rect.left) / rect.width) - 0.5) * 100 / zoom + 50;
    const py = (((ev.clientY - rect.top) / rect.height) - 0.5) * 100 / zoom + 50;
    draggingRef.current = { id: table.id, offX: px - table.x, offY: py - table.y };
  };

  const alignTables = () => {
    if (!plan || plan.tables.length === 0) return;
    const cols = Math.max(2, Math.min(6, Math.ceil(Math.sqrt(plan.tables.length * 1.5))));
    const rows = Math.ceil(plan.tables.length / cols);
    const cellW = 100 / (cols + 1);
    const cellH = 100 / (rows + 1);
    const next = plan.tables.map((t, i) => ({
      ...t,
      x: ((i % cols) + 1) * cellW,
      y: (Math.floor(i / cols) + 1) * cellH,
    }));
    upsertPlanLocal(classeId, scope, { tables: next });
    toast.success("Tables alignées");
  };

  const setZoom = (zoom: number) => {
    upsertPlanLocal(classeId, scope, { zoom });
  };

  const assignedElsewhere = (eleveId: string, tableId: string) =>
    tables.some(
      (t) => t.id !== tableId && (t.leftEleveId === eleveId || t.rightEleveId === eleveId),
    );

  const eleveById = (id?: string) => eleves.find((e) => e.id === id);

  return (
    <AppShell
      title="Plan de classe"
      subtitle={scopeLabel(scope, classe.nom, classe.groupe1Nom, classe.groupe2Nom)}
    >
      {/* Scope switcher */}
      <div className="mb-3 grid grid-cols-3 gap-2 p-1 bg-muted rounded-2xl">
        {(["all", "g1", "g2"] as const).map((s) => (
          <Link
            key={s}
            to="/plan/$classeId"
            params={{ classeId }}
            search={{ scope: s === "all" ? undefined : s }}
            className={`text-xs font-semibold rounded-xl px-2 py-2 text-center transition ${
              scope === s
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {s === "all"
              ? "Classe"
              : s === "g1"
                ? classe.groupe1Nom?.trim() || "Groupe 1"
                : classe.groupe2Nom?.trim() || "Groupe 2"}
          </Link>
        ))}
      </div>




      <div className="mb-3 grid grid-cols-2 gap-2">
        <Button
          size="sm"
          className="h-10 rounded-xl"
          onClick={() => {
            upsertPlanLocal(classeId, scope, {
              tables: [...tables, { id: uid(), x: 50, y: 50, orientation: "h" }],
            });
            toast.success("Table horizontale ajoutée");
          }}
        >
          <Plus className="size-4 mr-1" /> Table horizontale
        </Button>
        <Button
          size="sm"
          className="h-10 rounded-xl"
          onClick={() => {
            upsertPlanLocal(classeId, scope, {
              tables: [...tables, { id: uid(), x: 50, y: 50, orientation: "v" }],
            });
            toast.success("Table verticale ajoutée");
          }}
        >
          <Plus className="size-4 mr-1" /> Table verticale
        </Button>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-10 rounded-xl"
          onClick={() => setSnap((s) => !s)}
        >
          <Magnet className={`size-4 mr-1 ${snap ? "text-primary" : "text-muted-foreground"}`} />
          {snap ? "Aimantation on" : "Aimantation off"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-10 rounded-xl"
          onClick={alignTables}
        >
          <Grid3x3 className="size-4 mr-1" /> Aligner auto
        </Button>
      </div>


      <div className="mb-3 grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-10 rounded-xl"
          onClick={() => {
            const placedIds = new Set<string>();
            tables.forEach((t) => {
              if (t.leftEleveId) placedIds.add(t.leftEleveId);
              if (t.rightEleveId) placedIds.add(t.rightEleveId);
            });
            const queue = eleves.filter((e) => !placedIds.has(e.id));
            if (queue.length === 0) {
              toast.info("Tous les élèves sont déjà placés.");
              return;
            }
            let filled = 0;
            const next = tables.map((t) => {
              const nt = { ...t };
              if (!nt.leftEleveId && queue.length > 0) {
                nt.leftEleveId = queue.shift()!.id;
                filled++;
              }
              if (!nt.rightEleveId && queue.length > 0) {
                nt.rightEleveId = queue.shift()!.id;
                filled++;
              }
              return nt;
            });
            if (filled === 0) {
              toast.error("Aucune place libre.");
              return;
            }
            upsertPlanLocal(classeId, scope, { tables: next });
            toast.success(
              `${filled} élève(s) placé(s)${queue.length ? ` — ${queue.length} sans place` : ""}`,
            );
          }}
        >
          <Users className="size-4 mr-1" /> Assigner tous
        </Button>
        <Button asChild variant="outline" size="sm" className="h-10 rounded-xl">
          <Link
            to="/appel-plan/$classeId"
            params={{ classeId }}
            search={{ scope: scope === "all" ? undefined : scope }}
          >
            <ScanLine className="size-4 mr-1" />
            Faire l'appel
          </Link>
        </Button>
      </div>


      {editingTable && (() => {
        const orient: TableOrientation = editingTable.orientation ?? "h";
        const defW = orient === "h" ? TABLE_H_W : TABLE_V_W;
        const defH = orient === "h" ? TABLE_H_H : TABLE_V_H;
        const w = editingTable.w ?? defW;
        const h = editingTable.h ?? defH;
        const rot: TableRotation = editingTable.rotation ?? 0;
        return (
          <div className="mb-3 rounded-2xl border-2 border-primary bg-card p-3 space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold">Table sélectionnée</p>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => setEditingSeat(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="move" className="border-b">
                <AccordionTrigger className="text-xs font-semibold py-2">
                  <span className="flex items-center gap-1.5">
                    <Move className="size-3.5" /> Déplacer
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">
                      {editingTable.x.toFixed(1)}% · {editingTable.y.toFixed(1)}%
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pt-1">
                  {(() => {
                    const nudge = (dx: number, dy: number) => {
                      const s = nudgeStep;
                      updateTable(editingTable.id, {
                        x: Math.max(0, Math.min(100, editingTable.x + dx * s)),
                        y: Math.max(0, Math.min(100, editingTable.y + dy * s)),
                      });
                    };
                    const startHold = (dx: number, dy: number) => {
                      nudge(dx, dy);
                      if (holdRef.current) window.clearInterval(holdRef.current);
                      let delay = 300;
                      const tick = () => {
                        nudge(dx, dy);
                        delay = Math.max(40, delay - 30);
                        holdRef.current = window.setTimeout(tick, delay);
                      };
                      holdRef.current = window.setTimeout(tick, delay);
                    };
                    const stopHold = () => {
                      if (holdRef.current) {
                        window.clearTimeout(holdRef.current);
                        holdRef.current = null;
                      }
                    };
                    const padBtn = (dx: number, dy: number, icon: React.ReactNode, label: string) => (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0 rounded-xl"
                        aria-label={label}
                        onPointerDown={(e) => { e.preventDefault(); startHold(dx, dy); }}
                        onPointerUp={stopHold}
                        onPointerLeave={stopHold}
                        onPointerCancel={stopHold}
                      >
                        {icon}
                      </Button>
                    );
                    return (
                      <div className="rounded-xl border border-border bg-muted/40 p-2">
                        <div className="flex items-center justify-end mb-1.5">
                          <span className="text-[10px] text-muted-foreground tabular-nums">pas {nudgeStep.toFixed(2)}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="grid grid-cols-3 gap-1 shrink-0">
                            <div />
                            {padBtn(0, -1, <ArrowUp className="size-4" />, "Haut")}
                            <div />
                            {padBtn(-1, 0, <ArrowLeft className="size-4" />, "Gauche")}
                            <div className="h-10 w-10 rounded-xl bg-background/60 flex items-center justify-center text-muted-foreground">
                              <Move className="size-3.5" />
                            </div>
                            {padBtn(1, 0, <ArrowRight className="size-4" />, "Droite")}
                            <div />
                            {padBtn(0, 1, <ArrowDown className="size-4" />, "Bas")}
                            <div />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] text-muted-foreground mb-1">Finesse du pas</p>
                            <input
                              type="range"
                              min={1}
                              max={500}
                              step={1}
                              value={Math.round(nudgeStep * 100)}
                              onChange={(e) => setNudgeStep(Number(e.target.value) / 100)}
                              className="w-full accent-primary"
                              aria-label="Pas du joystick"
                            />
                            <div className="grid grid-cols-4 gap-1 mt-1">
                              {[0.05, 0.25, 1, 5].map((v) => (
                                <Button
                                  key={v}
                                  size="sm"
                                  variant={Math.abs(nudgeStep - v) < 0.001 ? "default" : "outline"}
                                  className="h-6 px-1 text-[10px]"
                                  onClick={() => setNudgeStep(v)}
                                >
                                  {v}%
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="size" className="border-b">
                <AccordionTrigger className="text-xs font-semibold py-2">
                  <span className="flex items-center gap-1.5">
                    <Grid3x3 className="size-3.5" /> Dimensionner
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">
                      {Math.round(w)}×{Math.round(h)}%
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pt-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[11px] block">
                      <span className="text-muted-foreground">Largeur (%)</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={dimensionDraft?.tableId === editingTable.id ? dimensionDraft.w : String(Math.round(w))}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          setDimensionDraft((current) => ({
                            tableId: editingTable.id,
                            w: raw,
                            h: current?.tableId === editingTable.id ? current.h : String(Math.round(h)),
                          }));
                          if (raw === "") return;
                          const v = Number(raw);
                          if (!Number.isNaN(v)) updateTable(editingTable.id, { w: Math.max(1, Math.min(100, v)) });
                        }}
                        onBlur={() => {
                          if (dimensionDraft?.tableId === editingTable.id && dimensionDraft.w === "") {
                            setDimensionDraft((current) => current?.tableId === editingTable.id ? { ...current, w: String(Math.round(w)) } : current);
                          }
                        }}
                        className="w-full h-8 mt-0.5 px-2 rounded border border-border bg-background text-sm"
                      />
                    </label>
                    <label className="text-[11px] block">
                      <span className="text-muted-foreground">Hauteur (%)</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={dimensionDraft?.tableId === editingTable.id ? dimensionDraft.h : String(Math.round(h))}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          setDimensionDraft((current) => ({
                            tableId: editingTable.id,
                            w: current?.tableId === editingTable.id ? current.w : String(Math.round(w)),
                            h: raw,
                          }));
                          if (raw === "") return;
                          const v = Number(raw);
                          if (!Number.isNaN(v)) updateTable(editingTable.id, { h: Math.max(1, Math.min(100, v)) });
                        }}
                        onBlur={() => {
                          if (dimensionDraft?.tableId === editingTable.id && dimensionDraft.h === "") {
                            setDimensionDraft((current) => current?.tableId === editingTable.id ? { ...current, h: String(Math.round(h)) } : current);
                          }
                        }}
                        className="w-full h-8 mt-0.5 px-2 rounded border border-border bg-background text-sm"
                      />
                    </label>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8"
                    onClick={() => {
                      updateTable(editingTable.id, { w: undefined, h: undefined });
                      setDimensionDraft({ tableId: editingTable.id, w: String(Math.round(defW)), h: String(Math.round(defH)) });
                    }}
                  >
                    Dimensions par défaut
                  </Button>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="orient" className="border-b-0">
                <AccordionTrigger className="text-xs font-semibold py-2">
                  <span className="flex items-center gap-1.5">
                    <RotateCw className="size-3.5" /> Orientation & rotation
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">
                      {orient === "h" ? "horiz." : "vert."} · {rot}°
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pt-1 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8"
                    onClick={() => toggleOrientation(editingTable.id)}
                  >
                    Sièges : {orient === "h" ? "horizontal" : "vertical"}
                  </Button>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">Rotation : {rot}°</p>
                    <div className="grid grid-cols-4 gap-1">
                      {([0, 90, 180, 270] as const).map((r) => (
                        <Button
                          key={r}
                          size="sm"
                          variant={rot === r ? "default" : "outline"}
                          className="h-8"
                          onClick={() => updateTable(editingTable.id, { rotation: r })}
                        >
                          {r}°
                        </Button>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button
              size="sm"
              className="w-full h-8"
              onClick={() => setSeatDialogOpen(true)}
            >
              <Users className="size-4 mr-1" /> Assigner des élèves
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="w-full h-8 text-destructive"
              onClick={() => {
                if (confirm("Supprimer cette table ?")) {
                  removeTable(editingTable.id);
                  setEditingSeat(null);
                  setSeatDialogOpen(false);
                  toast.success("Table supprimée");
                }
              }}
            >
              <Trash2 className="size-4 mr-1" /> Supprimer cette table
            </Button>
          </div>
        );
      })()}

      {plan ? (

      <ClassPlanBoard
        plan={plan}
        zoom={plan?.zoom ?? 1}
        onZoomChange={setZoom}
        showGrid={snap}
        gridStep={GRID_STEP}
        editable
        containerRef={containerRef}
        onTableClick={(t) => { setEditingSeat(t.id); setSeatDialogOpen(true); }}

        renderSeat={(eleveId, _tableId, _side, _orientation, rotation) => {
          const e = eleveById(eleveId);
          if (!e) {
            return (
              <div className="flex-1 flex items-center justify-center text-[10px] leading-tight font-semibold text-center px-1 border-r last:border-r-0 border-primary-foreground/40">
                —
              </div>
            );
          }
          return (
            <div className="flex-1 flex items-center justify-center text-[10px] leading-tight font-semibold text-center px-1 border-r last:border-r-0 border-primary-foreground/40">
              <SeatLabel prenom={e.prenom} nom={e.nom} rotation={rotation} />
            </div>
          );
        }}
      />
      ) : (
        <div className="mb-3 rounded-2xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Préparation du plan…
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2">
        Faites glisser la poignée pour déplacer une table. Touchez une table puis un élève ci-dessous pour placer.
      </p>

      {/* Deux listes colorées : filles / garçons non placés */}
      {(() => {
        const placedIds = new Set<string>();
        tables.forEach((t) => {
          if (t.leftEleveId) placedIds.add(t.leftEleveId);
          if (t.rightEleveId) placedIds.add(t.rightEleveId);
        });
        const unplaced = eleves.filter((e) => !placedIds.has(e.id));
        const filles = unplaced.filter((e) => detectSexe(e.sexe) === "F");
        const garcons = unplaced.filter((e) => detectSexe(e.sexe) === "M");
        const autres = unplaced.filter((e) => detectSexe(e.sexe) === "?");

        const listCard = (
          titre: string,
          list: typeof eleves,
          bgClass: string,
          borderClass: string,
          itemClass: string,
        ) => (
          <div className={`rounded-2xl border ${borderClass} ${bgClass} p-3`}>
            <p className="font-bold text-sm mb-2">
              {titre} <span className="opacity-60">({list.length})</span>
            </p>
            {list.length === 0 ? (
              <p className="text-[11px] opacity-70">Aucun non placé</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {list.map((e) => (
                  <li key={e.id}>
                    <span
                      className={`inline-block px-2 py-1 rounded-lg text-[11px] font-semibold ${itemClass}`}
                    >
                      {displayName(e)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );

        return (
          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-3">
              {listCard(
                "👧 Filles",
                filles,
                "bg-pink-50",
                "border-pink-200",
                "bg-pink-100 text-pink-900 border border-pink-200",
              )}
              {listCard(
                "👦 Garçons",
                garcons,
                "bg-sky-50",
                "border-sky-200",
                "bg-sky-100 text-sky-900 border border-sky-200",
              )}
            </div>
            {autres.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-3">
                <p className="font-bold text-sm mb-2">
                  Sexe non renseigné{" "}
                  <span className="opacity-60">({autres.length})</span>
                </p>
                <ul className="space-y-1.5">
                  {autres.map((e) => (
                    <li key={e.id} className="flex items-center gap-2">
                      <span className="flex-1 text-sm font-semibold truncate">
                        {displayName(e)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 bg-pink-100 hover:bg-pink-200 text-pink-900 border-pink-200"
                        onClick={() => updateEleve(e.id, { sexe: "F" })}
                      >
                        👧
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 bg-sky-100 hover:bg-sky-200 text-sky-900 border-sky-200"
                        onClick={() => updateEleve(e.id, { sexe: "M" })}
                      >
                        👦
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })()}

      {plan && (
        <div className="mt-4 grid grid-cols-1 gap-2">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="grid gap-2">
              <Input
                placeholder="Nom du modèle de plan"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="h-12"
              />
              <Input
                placeholder="Salle (ex: B12)"
                value={templateSalle}
                onChange={(e) => setTemplateSalle(e.target.value)}
                className="h-12"
              />
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  if (!plan) {
                    toast.error("Aucun plan à enregistrer.");
                    return;
                  }
                  saveTemplate();
                }}
              >
                <Save className="size-4 mr-2" /> Enregistrer le plan
              </Button>
            </div>
            {templates.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Modèles enregistrés</p>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div key={template.id} className="rounded-xl border border-border p-3 bg-muted">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="font-semibold">{template.name}</p>
                          {template.salle ? <p className="text-xs text-muted-foreground">Salle : {template.salle}</p> : null}
                          <p className="text-xs text-muted-foreground">Scope : {template.scope === "all" ? "Classe entière" : template.scope === "g1" ? "Groupe 1" : "Groupe 2"}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" className="h-9" onClick={() => loadTemplate(template)}>
                            Charger
                          </Button>
                          <Button size="sm" variant="outline" className="h-9" onClick={() => removeTemplate(template.id)}>
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (confirm("Vider toutes les tables du plan ?")) {
                upsertPlanLocal(classeId, scope, { tables: [] });
                toast.success("Plan vidé");
              }
            }}
          >
            <X className="size-4" /> Vider le plan (aucune table)
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (confirm("Restaurer la disposition par défaut ?")) resetToDefault();
            }}
          >
            <RotateCw className="size-4" /> Restaurer disposition par défaut
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              if (!plan) {
                toast.error("Aucun plan à enregistrer.");
                return;
              }
              try {
                await upsertDefaultPlan({
                  tables: plan.tables.map((t) => ({
                    x: t.x,
                    y: t.y,
                    w: t.w ?? (t.orientation === "h" ? TABLE_H_W : TABLE_V_W),
                    h: t.h ?? (t.orientation === "h" ? TABLE_H_H : TABLE_V_H),
                    orientation: t.orientation ?? "h",
                    rotation: t.rotation,
                  })),
                  rows: 0,
                  cols: 0,
                  orientation: null,
                  zoom: plan.zoom ?? 1,
                  background_image: plan.backgroundImage ?? null,
                });
                toast.success("Plan enregistré comme disposition par défaut");
              } catch (error) {
                console.error("Erreur sauvegarde du plan par défaut", error);
                toast.error("Impossible d'enregistrer le plan par défaut.");
              }
            }}
          >
            <Save className="size-4" /> Enregistrer comme plan par défaut
          </Button>
          <Button
            variant="ghost"
            className="w-full text-destructive"
            onClick={() => {
              if (confirm("Supprimer définitivement ce plan ? La disposition par défaut sera recréée à la prochaine ouverture.")) {
                try {
                  await deletePlanServer(classeId, scope);
                  deletePlanLocal(classeId, scope);
                  toast.success("Plan supprimé du serveur");
                } catch (error) {
                  console.error("Erreur suppression du plan serveur", error);
                  toast.error("Impossible de supprimer le plan du serveur.");
                }
              }
            }}
          >
            <Trash2 className="size-4" /> Supprimer ce plan
          </Button>
        </div>
      )}


      <Dialog open={seatDialogOpen && !!editingTable} onOpenChange={(o) => setSeatDialogOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Users className="inline size-4 mr-1" />
              Élèves à cette table
            </DialogTitle>
          </DialogHeader>
          {editingTable && (() => {
            const leftE = eleveById(editingTable.leftEleveId);
            const rightE = eleveById(editingTable.rightEleveId);
            const placedHere = new Set(
              [editingTable.leftEleveId, editingTable.rightEleveId].filter(Boolean) as string[],
            );
            const available = eleves.filter(
              (e) => !assignedElsewhere(e.id, editingTable.id) && !placedHere.has(e.id),
            );
            const filles = available.filter((e) => detectSexe(e.sexe) === "F");
            const garcons = available.filter((e) => detectSexe(e.sexe) === "M");
            const autres = available.filter((e) => detectSexe(e.sexe) === "?");

            const assignFirstEmpty = (eleveId: string) => {
              if (!editingTable.leftEleveId) {
                updateTable(editingTable.id, { leftEleveId: eleveId });
              } else if (!editingTable.rightEleveId) {
                updateTable(editingTable.id, { rightEleveId: eleveId });
              } else {
                toast.error("Table pleine — retirez un élève d'abord.");
              }
            };

            const seatCard = (label: string, e: typeof leftE, side: "leftEleveId" | "rightEleveId") => (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                    {label}
                  </p>
                  <p className="text-sm font-bold truncate">
                    {e ? displayName(e) : "— Vide —"}
                  </p>
                </div>
                {e && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive"
                    onClick={() => updateTable(editingTable.id, { [side]: undefined })}
                    aria-label="Retirer"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            );

            const list = (
              titre: string,
              arr: typeof eleves,
              bg: string,
              itemBg: string,
              itemText: string,
              emptyMsg: string,
            ) => (
              <div className={`rounded-lg ${bg} p-2`}>
                <p className="text-[11px] font-bold mb-1.5">
                  {titre} <span className="opacity-60">({arr.length})</span>
                </p>
                {arr.length === 0 ? (
                  <p className="text-[10px] opacity-60">{emptyMsg}</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {arr.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => assignFirstEmpty(e.id)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold ${itemBg} ${itemText} active:scale-95 transition`}
                      >
                        {displayName(e)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );

            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {seatCard("Première place", leftE, "leftEleveId")}
                  {seatCard("Deuxième place", rightE, "rightEleveId")}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Touchez un élève pour l'assigner à la première place libre.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {list(
                    "👧 Filles",
                    filles,
                    "bg-pink-50 border border-pink-200",
                    "bg-pink-100 hover:bg-pink-200",
                    "text-pink-900",
                    "Aucune fille disponible",
                  )}
                  {list(
                    "👦 Garçons",
                    garcons,
                    "bg-sky-50 border border-sky-200",
                    "bg-sky-100 hover:bg-sky-200",
                    "text-sky-900",
                    "Aucun garçon disponible",
                  )}
                </div>

                {autres.length > 0 && (
                  <div className="rounded-lg bg-muted p-2">
                    <p className="text-[11px] font-bold mb-1.5">
                      Sexe non renseigné{" "}
                      <span className="opacity-60">({autres.length})</span>
                    </p>
                    <ul className="space-y-1">
                      {autres.map((e) => (
                        <li key={e.id} className="flex items-center gap-1.5">
                          <button
                            onClick={() => assignFirstEmpty(e.id)}
                            className="flex-1 text-left px-2 py-1 rounded text-[11px] font-semibold bg-background hover:bg-muted"
                          >
                            {displayName(e)}
                          </button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 bg-pink-100 text-pink-900 border-pink-200"
                            onClick={() => updateEleve(e.id, { sexe: "F" })}
                          >
                            👧
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 bg-sky-100 text-sky-900 border-sky-200"
                            onClick={() => updateEleve(e.id, { sexe: "M" })}
                          >
                            👦
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  variant="ghost"
                  className="w-full text-destructive"
                  onClick={() => {
                    removeTable(editingTable.id);
                    setEditingSeat(null);
                  }}
                >
                  <Trash2 className="size-4" /> Supprimer cette table
                </Button>


              </div>
            );
          })()}
          <DialogFooter>
            <Button className="w-full" onClick={() => setSeatDialogOpen(false)}>
              Terminé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

