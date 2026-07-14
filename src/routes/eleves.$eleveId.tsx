import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  useStore,
  countAbsences,
  fmtDate,
  fmtTime,
  DAYS,
  DISPOSITIFS,
  type Comportement,
  type Materiel,
  type Travail,
  type Day,
  type Observation,
  type DispositifCode,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import { Trash2, QrCode, Copy, Plus, Pencil, Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/eleves/$eleveId")({
  component: ElevePage,
  errorComponent: ({ error, reset }) => (
    <AppShell title="Erreur">
      <p className="text-sm text-destructive mb-3">
        {error instanceof Error ? error.message : "Une erreur est survenue."}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Réessayer</Button>
        <Link to="/" className="underline self-center">Accueil</Link>
      </div>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell title="Élève introuvable">
      <Link to="/" className="underline">Retour à l'accueil</Link>
    </AppShell>
  ),
});

const COMPORTEMENTS: { v: Comportement; l: string }[] = [
  { v: "tres_bien", l: "Très bien" },
  { v: "bien", l: "Bien" },
  { v: "moyen", l: "Moyen" },
  { v: "mauvais", l: "Mauvais" },
];

const MATERIELS = [
  "feuille",
  "règle",
  "stylo",
  "crayon à papier",
  "cahier",
  "classeur",
  "autres",
] as const;

const QUICK_ACTIONS = [
  "Travail non fait en classe",
  "Travail non fait à la maison",
  "S'amuse en classe",
  "Bavardages",
  "Mange des chewing-gums",
  "Mange autre chose (snack, bonbons…)",
  "Utilise son téléphone portable",
];

