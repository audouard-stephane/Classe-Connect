import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, countAbsences, fmtDate } from "@/lib/store";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/absences")({
  validateSearch: z.object({ appelId: z.string().optional() }),
  component: AbsencesPage,
  head: () => ({ meta: [{ title: "Absences — ClasseScan" }] }),
});

function AbsencesPage() {
  const { appelId } = Route.useSearch();
  const appels = useStore((s) => s.appels);
  const eleves = useStore((s) => s.eleves);
  const classes = useStore((s) => s.classes);
  const alerte = useStore((s) => s.settings.alerteAbsences);

  const [filtreClasse, setFiltreClasse] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [vue, setVue] = useState<"jour" | "total">(appelId ? "jour" : "total");

  const appelCible = appelId ? appels.find((a) => a.id === appelId) : null;
  const today = fmtDate();

  // List of absents (per current view)
  let lignes: { eleveId: string; meta: string }[] = [];
  if (vue === "jour") {
    const target = appelCible
      ? [appelCible]
      : appels.filter((a) => a.date === today);
    target.forEach((a) => {
      a.entries
        .filter((e) => e.presence === "absent")
        .forEach((e) =>
          lignes.push({
            eleveId: e.eleveId,
            meta: `${a.date} · ${a.heure} · ${classes.find((c) => c.id === a.classeId)?.nom ?? ""}`,
          }),
        );
    });
  } else {
    eleves.forEach((e) => {
      const n = countAbsences(e.id, appels);
      if (n > 0) lignes.push({ eleveId: e.id, meta: `${n} absence(s)` });
    });
    lignes.sort((a, b) => {
      const na = countAbsences(a.eleveId, appels);
      const nb = countAbsences(b.eleveId, appels);
      return nb - na;
    });
  }

  lignes = lignes.filter((l) => {
    const e = eleves.find((x) => x.id === l.eleveId);
    if (!e) return false;
    if (filtreClasse !== "all" && e.classeId !== filtreClasse) return false;
    if (
      search &&
      !`${e.nom} ${e.prenom}`.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <AppShell title="Absences">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setVue("jour")}
          className={`flex-1 py-2 rounded-full font-semibold ${vue === "jour" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}
        >
          {appelCible ? "Cet appel" : "Du jour"}
        </button>
        <button
          onClick={() => setVue("total")}
          className={`flex-1 py-2 rounded-full font-semibold ${vue === "total" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}
        >
          Total / élève
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <Select value={filtreClasse} onValueChange={setFiltreClasse}>
          <SelectTrigger className="h-11 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {lignes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {vue === "jour" ? "Aucune absence." : "Aucun élève absent enregistré."}
        </p>
      ) : (
        <ul className="space-y-2">
          {lignes.map((l, i) => {
            const e = eleves.find((x) => x.id === l.eleveId)!;
            const total = countAbsences(e.id, appels);
            const enAlerte = total >= alerte;
            return (
              <li key={`${l.eleveId}-${i}`}>
                <Link
                  to="/eleves/$eleveId"
                  params={{ eleveId: e.id }}
                  className="flex items-center justify-between bg-card border border-border rounded-xl p-3"
                >
                  <div>
                    <p className="font-bold flex items-center gap-2">
                      {e.prenom} {e.nom.charAt(0).toUpperCase()}.
                      {enAlerte && <AlertTriangle className="size-4 text-destructive" />}
                    </p>
                    <p className="text-xs text-muted-foreground">{l.meta}</p>
                  </div>
                  <span className="text-2xl font-bold text-destructive">{total}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
