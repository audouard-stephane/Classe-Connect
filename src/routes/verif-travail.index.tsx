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
import { CheckCheck } from "lucide-react";

export const Route = createFileRoute("/verif-travail/")({
  component: VerifTravailLanding,
  head: () => ({
    meta: [{ title: "Vérification du travail — ClasseScan" }],
  }),
});

function VerifTravailLanding() {
  const allClasses = useStore((s) => s.classes);
  const classes = useMemo(() => allClasses.filter((c) => c.source !== "edt"), [allClasses]);
  const [classeId, setClasseId] = useState("");
  const navigate = useNavigate();

  return (
    <AppShell
      title="Vérification du travail"
      subtitle="Choisissez une classe"
    >
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

      <Button
        disabled={!classeId}
        className="w-full h-16 rounded-2xl text-lg"
        onClick={() =>
          navigate({
            to: "/verif-travail/$classeId",
            params: { classeId },
          })
        }
      >
        <CheckCheck className="size-6" /> Ouvrir le plan
      </Button>
    </AppShell>
  );
}