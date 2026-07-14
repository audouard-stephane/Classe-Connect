import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore, DAYS, todayDay, type Day } from "@/lib/store";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Play, Upload, Download, Link2, Copy, CalendarPlus, X, RefreshCw, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { parseICS, buildICS } from "@/lib/ical";
import { useIcsSubscription } from "@/hooks/use-ics-subscription";
import { fetchExternalIcs } from "@/lib/ics-fetch.functions";
import QRCode from "qrcode";

export const Route = createFileRoute("/emploi-du-temps")({
  component: EdtPage,
  ssr: false,
  head: () => ({ meta: [{ title: "Emploi du temps — ClasseScan" }] }),
});

function EdtPage() {
  const cours = useStore((s) => s.cours);
  const classes = useStore((s) => s.classes);
  const addCours = useStore((s) => s.addCours);
  const addClasse = useStore((s) => s.addClasse);
  const deleteCours = useStore((s) => s.deleteCours);
  const replaceCours = useStore((s) => s.replaceCours);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    jour: todayDay(),
    heureDebut: "08:00",
    heureFin: "09:00",
    classeId: classes[0]?.id ?? "",
    salle: "",
  });


  const currentIcs = useMemo(
    () => (cours.length > 0 ? buildICS(cours, classes) : null),
    [cours, classes],
  );
  const subscription = useIcsSubscription(currentIcs);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleImportICS = async (file: File) => {
    try {
      const text = await file.text();
      const events = parseICS(text);
      if (events.length === 0) {
        toast.error("Aucun événement trouvé dans le fichier ICS");
        return;
      }
      let added = 0;
      let skipped = 0;
      for (const ev of events) {
        // Match classe by summary (case-insensitive contains)
        const cls = classes.find((c) =>
          ev.summary.toLowerCase().includes(c.nom.toLowerCase()),
        ) ?? classes[0];
        if (!cls) { skipped++; continue; }
        addCours({
          jour: ev.jour,
          heureDebut: ev.heureDebut,
          heureFin: ev.heureFin,
          classeId: cls.id,
          salle: ev.salle,
        });
        added++;
      }
      toast.success(`${added} cours importé(s)${skipped ? ` · ${skipped} ignoré(s)` : ""}`);
    } catch (e) {
      toast.error("Fichier ICS invalide");
    }
  };

  const handleExportICS = () => {
    if (cours.length === 0) { toast.error("Aucun cours à exporter"); return; }
    const ics = buildICS(cours, classes);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "emploi-du-temps.ics";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export ICS téléchargé");
  };

  return (
    <AppShell
      title="Emploi du temps"
      action={
        <div className="flex gap-1">
          <input
            ref={fileRef}
            type="file"
            accept=".ics,text/calendar"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportICS(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="secondary"
            size="icon"
            className="size-11 rounded-full"
            title="Importer ICS"
            onClick={() => fileRef.current?.click()}
          >
            <Upload />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="size-11 rounded-full"
            title="Exporter ICS"
            onClick={handleExportICS}
          >
            <Download />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="icon" className="size-11 rounded-full">
              <Plus />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau cours</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Select value={form.jour} onValueChange={(v) => setForm({ ...form, jour: v as Day })}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input type="time" value={form.heureDebut} onChange={(e) => setForm({ ...form, heureDebut: e.target.value })} className="h-12" />
                <Input type="time" value={form.heureFin} onChange={(e) => setForm({ ...form, heureFin: e.target.value })} className="h-12" />
              </div>
              <Select value={form.classeId} onValueChange={(v) => setForm({ ...form, classeId: v })}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Classe" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Salle (ex. B13)" value={form.salle} onChange={(e) => setForm({ ...form, salle: e.target.value })} className="h-12" />
            </div>
            <DialogFooter>
              <Button
                className="w-full tap-lg"
                onClick={() => {
                  if (!form.classeId) { toast.error("Choisir une classe"); return; }
                  addCours(form);
                  setOpen(false);
                  toast.success("Cours ajouté");
                }}
              >
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      }
    >
      <WeekGrid
        cours={cours}
        classes={classes}
        onDelete={deleteCours}
      />


      <ExternalIcsCard classes={classes} replaceCours={replaceCours} addClasse={addClasse} />

      <IcsSubscribeCard subscription={subscription} hasCours={cours.length > 0} />
    </AppShell>
  );
}

