import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useStore, fmtDate, fmtTime, type PlanScope, type Presence } from "@/lib/store";
import { toast } from "sonner";
import { Save, Check, X, Pencil, Users, FolderOpen } from "lucide-react";
import { ClassPlanBoard } from "@/components/ClassPlanBoard";
import { SeatLabel } from "@/components/SeatLabel";
import type { TableOrientation, TableRotation } from "@/lib/store";


const searchSchema = z.object({
  scope: z.enum(["all", "g1", "g2"]).optional(),
  coursId: z.string().optional(),
  appelId: z.string().optional(),
});

export const Route = createFileRoute("/appel-plan/$classeId")({
  validateSearch: searchSchema,
  component: AppelPlanPage,
});

function AppelPlanPage() {
  const { classeId } = Route.useParams();
  const { scope: scopeSearch, coursId, appelId } = Route.useSearch();
  const scope: PlanScope = scopeSearch ?? "all";
  const groupe: 1 | 2 | undefined = scope === "g1" ? 1 : scope === "g2" ? 2 : undefined;

  const classes = useStore((s) => s.classes);
  const allEleves = useStore((s) => s.eleves);
  const plans = useStore((s) => s.seatingPlans);
  const appels = useStore((s) => s.appels);
  const observations = useStore((s) => s.observations);
  const saveAppel = useStore((s) => s.saveAppel);
  const updateAppel = useStore((s) => s.updateAppel);
  const upsertPlan = useStore((s) => s.upsertSeatingPlan);
  const addObservation = useStore((s) => s.addObservation);
  const deleteObservation = useStore((s) => s.deleteObservation);
  const navigate = useNavigate();

  const classe = useMemo(() => classes.find((c) => c.id === classeId), [classes, classeId]);
  const plan = useMemo(
    () => plans.find((p) => p.classeId === classeId && p.scope === scope),
    [plans, classeId, scope],
  );
  const sorted = useMemo(
    () =>
      allEleves
        .filter((e) => e.classeId === classeId)
        .filter((e) => (groupe ? e.groupe === groupe : true))
        .sort((a, b) => a.nom.localeCompare(b.nom)),
    [allEleves, classeId, groupe],
  );

  // Un appel reste valable 1h : si un appel récent existe pour cette
  // classe/portée, on l'édite au lieu d'en créer un nouveau.
  const recentAppel = useMemo(() => {
    if (appelId) return undefined;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return [...appels]
      .filter((a) => a.classeId === classeId && a.createdAt >= oneHourAgo)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
  }, [appels, classeId, appelId]);

  useEffect(() => {
    if (recentAppel && !appelId) {
      navigate({
        to: "/appel-plan/$classeId",
        params: { classeId },
        search: { scope: scopeSearch, coursId, appelId: recentAppel.id },
        replace: true,
      });
    }
  }, [recentAppel, appelId, classeId, scopeSearch, coursId, navigate]);

  const editingAppel = useMemo(
    () => (appelId ? appels.find((a) => a.id === appelId) : undefined),
    [appelId, appels],
  );

  // Tous présents par défaut ; on clique pour marquer absent.
  const [presences, setPresences] = useState<Record<string, Presence>>({});
  const [retards, setRetards] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialise depuis un appel existant en mode modification, ou par défaut tous présents.
  useEffect(() => {
    if (initialized || sorted.length === 0) return;
    if (!editingAppel) {
      setPresences(Object.fromEntries(sorted.map((e) => [e.id, "present" as Presence])));
      setInitialized(true);
      return;
    }
    const p: Record<string, Presence> = {};
    for (const e of sorted) {
      const entry = editingAppel.entries.find((x) => x.eleveId === e.id);
      p[e.id] = entry?.presence ?? "present";
    }
    const r: Record<string, boolean> = {};
    for (const o of observations) {
      if (
        o.classeId === classeId &&
        o.date === editingAppel.date &&
        o.heure === editingAppel.heure &&
        o.note === "Retard"
      ) {
        r[o.eleveId] = true;
      }
    }
    setPresences(p);
    setRetards(r);
    setInitialized(true);
  }, [editingAppel, sorted, observations, classeId, initialized]);

  if (!classe) {
    return (
      <AppShell title="Classe introuvable">
        <Link to="/" className="underline">Retour</Link>
      </AppShell>
    );
  }

  if (!plan || plan.tables.length === 0) {
    return (
      <AppShell title="Plan de classe" subtitle={classe.nom}>
        <p className="text-sm text-muted-foreground mb-4">
          Aucun plan configuré pour cette portée. Créez-le d'abord.
        </p>
        <Button asChild className="w-full h-14 rounded-2xl">
          <Link
            to="/plan/$classeId"
            params={{ classeId }}
            search={{ scope: scope === "all" ? undefined : scope }}
          >
            <Pencil className="size-5" /> Créer le plan
          </Link>
        </Button>
      </AppShell>
    );
  }

  const eleveById = (id?: string) => sorted.find((e) => e.id === id);
  const placedIds = new Set<string>();
  plan.tables.forEach((t) => {
    if (t.leftEleveId) placedIds.add(t.leftEleveId);
    if (t.rightEleveId) placedIds.add(t.rightEleveId);
  });
  const unplaced = sorted.filter((e) => !placedIds.has(e.id));

  const presentsCount = sorted.filter((e) => presences[e.id] === "present").length;
  const absentsCount = sorted.length - presentsCount;
  const retardsCount = Object.values(retards).filter(Boolean).length;

  const setPresence = (id: string, p: Presence) =>
    setPresences((s) => ({ ...s, [id]: p }));
  const setRetard = (id: string, v: boolean) =>
    setRetards((s) => ({ ...s, [id]: v }));
  const setZoom = (zoom: number) => {
    if (plan) upsertPlan(classeId, scope, { zoom });
  };

  const applyRetards = (date: string, heure: string) => {
    // Supprime les retards existants pour cet appel puis ajoute les nouveaux
    const existing = observations.filter(
      (o) =>
        o.classeId === classeId &&
        o.date === date &&
        o.heure === heure &&
        o.note === "Retard",
    );
    existing.forEach((o) => deleteObservation(o.id));
    Object.entries(retards).forEach(([eleveId, v]) => {
      if (!v) return;
      addObservation({ eleveId, classeId, date, heure, note: "Retard" });
    });
  };

  const terminer = () => {
    if (editingAppel) {
      updateAppel(editingAppel.id, {
        entries: sorted.map((e) => ({ eleveId: e.id, presence: presences[e.id] ?? "present" })),
      });
      applyRetards(editingAppel.date, editingAppel.heure);
      toast.success("Appel modifié");
      navigate({ to: "/historique" });
      return;
    }
    const now = new Date();
    const appel = saveAppel({
      classeId,
      coursId,
      date: fmtDate(now),
      heure: fmtTime(now),
      entries: sorted.map((e) => ({ eleveId: e.id, presence: presences[e.id] ?? "present" })),
    });
    applyRetards(appel.date, appel.heure);
    toast.success("Appel enregistré");
    navigate({ to: "/absences", search: { appelId: appel.id } });
  };


  const renderSeat = (
    eleveId: string | undefined,
    tableId: string,
    side: "L" | "R",
    orientation: TableOrientation,
    rotation: TableRotation,
  ) => {
    const e = eleveById(eleveId);
    if (!e) {
      return (
        <div className="flex-1 flex items-center justify-center text-[10px] text-muted-foreground border-r last:border-r-0 border-background/40">
          —
        </div>
      );
    }
    const p = presences[e.id] ?? "present";
    const late = !!retards[e.id];
    const key = `${tableId}-${side}`;
    const isOpen = openId === key;
    return (
      <Popover open={isOpen} onOpenChange={(o) => setOpenId(o ? key : null)}>
        <PopoverTrigger asChild>
          <button
            title={`${e.prenom} ${e.nom}`}
            className={`flex-1 flex items-center justify-center border-r last:border-r-0 border-background/40 px-1 text-center transition ${
              p === "absent"
                ? "bg-destructive text-destructive-foreground"
                : late
                  ? "bg-amber-500 text-white"
                  : "bg-primary text-primary-foreground"
            }`}
          >
            <SeatLabel prenom={e.prenom} nom={e.nom} orientation={orientation} rotation={rotation} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" side="top" align="center">
          <p className="text-base font-bold px-2 pb-2 border-b mb-2">
            {e.prenom} <span className="uppercase">{e.nom}</span>
          </p>

          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              variant={p === "present" && !late ? "default" : "outline"}
              className="justify-start"
              onClick={() => {
                setPresence(e.id, "present");
                setRetard(e.id, false);
                setOpenId(null);
              }}
            >
              <Check className="size-4" /> Présent
            </Button>
            <Button
              size="sm"
              variant={p === "absent" ? "destructive" : "outline"}
              className="justify-start"
              onClick={() => {
                setPresence(e.id, "absent");
                setRetard(e.id, false);
                setOpenId(null);
              }}
            >
              <X className="size-4" /> Absent
            </Button>
            <Button
              size="sm"
              variant={late ? "default" : "outline"}
              className={`justify-start ${late ? "bg-amber-500 hover:bg-amber-600" : ""}`}
              onClick={() => {
                setPresence(e.id, "present");
                setRetard(e.id, true);
                setOpenId(null);
              }}
            >
              ⏱ Retard
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="justify-start"
              onClick={() => {
                setOpenId(null);
                navigate({ to: "/eleves/$eleveId", params: { eleveId: e.id } });
              }}
            >
              <FolderOpen className="size-4" /> Ouvrir la fiche
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };


  return (
    <AppShell
      title={editingAppel ? `Modifier · ${classe.nom}` : `Appel · ${classe.nom}`}
      subtitle={
        editingAppel
          ? `Appel du ${editingAppel.date} à ${editingAppel.heure} · ${presentsCount} présent · ${absentsCount} absent${retardsCount ? ` · ${retardsCount} retard` : ""}`
          : `${presentsCount} présent · ${absentsCount} absent${retardsCount ? ` · ${retardsCount} retard` : ""}`
      }
    >

      <ClassPlanBoard plan={plan} zoom={plan.zoom ?? 1} onZoomChange={setZoom} renderSeat={renderSeat} />

      <p className="text-xs text-muted-foreground mb-3">
        Touchez un élève pour changer son statut (Présent / Absent / Retard).
        Rouge = absent, orange = retard.
      </p>

      {unplaced.length > 0 && (
        <div className="mb-3 p-3 rounded-2xl border border-border bg-card">
          <p className="font-bold text-sm mb-2 flex items-center gap-1">
            <Users className="size-4" /> Non placés ({unplaced.length})
          </p>
          <ul className="space-y-1.5">
            {unplaced.map((e) => {
              const p = presences[e.id] ?? "present";
              const late = !!retards[e.id];
              return (
                <li key={e.id} className="flex gap-1.5 items-center">
                  <span className="flex-1 text-sm font-semibold truncate">
                    {e.prenom} {e.nom.charAt(0).toUpperCase()}.
                  </span>

                  <Button
                    size="sm"
                    variant={p === "present" && !late ? "default" : "outline"}
                    className="h-8 px-2"
                    onClick={() => {
                      setPresence(e.id, "present");
                      setRetard(e.id, false);
                    }}
                    aria-label="Présent"
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={p === "absent" ? "destructive" : "outline"}
                    className="h-8 px-2"
                    onClick={() => {
                      setPresence(e.id, "absent");
                      setRetard(e.id, false);
                    }}
                    aria-label="Absent"
                  >
                    <X className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={late ? "default" : "outline"}
                    className={`h-8 px-2 ${late ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                    onClick={() => {
                      setPresence(e.id, "present");
                      setRetard(e.id, true);
                    }}
                    aria-label="Retard"
                  >
                    ⏱
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Button
        className="w-full h-16 rounded-2xl text-lg sticky bottom-24"
        onClick={terminer}
        disabled={sorted.length === 0}
      >
        <Save className="size-6" /> {editingAppel ? "Enregistrer les modifications" : "Terminer l'appel"}
      </Button>
    </AppShell>
  );
}
