import { useCallback, useEffect, useState } from "react";
import { getClasses, type ClasseApi } from "@/services/api/classes";

export function useClassesServeur() {
  const [classes, setClasses] = useState<ClasseApi[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    try {
      setErreur(null);
      const donnees = await getClasses();
      setClasses(donnees);
    } catch (e) {
      console.error(e);
      setErreur("Impossible de charger les classes");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  return {
    classes,
    chargement,
    erreur,
    recharger,
  };
}