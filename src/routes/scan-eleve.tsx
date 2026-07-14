import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { QrCameraScanner } from "@/components/QrCameraScanner";
import { useStore } from "@/lib/store";
import { findEleveByQr } from "@/lib/qr-lookup";
import { decodeQrFromImageFile } from "@/lib/qr-image";
import {
  getCameraErrorMessage,
  openCurrentPageFullscreen,
  requestCameraStream,
  stopMediaStream,
} from "@/lib/camera";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { CameraOff, ImageUp, ScanLine, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/scan-eleve")({
  component: ScanElevePage,
  head: () => ({ meta: [{ title: "Scanner un élève — ClasseScan" }] }),
});

function ScanElevePage() {
  const eleves = useStore((s) => s.eleves);
  const classes = useStore((s) => s.classes);
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    cameraStreamRef.current = cameraStream;
  }, [cameraStream]);

  useEffect(() => () => stopMediaStream(cameraStreamRef.current), []);

  const startCamera = () => {
    setCameraError(null);
    stopMediaStream(cameraStreamRef.current);
    setCameraStream(null);

    void requestCameraStream()
      .then((stream) => {
        setCameraStream(stream);
        setScanning(true);
      })
      .catch((err: unknown) => setCameraError(getCameraErrorMessage(err)));
  };

  const stopCamera = () => {
    stopMediaStream(cameraStreamRef.current);
    setCameraStream(null);
    setScanning(false);
    setCameraError(null);
  };

  const handleScan = (qr: string) => {
    const eleve = findEleveByQr(qr, eleves, classes);
    if (!eleve) {
      toast.error("QR code inconnu");
      return;
    }
    stopCamera();
    toast.success(`${eleve.prenom} ${eleve.nom.charAt(0).toUpperCase()}.`);
    navigate({ to: "/eleves/$eleveId", params: { eleveId: eleve.id } });
  };

  const scanImageFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const qr = await decodeQrFromImageFile(file);
      handleScan(qr);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "QR code introuvable");
    }
  };

  return (
    <AppShell title="Scanner un élève" subtitle="Ouvre la fiche de l'élève">
      {scanning ? (
        <div className="rounded-2xl overflow-hidden border-2 border-primary relative mb-3">
          {cameraError ? (
            <div className="aspect-square flex flex-col items-center justify-center bg-muted text-center p-4">
              <CameraOff className="size-12 text-muted-foreground mb-2" />
              <p className="font-semibold">Caméra bloquée</p>
              <p className="text-xs text-muted-foreground mb-3">{cameraError}</p>
              <div className="flex flex-col gap-2">
                <Button size="sm" onClick={startCamera}>
                  <RefreshCw className="size-4" /> Réessayer
                </Button>
                <Button size="sm" variant="secondary" onClick={() => imageInputRef.current?.click()}>
                  <ImageUp className="size-4" /> Scanner une photo
                </Button>
                <Button size="sm" variant="outline" onClick={openCurrentPageFullscreen}>
                  Ouvrir en plein écran
                </Button>
              </div>
            </div>
          ) : cameraStream ? (
            <QrCameraScanner
              stream={cameraStream}
              onScan={handleScan}
              onError={setCameraError}
            />
          ) : null}
          <Button
            variant="secondary"
            className="absolute top-2 right-2"
            size="sm"
            onClick={stopCamera}
          >
            Arrêter
          </Button>
        </div>
      ) : (
        <Button className="w-full h-16 rounded-2xl text-lg mb-3" onClick={startCamera}>
          <ScanLine className="size-6" /> Lancer le scanner
        </Button>
      )}

      {!scanning && cameraError && (
        <div className="mb-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-center">
          <CameraOff className="mx-auto mb-2 size-10 text-destructive" />
          <p className="font-semibold text-destructive">Caméra bloquée</p>
          <p className="mb-3 text-xs text-muted-foreground">{cameraError}</p>
          <div className="flex flex-col gap-2">
            <Button size="sm" onClick={startCamera}>
              <RefreshCw className="size-4" /> Réessayer
            </Button>
            <Button size="sm" variant="outline" onClick={openCurrentPageFullscreen}>
              Ouvrir en plein écran
            </Button>
          </div>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full h-14 rounded-2xl text-base mb-3"
        onClick={() => imageInputRef.current?.click()}
      >
        <ImageUp className="size-5" /> Scanner une photo du QR
      </Button>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={scanImageFile}
      />

      <Link to="/" className="block text-center text-sm underline text-muted-foreground">
        Retour à l'accueil
      </Link>
    </AppShell>
  );
}
