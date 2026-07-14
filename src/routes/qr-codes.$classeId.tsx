import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import {
  gardeDocumentHTML,
  gardePageHTML,
  gardeQrPayload,
  gardeSchoolYear,
} from "@/lib/garde-template";

export const Route = createFileRoute("/qr-codes/$classeId")({
  component: QrCodesPage,
});

function QrCodesPage() {
  const { classeId } = Route.useParams();
  const classes = useStore((s) => s.classes);
  const allEleves = useStore((s) => s.eleves);
  const classe = useMemo(() => classes.find((c) => c.id === classeId), [classes, classeId]);
  const eleves = useMemo(
    () => allEleves.filter((e) => e.classeId === classeId),
    [allEleves, classeId],
  );
  const [codes, setCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!classe) return;
    (async () => {
      const out: Record<string, string> = {};
      for (const e of eleves) {
        const payload = gardeQrPayload(classe.nom, e.nom, e.prenom);
        out[e.id] = await QRCode.toDataURL(payload, { width: 600, margin: 1 });
      }
      setCodes(out);
    })();
  }, [eleves, classe]);

  const handlePrint = async () => {
    if (!classe) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const annee = gardeSchoolYear();
    const pages: string[] = [];
    for (const e of eleves) {
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

  if (!classe)
    return (
      <AppShell title="Classe introuvable">
        <Link to="/" className="underline">Retour</Link>
      </AppShell>
    );

  return (
    <AppShell
      title={`Pages A4 ${classe.nom}`}
      subtitle={`${eleves.length} élève(s)`}
      action={
        eleves.length > 0 ? (
          <Button
            variant="secondary"
            size="icon"
            className="size-11 rounded-full"
            onClick={handlePrint}
          >
            <Printer />
          </Button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {eleves.map((e) => (
          <div key={e.id} className="bg-card border border-border rounded-2xl p-3 text-center">
            {codes[e.id] && <img src={codes[e.id]} alt="" className="w-full" />}
            <p className="font-bold text-sm mt-2">{e.prenom} {e.nom}</p>
            <p className="text-[10px] text-muted-foreground">{classe.nom} · Technologie</p>
          </div>
        ))}
      </div>
      {eleves.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">Aucun élève dans cette classe.</p>
      )}
    </AppShell>
  );
}
