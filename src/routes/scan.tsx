import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList, MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/scan")({
  component: ScanLanding,
  head: () => ({ meta: [{ title: "Appel rapide — ClasseScan" }] }),
});

function ScanLanding() {
  const allClasses = useStore((s) => s.classes);
  const classes = useMemo(() => allClasses.filter((c) => c.source !== "edt"), [allClasses]);
  const [classeId, setClasseId] = useState("");
  const navigate = useNavigate();

  return (
    <AppShell title="Appel rapide" subtitle="Choisissez une classe">
      <div className="rounded-2xl bg-card border border-border p-4 mb-4">
        <p className="font-semibold mb-2">Classe</p>
        <Select value={classeId} onValueChange={setClasseId}>
          <SelectTrigger className="h-14 text-base">
            <SelectValue placeholder="Sélectionner une classe" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        disabled={!classeId}
        className="w-full tap-lg h-16 text-lg rounded-2xl"
        onClick={() =>
          navigate({ to: "/appel-plan/$classeId", params: { classeId } })
        }
      >
        <MapPin className="size-6" /> Ouvrir le plan de classe
      </Button>

      {classes.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList className="size-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Créez d'abord une classe.</p>
        </div>
      )}
    </AppShell>
  );
}
