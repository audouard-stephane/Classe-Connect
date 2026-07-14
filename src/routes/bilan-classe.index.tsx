import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { BarChart3, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/bilan-classe/")({
  component: BilanClasseIndex,
  head: () => ({
    meta: [
      { title: "Bilan des classes — ClasseScan" },
      { name: "description", content: "Choisir une classe pour voir son bilan semestriel." },
    ],
  }),
});

function BilanClasseIndex() {
  const classes = useStore((s) => s.classes.filter((c) => c.source !== "edt"));
  const eleves = useStore((s) => s.eleves);


  return (
    <AppShell title="Bilan" subtitle="Choisir une classe">
      {classes.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Aucune classe. Créez une classe pour voir son bilan.
        </p>
      ) : (
        <ul className="space-y-2">
          {classes.map((c) => {
            const n = eleves.filter((e) => e.classeId === c.id).length;
            return (
              <li key={c.id}>
                <Link
                  to="/bilan-classe/$classeId"
                  params={{ classeId: c.id }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-accent/50 transition"
                >
                  <div className="rounded-xl bg-emerald-500/15 text-emerald-600 p-3">
                    <BarChart3 className="size-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{c.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      {n} élève{n > 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
