import { useEffect, useRef, useState } from "react";
import { BarcodeDetector } from "barcode-detector/ponyfill";

export function QrCameraScanner({
  stream,
  onScan,
  onError,
}: {
  stream: MediaStream;
  onScan: (rawValue: string) => void;
  onError: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  const [playBlocked, setPlayBlocked] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let timer: number | undefined;
    const detector = new BarcodeDetector({ formats: ["qr_code"] });

    const scan = async () => {
      if (cancelled) return;

      try {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
          const codes = await detector.detect(video);
          const rawValue = codes[0]?.rawValue;

          if (rawValue) {
            onScanRef.current(rawValue);
            return;
          }
        }

        timer = window.setTimeout(scan, 200);
      } catch {
        if (!cancelled) {
          onErrorRef.current("Lecture du QR code impossible avec ce navigateur.");
        }
      }
    };

    const start = () => {
      video.srcObject = stream;
      setPlayBlocked(false);
      scan();

      void video.play().catch(() => {
        if (!cancelled) setPlayBlocked(true);
      });
    };

    start();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      video.pause();
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <div className="aspect-square bg-muted relative overflow-hidden">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
        autoPlay
      />
      {playBlocked && (
        <button
          type="button"
          className="absolute inset-0 z-10 flex items-center justify-center bg-background/85 p-6 text-center font-semibold text-foreground"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            void video.play().then(() => setPlayBlocked(false));
          }}
        >
          Toucher pour activer la caméra
        </button>
      )}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-56 max-w-[72%] max-h-[72%] rounded-2xl border-4 border-primary shadow-lg" />
      </div>
    </div>
  );
}