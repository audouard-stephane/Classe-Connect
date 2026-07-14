import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, UserCog } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/aesh")({
  component: AeshPage,
  head: () => ({ meta: [{ title: "AESH — ClasseScan" }] }),
});

function AeshPage() {
  const aeshs = useStore((s) => s.aeshs);
  const allClasses = useStore((s) => s.classes);
  const classes = allClasses.filter((c) => c.source !== "edt");
  const eleves = useStore((s) => s.eleves);
  const addAesh = useStore((s) => s.addAesh);
  const updateAesh = useStore((s) => s.updateAesh);
  const deleteAesh = useStore((s) => s.deleteAesh);

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    classeIds: [] as string[],
    eleveIds: [] as string[],
  });

  const resetForm = () => setForm({ nom: "", prenom: "", email: "", telephone: "", classeIds: [], eleveIds: [] });

  const startEdit = (id: string) => {
    const a = aeshs.find((x) => x.id === id);
    if (!a) return;
    setForm({
      nom: a.nom,
      prenom: a.prenom,
      email: a.email ?? "",
      telephone: a.telephone ?? "",
      classeIds: a.classeIds,
      eleveIds: a.eleveIds,
    });
    setEdit(id);
    setOpen(true);
  };

  const save = () => {
    if (!form.nom.trim() || !form.prenom.trim()) {
      toast.error("Nom et prénom requis");
      return;
    }
    const payload = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      email: form.email.trim() || undefined,
      telephone: form.telephone.trim() || undefined,
      classeIds: form.classeIds,
      eleveIds: form.eleveIds,
    };
    if (edit) {
      updateAesh(edit, payload);
      toast.success("AESH modifié");
    } else {
      addAesh(payload);
      toast.success("AESH ajouté");
    }
    setOpen(false);
    setEdit(null);
    resetForm();
  };

  const elevesDispo = eleves.filter((e) => form.classeIds.includes(e.classeId));

  return (
    <AppShell
      title="AESH"
      subtitle={`${aeshs.length} accompagnant(s)`}
      action={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEdit(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="icon" className="size-11 rounded-full">
              <Plus />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{edit ? "Modifier l'AESH" : "Nouvel AESH"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className="h-12" />
              <Input placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="h-12" />
              <Input placeholder="Email (facultatif)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-12" />
              <Input placeholder="Téléphone (facultatif)" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="h-12" />
              <div>
                <p className="text-sm font-semibold mb-2">Classes</p>
                <div className="space-y-1.5">
                  {classes.map((c) => (
                    <label key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                      <Checkbox
                        checked={form.classeIds.includes(c.id)}
                        onCheckedChange={(v) => {
                          setForm((f) => ({
                            ...f,
                            classeIds: v ? [...f.classeIds, c.id] : f.classeIds.filter((x) => x !== c.id),
                            eleveIds: v ? f.eleveIds : f.eleveIds.filter((eid) => eleves.find((e) => e.id === eid)?.classeId !== c.id),
                          }));
                        }}
                      />
                      <span>{c.nom}</span>
                    </label>
                  ))}
                </div>
              </div>
              {elevesDispo.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Élèves accompagnés</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {elevesDispo.map((e) => (
                      <label key={e.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted text-sm">
                        <Checkbox
                          checked={form.eleveIds.includes(e.id)}
                          onCheckedChange={(v) =>
                            setForm((f) => ({
                              ...f,
                              eleveIds: v ? [...f.eleveIds, e.id] : f.eleveIds.filter((x) => x !== e.id),
                            }))
                          }
                        />
                        <span>{e.prenom} {e.nom}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button className="w-full tap-lg" onClick={save}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {aeshs.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-border">
          <UserCog className="size-12 mx-auto text-muted-foreground mb-2" />
          <p className="font-semibold">Aucun AESH</p>
          <p className="text-sm text-muted-foreground">Ajoutez les accompagnants.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {aeshs.map((a) => {
            const suivis = eleves.filter((e) => a.eleveIds.includes(e.id));
            return (
              <li key={a.id} className="bg-card border border-border rounded-xl">
                <details className="group [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex justify-between items-center gap-2 p-3 cursor-pointer list-none">
                    <div className="text-left flex-1">
                      <p className="font-bold">{a.prenom} {a.nom}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.classeIds.length} classe(s) · {suivis.length} élève(s)
                      </p>
                      {a.email && <p className="text-xs text-muted-foreground">{a.email}</p>}
                      {a.telephone && <p className="text-xs text-muted-foreground">{a.telephone}</p>}
                    </div>
                    <span className="text-muted-foreground transition-transform group-open:rotate-180">▾</span>
                  </summary>
                  <div className="px-3 pb-3 space-y-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => startEdit(a.id)} className="flex-1">
                        Modifier
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Supprimer ${a.prenom} ${a.nom} ?`)) deleteAesh(a.id);
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        Élèves suivis ({suivis.length})
                      </p>
                      {suivis.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Aucun élève associé.</p>
                      ) : (
                        <ul className="space-y-1">
                          {suivis.map((e) => {
                            const c = allClasses.find((cl) => cl.id === e.classeId);
                            return (
                              <li key={e.id} className="flex justify-between bg-muted rounded-lg px-2 py-1.5 text-sm">
                                <span className="font-medium">{e.prenom} {e.nom}</span>
                                <span className="text-xs text-muted-foreground">{c?.nom ?? "—"}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
