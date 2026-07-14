import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Save,
  ShieldAlert,
  Dices,
  Camera,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
} from "lucide-react";

import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ClassPlanBoard } from "@/components/ClassPlanBoard";
import { SeatLabel } from "@/components/SeatLabel";
import {
  useStore,
  fmtDate,
  fmtTime,
  type PlanScope,
  type TableOrientation,
  type TableRotation,
} from "@/lib/store";
import { displayName, getLastAppelStatus } from "@/lib/plan-helpers";
import {
  getCameraErrorMessage,
  requestCameraStream,
  stopMediaStream,
} from "@/lib/camera";

export type VerifMode =
  | "travail"
  | "travail-maison"
  | "travail-classe"
  | "classeur"
  | "bavardages";
type StateVal =
  | "fait"
  | "partiel"
  | "non_fait"
  | "present"
  | "oubli"
  | "bav_aucun"
  | "bav_quelques"
  | "bav_beaucoup";

interface StateDef {
  value: StateVal;
  label: string;
  emoji: string;
  bg: string;
  text: string;
}

const TRAVAIL_STATES: StateDef[] = [
  { value: "fait", label: "Fait", emoji: "✅", bg: "bg-emerald-500", text: "text-white" },
  { value: "partiel", label: "Partiellement fait", emoji: "🟡", bg: "bg-amber-500", text: "text-white" },
  { value: "non_fait", label: "Non fait", emoji: "❌", bg: "bg-rose-600", text: "text-white" },
];

const CLASSEUR_STATES: StateDef[] = [
  { value: "present", label: "A son classeur", emoji: "📒", bg: "bg-emerald-500", text: "text-white" },
  { value: "oubli", label: "N'a pas son classeur", emoji: "❌", bg: "bg-rose-600", text: "text-white" },
];

const BAVARDAGES_STATES: StateDef[] = [
  { value: "bav_aucun", label: "Aucun bavardage", emoji: "🤫", bg: "bg-emerald-500", text: "text-white" },
  { value: "bav_quelques", label: "Quelques bavardages", emoji: "💬", bg: "bg-amber-500", text: "text-white" },
  { value: "bav_beaucoup", label: "Beaucoup de bavardages", emoji: "🗣️", bg: "bg-rose-600", text: "text-white" },
];

