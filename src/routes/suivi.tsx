import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { BookOpen, Home, School, MessageCircle, type LucideIcon } from "lucide-react";

export const Route = createFileRoute("/suivi")({
  component: SuiviHub,
  head: () => ({
    meta: [{ title: "Suivi sur le plan — ClasseScan" }],
  }),
});

type Rubrique = {
  key: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  colors: string;
  iconColor: string;
  to: "/verif-classeur/$classeId" | "/verif-travail/$classeId" | "/verif-travail-classe/$classeId" | "/bavardages/$classeId";
};

const RUBRIQUES: Rubrique[] = [
  {
    key: "classeur",
    label: "A son classeur",
    desc: "Vérifier le matériel",
    icon: BookOpen,
    colors: "bg-amber-50 border-amber-200 text-amber-950",
    iconColor: "text-amber-600",
    to: "/verif-classeur/$classeId",
  },
  {
    key: "travail-maison",
    label: "Travail à la maison",
    desc: "Devoirs faits / non faits",
    icon: Home,
    colors: "bg-emerald-50 border-emerald-200 text-emerald-950",
    iconColor: "text-emerald-600",
    to: "/verif-travail/$classeId",
  },
  {
    key: "travail-classe",
    label: "Travail en classe",
    desc: "Suivi pendant la séance",
    icon: School,
    colors: "bg-sky-50 border-sky-200 text-sky-950",
    iconColor: "text-sky-600",
    to: "/verif-travail-classe/$classeId",
  },
  {
    key: "bavardages",
    label: "Bavardages",
    desc: "Comportement en classe",
    icon: MessageCircle,
    colors: "bg-rose-50 border-rose-200 text-rose-950",
    iconColor: "text-rose-600",
    to: "/bavardages/$classeId",
  },
];

function SuiviHub() {
  const allClasses = useStore((s) => s.classes);
  const classes = useMemo(
    () => allClasses.filter((c) => c.source !== "edt"),
    [allClasses],
  );
  const [classeId, setClasseId] = useState("");
  const navigate = useNavigate();

  return (
    <AppShell title="Suivi sur le plan" subtitle="Choisissez une classe puis une rubrique">
      <div className="rounded-2xl bg-card border border-border p-4 mb-4">
        <p className="font-semibold mb-2">Classe</p>
        <Select value={classeId} onValueChange={setClasseId}>
          <SelectTrigger className="h-14 text-base">
            <SelectValue placeholder="Sélectionner une classe" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {RUBRIQUES.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.key}
              disabled={!classeId}
              onClick={() =>
                navigate({ to: r.to, params: { classeId } })
              }
              className={`rounded-2xl border p-4 tap-lg flex items-center gap-3 text-left transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${r.colors}`}
            >
              <Icon className={`size-9 ${r.iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg">{r.label}</p>
                <p className="text-xs opacity-80">{r.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {!classeId && (
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Sélectionnez une classe pour activer les rubriques.
        </p>
      )}

      <p className="mt-6 text-xs text-muted-foreground text-center">
        Toutes les rubriques utilisent le plan de classe et le dernier appel.
      </p>
    </AppShell>
  );
}
