export const RELEASE_VERSION = __APP_VERSION__;
export const RELEASE_NAME = "Version 2.1.0 - Multi-saison, cockpit compact et guide/FAQ V2";

export const RELEASE_HIGHLIGHTS: string[] = [
  "Nouveau cockpit Accueil en onglets avec timeline de saison et blocs decisionnels compacts.",
  "Nouvelle page Planification multi-saison avec jalons, progression et duplication vers la saison suivante.",
  "Guide debutant et FAQ en mode QuickStart/Reference, recherche live, filtres thematiques et preferences memorisees.",
  "Timeline saisonniere partagee sur Accueil et Calendrier avec deadlines hebdomadaires visibles.",
  "Migration de stockage renforcée et harmonisation responsive desktop/mobile sur toute la V2.",
];

export const RELEASE_CHANGELOG: Array<{
  title: string;
  items: string[];
}> = [
  {
    title: "Cap produit",
    items: [
      "Reduire drastiquement le scroll avec des vues compactes et orientees action.",
      "Introduire un pilotage multi-saison explicite pour preparer les objectifs sportifs et economiques.",
      "Conserver la robustesse locale via migration/sanitation des donnees existantes.",
    ],
  },
  {
    title: "Cockpit Accueil V2",
    items: [
      "Onglets Cette semaine / Equipe / Pilotage pour naviguer vite sans perdre le contexte.",
      "Timeline saisonniere compacte dans le cockpit avec semaine courante et deadlines.",
      "Raccourci direct vers la planification multi-saison depuis la barre d'outils.",
    ],
  },
  {
    title: "Planification multi-saison",
    items: [
      "Nouveau stockage versionne des jalons avec fallback legacy et normalisation des donnees.",
      "Creation/suivi de jalons par categorie, semaine et saison, avec etat termine/reouvrir.",
      "Duplication des jalons ouverts vers la saison suivante pour accelerer les transitions.",
    ],
  },
  {
    title: "Guide debutant + FAQ V2",
    items: [
      "Mode QuickStart pour les actions prioritaires et mode Reference pour l'exhaustivite.",
      "Recherche live avec mise en evidence des correspondances et filtres thematiques.",
      "Preferences de vue stockees localement avec garde-fous sur les anciens formats.",
    ],
  },
  {
    title: "Responsive et cohérence visuelle",
    items: [
      "Uniformisation des barres d'outils, tabs, chips et actions sur desktop et mobile.",
      "Comportements de grille et de formulaires stabilises sur les breakpoints critiques.",
      "Validation compile/build finale pour garantir l'absence de regression technique.",
    ],
  },
];
