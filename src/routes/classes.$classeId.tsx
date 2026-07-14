import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteClasseServeur } from "@/services/api/classes";
import {
  chargerClassesDepuisServeur,
  chargerElevesDepuisServeur,
} from "@/lib/store";
import {
  createEleve,
  deleteEleveServeur,
} from "@/services/api/eleves";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  ScanLine,
  Trash2,
  Pencil,
  Download,
  Printer,
  Users,
  FolderOpen,
  Grid3x3,
  MapPin,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/csv";
import { countAbsences } from "@/lib/store";
import QRCode from "qrcode";
import {
  gardeDocumentHTML,
  gardePageHTML,
  gardeClassePageHTML,
  gardeQrPayload,
  gardeSchoolYear,
} from "@/lib/garde-template";

export const Route = createFileRoute("/classes/$classeId")({
  validateSearch: z.object({
    groupe: z.union([z.literal(1), z.literal(2)]).optional(),
  }),
  component: ClassePage,
});


function schoolYear(): string {
  const d = new Date();
  const y = d.getFullYear();
  return d.getMonth() >= 7 ? `${y} – ${y + 1}` : `${y - 1} – ${y}`;
}

function ClassePage() {
  const { classeId } = Route.useParams();
  const { groupe: groupeSearch } = Route.useSearch();
  const allClasses = useStore((s) => s.classes);
  const allEleves = useStore((s) => s.eleves);
  const allAeshs = useStore((s) => s.aeshs);
  const classe = useMemo(
    () => allClasses.find((c) => c.id === classeId),
    [allClasses, classeId],
  );
  const eleves = useMemo(
    () => allEleves.filter((e) => e.classeId === classeId),
    [allEleves, classeId],
  );
  const aeshsAssocies = useMemo(
    () => allAeshs.filter((a) => a.classeIds.includes(classeId)),
    [allAeshs, classeId],
  );
  const addEleve = useStore((s) => s.addEleve);
  const updateEleve = useStore((s) => s.updateEleve);
  const deleteEleve = useStore((s) => s.deleteEleve);
  const deleteClasse = useStore((s) => s.deleteClasse);
  const updateClasse = useStore((s) => s.updateClasse);
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");

  const [editingClasse, setEditingClasse] = useState(false);
  const [editNom, setEditNom] = useState("");
  const [editAlias1, setEditAlias1] = useState("");
  const [editAlias2, setEditAlias2] = useState("");
  const [editG1Nom, setEditG1Nom] = useState("");
  const [editG2Nom, setEditG2Nom] = useState("");

  const [editEleveId, setEditEleveId] = useState<string | null>(null);
  const [eNom, setENom] = useState("");
  const [ePrenom, setEPrenom] = useState("");

  const [groupeFilter, setGroupeFilter] = useState<"all" | 1 | 2>(groupeSearch ?? "all");
  useEffect(() => {
    setGroupeFilter(groupeSearch ?? "all");
  }, [groupeSearch]);
  useEffect(() => {
    chargerElevesDepuisServeur().catch(console.error);
  }, []);
  const sortedEleves = useMemo(
    () =>
      eleves
        .filter((e) =>
          groupeFilter === "all" ? true : e.groupe === groupeFilter,
        )
        .slice()
        .sort((a, b) => a.nom.localeCompare(b.nom)),
    [eleves, groupeFilter],
  );

  const countG1 = useMemo(() => eleves.filter((e) => e.groupe === 1).length, [eleves]);
  const countG2 = useMemo(() => eleves.filter((e) => e.groupe === 2).length, [eleves]);


  if (!classe) {
    return (
      <AppShell title="Classe introuvable">
        <Link to="/" className="underline">Retour</Link>
      </AppShell>
    );
  }

  const annee = schoolYear();

  const printPages = async (list: typeof sortedEleves) => {
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Autorisez les popups pour imprimer");
      return;
    }
    const pages: string[] = [];
    for (const e of list) {
      const qr = await QRCode.toDataURL(
        gardeQrPayload(classe.nom, e.nom, e.prenom),
        { width: 600, margin: 1 },
      );
      pages.push(
        gardePageHTML(
          { prenom: e.prenom, nom: e.nom, classe: classe.nom, qrDataUrl: qr },
          annee,
        ),
      );
    }
    w.document.write(gardeDocumentHTML(`Pages de garde — ${classe.nom}`, pages.join("")));
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  const printFeuilleClasse = async () => {
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Autorisez les popups pour imprimer");
      return;
    }
    const rows = await Promise.all(
      sortedEleves.map(async (e) => ({
        prenom: e.prenom,
        nom: e.nom,
        qrDataUrl: await QRCode.toDataURL(
          gardeQrPayload(classe.nom, e.nom, e.prenom),
          { width: 400, margin: 1 },
        ),
      })),
    );
    const anneeCourt = gardeSchoolYear();
    w.document.write(
      gardeDocumentHTML(
        `Feuille de classe — ${classe.nom}`,
        gardeClassePageHTML(classe.nom, rows, anneeCourt),
      ),
    );
    w.document.close();
    setTimeout(() => w.print(), 600);
  };


  return (
    <AppShell
      title={classe.nom}
      subtitle={`${eleves.length} élève(s)`}
      action={
        <Button
          variant="secondary"
          size="icon"
          className="size-11 rounded-full"
          onClick={async () => {
            setEditNom(classe.nom);
            setEditAlias1(classe.alias1 ?? "");
            setEditAlias2(classe.alias2 ?? "");
            setEditG1Nom(classe.groupe1Nom ?? "");
            setEditG2Nom(classe.groupe2Nom ?? "");
            setEditingClasse(true);
          }}
          aria-label="Modifier"
        >
          <Pencil className="size-5" />
        </Button>
      }
    >
      <div className="mb-4 grid grid-cols-3 gap-2 p-1 bg-muted rounded-2xl">
        {([
          ["all", `Classe entière (${eleves.length})`],
          [1, `${classe.groupe1Nom?.trim() || "Groupe 1"} (${countG1})`],
          [2, `${classe.groupe2Nom?.trim() || "Groupe 2"} (${countG2})`],
        ] as const).map(([val, label]) => (
          <button
            key={String(val)}
            onClick={() => setGroupeFilter(val)}
            className={`text-xs font-semibold rounded-xl px-2 py-2 tap-lg transition ${
              groupeFilter === val
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button asChild className="tap-lg h-auto py-4 flex-col gap-1 rounded-2xl">
          <Link
            to="/appel/$classeId"
            params={{ classeId }}
            search={{ groupe: groupeFilter === "all" ? undefined : groupeFilter }}
          >
            <ScanLine className="size-6" />
            <span className="font-bold">Faire l'appel</span>
            <span className="text-[10px] opacity-80">
              {groupeFilter === "all"
                ? "Classe entière"
                : groupeFilter === 1
                  ? classe.groupe1Nom?.trim() || "Groupe 1"
                  : classe.groupe2Nom?.trim() || "Groupe 2"}
            </span>
          </Link>
        </Button>
        <Button
          variant="secondary"
          className="tap-lg h-auto py-4 flex-col gap-1 rounded-2xl"
          onClick={() => {
            if (sortedEleves.length === 0) {
              toast.error("Aucun élève");
              return;
            }
            printPages(sortedEleves);
          }}
        >
          <Printer className="size-6" />
          <span className="font-bold">Pages de garde</span>
          <span className="text-[10px] opacity-70">QR 2 & 3</span>
        </Button>
      </div>

      <Button
        variant="outline"
        className="w-full tap-lg h-auto py-3 mb-4 rounded-2xl"
        onClick={() => {
          if (sortedEleves.length === 0) {
            toast.error("Aucun élève");
            return;
          }
          printFeuilleClasse();
        }}
      >
        <Printer className="size-5" />
        <span className="font-bold">Feuille de classe · QR 1 (sans classeur)</span>
      </Button>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button asChild variant="secondary" className="tap-lg h-auto py-4 flex-col gap-1 rounded-2xl">
          <Link
            to="/plan/$classeId"
            params={{ classeId }}
            search={{ scope: groupeFilter === "all" ? undefined : groupeFilter === 1 ? "g1" : "g2" }}
          >
            <Grid3x3 className="size-6" />
            <span className="font-bold">Plan de classe</span>
            <span className="text-[10px] opacity-70">Placer les élèves</span>
          </Link>
        </Button>
        <Button asChild className="tap-lg h-auto py-4 flex-col gap-1 rounded-2xl">
          <Link
            to="/appel-plan/$classeId"
            params={{ classeId }}
            search={{ scope: groupeFilter === "all" ? undefined : groupeFilter === 1 ? "g1" : "g2" }}
          >
            <MapPin className="size-6" />
            <span className="font-bold">Appel via plan</span>
            <span className="text-[10px] opacity-80">Cliquer sur l'élève</span>
          </Link>
        </Button>
      </div>

      <Button
        asChild
        className="w-full h-14 rounded-2xl mb-4 text-base font-bold gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md"
      >
        <Link to="/bilan-classe/$classeId" params={{ classeId }}>
          📊 Bilan de la classe (CSV)
        </Link>
      </Button>

      {aeshsAssocies.length > 0 && (

        <section className="mb-4 rounded-2xl bg-accent/20 border border-accent/40 p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            AESH associés
          </p>
          <div className="flex flex-wrap gap-2">
            {aeshsAssocies.map((a) => (
              <span
                key={a.id}
                className="text-sm bg-accent text-accent-foreground rounded-full px-3 py-1 font-medium"
              >
                {a.prenom} {a.nom}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg">Élèves</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full"
            onClick={() => {
              const appels = useStore.getState().appels;
              const aeshs = useStore.getState().aeshs;
              downloadCSV(
                `eleves-${classe.nom}.csv`,
                sortedEleves.map((e) => {
                  const a = aeshs.find((x) => x.id === e.aeshId);
                  return {
                    classe: classe.nom,
                    nom: e.nom,
                    prenom: e.prenom,
                    qr: e.qrCode,
                    aesh: a ? `${a.prenom} ${a.nom}` : "",
                    absences: countAbsences(e.id, appels),
                  };
                }),
              );
            }}
          >
            <Download className="size-4" /> CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full">
                <Plus className="size-4" /> Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvel élève</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Prénom"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  className="h-12"
                  autoFocus
                />
                <Input
                  placeholder="Nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="h-12"
                />
              </div>
              <DialogFooter>
                <Button
                  className="w-full tap-lg"
                  onClick={async () => {
                    if (!nom.trim() || !prenom.trim()) {
                      toast.error("Nom et prénom requis");
                      return;
                    }
                    await createEleve({
                      classe_id: classeId,
                      nom,
                      prenom,
                    });

                    await chargerElevesDepuisServeur();
                    setNom("");
                    setPrenom("");
                    setOpen(false);
                    toast.success("Élève ajouté");
                  }}
                >
                  Ajouter
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {sortedEleves.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun élève dans cette classe.
        </p>
      ) : (
        <ul className="space-y-4">
          {sortedEleves.map((e) => (
            <li key={e.id}>
              <Link
                to="/eleves/$eleveId"
                params={{ eleveId: e.id }}
                className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 tap-lg active:bg-muted active:scale-[0.99] transition shadow-sm"
              >
                <div className="flex flex-col gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-xl leading-tight break-words">
                      {e.nom.toUpperCase()}
                    </p>
                    <p className="text-lg text-muted-foreground break-words">
                      {e.prenom}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-10"
                      aria-label="Imprimer"
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        printPages([e]);
                      }}
                    >
                      <Printer className="size-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-10"
                      aria-label="Changer de groupe"
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        const next: 1 | 2 | undefined = e.groupe === 1 ? 2 : e.groupe === 2 ? undefined : 1;
                        updateEleve(e.id, { groupe: next });
                        toast.success(next ? `→ Groupe ${next}` : "Retiré des groupes");
                      }}
                    >
                      <Users className="size-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-10"
                      aria-label="Modifier"
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        setEditEleveId(e.id);
                        setENom(e.nom);
                        setEPrenom(e.prenom);
                      }}
                    >
                      <Pencil className="size-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-10 text-destructive"
                      aria-label="Supprimer"
                      onClick={async (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();

                        if (confirm(`Supprimer ${e.prenom} ${e.nom} ?`)) {
                          try {
                            await deleteEleveServeur(e.id);
                            await chargerElevesDepuisServeur();
                            toast.success("Élève supprimé");
                          } catch (error) {
                            console.error(error);
                            toast.error("Erreur lors de la suppression");
                          }
                        }
                      }}
                    >
                      <Trash2 className="size-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-10 text-primary"
                      aria-label="Ouvrir le dossier"
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        navigate({ to: "/eleves/$eleveId", params: { eleveId: e.id } });
                      }}
                    >
                      <FolderOpen className="size-5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {e.aeshId && (
                    <span className="text-xs text-accent-foreground bg-accent/40 px-2 py-0.5 rounded-full">
                      AESH
                    </span>
                  )}
                  {e.groupe && (
                    <span className="text-xs font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                      Groupe {e.groupe}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Button
          variant="ghost"
          className="text-destructive w-full tap-lg"
          onClick={async () => {
            if (confirm(`Supprimer la classe ${classe.nom} et tous ses élèves ?`)) {
              try {
                await deleteClasseServeur(classe.id);
                await chargerClassesDepuisServeur();
                navigate({ to: "/" });
              } catch (e) {
                console.error(e);
                alert(String(e));
              }
            }
          }}
        >
          <Trash2 className="size-4" /> Supprimer la classe
        </Button>
      </div>S

      <Dialog open={editingClasse} onOpenChange={setEditingClasse}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paramètres de la classe</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nom</label>
              <Input
                value={editNom}
                onChange={(e) => setEditNom(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold mb-2">Noms des demi-groupes</p>
              <label className="text-xs font-semibold text-muted-foreground">Nom du Groupe 1</label>
              <Input
                value={editG1Nom}
                onChange={(e) => setEditG1Nom(e.target.value)}
                placeholder="Groupe 1"
                className="h-12 mb-2"
              />
              <label className="text-xs font-semibold text-muted-foreground">Nom du Groupe 2</label>
              <Input
                value={editG2Nom}
                onChange={(e) => setEditG2Nom(e.target.value)}
                placeholder="Groupe 2"
                className="h-12"
              />
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold mb-1">Correspondance EDT ↔ groupes</p>
              <p className="text-[11px] text-muted-foreground mb-2">
                Nom exact tel qu'il apparaît dans votre calendrier importé
                (ex. « 4A grp1 »). Les cours correspondants seront rangés
                dans cette classe et marqués comme groupe 1 ou 2.
              </p>
              <label className="text-xs font-semibold text-muted-foreground">Nom EDT du Groupe 1</label>
              <Input
                value={editAlias1}
                onChange={(e) => setEditAlias1(e.target.value)}
                placeholder={`${classe.nom} grp1`}
                className="h-12 mb-2"
              />
              <label className="text-xs font-semibold text-muted-foreground">Nom EDT du Groupe 2</label>
              <Input
                value={editAlias2}
                onChange={(e) => setEditAlias2(e.target.value)}
                placeholder={`${classe.nom} grp2`}
                className="h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full tap-lg"
              onClick={async () => {
                if (!editNom.trim()) {
                  toast.error("Le nom est requis");
                  return;
                }
                updateClasse(classe.id, {
                  nom: editNom.trim(),
                  alias1: editAlias1.trim() || undefined,
                  alias2: editAlias2.trim() || undefined,
                  groupe1Nom: editG1Nom.trim() || undefined,
                  groupe2Nom: editG2Nom.trim() || undefined,
                });
                setEditingClasse(false);
                toast.success("Classe mise à jour");
              }}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <Dialog open={!!editEleveId} onOpenChange={(o) => !o && setEditEleveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'élève</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Prénom"
              value={ePrenom}
              onChange={(ev) => setEPrenom(ev.target.value)}
              className="h-12"
            />
            <Input
              placeholder="Nom"
              value={eNom}
              onChange={(ev) => setENom(ev.target.value)}
              className="h-12"
            />
          </div>
          <DialogFooter>
            <Button
              className="w-full tap-lg"
              onClick={async () => {
                if (!editEleveId) return;
                if (!eNom.trim() || !ePrenom.trim()) {
                  toast.error("Nom et prénom requis");
                  return;
                }
                updateEleve(editEleveId, {
                  nom: eNom.trim(),
                  prenom: ePrenom.trim(),
                });
                setEditEleveId(null);
                toast.success("Élève mis à jour");
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