function IcsSubscribeCard({
  subscription,
  hasCours,
}: {
  subscription: ReturnType<typeof useIcsSubscription>;
  hasCours: boolean;
}) {
  const { token, syncing, dirty, lastSyncAt, create, revoke } = subscription;
  const [qr, setQr] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const httpsUrl = token ? `${origin}/api/public/ics/${token}.ics` : "";
  const webcalUrl = token
    ? httpsUrl.replace(/^https?:\/\//, "webcal://")
    : "";

  useEffect(() => {
    if (!httpsUrl) { setQr(null); return; }
    QRCode.toDataURL(httpsUrl, { width: 400, margin: 1 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [httpsUrl]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Lien copié");
    } catch {
      toast.error("Copie impossible");
    }
  };

  return (
    <section className="mt-6 bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="size-5 text-primary" />
        <h2 className="font-bold">Lien d'abonnement calendrier</h2>
      </div>

      {!token ? (
        <>
          <p className="text-sm text-muted-foreground mb-3">
            Créez un lien à coller dans Google Agenda, Apple Calendrier ou Outlook. Le calendrier se
            mettra à jour automatiquement à chaque modification de l'EDT.
          </p>
          <Button className="w-full tap-lg gap-2" disabled={!hasCours} onClick={create}>
            <CalendarPlus className="size-4" /> Créer le lien
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2 text-xs">
            {syncing ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <RefreshCw className="size-3 animate-spin" /> Synchronisation…
              </span>
            ) : dirty ? (
              <span className="text-amber-600 dark:text-amber-400">
                Modifications non synchronisées (auto au retour en ligne)
              </span>
            ) : (
              <span className="text-primary">
                À jour{lastSyncAt ? ` · ${new Date(lastSyncAt).toLocaleTimeString()}` : ""}
              </span>
            )}
          </div>

          <div className="bg-muted rounded-lg p-2 text-[11px] font-mono break-all mb-2">
            {httpsUrl}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <Button variant="secondary" className="tap-lg gap-1" onClick={() => copy(httpsUrl)}>
              <Copy className="size-4" /> Copier
            </Button>
            <Button asChild variant="secondary" className="tap-lg gap-1">
              <a href={webcalUrl}>
                <CalendarPlus className="size-4" /> Ouvrir
              </a>
            </Button>
          </div>

          {qr && (
            <div className="flex flex-col items-center gap-2 mb-3">
              <img src={qr} alt="QR du lien" className="w-40 h-40 rounded-lg border border-border bg-white p-2" />
              <p className="text-[11px] text-muted-foreground">Scannez pour ouvrir sur un autre appareil</p>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground mb-2">
            Rafraîchissement côté calendriers : Google ~24 h, Apple ~1 h, Outlook variable.
          </p>

          <Button variant="ghost" className="w-full text-destructive tap-lg gap-1" onClick={revoke}>
            <X className="size-4" /> Révoquer le lien
          </Button>
        </>
      )}
    </section>
  );
}

const EXT_URL_KEY = "edt.externalIcsUrl";

function ExternalIcsCard({
  classes,
  replaceCours,
  addClasse,
}: {
  classes: ReturnType<typeof useStore.getState>["classes"];
  replaceCours: ReturnType<typeof useStore.getState>["replaceCours"];
  addClasse: ReturnType<typeof useStore.getState>["addClasse"];
}) {
  const [url, setUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(EXT_URL_KEY);
    if (saved) {
      setSavedUrl(saved);
      setUrl(saved);
    }
    const ts = localStorage.getItem(EXT_URL_KEY + ".ts");
    if (ts) setLastSync(Number(ts));
  }, []);

  const sync = async (target: string) => {
    if (!target.trim()) { toast.error("URL vide"); return; }
    setBusy(true);
    try {
      const { text } = await fetchExternalIcs({ data: { url: target } });
      const events = parseICS(text);
      if (events.length === 0) { toast.error("Aucun événement trouvé"); return; }

      // Extract subject label from summary (first non-empty line)
      const subjectOf = (summary: string) =>
        summary.split("\n").map((s) => s.trim()).find(Boolean) ?? "Cours";

      // Use the class group (e.g. "6°A") extracted from the ICS description
      // as the classe; fall back to the subject when absent.
      const classNameOf = (ev: (typeof events)[number]) =>
        (ev.classe && ev.classe.trim()) || subjectOf(ev.summary);

      // Map by existing class names + aliases de demi-groupes.
      // Un alias renvoie le cours vers la classe parente et marque le groupe.
      const classMap = new Map<string, { classeId: string; groupe?: 1 | 2 }>();
      for (const c of classes) {
        classMap.set(c.nom.toLowerCase(), { classeId: c.id });
        if (c.alias1?.trim())
          classMap.set(c.alias1.trim().toLowerCase(), { classeId: c.id, groupe: 1 });
        if (c.alias2?.trim())
          classMap.set(c.alias2.trim().toLowerCase(), { classeId: c.id, groupe: 2 });
      }

      let created = 0;
      const list = events.map((ev) => {
        const name = classNameOf(ev);
        let hit = classMap.get(name.toLowerCase());
        if (!hit) {
          const newClasse = addClasse(name, "edt");
          classMap.set(name.toLowerCase(), { classeId: newClasse.id });
          hit = { classeId: newClasse.id };
          created++;
        }
        return {
          jour: ev.jour,
          date: ev.date,
          heureDebut: ev.heureDebut,
          heureFin: ev.heureFin,
          classeId: hit.classeId,
          groupe: hit.groupe,
          salle: ev.salle,
          matiere: subjectOf(ev.summary),
          professeur: ev.professeur,
        };
      });



      replaceCours(list);
      const now = Date.now();
      setLastSync(now);
      localStorage.setItem(EXT_URL_KEY + ".ts", String(now));
      toast.success(`${list.length} cours importé(s)${created ? ` · ${created} classe(s) créée(s)` : ""}`);


    } catch (e: any) {
      toast.error("Échec de la synchronisation : " + (e?.message ?? ""));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const clean = url.trim();
    if (!clean) return;
    localStorage.setItem(EXT_URL_KEY, clean);
    setSavedUrl(clean);
    toast.success("Lien enregistré");
    await sync(clean);
  };

  const forget = () => {
    localStorage.removeItem(EXT_URL_KEY);
    localStorage.removeItem(EXT_URL_KEY + ".ts");
    setSavedUrl(null);
    setLastSync(null);
    setUrl("");
    toast.success("Lien supprimé");
  };

  return (
    <section className="mt-6 bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="size-5 text-primary" />
        <h2 className="font-bold">Importer depuis une URL (Pronote, iCal…)</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Collez l'URL d'un calendrier (ex. Pronote). Elle est enregistrée pour resynchroniser en 1 clic.
      </p>
      <Input
        placeholder="https://…/ical/…ics"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="h-12 mb-2 text-xs"
      />
      <div className="grid grid-cols-2 gap-2">
        <Button className="tap-lg gap-1" disabled={busy || !url.trim()} onClick={save}>
          <Download className="size-4" /> Enregistrer & importer
        </Button>
        <Button
          variant="secondary"
          className="tap-lg gap-1"
          disabled={busy || !savedUrl}
          onClick={() => savedUrl && sync(savedUrl)}
        >
          <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} /> Resynchroniser
        </Button>
      </div>
      {savedUrl && (
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {lastSync ? `Dernière sync : ${new Date(lastSync).toLocaleString()}` : "Jamais synchronisé"}
          </span>
          <button className="text-destructive underline" onClick={forget}>
            Oublier
          </button>
        </div>
      )}
    </section>
  );
}

// ---------- Weekly grid (Pronote-like) ----------

const WEEK_DAYS: Day[] = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];
const DAY_LABELS: Record<Day, string> = {
  lundi: "Lun", mardi: "Mar", mercredi: "Mer",
  jeudi: "Jeu", vendredi: "Ven", samedi: "Sam",
};

const CLASS_COLORS = [
  "bg-orange-100 border-orange-400 text-orange-900",
  "bg-yellow-100 border-yellow-400 text-yellow-900",
  "bg-emerald-100 border-emerald-500 text-emerald-900",
  "bg-sky-100 border-sky-400 text-sky-900",
  "bg-rose-100 border-rose-400 text-rose-900",
  "bg-violet-100 border-violet-400 text-violet-900",
  "bg-lime-100 border-lime-400 text-lime-900",
  "bg-fuchsia-100 border-fuchsia-400 text-fuchsia-900",
];

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Monday of the week containing d (00:00 local) */
function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay(); // 0 Sun..6 Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtDDMMYYYY(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function fmtDDMM(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function toInputDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** School year start = Monday on/after Sep 1 of the year containing the given date's school year */
function schoolYearStart(d: Date): Date {
  const year = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return mondayOf(new Date(year, 8, 1));
}
function weekIndex(monday: Date): number {
  const start = schoolYearStart(monday);
  return Math.floor((monday.getTime() - start.getTime()) / (7 * 86400000));
}
function semaineAB(monday: Date): "A" | "B" {
  return weekIndex(monday) % 2 === 0 ? "A" : "B";
}

function WeekGrid({
  cours,
  classes,
  onDelete,
}: {
  cours: ReturnType<typeof useStore.getState>["cours"];
  classes: ReturnType<typeof useStore.getState>["classes"];
  onDelete: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()));

  const dayDates = useMemo(
    () => WEEK_DAYS.map((_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const weekEnd = dayDates[dayDates.length - 1];
  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const coursForDay = (i: number) => {
    const dateStr = toInputDate(dayDates[i]);
    const day = WEEK_DAYS[i];
    return cours.filter((c) => (c.date ? c.date === dateStr : c.jour === day));
  };

  const visibleCours = useMemo(() => {
    const out: typeof cours = [];
    for (let i = 0; i < WEEK_DAYS.length; i++) out.push(...coursForDay(i));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cours, weekStart]);

  const startH = 8;
  const endH = 19;

  const hours = endH - startH;
  const HOUR_PX = 56;
  const gridH = hours * HOUR_PX;
  const classColor = (id: string) => {
    const i = classes.findIndex((c) => c.id === id);
    return CLASS_COLORS[(i < 0 ? 0 : i) % CLASS_COLORS.length];
  };

  const resolveTarget = (classeId: string, groupe?: 1 | 2) => {
    const classe = classes.find((x) => x.id === classeId);
    if (!classe) return { id: classeId, nom: "?", groupe };
    if (classe.source === "edt") {
      const parent = classes.find(
        (x) =>
          x.source !== "edt" &&
          ((x.alias1 && x.alias1 === classe.nom) ||
            (x.alias2 && x.alias2 === classe.nom)),
      );
      if (parent) {
        const g: 1 | 2 | undefined =
          parent.alias1 === classe.nom ? 1 : parent.alias2 === classe.nom ? 2 : groupe;
        return { id: parent.id, nom: parent.nom, groupe: g };
      }
    }
    return { id: classe.id, nom: classe.nom, groupe };
  };
  const resolveDisplay = (classeId: string, groupe?: 1 | 2) => {
    const t = resolveTarget(classeId, groupe);
    return { nom: t.nom, groupe: t.groupe };
  };

  const selectedCours = selectedId ? cours.find((c) => c.id === selectedId) : null;
  const selectedDisplay = selectedCours
    ? resolveDisplay(selectedCours.classeId, selectedCours.groupe)
    : null;
  const selectedTarget = selectedCours
    ? resolveTarget(selectedCours.classeId, selectedCours.groupe)
    : null;



  const weekNav = (
    <div className="mb-3 bg-card border border-border rounded-2xl p-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full shrink-0"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          title="Semaine précédente"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex-1 text-center">
          <div className="text-[13px] font-semibold leading-tight">
            du {fmtDDMMYYYY(weekStart)} au {fmtDDMMYYYY(weekEnd)}
          </div>
          <div className="text-[11px] text-muted-foreground">Semaine {semaineAB(weekStart)}</div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full shrink-0"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          title="Semaine suivante"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="rounded-full gap-1 h-8"
          onClick={() => setWeekStart(mondayOf(new Date()))}
        >
          <CalendarDays className="size-3.5" /> Aujourd'hui
        </Button>
        <label className="relative flex-1">
          <input
            type="date"
            value={toInputDate(weekStart)}
            onChange={(e) => {
              const [y, m, d] = e.target.value.split("-").map(Number);
              if (y) setWeekStart(mondayOf(new Date(y, m - 1, d)));
            }}
            className="w-full h-8 px-2 rounded-full bg-muted text-xs border border-border"
          />
        </label>
      </div>
    </div>
  );

  return (
    <>
      {weekNav}


      {cours.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun cours. Ajoutez-en ou importez un calendrier ci-dessous.
        </p>
      ) : (
        <div className="-mx-4 overflow-x-auto pb-2">
          <div className="min-w-[540px] px-4">
            {/* Header row */}
            <div className="grid" style={{ gridTemplateColumns: "44px repeat(5, 1fr)" }}>
              <div />
              {WEEK_DAYS.map((d, i) => {
                const date = dayDates[i];
                const isToday = isSameDay(date, today);
                return (
                  <div
                    key={d}
                    className={`text-center py-1 border-b border-border ${
                      isToday ? "bg-primary/10 rounded-t-md" : ""
                    }`}
                  >
                    <div className={`text-xs font-semibold capitalize ${isToday ? "text-primary" : ""}`}>
                      {DAY_LABELS[d]}
                    </div>
                    <div className={`text-[10px] ${isToday ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                      {fmtDDMM(date)}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Grid body */}
            <div className="grid relative" style={{ gridTemplateColumns: "44px repeat(5, 1fr)", height: gridH }}>
              <div className="relative">
                {Array.from({ length: hours }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-1 text-[10px] text-muted-foreground text-right"
                    style={{ top: i * HOUR_PX - 6 }}
                  >
                    {String(startH + i).padStart(2, "0")}h
                  </div>
                ))}
              </div>
              {WEEK_DAYS.map((d, i) => {
                const isToday = isSameDay(dayDates[i], today);
                return (
                  <div
                    key={d}
                    className={`relative border-l border-border ${isToday ? "bg-primary/5" : ""}`}
                  >
                    {Array.from({ length: hours + 1 }).map((_, j) => (
                      <div
                        key={j}
                        className="absolute left-0 right-0 border-t border-border"
                        style={{ top: j * HOUR_PX }}
                      />
                    ))}
                    {coursForDay(i)
                      .map((c) => {
                        const top = (toMin(c.heureDebut) - startH * 60) * (HOUR_PX / 60);
                        const height = (toMin(c.heureFin) - toMin(c.heureDebut)) * (HOUR_PX / 60);
                        const disp = resolveDisplay(c.classeId, c.groupe);
                        const baseLabel = disp.nom || c.matiere || "?";
                        const label = disp.groupe ? `${baseLabel} G${disp.groupe}` : baseLabel;
                        return (
                          <button
                            key={c.id}
                            onClick={() => setSelectedId(c.id)}
                            className={`absolute left-0.5 right-0.5 rounded-md border-l-4 px-1 py-0.5 text-left overflow-hidden ${classColor(c.classeId)}`}
                            style={{ top, height: Math.max(height - 2, 20) }}
                          >
                            <div className="text-[10px] font-bold leading-tight truncate">
                              {label}
                            </div>
                            {c.salle && (
                              <div className="text-[9px] leading-tight truncate opacity-80">
                                {c.salle}
                              </div>
                            )}
                            <div className="text-[9px] leading-tight opacity-70">
                              {c.heureDebut}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDisplay?.nom ?? selectedCours?.matiere ?? "Cours"}
              {selectedDisplay?.groupe ? ` · Groupe ${selectedDisplay.groupe}` : ""}
              {selectedCours?.salle ? ` · Salle ${selectedCours.salle}` : ""}
            </DialogTitle>
          </DialogHeader>
          {selectedCours && (
            <div className="text-sm text-muted-foreground space-y-1">
              <div>
                <span className="capitalize">{selectedCours.jour}</span>{" "}
                {(() => {
                  if (selectedCours.date) {
                    const [y, m, d] = selectedCours.date.split("-").map(Number);
                    return fmtDDMMYYYY(new Date(y, m - 1, d)) + " · ";
                  }
                  const idx = WEEK_DAYS.indexOf(selectedCours.jour);
                  return idx >= 0 ? fmtDDMMYYYY(dayDates[idx]) + " · " : "";
                })()}
                {selectedCours.heureDebut}–{selectedCours.heureFin}
              </div>
              {selectedCours.professeur && (
                <div>Professeur : {selectedCours.professeur}</div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            {selectedCours && (
              <Button asChild className="flex-1 tap-lg gap-1" onClick={() => setSelectedId(null)}>
                <Link
                  to="/appel-plan/$classeId"
                  params={{ classeId: selectedTarget?.id ?? selectedCours.classeId }}
                  search={{
                    coursId: selectedCours.id,
                    scope:
                      (selectedTarget?.groupe ?? selectedCours.groupe) === 1
                        ? "g1"
                        : (selectedTarget?.groupe ?? selectedCours.groupe) === 2
                          ? "g2"
                          : undefined,
                  }}
                >
                  <Play className="size-4" /> Faire l'appel
                </Link>
              </Button>

            )}
            <Button
              variant="ghost"
              className="text-destructive tap-lg gap-1"
              onClick={() => {
                if (selectedId) onDelete(selectedId);
                setSelectedId(null);
              }}
            >
              <Trash2 className="size-4" /> Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


