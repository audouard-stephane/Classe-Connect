import { useCallback, useEffect, useState } from "react";
import { getEleves, type EleveApi } from "@/services/api/eleves";

export function useElevesServeur(classeId?: string) {
  const [eleves, setEleves] = useState<EleveApi[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    try {
      setErreur(null);

      const donnees = await getEleves();

      setEleves(
        classeId
          ? donnees.filter((eleve) => eleve.classe_id === classeId)
          : donnees,
      );
    } catch (error) {
      console.error(error);
      setErreur("Impossible de charger les élèves.");
    } finally {
      setChargement(false);
    }
  }, [classeId]);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  return {
    eleves,
    chargement,
    erreur,
    recharger,
  };
}