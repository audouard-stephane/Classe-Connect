import type { TableOrientation, TableRotation } from "@/lib/store";

/**
 * Étiquette d'un siège dans le plan de classe.
 * - Le prénom et l'initiale du nom sont toujours écrits horizontalement et à l'endroit
 * - La police se réduit pour tenir sur une seule ligne ; tronquature en dernier recours
 * - Contre-rotation pour rester lisible même si la table est tournée
 */
export function SeatLabel({
  prenom,
  nom,
  rotation = 0,
}: {
  prenom: string;
  nom: string;
  orientation?: TableOrientation;
  rotation?: TableRotation;
}) {
  const initial = nom.charAt(0).toUpperCase();

  // Réduction continue de la police à partir de 6 caractères, minimum 6.5 px
  const baseSize = 12;
  const shrink = Math.max(0, prenom.length - 6) * 0.6;
  const fontSize = Math.max(6.5, baseSize - shrink);

  return (
    <span
      className="flex flex-col items-center justify-center font-extrabold leading-tight tracking-tight w-full"
      style={{ fontSize: `${fontSize}px`, transform: `rotate(${-rotation}deg)` }}
    >
      <span className="w-full text-center truncate">{prenom}</span>
      <span className="w-full text-center opacity-90 truncate">{initial}.</span>
    </span>
  );
}