export function PlanVerifView({
  classeId,
  mode,
  scope = "all",
}: {
  classeId: string;
  mode: VerifMode;
  scope?: PlanScope;
}) {
  const classes = useStore((s) => s.classes);
  const eleves = useStore((s) => s.eleves);
  const plans = useStore((s) => s.seatingPlans);
  const appels = useStore((s) => s.appels);
  const observations = useStore((s) => s.observations);
  const addObservation = useStore((s) => s.addObservation);
  const upsertPlan = useStore((s) => s.upsertSeatingPlan);

  const classe = classes.find((c) => c.id === classeId);
  const plan = plans.find((p) => p.classeId === classeId && p.scope === scope);
  const last = useMemo(
    () => getLastAppelStatus(classeId, appels, observations),
    [classeId, appels, observations],
  );

  const isTravail = mode === "travail" || mode === "travail-maison" || mode === "travail-classe";
  const isTravailClasse = mode === "travail-classe";
  const isBav = mode === "bavardages";
  const states = isBav ? BAVARDAGES_STATES : isTravail ? TRAVAIL_STATES : CLASSEUR_STATES;
  const title =
    mode === "travail-maison"
      ? "Travail à la maison"
      : mode === "travail-classe"
        ? "Travail en classe"
        : mode === "travail"
          ? "Vérification du travail"
          : mode === "bavardages"
            ? "Bavardages"
            : "A son classeur";
  const travailPrefix =
    mode === "travail-maison" ? "Travail maison" : mode === "travail-classe" ? "Travail classe" : "Travail";

  const [values, setValues] = useState<Record<string, StateVal>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  const defaultVal: StateVal = isBav ? "bav_aucun" : isTravail ? "fait" : "present";



  // Travail en classe : plusieurs exercices
  const [exerciseCount, setExerciseCount] = useState(1);
  const [exerciseIndex, setExerciseIndex] = useState(1);

  // Tirage au sort
  const [tirageOpen, setTirageOpen] = useState(false);
  const [tirageEleveId, setTirageEleveId] = useState<string | null>(null);
  const [tirageHistory, setTirageHistory] = useState<string[]>([]);

  // Webcam
  const [camSelectMode, setCamSelectMode] = useState(false);
  const [camEleveId, setCamEleveId] = useState<string | null>(null);
  const [camOpen, setCamOpen] = useState(false);
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [camPhoto, setCamPhoto] = useState<string | null>(null);
  const camVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (seeded || !last || !plan || plan.tables.length === 0) return;
    const seatedIds = new Set<string>();
    for (const t of plan.tables) {
      if (t.leftEleveId) seatedIds.add(t.leftEleveId);
      if (t.rightEleveId) seatedIds.add(t.rightEleveId);
    }
    const init: Record<string, StateVal> = {};
    for (const id of seatedIds) {
      if (last.statusByEleve[id] !== "absent") init[id] = defaultVal;
    }
    setValues(init);
    setSeeded(true);
  }, [seeded, last, plan, defaultVal]);


  // Gestion du flux caméra
  useEffect(() => {
    if (!camOpen) return;
    let cancelled = false;
    setCamError(null);
    requestCameraStream()
      .then((s) => {
        if (cancelled) {
          stopMediaStream(s);
          return;
        }
        setCamStream(s);
      })
      .catch((err) => {
        if (!cancelled) setCamError(getCameraErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [camOpen]);

  useEffect(() => {
    if (camVideoRef.current && camStream) {
      camVideoRef.current.srcObject = camStream;
      void camVideoRef.current.play().catch(() => {});
    }
  }, [camStream]);

  useEffect(() => {
    if (!camOpen && camStream) {
      stopMediaStream(camStream);
      setCamStream(null);
    }
  }, [camOpen, camStream]);

  useEffect(() => {
    return () => {
      stopMediaStream(camStream);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!classe) {
    return (
      <AppShell title="Classe introuvable">
        <Link to="/" className="underline">Retour</Link>
      </AppShell>
    );
  }

  if (!plan || plan.tables.length === 0) {
    return (
      <AppShell title={title} subtitle={classe.nom}>
        <p className="text-sm text-muted-foreground mb-4">
          Aucun plan configuré pour cette classe.
        </p>
        <Button asChild className="w-full h-14 rounded-2xl">
          <Link to="/plan/$classeId" params={{ classeId }}>
            Créer le plan
          </Link>
        </Button>
      </AppShell>
    );
  }

  if (!last) {
    return (
      <AppShell title={title} subtitle={classe.nom}>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <ShieldAlert className="size-10 mx-auto mb-2 text-muted-foreground" />
          <p className="font-semibold">Aucun appel effectué</p>
          <p className="text-sm text-muted-foreground mb-4">
            Faites d'abord un appel pour connaître les présents et les absents.
          </p>
          <Button asChild>
            <Link to="/appel-plan/$classeId" params={{ classeId }}>
              Faire l'appel
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const { statusByEleve } = last;
  const eleveById = (id?: string) => eleves.find((e) => e.id === id);
  const setZoom = (zoom: number) => {
    if (plan) upsertPlan(classeId, scope, { zoom });
  };

  const presentEleves = useMemo(() => {
    if (!plan) return [];
    const ids = new Set<string>();
    for (const t of plan.tables) {
      if (t.leftEleveId) ids.add(t.leftEleveId);
      if (t.rightEleveId) ids.add(t.rightEleveId);
    }
    return [...ids]
      .filter((id) => statusByEleve[id] && statusByEleve[id] !== "absent")
      .map((id) => eleves.find((e) => e.id === id))
      .filter((e): e is NonNullable<typeof e> => Boolean(e));
  }, [plan, statusByEleve, eleves]);

  const tirageEleve = tirageEleveId
    ? eleves.find((e) => e.id === tirageEleveId)
    : null;
  const camEleve = camEleveId ? eleves.find((e) => e.id === camEleveId) : null;

  const doTirage = () => {
    if (presentEleves.length === 0) {
      toast.error("Aucun élève présent");
      return;
    }
    let history = tirageHistory;
    let pool = presentEleves.filter((e) => !history.includes(e.id));
    if (pool.length === 0) {
      // Tout le monde tiré → on recommence, mais on évite le dernier
      history = tirageEleveId ? [tirageEleveId] : [];
      pool = presentEleves.filter((e) => !history.includes(e.id));
      if (pool.length === 0) pool = presentEleves;
      toast.info("Tour terminé : nouveau tirage");
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setTirageEleveId(pick.id);
    setTirageHistory([...history, pick.id]);
    setTirageOpen(true);
  };

  const noteInterrogation = (result: "fait" | "partiel" | "non_fait") => {
    if (!tirageEleve) return;
    const now = new Date();
    const label =
      result === "fait" ? "juste" : result === "partiel" ? "partiellement juste" : "fausse";
    const exSuffix = isTravailClasse ? ` — Ex ${exerciseIndex}` : "";
    addObservation({
      eleveId: tirageEleve.id,
      classeId,
      date: fmtDate(now),
      heure: fmtTime(now),
      travail: result,
      note: `Interrogation${exSuffix} : réponse ${label}`,
    });
    toast.success(`${tirageEleve.prenom} : réponse ${label}`);
    // Passe automatiquement au tirage suivant pour garder le rythme
    doTirage();
  };


  const startCamera = () => {
    if (presentEleves.length === 0) {
      toast.error("Aucun élève présent");
      return;
    }
    setCamSelectMode(true);
    toast.info("Sélectionnez un élève sur le plan");
  };

  const openCameraFor = (eleveId: string) => {
    setCamEleveId(eleveId);
    setCamPhoto(null);
    setCamSelectMode(false);
    setCamOpen(true);
  };

  const capturePhoto = () => {
    const video = camVideoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCamPhoto(canvas.toDataURL("image/jpeg", 0.9));
    if (camEleve) {
      const now = new Date();
      const exSuffix = isTravailClasse ? ` — Ex ${exerciseIndex}` : "";
      addObservation({
        eleveId: camEleve.id,
        classeId,
        date: fmtDate(now),
        heure: fmtTime(now),
        travail: "fait",
        note: `Bon point 🌟 (photo exercice${exSuffix})`,
      });
      toast.success(`Bon point 🌟 pour ${camEleve.prenom}`);
    }
  };

  const downloadPhoto = () => {
    if (!camPhoto || !camEleve) return;
    const a = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = camPhoto;
    a.download = `${camEleve.prenom}-${camEleve.nom}-${stamp}.jpg`;
    a.click();
  };


  const resetExerciseValues = () => {
    const seated = new Set<string>();
    for (const t of plan.tables) {
      if (t.leftEleveId) seated.add(t.leftEleveId);
      if (t.rightEleveId) seated.add(t.rightEleveId);
    }
    const init: Record<string, StateVal> = {};
    for (const id of seated) {
      if (statusByEleve[id] !== "absent") init[id] = defaultVal;
    }
    setValues(init);
  };



  const saveAll = () => {
    const now = new Date();
    let n = 0;
    const exerciseLabel = isTravailClasse ? ` — Ex ${exerciseIndex}` : "";
    for (const [eleveId, val] of Object.entries(values)) {
      if (statusByEleve[eleveId] === "absent") continue;
      if (isTravail) {
        addObservation({
          eleveId,
          classeId,
          date: fmtDate(now),
          heure: fmtTime(now),
          travail: val as "fait" | "partiel" | "non_fait",
          note: `${travailPrefix}${exerciseLabel} : ${val.replace("_", " ")}`,
        });
      } else if (isBav) {
        const comportement =
          val === "bav_aucun" ? "bien" : val === "bav_quelques" ? "moyen" : "mauvais";
        const label =
          val === "bav_aucun"
            ? "Aucun bavardage"
            : val === "bav_quelques"
              ? "Quelques bavardages"
              : "Beaucoup de bavardages";
        addObservation({
          eleveId,
          classeId,
          date: fmtDate(now),
          heure: fmtTime(now),
          comportement,
          note: label,
        });
      } else {
        addObservation({
          eleveId,
          classeId,
          date: fmtDate(now),
          heure: fmtTime(now),
          materiel: val as "present" | "oubli",
          note: val === "present" ? "A son classeur" : "N'a pas son classeur",
        });
      }
      n++;
    }
    toast.success(
      n === 0
        ? "Aucune saisie à enregistrer"
        : `${n} observation${n > 1 ? "s" : ""} enregistrée${n > 1 ? "s" : ""}${exerciseLabel}`,
    );

    if (isTravailClasse && n > 0) {
      // Avance vers l'exercice suivant
      const next = exerciseIndex + 1;
      if (next > exerciseCount) setExerciseCount(next);
      setExerciseIndex(next);
      resetExerciseValues();
    } else {
      setValues({});
    }
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
    const status = statusByEleve[e.id];
    const val = values[e.id];
    const cfg = val ? states.find((s) => s.value === val) : null;
    const key = `${tableId}-${side}`;
    const locked = status === "absent";

    let bg = "bg-primary text-primary-foreground";
    if (locked) bg = "bg-muted text-muted-foreground/70";
    else if (cfg) bg = `${cfg.bg} ${cfg.text}`;
    else if (status === "retard") bg = "bg-amber-400 text-black";

    if (locked) {
      return (
        <div
          className={`flex-1 flex flex-col items-center justify-center border-r last:border-r-0 border-background/40 px-1 text-center line-through ${bg}`}
          title={`${e.prenom} ${e.nom} — Absent`}
        >
          <SeatLabel prenom={e.prenom} nom={e.nom} orientation={orientation} rotation={rotation} />
          <span className="text-[8px] opacity-80 no-underline">Absent</span>
        </div>
      );
    }

    if (camSelectMode) {
      return (
        <button
          title={`${e.prenom} ${e.nom}`}
          onClick={() => openCameraFor(e.id)}
          className={`flex-1 flex flex-col items-center justify-center border-r last:border-r-0 border-background/40 px-1 text-center transition ring-2 ring-offset-1 ring-primary/70 animate-pulse ${bg}`}
        >
          <SeatLabel prenom={e.prenom} nom={e.nom} orientation={orientation} rotation={rotation} />
          <Camera className="size-3 mt-0.5" />
        </button>
      );
    }

    return (
      <Popover open={openId === key} onOpenChange={(o) => setOpenId(o ? key : null)}>
        <PopoverTrigger asChild>
          <button
            title={`${e.prenom} ${e.nom}`}
            className={`flex-1 flex flex-col items-center justify-center border-r last:border-r-0 border-background/40 px-1 text-center transition ${bg}`}
          >
            <SeatLabel prenom={e.prenom} nom={e.nom} orientation={orientation} rotation={rotation} />
            {status === "retard" && <span className="text-[8px]">⏱</span>}
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-56 p-2" side="top" align="center">
          <p className="text-base font-bold px-2 pb-2 border-b mb-2">
            {e.prenom} <span className="uppercase">{e.nom}</span>
          </p>

          <div className="flex flex-col gap-1">
            {states.map((s) => (
              <Button
                key={s.value}
                size="sm"
                variant={val === s.value ? "default" : "outline"}
                className={`justify-start ${
                  val === s.value ? `${s.bg} ${s.text} hover:opacity-90` : ""
                }`}
                onClick={() => {
                  setValues((v) => ({ ...v, [e.id]: s.value }));
                  setOpenId(null);
                }}
              >
                <span className="mr-1">{s.emoji}</span> {s.label}
              </Button>
            ))}
            {val && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setValues((v) => {
                    const next = { ...v };
                    delete next[e.id];
                    return next;
                  });
                  setOpenId(null);
                }}
              >
                Effacer
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const pendingCount = Object.keys(values).length;

  return (
    <AppShell
      title={title}
      subtitle={`${classe.nom} · appel du ${last.appel.date} à ${last.appel.heure}`}
    >
      {isTravailClasse && (
        <div className="mb-3 rounded-2xl border border-border bg-card p-3 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Exercice en cours</p>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8"
                  onClick={() => setExerciseIndex((i) => Math.max(1, i - 1))}
                  disabled={exerciseIndex <= 1}
                  aria-label="Exercice précédent"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8"
                  onClick={() => {
                    const next = exerciseIndex + 1;
                    if (next > exerciseCount) setExerciseCount(next);
                    setExerciseIndex(next);
                  }}
                  aria-label="Exercice suivant"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: exerciseCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setExerciseIndex(n)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
                    n === exerciseIndex
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border"
                  }`}
                >
                  Ex {n}
                </button>
              ))}
              <button
                onClick={() => {
                  const next = exerciseCount + 1;
                  setExerciseCount(next);
                  setExerciseIndex(next);
                }}
                className="px-2 py-1.5 rounded-full text-sm border border-dashed border-border text-muted-foreground"
                aria-label="Ajouter un exercice"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="h-12 rounded-xl" onClick={doTirage}>
              <Dices className="size-5" /> Tirage au sort
            </Button>
            <Button
              variant={camSelectMode ? "default" : "secondary"}
              className="h-12 rounded-xl"
              onClick={() => (camSelectMode ? setCamSelectMode(false) : startCamera())}
            >
              <Camera className="size-5" />
              {camSelectMode ? "Annuler" : "Photo élève"}
            </Button>
          </div>
          {camSelectMode && (
            <p className="text-xs text-center text-primary font-semibold">
              Sélectionnez un élève sur le plan pour prendre sa photo
            </p>
          )}
        </div>
      )}


      <ClassPlanBoard plan={plan} zoom={plan.zoom ?? 1} onZoomChange={setZoom} renderSeat={renderSeat} />

      <div className="mb-3 grid grid-cols-2 gap-2 text-[10px]">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-2">
          <span className="inline-block size-3 rounded-full bg-muted-foreground/50" />
          Absent (verrouillé)
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-2">
          <span className="inline-block size-3 rounded-full bg-amber-400" />
          Retard (modifiable)
        </div>
        {states.map((s) => (
          <div key={s.value} className="flex items-center gap-1 rounded-lg bg-muted p-2">
            <span className={`inline-block size-3 rounded-full ${s.bg}`} />
            {s.emoji} {s.label}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Touchez un élève pour choisir son état. Les absents ne sont pas
        modifiables.
      </p>

      <Button
        className="w-full h-16 rounded-2xl text-lg sticky bottom-24"
        onClick={saveAll}
        disabled={pendingCount === 0}
      >
        <Save className="size-6" />
        {isTravailClasse
          ? `Enregistrer Ex ${exerciseIndex}${pendingCount > 0 ? ` (${pendingCount})` : ""}`
          : `Enregistrer${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
      </Button>

      {/* Tirage au sort — plein écran */}
      <Dialog open={tirageOpen} onOpenChange={setTirageOpen}>
        <DialogContent
          className="max-w-none w-screen h-screen p-0 rounded-none border-0 flex flex-col items-center justify-center bg-background"
        >
          <DialogTitle className="sr-only">Élève tiré au sort</DialogTitle>
          <button
            className="absolute top-4 right-4 rounded-full bg-muted p-3"
            onClick={() => setTirageOpen(false)}
            aria-label="Fermer"
          >
            <X className="size-6" />
          </button>
          {tirageEleve && (
            <div className="text-center px-6">
              <p className="text-lg text-muted-foreground mb-6">
                À toi de donner la réponse !
              </p>
              <p className="font-black leading-none tracking-tight text-[clamp(3rem,15vw,10rem)]">
                {displayName(tirageEleve)}
              </p>
            </div>
          )}
          {tirageEleve && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 w-full px-4">
              <p className="text-sm text-muted-foreground">Sa réponse était :</p>
              <div className="grid grid-cols-3 gap-2 w-full max-w-md">
                <Button
                  size="lg"
                  className="h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-base"
                  onClick={() => noteInterrogation("fait")}
                >
                  ✅ Juste
                </Button>
                <Button
                  size="lg"
                  className="h-16 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-base"
                  onClick={() => noteInterrogation("partiel")}
                >
                  🟡 Partiel
                </Button>
                <Button
                  size="lg"
                  className="h-16 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-base"
                  onClick={() => noteInterrogation("non_fait")}
                >
                  ❌ Faux
                </Button>
              </div>
            </div>
          )}
          <div className="absolute bottom-4 flex gap-3">
            <Button size="sm" variant="outline" onClick={doTirage}>
              <Dices className="size-4" /> Un autre
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setTirageOpen(false)}>
              Fermer
            </Button>
          </div>

        </DialogContent>
      </Dialog>

      {/* Webcam — plein écran */}
      <Dialog
        open={camOpen}
        onOpenChange={(o) => {
          setCamOpen(o);
          if (!o) {
            setCamPhoto(null);
            setCamEleveId(null);
          }
        }}
      >
        <DialogContent
          className="max-w-none w-screen h-screen p-0 rounded-none border-0 bg-black flex items-center justify-center"
        >
          <DialogTitle className="sr-only">Caméra</DialogTitle>
          <button
            className="absolute top-4 right-4 z-10 rounded-full bg-white/20 p-3 text-white backdrop-blur"
            onClick={() => setCamOpen(false)}
            aria-label="Fermer"
          >
            <X className="size-6" />
          </button>
          {camEleve && (
            <div className="absolute top-4 left-4 z-10 rounded-full bg-black/60 backdrop-blur px-4 py-2 text-white font-bold">
              {displayName(camEleve)}
            </div>
          )}
          {camError ? (
            <div className="text-center px-8 text-white">
              <Camera className="size-12 mx-auto mb-3 opacity-70" />
              <p className="font-semibold mb-2">{camError}</p>
              <Button variant="secondary" onClick={() => setCamOpen(false)}>
                Fermer
              </Button>
            </div>
          ) : camPhoto ? (
            <img
              src={camPhoto}
              alt="Photo"
              className="h-full w-full object-contain"
            />
          ) : (
            <video
              ref={camVideoRef}
              className="h-full w-full object-contain"
              muted
              playsInline
              autoPlay
            />
          )}
          {!camError && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
              {camPhoto ? (
                <>
                  <Button size="lg" variant="secondary" onClick={() => setCamPhoto(null)}>
                    <RotateCcw className="size-5" /> Reprendre
                  </Button>
                  <Button size="lg" onClick={downloadPhoto}>
                    <Download className="size-5" /> Enregistrer
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  onClick={capturePhoto}
                  className="h-16 w-16 rounded-full p-0 bg-white text-black hover:bg-white/90"
                  aria-label="Prendre la photo"
                >
                  <Camera className="size-8" />
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

