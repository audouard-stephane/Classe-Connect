import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, countAbsences } from "@/lib/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, BarChart3, ArrowLeft, Pencil } from "lucide-react";


export const Route = createFileRoute("/historique")({
  component: HistoriquePage,
  head: () => ({ meta: [{ title: "Historique — ClasseScan" }] }),
});

function HistoriquePage() {
  const navigate = useNavigate();

  const appels = useStore((s) => s.appels);
  const observations = useStore((s) => s.observations);
  const classes = useStore((s) => s.classes);
  const eleves = useStore((s) => s.eleves);
  const aeshs = useStore((s) => s.aeshs);
  const deleteAppel = useStore((s) => s.deleteAppel);

  const [filtre, setFiltre] = useState<string>("all");
  const [tab, setTab] = useState<"appels" | "observations" | "stats">("appels");
  const [openAppelId, setOpenAppelId] = useState<string | null>(null);

  const appelsList = appels
    .filter((a) => filtre === "all" || a.classeId === filtre)
    .sort((a, b) => b.createdAt - a.createdAt);

  const obsList = observations
    .filter((o) => filtre === "all" || o.classeId === filtre)
    .sort((a, b) => b.createdAt - a.createdAt);

  // Stats
  const elevesFiltres = filtre === "all" ? eleves : eleves.filter((e) => e.classeId === filtre);
  const totalAbs = elevesFiltres.reduce((acc, e) => acc + countAbsences(e.id, appels), 0);
  const totalAppels = appelsList.length;
  const totalObs = obsList.length;
  const oublisMat = obsList.filter((o) => o.materiel === "oubli").length;
  const travailNonFait = obsList.filter((o) => o.travail === "non_fait").length;

  // Detail view
  if (openAppelId) {
    const a = appels.find((x) => x.id === openAppelId);
    if (!a) {
      setOpenAppelId(null);
      return null;
    }
    const c = classes.find((x) => x.id === a.classeId);
    const absents = a.entries
      .filter((e) => e.presence === "absent")
      .map((e) => eleves.find((x) => x.id === e.eleveId))
      .filter((e): e is NonNullable<typeof e> => !!e);
    const presents = a.entries.length - absents.length;
    return (
      <AppShell title={`Appel ${c?.nom ?? ""}`} subtitle={`${a.date} · ${a.heure}`}>
        <div className="flex gap-2 mb-4">
          <Button
            variant="secondary"
            className="flex-1 h-14 rounded-2xl text-base"
            onClick={() => setOpenAppelId(null)}
          >
            <ArrowLeft className="size-5" /> Retour
          </Button>
          <Button
            className="flex-1 h-14 rounded-2xl text-base"
            onClick={() =>
              navigate({
                to: "/appel-plan/$classeId",
                params: { classeId: a.classeId },
                search: { appelId: a.id },
              })
            }
          >
            <Pencil className="size-5" /> Modifier
          </Button>
        </div>
        {a.updatedAt && (
          <p className="text-xs text-muted-foreground -mt-2 mb-3">
            Modifié le {new Date(a.updatedAt).toLocaleString("fr-FR")}
          </p>
        )}


        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-primary">{presents}</p>
            <p className="text-xs text-muted-foreground">Présents</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-destructive">{absents.length}</p>
            <p className="text-xs text-muted-foreground">Absents</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <p className="font-bold mb-2">Élèves absents</p>
          {absents.length === 0 ? (
            <p className="text-sm text-primary font-semibold">Tous les élèves étaient présents</p>
          ) : (
            <ul className="space-y-1">
              {absents.map((e) => (
                <li key={e.id} className="text-sm">
                  • {e.prenom} {e.nom.charAt(0).toUpperCase()}.
                </li>
              ))}

            </ul>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="font-bold mb-2">AESH</p>
          {!a.aeshPresences || a.aeshPresences.length === 0 ? (
            <p className="text-sm text-muted-foreground">Pas d'AESH</p>
          ) : (
            <ul className="space-y-1">
              {a.aeshPresences.map((ap) => {
                const aesh = aeshs.find((x) => x.id === ap.aeshId);
                return (
                  <li key={ap.aeshId} className="text-sm flex justify-between">
                    <span>{aesh ? `${aesh.prenom} ${aesh.nom}` : "?"}</span>
                    <span className={ap.presence === "present" ? "text-primary font-semibold" : "text-destructive font-semibold"}>
                      {ap.presence === "present" ? "Présent" : "Absent"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Historique">
      <Select value={filtre} onValueChange={setFiltre}>
        <SelectTrigger className="h-11 mb-3"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les classes</SelectItem>
          {classes.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-1 mb-3">
        {(["appels", "observations", "stats"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-full text-sm font-semibold capitalize ${tab === t ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "appels" && (
        <ul className="space-y-2">
          {appelsList.length === 0 ? <Empty label="Aucun appel" /> : appelsList.map((a) => {
            const c = classes.find((x) => x.id === a.classeId);
            const abs = a.entries.filter((e) => e.presence === "absent").length;
            const pres = a.entries.length - abs;
            return (
              <li
                key={a.id}
                className="bg-card border border-border rounded-xl p-3 flex justify-between items-center gap-2"
              >
                <button onClick={() => setOpenAppelId(a.id)} className="flex-1 text-left">
                  <p className="font-bold">{c?.nom ?? "?"} · {a.date}</p>
                  <p className="text-xs text-muted-foreground">{a.heure} · {pres} présent / {abs} absent</p>
                </button>
                <ChevronRight className="text-muted-foreground" onClick={() => setOpenAppelId(a.id)} />
                <button
                  onClick={() => confirm("Supprimer cet appel ?") && deleteAppel(a.id)}
                  className="text-xs text-destructive"
                >
                  Suppr.
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "observations" && (
        <ul className="space-y-2">
          {obsList.length === 0 ? <Empty label="Aucune observation" /> : obsList.map((o) => {
            const e = eleves.find((x) => x.id === o.eleveId);
            return (
              <li key={o.id}>
                <Link
                  to="/eleves/$eleveId"
                  params={{ eleveId: o.eleveId }}
                  className="flex justify-between bg-card border border-border rounded-xl p-3"
                >
                  <div className="flex-1">
                    <p className="font-bold">{e ? `${e.prenom} ${e.nom}` : "?"}</p>
                    <p className="text-xs text-muted-foreground">{o.date} · {o.heure}</p>
                    {o.note && <p className="text-sm mt-1 line-clamp-2">{o.note}</p>}
                  </div>
                  <ChevronRight className="text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "stats" && (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Appels" value={totalAppels} />
          <Stat label="Absences" value={totalAbs} accent="destructive" />
          <Stat label="Observations" value={totalObs} />
          <Stat label="Oublis matériel" value={oublisMat} />
          <Stat label="Travail non fait" value={travailNonFait} />
          <Stat label="Élèves" value={elevesFiltres.length} />
        </div>
      )}
    </AppShell>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="text-center py-12">
      <BarChart3 className="size-12 mx-auto text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "destructive" }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 text-center">
      <p className={`text-3xl font-bold ${accent === "destructive" ? "text-destructive" : "text-primary"}`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
