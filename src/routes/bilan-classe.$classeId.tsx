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
import { computeBilan, listSemesters, currentSemesterId } from "@/lib/bilan";
import { downloadCSV } from "@/lib/csv";
import { Download, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/bilan-classe/$classeId")({
  component: BilanClassePage,
  head: () => ({
    meta: [
      { title: "Bilan de la classe — ClasseScan" },
      { name: "description", content: "Bilan semestriel de tous les élèves de la classe." },
    ],
  }),
  notFoundComponent: () => (
    <AppShell title="Classe introuvable">
      <Link to="/" className="underline">Retour</Link>
    </AppShell>
  ),
});

type SortKey = "nom" | "note" | "positifs" | "negatifs";

function BilanClassePage() {
  const { classeId } = Route.useParams();
  const classe = useStore((s) => s.classes.find((c) => c.id === classeId && c.source !== "edt"));
  const eleves = useStore((s) => s.eleves);
  const observations = useStore((s) => s.observations);
  const appels = useStore((s) => s.appels);
  const retenues = useStore((s) => s.retenues);


  const semesters = useMemo(() => listSemesters(), []);
  const [semId, setSemId] = useState<string>(() => currentSemesterId());
  const [sortKey, setSortKey] = useState<SortKey>("nom");
  const sem = semesters.find((s) => s.id === semId) ?? semesters[0];

  const rows = useMemo(() => {
    const list = eleves
      .filter((e) => e.classeId === classeId)
      .map((e) => {
        const b = computeBilan(e.id, sem.from, sem.to, { observations, appels, retenues });
        const absencesLine = b.timeline.filter((t) => t.kind === "absence").length;
        return { eleve: e, bilan: b, absences: absencesLine };
      });
    list.sort((a, b) => {
      switch (sortKey) {
        case "note":
          return b.bilan.note - a.bilan.note;
        case "positifs":
          return b.bilan.totalPositifs - a.bilan.totalPositifs;
        case "negatifs":
          return b.bilan.totalNegatifs - a.bilan.totalNegatifs;
        default:
          return `${a.eleve.nom} ${a.eleve.prenom}`.localeCompare(
            `${b.eleve.nom} ${b.eleve.prenom}`,
          );
      }
    });
    return list;
  }, [eleves, classeId, sem, observations, appels, retenues, sortKey]);

  if (!classe) {
    return (
      <AppShell title="Classe introuvable">
        <Link to="/" className="underline">Retour</Link>
      </AppShell>
    );
  }

  const moyenne =
    rows.length === 0
      ? 0
      : Math.round((rows.reduce((s, r) => s + r.bilan.note, 0) / rows.length) * 10) / 10;

  const exportCSV = () => {
    const data = rows.map((r) => {
      const posMap: Record<string, number> = {};
      for (const p of r.bilan.positifs) posMap[p.label] = p.count;
      const negMap: Record<string, number> = {};
      for (const n of r.bilan.negatifs) negMap[n.label] = n.count;
      return {
        Nom: r.eleve.nom,
        Prénom: r.eleve.prenom,
        Classe: classe.nom,
        Période: sem.label,
        "Note /20": r.bilan.note,
        "Points positifs (total pondéré)": r.bilan.totalPositifs,
        "Points négatifs (total pondéré)": r.bilan.totalNegatifs,
        Absences: r.absences,
        "Exos faits maison": posMap["Exercices faits à la maison"] ?? 0,
        "Exos faits classe": posMap["Exercices faits en classe"] ?? 0,
        "Interros justes": posMap["Interrogations réussies"] ?? 0,
        "Interros partielles": posMap["Interrogations partiellement justes"] ?? 0,
        "Bons points": posMap["Bons points 🌟 (photos d'exercice)"] ?? 0,
        "Classeur présent": posMap["Classeur présent"] ?? 0,
        "Aucun bavardage": posMap["Cours sans bavardage"] ?? 0,
        "Exos non faits maison": negMap["Exercices non faits à la maison"] ?? 0,
        "Exos non faits classe": negMap["Exercices non faits en classe"] ?? 0,
        "Interros fausses": negMap["Interrogations fausses"] ?? 0,
        "Oublis classeur": negMap["Oublis de classeur"] ?? 0,
        "Autres oublis": negMap["Oublis de matériel"] ?? 0,
        "Quelques bavardages": negMap["Quelques bavardages"] ?? 0,
        "Beaucoup bavardages": negMap["Beaucoup de bavardages"] ?? 0,
        Retenues: negMap["Retenues"] ?? 0,
      };
    });
    const safe = classe.nom.replace(/[^\w-]+/g, "_");
    downloadCSV(`bilan_${safe}_${sem.id}.csv`, data);
  };

  return (
    <AppShell
      title={`Bilan classe · ${classe.nom}`}
      subtitle={`${rows.length} élève${rows.length > 1 ? "s" : ""} · moy. ${moyenne}/20`}
      action={
        <Button size="sm" variant="secondary" onClick={exportCSV} className="gap-1">
          <Download className="size-4" /> CSV
        </Button>
      }
    >
      <div className="mb-3">
        <Button asChild size="sm" variant="ghost" className="gap-1">
          <Link to="/classes/$classeId" params={{ classeId }}>
            <ArrowLeft className="size-4" /> Retour à la classe
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <label className="text-xs text-muted-foreground">Période</label>
          <Select value={semId} onValueChange={setSemId}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {semesters.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Trier par</label>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nom">Nom</SelectItem>
              <SelectItem value="note">Note (décroissante)</SelectItem>
              <SelectItem value="positifs">Points positifs</SelectItem>
              <SelectItem value="negatifs">Points négatifs</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Aucun élève dans cette classe.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ eleve, bilan, absences }) => {
            const color =
              bilan.note >= 14
                ? "text-emerald-600"
                : bilan.note >= 10
                  ? "text-amber-500"
                  : "text-rose-600";
            return (
              <li key={eleve.id}>
                <Link
                  to="/bilan/$eleveId"
                  params={{ eleveId: eleve.id }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-accent/50 transition"
                >
                  <div className={`text-3xl font-black tabular-nums w-14 text-center ${color}`}>
                    {bilan.note}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {eleve.prenom} <span className="uppercase">{eleve.nom}</span>
                    </p>
                    <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="text-emerald-700">+{bilan.totalPositifs}</span>
                      <span className="text-rose-700">−{bilan.totalNegatifs}</span>
                      {absences > 0 && <span>· {absences} abs.</span>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
