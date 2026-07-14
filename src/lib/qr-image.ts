import { BarcodeDetector } from "barcode-detector/ponyfill";

const detector = new BarcodeDetector({ formats: ["qr_code"] });

export async function decodeQrFromImageFile(file: File) {
  const codes = await detector.detect(file);
  const rawValue = codes[0]?.rawValue?.trim();

  if (!rawValue) {
    throw new Error("QR code introuvable. Reprenez une photo plus nette et bien cadrée.");
  }

  return rawValue;
}