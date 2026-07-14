import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import {
  gardeDocumentHTML,
  gardePageHTML,
  gardeQrPayload,
  gardeSchoolYear,
} from "@/lib/garde-template";

export const Route = createFileRoute("/qr-codes/")({
  component: AllQrCodesPage,
});

function AllQrCodesPage() {
  const classes = useStore((s) => s.classes);
  const eleves = useStore((s) => s.eleves);
  const [codes, setCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const out: Record<string, string> = {};
      for (const e of eleves) {
        const c = classes.find((x) => x.id === e.classeId);
        if (!c) continue;
        const payload = gardeQrPayload(c.nom, e.nom, e.prenom);
        out[e.id] = await QRCode.toDataURL(payload, { width: 600, margin: 1 });
      }
      setCodes(out);
    })();
  }, [eleves, classes]);

  const handlePrint = async () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const annee = gardeSchoolYear();
    const pages: string[] = [];
    for (const c of classes) {
      const list = eleves.filter((e) => e.classeId === c.id);
      for (const e of list) {
        const qr = await QRCode.toDataURL(
          gardeQrPayload(c.nom, e.nom, e.prenom),
          { width: 600, margin: 1 },
        );
        pages.push(
          gardePageHTML(
            { prenom: e.prenom, nom: e.nom, classe: c.nom, qrDataUrl: qr },
            annee,
          ),
        );
      }
    }

    w.document.write(gardeDocumentHTML("Pages de garde — QR codes", pages.join("")));
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  return (
    <AppShell
      title="Pages de garde A4"
      subtitle={`${eleves.length} élève(s) · ${classes.length} classe(s)`}
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
      {eleves.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Aucun élève. <Link to="/" className="underline">Créer une classe</Link>
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-3">
            Une page A4 par élève — design Technologie, vert foncé.
          </p>
          <div className="space-y-3">
            {classes.map((c) => {
              const list = eleves.filter((e) => e.classeId === c.id);
              if (list.length === 0) return null;
              return (
                <div key={c.id}>
                  <h3 className="font-bold mb-2">{c.nom}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {list.map((e) => (
                      <div key={e.id} className="bg-card border border-border rounded-xl p-3 text-center">
                        {codes[e.id] && <img src={codes[e.id]} alt="" className="w-full" />}
                        <p className="font-bold text-sm mt-2">{e.prenom} {e.nom}</p>
                        <p className="text-[10px] text-muted-foreground">{c.nom} · Technologie</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </AppShell>
  );
}
