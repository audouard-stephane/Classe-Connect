import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, countAbsences } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Upload, Download, Trash2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { downloadCSV, importAeshCSV, importEdtCSV, importElevesCSV, importPronoteElevesCSV } from "@/lib/csv";

export const Route = createFileRoute("/import-export")({
  component: ImportExportPage,
  head: () => ({ meta: [{ title: "Import / Export — ClasseScan" }] }),
});

function ImportExportPage() {
  const state = useStore();
  const refEleves = useRef<HTMLInputElement>(null);
  const refPronote = useRef<HTMLInputElement>(null);
  const refEdt = useRef<HTMLInputElement>(null);
  const refAesh = useRef<HTMLInputElement>(null);

  const handleImport = async (file: File | undefined, fn: (f: File) => Promise<any>, label: string) => {
    if (!file) return;
    try {
      const r = await fn(file);
      toast.success(`Import ${label} : ${JSON.stringify(r)}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : `${e}`;
      toast.error(`Erreur import ${label} : ${message}`);
      console.error(e);
    }
  };

  const exportEleves = () => {
    downloadCSV(
      "eleves.csv",
      state.eleves.map((e) => ({
        classe: state.classes.find((c) => c.id === e.classeId)?.nom ?? "",
        nom: e.nom,
        prenom: e.prenom,
        qr: e.qrCode,
        aesh: (() => {
          const a = state.aeshs.find((x) => x.id === e.aeshId);
          return a ? `${a.prenom} ${a.nom}` : "";
        })(),
        absences: countAbsences(e.id, state.appels),
      })),
    );
  };

  const exportAppels = () => {
    const rows: any[] = [];
    state.appels.forEach((a) => {
      const c = state.classes.find((x) => x.id === a.classeId)?.nom ?? "";
      a.entries.forEach((e) => {
        const el = state.eleves.find((x) => x.id === e.eleveId);
        rows.push({ date: a.date, heure: a.heure, classe: c, eleve: el ? `${el.prenom} ${el.nom}` : "", presence: e.presence });
      });
    });
    downloadCSV("appels.csv", rows);
  };

  const exportAbsences = () => {
    const rows: any[] = [];
    state.appels.forEach((a) => {
      const c = state.classes.find((x) => x.id === a.classeId)?.nom ?? "";
      a.entries
        .filter((e) => e.presence === "absent")
        .forEach((e) => {
          const el = state.eleves.find((x) => x.id === e.eleveId);
          rows.push({ date: a.date, heure: a.heure, classe: c, eleve: el ? `${el.prenom} ${el.nom}` : "" });
        });
    });
    downloadCSV("absences.csv", rows);
  };

  const exportObservations = () => {
    downloadCSV(
      "observations.csv",
      state.observations.map((o) => {
        const e = state.eleves.find((x) => x.id === o.eleveId);
        return {
          date: o.date,
          heure: o.heure,
          classe: state.classes.find((c) => c.id === o.classeId)?.nom ?? "",
          eleve: e ? `${e.prenom} ${e.nom}` : "",
          comportement: o.comportement ?? "",
          materiel: o.materiel ?? "",
          travail: o.travail ?? "",
          note: o.note ?? "",
        };
      }),
    );
  };

  const exportOublis = () => {
    downloadCSV(
      "oublis_materiel.csv",
      state.observations
        .filter((o) => o.materiel === "oubli")
        .map((o) => {
          const e = state.eleves.find((x) => x.id === o.eleveId);
          return { date: o.date, heure: o.heure, eleve: e ? `${e.prenom} ${e.nom}` : "", note: o.note ?? "" };
        }),
    );
  };

  const exportTravaux = () => {
    downloadCSV(
      "travaux_non_faits.csv",
      state.observations
        .filter((o) => o.travail === "non_fait" || o.travail === "partiel")
        .map((o) => {
          const e = state.eleves.find((x) => x.id === o.eleveId);
          return { date: o.date, heure: o.heure, eleve: e ? `${e.prenom} ${e.nom}` : "", travail: o.travail, note: o.note ?? "" };
        }),
    );
  };

  const exportAesh = () => {
    downloadCSV(
      "aesh.csv",
      state.aeshs.map((a) => ({
        nom: a.nom,
        prenom: a.prenom,
        email: a.email ?? "",
        telephone: a.telephone ?? "",
        classes: a.classeIds.map((id) => state.classes.find((c) => c.id === id)?.nom).join(" | "),
        eleves: a.eleveIds
          .map((id) => {
            const e = state.eleves.find((x) => x.id === id);
            return e ? `${e.prenom} ${e.nom}` : "";
          })
          .join(" | "),
      })),
    );
  };

  const exportEdt = () => {
    downloadCSV(
      "emploi_du_temps.csv",
      state.cours.map((c) => ({
        jour: c.jour,
        heure_debut: c.heureDebut,
        heure_fin: c.heureFin,
        classe: state.classes.find((x) => x.id === c.classeId)?.nom ?? "",
        salle: c.salle,
      })),
    );
  };

  return (
    <AppShell title="Import / Export" subtitle="CSV">
      <section className="mb-5">
        <h2 className="font-bold text-lg mb-2">Importer</h2>
        <div className="space-y-2">
          <ImportRow
            label="Élèves (classe,nom,prenom)"
            inputRef={refEleves}
            onFile={(f) => handleImport(f, importElevesCSV, "élèves")}
          />
          <ImportRow
            label="Élèves — export Pronote (une classe entière)"
            inputRef={refPronote}
            onFile={(f) => {
              if (!f) return;
              const nom = prompt("Nom de la classe pour ces élèves ?");
              if (!nom || !nom.trim()) {
                toast.error("Import annulé : nom de classe requis");
                return;
              }
              handleImport(f, (file) => importPronoteElevesCSV(file, nom.trim()), "Pronote");
            }}
          />
          <ImportRow
            label="Emploi du temps (jour,heure_debut,heure_fin,classe,salle)"
            inputRef={refEdt}
            onFile={(f) => handleImport(f, importEdtCSV, "EDT")}
          />
          <ImportRow
            label="AESH (nom,prenom,classe,eleve)"
            inputRef={refAesh}
            onFile={(f) => handleImport(f, importAeshCSV, "AESH")}
          />
        </div>
      </section>

      <section className="mb-5">
        <h2 className="font-bold text-lg mb-2">Exporter</h2>
        <div className="grid grid-cols-2 gap-2">
          <ExportBtn onClick={exportEleves}>Élèves</ExportBtn>
          <ExportBtn onClick={exportAppels}>Appels</ExportBtn>
          <ExportBtn onClick={exportAbsences}>Absences</ExportBtn>
          <ExportBtn onClick={exportObservations}>Observations</ExportBtn>
          <ExportBtn onClick={exportOublis}>Oublis matériel</ExportBtn>
          <ExportBtn onClick={exportTravaux}>Travaux</ExportBtn>
          <ExportBtn onClick={exportAesh}>AESH</ExportBtn>
          <ExportBtn onClick={exportEdt}>Emploi du temps</ExportBtn>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-bold text-lg mb-2 text-destructive">Zone dangereuse</h2>
        <Button
          variant="ghost"
          className="text-destructive w-full tap-lg"
          onClick={() => {
            if (confirm("Effacer TOUTES les données ? Cette action est irréversible.")) {
              state.resetAll();
              toast.success("Données effacées");
            }
          }}
        >
          <Trash2 className="size-4" /> Effacer toutes les données
        </Button>
      </section>
    </AppShell>
  );
}

function ImportRow({
  label,
  inputRef,
  onFile,
}: {
  label: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File | undefined) => void;
}) {
  return (
    <button
      onClick={() => inputRef.current?.click()}
      className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3 tap-lg active:bg-muted text-left"
    >
      <Upload className="size-5 text-primary" />
      <span className="text-sm flex-1">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </button>
  );
}

function ExportBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <Button variant="secondary" onClick={onClick} className="tap-lg h-auto py-3 rounded-xl flex-col">
      <Download className="size-5" />
      <span className="text-xs">{children}</span>
    </Button>
  );
}
