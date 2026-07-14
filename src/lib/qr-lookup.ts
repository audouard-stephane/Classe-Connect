import type { Classe, Eleve } from "@/lib/store";
import { gardeQrPayload, stripQrVariant } from "@/lib/garde-template";

/**
 * Résout un payload QR en élève.
 * Un seul QR par élève désormais ; les anciens QR avec suffixe `_V1|_V2|_V3`
 * restent reconnus (le suffixe est ignoré).
 */
export function findEleveByQr(
  qr: string,
  eleves: Eleve[],
  classes: Classe[],
): Eleve | undefined {
  const raw = qr.trim();
  const direct = eleves.find((e) => e.qrCode === raw);
  if (direct) return direct;

  const upper = raw.toUpperCase();
  if (upper.startsWith("TECHNO_")) {
    const stripped = stripQrVariant(upper);
    return eleves.find((e) => {
      const classe = classes.find((c) => c.id === e.classeId);
      if (!classe) return false;
      return gardeQrPayload(classe.nom, e.nom, e.prenom) === stripped;
    });
  }
  return undefined;
}
