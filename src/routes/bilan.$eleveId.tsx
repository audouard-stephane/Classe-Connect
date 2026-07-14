import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import {
  computeBilan,
  listSemesters,
  currentSemesterId,
} from "@/lib/bilan";
import { Printer, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/bilan/$eleveId")({
  component: BilanPage,
  head: () => ({
    meta: [
      { title: "Bilan de l'élève — ClasseScan" },
      { name: "description", content: "Bilan semestriel des points positifs et négatifs de l'élève." },
    ],
  }),
  notFoundComponent: () => (
    <AppShell title="Élève introuvable">
      <Link to="/" className="underline">Retour</Link>
    </AppShell>
  ),
});

function BilanPage() {
  const { eleveId } = Route.useParams();
  const eleve = useStore((s) => s.eleves.find((e) => e.id === eleveId));
  const classes = useStore((s) => s.classes);
  const observations = useStore((s) => s.observations);
  const appels = useStore((s) => s.appels);
  const retenues = useStore((s) => s.retenues);

  const semesters = useMemo(() => listSemesters(), []);
  const [semId, setSemId] = useState<string>(() => currentSemesterId());
  const sem = semesters.find((s) => s.id === semId) ?? semesters[0];

  const bilan = useMemo(
    () =>
      eleve
        ? computeBilan(eleve.id, sem.from, sem.to, { observations, appels, retenues })
        : null,
    [eleve, sem, observations, appels, retenues],
  );

  if (!eleve || !bilan) {
    return (
      <AppShell title="Élève introuvable">
        <Link to="/" className="underline">Retour</Link>
      </AppShell>
    );
  }

  const classe = classes.find((c) => c.id === eleve.classeId);

  const noteColor =
    bilan.note >= 14
      ? "text-emerald-600"
      : bilan.note >= 10
        ? "text-amber-500"
        : "text-rose-600";

  return (
    <AppShell
      title={`Bilan · ${eleve.prenom} ${eleve.nom}`}
      subtitle={classe?.nom}
      action={
        <Button size="sm" variant="secondary" className="gap-1 print:hidden" onClick={() => window.print()}>
          <Printer className="size-4" /> Imprimer
        </Button>
      }
    >
      <div className="print:hidden mb-3">
        <Button asChild size="sm" variant="ghost" className="gap-1">
          <Link to="/eleves/$eleveId" params={{ eleveId }}>
            <ArrowLeft className="size-4" /> Fiche élève
          </Link>
        </Button>
      </div>

      <div className="print:hidden mb-4">
        <label className="text-xs text-muted-foreground">Période</label>
        <Select value={semId} onValueChange={setSemId}>
          <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
          <SelectContent>
            {semesters.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 mb-4 text-center">
        <p className="text-sm text-muted-foreground">Note globale du semestre</p>
        <p className={`text-6xl font-black tabular-nums ${noteColor}`}>
          {bilan.note}
          <span className="text-2xl text-muted-foreground font-semibold"> /20</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {sem.label}
        </p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2">
            <p className="text-xl font-bold text-emerald-600">+{bilan.totalPositifs}</p>
            <p className="text-[10px] text-emerald-700/80">points positifs</p>
          </div>
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-2">
            <p className="text-xl font-bold text-rose-600">−{bilan.totalNegatifs}</p>
            <p className="text-[10px] text-rose-700/80">points négatifs</p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 mb-4">
        <h2 className="font-bold text-emerald-700 mb-2 flex items-center gap-2">
          <span className="text-2xl">✅</span> Points positifs
        </h2>
        {bilan.positifs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Aucun point positif enregistré sur la période.</p>
        ) : (
          <ul className="space-y-1.5">
            {bilan.positifs.map((l) => (
              <li key={l.key} className="flex items-center justify-between text-sm">
                <span>{l.label}</span>
                <span className="font-mono font-bold text-emerald-700">×{l.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-rose-500/40 bg-rose-500/5 p-4 mb-4">
        <h2 className="font-bold text-rose-700 mb-2 flex items-center gap-2">
          <span className="text-2xl">⚠️</span> Points négatifs
        </h2>
        {bilan.negatifs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Aucun point négatif enregistré sur la période.</p>
        ) : (
          <ul className="space-y-1.5">
            {bilan.negatifs.map((l) => (
              <li key={l.key} className="flex items-center justify-between text-sm">
                <span>{l.label}</span>
                <span className="font-mono font-bold text-rose-700">×{l.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="rounded-2xl border border-border bg-card p-4 mb-4 text-sm">
        <summary className="cursor-pointer font-semibold">📐 Barème utilisé</summary>
        <div className="mt-3 space-y-3 text-xs">
          <p className="text-muted-foreground">
            La note /20 est calculée à partir des points positifs et négatifs pondérés :
          </p>
          <p className="font-mono bg-muted p-2 rounded">
            note = 20 × (Σ positifs) / (Σ positifs + Σ négatifs)
          </p>
          <p className="text-muted-foreground">
            Sans observation, la note est neutre à 10/20. Les <b>absences</b> sont affichées à titre
            indicatif mais <b>ne comptent pas</b> dans la note.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-bold text-emerald-700 mb-1">Positifs (poids)</p>
              <ul className="space-y-0.5">
                <li>Interro juste : <b>+3</b></li>
                <li>Bon point 🌟 : <b>+2</b></li>
                <li>Exo fait maison : <b>+2</b></li>
                <li>Exo fait classe : <b>+1</b></li>
                <li>Interro partielle : <b>+1</b></li>
                <li>Classeur présent : <b>+1</b></li>
                <li>Aucun bavardage : <b>+1</b></li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-rose-700 mb-1">Négatifs (poids)</p>
              <ul className="space-y-0.5">
                <li>Retenue : <b>−4</b></li>
                <li>Exo non fait maison : <b>−3</b></li>
                <li>Beaucoup bavardages : <b>−3</b></li>
                <li>Comportement mauvais : <b>−3</b></li>
                <li>Exo non fait classe : <b>−2</b></li>
                <li>Interro fausse : <b>−2</b></li>
                <li>Oubli classeur : <b>−2</b></li>
                <li>Autres oublis : <b>−1</b></li>
                <li>Quelques bavardages : <b>−1</b></li>
              </ul>
            </div>
          </div>
          <p className="text-muted-foreground italic">
            Interprétation : ≥14/20 excellent · 10–13 moyen · &lt;10 à améliorer.
          </p>
        </div>
      </details>



      <details className="rounded-2xl border border-border bg-card p-4 mb-4">
        <summary className="cursor-pointer font-semibold text-sm">
          Détail chronologique ({bilan.timeline.length})
        </summary>
        {bilan.timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground italic mt-3">Aucun événement.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-xs">
            {bilan.timeline.map((t) => (
              <li key={`${t.kind}-${t.id}`} className="flex gap-2 items-start border-b border-border/50 pb-1">
                <span
                  className={`shrink-0 font-bold w-4 text-center ${
                    t.polarity === "+" ? "text-emerald-600" : t.polarity === "-" ? "text-rose-600" : "text-muted-foreground"
                  }`}
                >
                  {t.polarity}
                </span>
                <span className="shrink-0 text-muted-foreground font-mono">{t.date} {t.heure}</span>
                <span className="flex-1">{t.label}</span>
              </li>
            ))}
          </ul>
        )}
      </details>
    </AppShell>
  );
}