function ElevePage() {
  const { eleveId } = Route.useParams();
  const eleve = useStore((s) => s.eleves.find((e) => e.id === eleveId));
  const classes = useStore((s) => s.classes);
  const aeshs = useStore((s) => s.aeshs);
  const appels = useStore((s) => s.appels);
  const allObservations = useStore((s) => s.observations);
  const allRetenues = useStore((s) => s.retenues);
  const observations = useMemo(
    () => allObservations.filter((o) => o.eleveId === eleveId),
    [allObservations, eleveId],
  );
  const retenues = useMemo(
    () => allRetenues.filter((r) => r.eleveId === eleveId),
    [allRetenues, eleveId],
  );
  const updateEleve = useStore((s) => s.updateEleve);
  const deleteEleve = useStore((s) => s.deleteEleve);
  const addObservation = useStore((s) => s.addObservation);
  const deleteObservation = useStore((s) => s.deleteObservation);
  const addRetenue = useStore((s) => s.addRetenue);
  const deleteRetenue = useStore((s) => s.deleteRetenue);
  const navigate = useNavigate();

  const [comp, setComp] = useState<Comportement | "">("");
  const [mat, setMat] = useState<Materiel | "">("");
  const [trav, setTrav] = useState<Travail | "">("");
  const [note, setNote] = useState("");

  // Édition d'une observation existante
  const [editObsId, setEditObsId] = useState<string | null>(null);
  const [editObsValue, setEditObsValue] = useState("");
  const updateObservation = useStore((s) => s.updateObservation);

  // Retenue form
  const [rJour, setRJour] = useState<Day>("lundi");
  const [rDebut, setRDebut] = useState("14:00");
  const [rFin, setRFin] = useState("15:00");
  const [rMotif, setRMotif] = useState("");

  if (!eleve) {
    return (
      <AppShell title="Élève introuvable">
        <Link to="/" className="underline">Retour</Link>
      </AppShell>
    );
  }

  const classe = classes.find((c) => c.id === eleve.classeId);
  const aesh = aeshs.find((a) => a.id === eleve.aeshId);
  const nbAbs = countAbsences(eleve.id, appels);
  const absencesList = appels
    .filter((a) =>
      a.entries.some((e) => e.eleveId === eleveId && e.presence === "absent"),
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  const quickAdd = (label: string) => {
    const now = new Date();
    addObservation({
      eleveId,
      classeId: eleve.classeId,
      date: fmtDate(now),
      heure: fmtTime(now),
      note: label,
    });
    toast.success(`Enregistré : ${label}`);
  };

  const saveObs = () => {
    if (!comp && !mat && !trav && !note.trim()) {
      toast.error("Renseignez au moins un champ");
      return;
    }
    const now = new Date();
    addObservation({
      eleveId,
      classeId: eleve.classeId,
      date: fmtDate(now),
      heure: fmtTime(now),
      comportement: comp || undefined,
      materiel: mat || undefined,
      travail: trav || undefined,
      note: note.trim() || undefined,
    });
    setComp(""); setMat(""); setTrav(""); setNote("");
    toast.success("Observation enregistrée");
  };

  // ---- Groupement historique observations ----
  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; type: string; count: number; last: Observation; ids: string[] }>();
    for (const o of observations) {
      const parts: string[] = [];
      if (o.comportement) parts.push(`Comportement: ${o.comportement.replace("_", " ")}`);
      if (o.materiel) parts.push(`Matériel: ${o.materiel}`);
      if (o.travail) parts.push(`Travail: ${o.travail.replace("_", " ")}`);
      if (o.note) parts.push(o.note);
      const label = parts.join(" · ") || "(vide)";
      const type = o.comportement
        ? "Comportement"
        : o.travail
          ? "Travail"
          : o.materiel
            ? "Matériel"
            : "Note";
      const key = `${type}::${label}`;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        existing.ids.push(o.id);
        if (o.createdAt > existing.last.createdAt) existing.last = o;
      } else {
        map.set(key, { label, type, count: 1, last: o, ids: [o.id] });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return b.last.createdAt - a.last.createdAt;
    });
  }, [observations]);

  const oublisList = useMemo(
    () => observations.filter((o) => o.materiel === "oubli"),
    [observations],
  );
  const travauxList = useMemo(
    () => observations.filter((o) => o.travail === "non_fait" || o.travail === "partiel"),
    [observations],
  );
  const nbPresent = appels.reduce(
    (n, a) => n + a.entries.filter((e) => e.eleveId === eleveId && e.presence === "present").length,
    0,
  );

  const copyResume = async () => {
    const lines: string[] = [];
    lines.push(`${eleve.prenom} ${eleve.nom}`);
    lines.push(`Classe : ${classe?.nom ?? "—"}`);
    if (eleve.qrCode) lines.push(`QR : ${eleve.qrCode}`);
    if (aesh) lines.push(`AESH : ${aesh.prenom} ${aesh.nom}${aesh.email ? ` <${aesh.email}>` : ""}${aesh.telephone ? ` ${aesh.telephone}` : ""}`);
    if (eleve.dateNaissance) lines.push(`Date de naissance : ${eleve.dateNaissance}`);
    if (eleve.sexe) lines.push(`Sexe : ${eleve.sexe}`);
    if (eleve.email) lines.push(`Email : ${eleve.email}`);
    if (eleve.tuteur) lines.push(`Tuteur : ${eleve.tuteur}`);
    if (eleve.rattachement) lines.push(`Rattachement : ${eleve.rattachement}`);
    if (eleve.regime) lines.push(`Régime : ${eleve.regime}`);
    if (eleve.options) lines.push(`Options : ${eleve.options}`);
    if (eleve.entree) lines.push(`Entrée : ${eleve.entree}`);
    if (eleve.sortie) lines.push(`Sortie : ${eleve.sortie}`);
    if (eleve.groupe) lines.push(`Groupe : ${eleve.groupe}`);
    lines.push(`Présences : ${nbPresent} · Absences : ${nbAbs}`);
    if (eleve.remarque) lines.push(`Remarque : ${eleve.remarque}`);
    lines.push("");
    lines.push("--- Observations (regroupées) ---");
    if (grouped.length === 0) lines.push("Aucune");
    for (const g of grouped) {
      lines.push(`• ${g.label}${g.count > 1 ? ` (x${g.count})` : ""} — dernier : ${g.last.date} ${g.last.heure}`);
    }
    lines.push("");
    lines.push("--- Oublis de matériel ---");
    if (oublisList.length === 0) lines.push("Aucun");
    for (const o of oublisList) {
      lines.push(`• ${o.date} ${o.heure}${o.note ? ` : ${o.note}` : ""}`);
    }
    lines.push("");
    lines.push("--- Travaux non faits / partiels ---");
    if (travauxList.length === 0) lines.push("Aucun");
    for (const t of travauxList) {
      lines.push(`• ${t.date} ${t.heure} — ${t.travail}${t.note ? ` : ${t.note}` : ""}`);
    }
    lines.push("");
    lines.push("--- Retenues ---");
    if (retenues.length === 0) lines.push("Aucune");
    for (const r of retenues) {
      lines.push(`• ${r.jour} ${r.heureDebut}${r.heureFin ? `–${r.heureFin}` : ""}${r.motif ? ` : ${r.motif}` : ""}`);
    }
    lines.push("");
    lines.push("--- Absences ---");
    if (absencesList.length === 0) lines.push("Aucune");
    for (const a of absencesList) {
      lines.push(`• ${a.date} ${a.heure}`);
    }
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Résumé copié dans le presse-papier");
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast.success("Résumé copié");
    }
  };

  const addRetenueSubmit = () => {
    if (!rDebut) {
      toast.error("Heure de début requise");
      return;
    }
    addRetenue({
      eleveId,
      jour: rJour,
      heureDebut: rDebut,
      heureFin: rFin || undefined,
      motif: rMotif.trim() || undefined,
    });
    setRMotif("");
    toast.success("Retenue ajoutée");
  };

  return (
    <AppShell
      title={`${eleve.prenom} ${eleve.nom}`}
      subtitle={classe?.nom}
      action={
        <div className="flex gap-1">
          <Button asChild size="sm" variant="default" className="gap-1">
            <Link to="/bilan/$eleveId" params={{ eleveId }}>
              📊 Bilan
            </Link>
          </Button>
          <Button size="sm" variant="secondary" onClick={copyResume} className="gap-1">
            <Copy className="size-4" /> Copier
          </Button>
        </div>
      }
    >
      <Button
        asChild
        className="w-full h-14 rounded-2xl mb-4 text-base font-bold gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md"
      >
        <Link to="/bilan/$eleveId" params={{ eleveId }}>
          📊 Voir le bilan du semestre
        </Link>
      </Button>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <p className="text-2xl font-bold text-destructive">{nbAbs}</p>
          <p className="text-xs text-muted-foreground">absences</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <p className="text-2xl font-bold text-primary">{observations.length}</p>
          <p className="text-xs text-muted-foreground">observations</p>
        </div>
        <Link
          to="/qr-codes/$classeId"
          params={{ classeId: eleve.classeId }}
          className="rounded-xl bg-accent text-accent-foreground p-3 text-center flex flex-col items-center justify-center"
        >
          <QrCode className="size-6" />
          <p className="text-xs font-semibold mt-1">QR code</p>
        </Link>
      </div>

      <Section title="Dossier administratif" defaultOpen>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <InfoRow label="Nom" value={eleve.nom} />
          <InfoRow label="Prénom" value={eleve.prenom} />
          <InfoRow label="Date de naissance" value={eleve.dateNaissance} />
          <InfoRow label="Sexe" value={eleve.sexe} />
          <InfoRow label="Email" value={eleve.email} />
          <InfoRow label="Groupe" value={eleve.groupe ? String(eleve.groupe) : undefined} />
          <InfoRow label="Régime" value={eleve.regime} />
          <InfoRow label="Rattachement" value={eleve.rattachement} />
          <InfoRow label="Tuteur" value={eleve.tuteur} full />
          <InfoRow label="Options" value={eleve.options} full />
          <InfoRow label="Entrée" value={eleve.entree} />
          <InfoRow label="Sortie" value={eleve.sortie} />
          {aesh && (
            <InfoRow
              label="AESH"
              value={`${aesh.prenom} ${aesh.nom}${aesh.email ? ` · ${aesh.email}` : ""}${aesh.telephone ? ` · ${aesh.telephone}` : ""}`}
              full
            />
          )}
          {DISPOSITIFS.filter((d) => eleve.dispositifs?.[d.code] !== undefined).length > 0 && (
            <InfoRow
              label="Dispositifs"
              value={DISPOSITIFS.filter((d) => eleve.dispositifs?.[d.code] !== undefined)
                .map((d) => {
                  const info = eleve.dispositifs?.[d.code];
                  return info ? `${d.code} (${info})` : d.code;
                })
                .join(" · ")}
              full
            />
          )}
          <InfoRow label="Présences" value={String(nbPresent)} />
          <InfoRow label="Absences" value={String(nbAbs)} />
        </dl>
      </Section>

      <Section
        title="Dispositifs d'accompagnement"
        badge={DISPOSITIFS.filter((d) => eleve.dispositifs?.[d.code] !== undefined).length || undefined}
      >
        <div className="space-y-3">
          {DISPOSITIFS.map((d) => {
            const current = eleve.dispositifs?.[d.code];
            const checked = current !== undefined;
            const toggle = (v: boolean) => {
              const next: Partial<Record<DispositifCode, string>> = { ...(eleve.dispositifs ?? {}) };
              if (v) next[d.code] = current ?? "";
              else delete next[d.code];
              updateEleve(eleve.id, { dispositifs: next });
            };
            const setText = (t: string) => {
              const next: Partial<Record<DispositifCode, string>> = { ...(eleve.dispositifs ?? {}) };
              next[d.code] = t;
              updateEleve(eleve.id, { dispositifs: next });
            };
            return (
              <div key={d.code} className="rounded-xl border border-border p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={checked} onCheckedChange={(v) => toggle(!!v)} className="mt-1" />
                  <span className="flex-1">
                    <span className="font-semibold">{d.code}</span>
                    <span className="text-sm text-muted-foreground"> — {d.label}</span>
                  </span>
                </label>
                {checked && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={current ?? ""}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={d.placeholder}
                      rows={2}
                    />
                    {d.code === "AESH" && (
                      <div>
                        <label className="text-xs text-muted-foreground">Personne accompagnante</label>
                        <Select
                          value={eleve.aeshId ?? "none"}
                          onValueChange={(v) => updateEleve(eleve.id, { aeshId: v === "none" ? undefined : v })}
                        >
                          <SelectTrigger className="h-12"><SelectValue placeholder="Choisir un AESH" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Aucun</SelectItem>
                            {aeshs.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.prenom} {a.nom}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Link to="/aesh" className="text-xs text-primary underline mt-1 inline-block">
                          Gérer les AESH
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>


      <Section title="Informations">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Classe</label>
            <Select
              value={eleve.classeId}
              onValueChange={(v) => updateEleve(eleve.id, { classeId: v })}
            >
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">AESH associé</label>
            <Select
              value={eleve.aeshId ?? "none"}
              onValueChange={(v) => updateEleve(eleve.id, { aeshId: v === "none" ? undefined : v })}
            >
              <SelectTrigger className="h-12"><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {aeshs.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.prenom} {a.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Remarque personnelle</label>
            <Textarea
              value={eleve.remarque ?? ""}
              onChange={(e) => updateEleve(eleve.id, { remarque: e.target.value })}
              placeholder="Notes générales sur l'élève..."
              rows={2}
            />
          </div>
          <p className="text-xs text-muted-foreground font-mono">QR : {eleve.qrCode}</p>
        </div>
      </Section>

      {oublisList.length > 0 && (
        <Section title="Oublis de matériel" badge={oublisList.length}>
          <ul className="space-y-1 text-sm">
            {oublisList.map((o) => (
              <li key={o.id} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{o.date} · {o.heure}</span>
                <span className="flex-1 text-right truncate">{o.note ?? "—"}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {travauxList.length > 0 && (
        <Section title="Travaux non faits / partiels" badge={travauxList.length}>
          <ul className="space-y-1 text-sm">
            {travauxList.map((t) => (
              <li key={t.id} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{t.date} · {t.heure}</span>
                <span className="flex-1 text-right truncate">
                  <span className="font-semibold capitalize">{t.travail?.replace("_", " ")}</span>
                  {t.note ? ` · ${t.note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Suivi rapide">
        <p className="text-xs text-muted-foreground mb-3">
          Un clic = enregistrement immédiat.
        </p>
        <div className="grid grid-cols-1 gap-2 mb-3">
          {QUICK_ACTIONS.map((label) => (
            <QuickCheck key={label} label={label} onClick={() => quickAdd(label)} />
          ))}
        </div>
        <p className="text-xs font-semibold mb-2">
          Oubli de matériel <span className="text-muted-foreground font-normal">(feuille, règle, stylo, crayon à papier, cahier, classeur, autres)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {MATERIELS.map((m) => (
            <button
              key={m}
              onClick={() => quickAdd(`Oubli de matériel : ${m}`)}
              className="px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted active:scale-95 transition text-sm font-medium capitalize"
            >
              + {m}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Nouvelle observation détaillée">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Comportement</label>
            <Select value={comp} onValueChange={(v) => setComp(v as Comportement)}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent>
                {COMPORTEMENTS.map((c) => (
                  <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Matériel</label>
              <Select value={mat} onValueChange={(v) => setMat(v as Materiel)}>
                <SelectTrigger className="h-12"><SelectValue placeholder="..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Présent</SelectItem>
                  <SelectItem value="oubli">Oubli</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Travail</label>
              <Select value={trav} onValueChange={(v) => setTrav(v as Travail)}>
                <SelectTrigger className="h-12"><SelectValue placeholder="..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fait">Fait</SelectItem>
                  <SelectItem value="partiel">Partiel</SelectItem>
                  <SelectItem value="non_fait">Non fait</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Observation rapide..."
            rows={2}
          />
          <Button className="w-full tap-lg" onClick={saveObs}>Enregistrer</Button>
        </div>
      </Section>

      <Section title="Retenues" badge={retenues.length || undefined}>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs text-muted-foreground">Jour</label>
            <Select value={rJour} onValueChange={(v) => setRJour(v as Day)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div>
              <label className="text-xs text-muted-foreground">Début</label>
              <Input type="time" value={rDebut} onChange={(e) => setRDebut(e.target.value)} className="h-11" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fin</label>
              <Input type="time" value={rFin} onChange={(e) => setRFin(e.target.value)} className="h-11" />
            </div>
          </div>
        </div>
        <Input
          placeholder="Motif (ex : travail non fait)"
          value={rMotif}
          onChange={(e) => setRMotif(e.target.value)}
          className="h-11 mb-2"
        />
        <Button onClick={addRetenueSubmit} className="w-full tap-lg gap-1">
          <Plus className="size-4" /> Ajouter la retenue
        </Button>
        {retenues.length > 0 && (
          <ul className="mt-3 space-y-2">
            {retenues.map((r) => (
              <li key={r.id} className="flex justify-between items-center bg-muted rounded-lg px-3 py-2 text-sm">
                <span>
                  <span className="capitalize font-semibold">{r.jour}</span> {r.heureDebut}
                  {r.heureFin ? `–${r.heureFin}` : ""}
                  {r.motif ? ` · ${r.motif}` : ""}
                </span>
                <Button size="icon" variant="ghost" onClick={() => deleteRetenue(r.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Historique observations (regroupé)" badge={grouped.length || undefined}>
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune observation.</p>
        ) : (
          <ul className="space-y-2">
            {grouped.map((g) => {
              const groupKey = `${g.type}-${g.label}`;
              const isEditing = editObsId === groupKey;
              return (
                <li key={groupKey} className="bg-muted/40 border border-border rounded-xl p-3 text-sm">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tag>{g.type}</Tag>
                        {g.count > 1 && (
                          <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            x{g.count}
                          </span>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            autoFocus
                            value={editObsValue}
                            onChange={(e) => setEditObsValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                g.ids.forEach((id) => updateObservation(id, { note: editObsValue.trim() }));
                                setEditObsId(null);
                                setEditObsValue("");
                                toast.success("Observation modifiée");
                              }
                              if (e.key === "Escape") {
                                setEditObsId(null);
                                setEditObsValue("");
                              }
                            }}
                            className="h-10 flex-1"
                          />
                          <Button
                            size="icon"
                            className="h-10 w-10"
                            onClick={() => {
                              const v = editObsValue.trim();
                              if (!v) return;
                              g.ids.forEach((id) => updateObservation(id, { note: v }));
                              setEditObsId(null);
                              setEditObsValue("");
                              toast.success("Observation modifiée");
                            }}
                            aria-label="Valider"
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-10 w-10"
                            onClick={() => { setEditObsId(null); setEditObsValue(""); }}
                            aria-label="Annuler"
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-1 break-words">{g.label}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Dernier : {g.last.date} · {g.last.heure}
                      </p>
                    </div>
                    {!isEditing && (
                      <div className="flex flex-col gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setEditObsId(groupKey); setEditObsValue(g.label); }}
                          title={g.count > 1 ? `Modifier les ${g.count} occurrences` : "Modifier"}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => g.ids.forEach((id) => deleteObservation(id))}
                          title={g.count > 1 ? `Supprimer les ${g.count} occurrences` : "Supprimer"}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Absences" badge={absencesList.length || undefined}>
        <p className="text-xs text-muted-foreground mb-2">
          Seules les absences (scan QR ou appel manuel) sont listées.
        </p>
        {absencesList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune absence.</p>
        ) : (
          <ul className="space-y-1">
            {absencesList.map((a) => (
              <li
                key={a.id}
                className="flex justify-between bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm"
              >
                <span>{a.date} · {a.heure}</span>
                <span className="font-bold text-destructive">Absent</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Button
        variant="ghost"
        className="text-destructive w-full tap-lg"
        onClick={() => {
          if (confirm(`Supprimer ${eleve.prenom} ${eleve.nom} ?`)) {
            deleteEleve(eleve.id);
            navigate({ to: "/classes/$classeId", params: { classeId: eleve.classeId } });
          }
        }}
      >
        <Trash2 className="size-4" /> Supprimer l'élève
      </Button>
    </AppShell>
  );
}

function QuickCheck({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-3 rounded-xl border border-border bg-card hover:bg-muted active:scale-[0.98] transition text-left tap-lg"
    >
      <span className="grid place-content-center size-7 rounded-md border-2 border-primary text-primary font-bold">
        ☐
      </span>
      <span className="font-semibold flex-1">{label}</span>
    </button>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
      {children}
    </span>
  );
}

function InfoRow({ label, value, full }: { label: string; value?: string; full?: boolean }) {
  if (!value) return null;
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

function Section({
  title,
  badge,
  defaultOpen,
  children,
}: {
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group bg-card border border-border rounded-2xl p-4 mb-4 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex items-center justify-between cursor-pointer list-none">
        <h2 className="font-bold flex items-center gap-2">
          {title}
          {badge !== undefined && badge > 0 && (
            <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
              {badge}
            </span>
          )}
        </h2>
        <span className="text-muted-foreground transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
