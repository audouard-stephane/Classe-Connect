# Bilan de l'élève

Nouvelle rubrique "Bilan" qui affiche, pour un élève, une synthèse notée de ses points positifs et négatifs sur le semestre en cours, calculée à partir des observations déjà enregistrées (travail, classeur, bavardages, interrogations, bons points photo, retenues, absences...).

## Ce que verra l'utilisateur

Depuis la fiche élève (`/eleves/$eleveId`), un nouveau bouton **"Bilan du semestre"** ouvre une page dédiée `/bilan/$eleveId` avec :

- **En-tête** : prénom + nom, classe, période du semestre (S1 sept→jan, S2 fév→juin — sélecteur pour changer).
- **Note globale /20** calculée automatiquement (points positifs − points négatifs, normalisée).
- **Encadré vert "Points positifs"** : liste agrégée avec compteurs
  - Exercices faits à la maison (×N)
  - Exercices faits en classe (×N)
  - Interrogations réussies (×N) + partielles (×N)
  - Bons points 🌟 (photos d'exercices) (×N)
  - Classeur présent (×N)
  - Cours sans bavardage (×N)
- **Encadré rouge "Points négatifs"**
  - Exercices non faits maison / classe (×N)
  - Interrogations fausses (×N)
  - Oublis de classeur (×N)
  - Bavardages (quelques / beaucoup) (×N)
  - Retenues (×N)
  - Absences (×N)
- **Détail chronologique** (repliable) : liste des observations de la période, triées par date décroissante.
- **Bouton "Exporter en PDF"** (impression navigateur) pour remettre le bilan à l'élève / aux parents.

## Détails techniques

- Nouveau fichier `src/lib/bilan.ts` : fonction `computeBilan(eleveId, from, to, { observations, appels, retenues })` qui parcourt les observations et retourne `{ positifs, negatifs, note, timeline }`.
- Règle de note : `note = round(20 * positifs / (positifs + negatifs))`, `10/20` si aucune donnée.
- Nouvelle route `src/routes/bilan.$eleveId.tsx` utilisant `AppShell`, lisant depuis `useStore`, avec `head()` propre.
- Lien "Bilan du semestre" ajouté sur la fiche élève existante.
- Sélecteur de période : semestre courant par défaut, choix entre S1/S2 de l'année scolaire courante et précédente.
- Aucune modification de schéma / backend : tout est calculé côté client à partir de `observations`, `appels`, `retenues` déjà présents dans le store.
- Impression via `window.print()` + classe `print:` Tailwind pour masquer la navigation.
