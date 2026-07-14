import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, countAbsences, chargerClassesDepuisServeur } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClasse } from "@/services/api/classes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { Plus, ChevronRight, AlertTriangle, Settings2, FileSpreadsheet, GraduationCap, ClipboardList, QrCode, ScanLine, Trash2, Pencil, CheckCheck, BookOpen } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Accueil — ClasseScan" },
      { name: "description", content: "Liste des classes et accès rapide à l'appel." },
    ],
  }),
});

function HomePage() {
  const allClasses = useStore((s) => s.classes);
  const classes = allClasses.filter((c) => c.source !== "edt");
  const edtClasses = useMemo(
    () =>
      allClasses
        .filter((c) => c.source === "edt")
        .slice()
        .sort((a, b) => a.nom.localeCompare(b.nom, "fr", { numeric: true, sensitivity: "base" })),
    [allClasses],
  );

  const eleves = useStore((s) => s.eleves);
  const appels = useStore((s) => s.appels);
  const alerte = useStore((s) => s.settings.alerteAbsences);
  const setAlerte = useStore((s) => s.setAlerte);
  const addClasse = useStore((s) => s.addClasse);
  const deleteClasse = useStore((s) => s.deleteClasse);
  const updateClasse = useStore((s) => s.updateClasse);

  const [openNew, setOpenNew] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [nom, setNom] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editG1, setEditG1] = useState("");
  const [editG2, setEditG2] = useState("");
  const [editAlias1, setEditAlias1] = useState<string>("");
  const [editAlias2, setEditAlias2] = useState<string>("");
  const navigate = useNavigate();

  const elevesEnAlerte = eleves.filter((e) => countAbsences(e.id, appels) >= alerte);

  return (
    <AppShell
      title="Mes classes"
      subtitle={`${classes.length} classe${classes.length > 1 ? "s" : ""} · ${eleves.length} élèves`}
      action={
        <Button
          variant="secondary"
          size="icon"
          className="size-11 rounded-full"
          onClick={() => setOpenSettings(true)}
          aria-label="Paramètres"
        >
          <Settings2 className="size-6" />
        </Button>
      }
    >
      {elevesEnAlerte.length > 0 && (
        <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/30 p-3 flex gap-3">
          <AlertTriangle className="text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-destructive">
              {elevesEnAlerte.length} élève(s) ont atteint {alerte} absences
            </p>
            <Link to="/absences" className="underline text-destructive">
              Voir les absences
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link
          to="/scan"
          className="rounded-2xl bg-primary text-primary-foreground p-4 tap-lg flex flex-col gap-1 shadow-sm active:scale-[0.98] transition"
        >
          <ClipboardList className="size-9" />
          <span className="font-bold text-lg">Appel rapide</span>
          <span className="text-xs opacity-80">Via le plan de classe</span>
        </Link>

        <Link
          to="/import-export"
          className="rounded-2xl bg-accent text-accent-foreground p-4 tap-lg flex flex-col gap-1 shadow-sm active:scale-[0.98] transition"
        >
          <FileSpreadsheet className="size-9" />
          <span className="font-bold text-lg">CSV</span>
          <span className="text-xs opacity-80">Import / Export</span>
        </Link>
      </div>

      <Link
        to="/scan-eleve"
        className="mb-3 rounded-2xl bg-primary/10 border border-primary/30 text-foreground p-4 tap-lg flex items-center gap-3 active:scale-[0.98] transition"
      >
        <ScanLine className="size-9 text-primary" />
        <div className="flex-1">
          <p className="font-bold text-lg">Scanner un élève</p>
          <p className="text-xs text-muted-foreground">Ouvre directement sa fiche</p>
        </div>
        <ChevronRight />
      </Link>

      <Link
        to="/qr-codes"
        className="mb-3 rounded-2xl bg-secondary text-secondary-foreground p-4 tap-lg flex items-center gap-3 shadow-sm active:scale-[0.98] transition"
      >
        <QrCode className="size-9" />
        <div className="flex-1">
          <p className="font-bold text-lg">QR codes de tous les élèves</p>
          <p className="text-xs opacity-80">Générer et imprimer</p>
        </div>
        <ChevronRight />
      </Link>

      <Link
        to="/verif-travail"
        className="mb-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 p-4 tap-lg flex items-center gap-3 active:scale-[0.98] transition"
      >
        <CheckCheck className="size-9 text-emerald-600" />
        <div className="flex-1">
          <p className="font-bold text-lg">Vérification du travail</p>
          <p className="text-xs opacity-80">Sur le plan · d'après le dernier appel</p>
        </div>
        <ChevronRight />
      </Link>

      <Link
        to="/verif-classeur"
        className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 p-4 tap-lg flex items-center gap-3 active:scale-[0.98] transition"
      >
        <BookOpen className="size-9 text-amber-600" />
        <div className="flex-1">
          <p className="font-bold text-lg">A son classeur</p>
          <p className="text-xs opacity-80">Sur le plan · d'après le dernier appel</p>
        </div>
        <ChevronRight />
      </Link>


      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-lg">Classes</h2>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full">
              <Plus className="size-4" />
              Nouvelle classe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle classe</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Ex. 4E"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              autoFocus
              className="h-12 text-base"
            />
            <DialogFooter>
              <Button
                className="tap-lg w-full"
                onClick={async () => {
                  if (!nom.trim()) return;
                  const c = await createClasse(nom);
                  await chargerClassesDepuisServeur();
                  setNom("");
                  setOpenNew(false);
                  navigate({ to: "/classes/$classeId", params: { classeId: c.id } });
                }}
              >
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-border">
          <GraduationCap className="size-14 mx-auto text-muted-foreground mb-2" />
          <p className="font-semibold">Aucune classe pour le moment</p>
          <p className="text-sm text-muted-foreground mb-4">
            Créez votre première classe ou importez un CSV.
          </p>
          <Button onClick={() => setOpenNew(true)}>Créer une classe</Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {classes.flatMap((c) => {
            const list = eleves.filter((e) => e.classeId === c.id);
            const n = list.length;
            const n1 = list.filter((e) => e.groupe === 1).length;
            const n2 = list.filter((e) => e.groupe === 2).length;
            const rows: {
              key: string;
              label: string;
              count: number;
              groupe?: 1 | 2;
              accent?: boolean;
            }[] = [{ key: `${c.id}-all`, label: c.nom, count: n }];
            if (n1 > 0) rows.push({ key: `${c.id}-g1`, label: c.groupe1Nom?.trim() || "Grp 1", count: n1, groupe: 1, accent: true });
            if (n2 > 0) rows.push({ key: `${c.id}-g2`, label: c.groupe2Nom?.trim() || "Grp 2", count: n2, groupe: 2, accent: true });
            return rows.map((r) => (
              <li key={r.key} className="relative">
                <Link
                  to="/classes/$classeId"
                  params={{ classeId: c.id }}
                  search={{ groupe: r.groupe }}
                  className={`flex items-center justify-between border rounded-2xl p-4 tap-lg transition ${
                    r.accent
                      ? "bg-primary/5 border-primary/20 active:bg-primary/10 ml-4"
                      : "bg-card border-border active:bg-muted"
                  }`}
                >
                  <div className="min-w-0 pr-10">
                    <p className={`font-bold truncate ${r.accent ? "text-base" : "text-lg"}`}>
                      {r.label}
                    </p>
                    <p className="text-sm text-muted-foreground">{r.count} élève(s)</p>
                  </div>
                  <ChevronRight className="text-muted-foreground shrink-0" />
                </Link>
                {!r.accent && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-12 size-8 bg-background/80 backdrop-blur"
                    aria-label="Renommer"
                    onClick={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      setEditNom(c.nom);
                      setEditG1(c.groupe1Nom ?? "");
                      setEditG2(c.groupe2Nom ?? "");
                      setEditAlias1(c.alias1 ?? "");
                      setEditAlias2(c.alias2 ?? "");
                      setEditingId(c.id);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
              </li>
            ));
          })}
        </ul>
      )}

      <Dialog open={openSettings} onOpenChange={(v) => { setOpenSettings(v); if (!v) setConfirmDeleteAll(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paramètres</DialogTitle>
          </DialogHeader>
          {!confirmDeleteAll ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Alerte au-delà de
                </label>
                <Select value={String(alerte)} onValueChange={(v) => setAlerte(Number(v) as 3 | 5 | 10)}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 absences</SelectItem>
                    <SelectItem value="5">5 absences</SelectItem>
                    <SelectItem value="10">10 absences</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4 border-t border-border">
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={classes.length === 0}
                  onClick={() => setConfirmDeleteAll(true)}
                >
                  <Trash2 className="size-4 mr-2" />
                  Effacer toutes les classes
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Êtes-vous sûr de vouloir supprimer toutes les classes ? Cela supprimera également les élèves et les cours associés.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmDeleteAll(false)}>
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    classes.forEach((c) => deleteClasse(c.id));
                    setConfirmDeleteAll(false);
                    setOpenSettings(false);
                  }}
                >
                  Confirmer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingId} onOpenChange={(o) => !o && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer la classe</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nom de la classe</label>
              <Input value={editNom} onChange={(e) => setEditNom(e.target.value)} className="h-12" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nom du Groupe 1</label>
              <Input
                value={editG1}
                onChange={(e) => setEditG1(e.target.value)}
                placeholder="Groupe 1"
                className="h-12"
              />
              <label className="text-xs font-semibold text-muted-foreground mt-2 block">
                Correspondance EDT (Groupe 1)
              </label>
              <Select
                value={editAlias1 || "__none__"}
                onValueChange={(v) => setEditAlias1(v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucune</SelectItem>
                  {edtClasses.map((ec) => (
                    <SelectItem key={ec.id} value={ec.nom}>
                      {ec.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nom du Groupe 2</label>
              <Input
                value={editG2}
                onChange={(e) => setEditG2(e.target.value)}
                placeholder="Groupe 2"
                className="h-12"
              />
              <label className="text-xs font-semibold text-muted-foreground mt-2 block">
                Correspondance EDT (Groupe 2)
              </label>
              <Select
                value={editAlias2 || "__none__"}
                onValueChange={(v) => setEditAlias2(v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucune</SelectItem>
                  {edtClasses.map((ec) => (
                    <SelectItem key={ec.id} value={ec.nom}>
                      {ec.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full tap-lg"
              onClick={() => {
                if (!editingId) return;
                if (!editNom.trim()) return;
                updateClasse(editingId, {
                  nom: editNom.trim(),
                  groupe1Nom: editG1.trim() || undefined,
                  groupe2Nom: editG2.trim() || undefined,
                  alias1: editAlias1.trim() || undefined,
                  alias2: editAlias2.trim() || undefined,
                });
                setEditingId(null);
              }}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
