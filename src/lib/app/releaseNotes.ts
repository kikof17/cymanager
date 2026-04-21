export const RELEASE_VERSION = __APP_VERSION__;
export const RELEASE_NAME = "Version 1.6.0 - recommandations transverses stabilisées";

export const RELEASE_HIGHLIGHTS: string[] = [
  "Identité des courses stabilisée avec migration des anciennes références et diagnostics de cohérence.",
  "Résultats relus sur des références fiables avec réparation, nettoyage des orphelins et finance resynchronisée.",
  "Recommandations croisées entre entraînement, finance, résultats et statistiques à partir des signaux club.",
  "Lecture hebdomadaire des indisponibilités et plan d'entraînement limité à 3 types avec intensité proposée.",
];

export const RELEASE_CHANGELOG: Array<{
  title: string;
  items: string[];
}> = [
  {
    title: "Cap produit",
    items: [
      "Fiabiliser les liens entre calendrier, résultats, finance, disponibilité effectif et recommandations métier.",
      "Éviter les décisions contradictoires en réinjectant les signaux de terrain dans les écrans de pilotage.",
      "Transformer les pages métier en poste de lecture transverse avant action, pas seulement en formulaires de saisie.",
    ],
  },
  {
    title: "Livrables stabilisés",
    items: [
      "Migration vers des identités de course stables, diagnostics de stockage et outils de réparation des références résultats.",
      "Recommandations croisées Entraînement, Finance et Résultats, avec lecture macro dans Statistiques.",
      "Historique hebdomadaire des indisponibilités, intégration au backup club et priorisation auto des todos critiques.",
      "Plan d'entraînement hebdomadaire contraint à 3 types avec intensité suggérée cohérente au niveau club.",
    ],
  },
  {
    title: "Impact utilisateur",
    items: [
      "Les écrans de gestion exposent plus tôt les incohérences de données avant qu'elles ne polluent résultats, primes ou décisions sportives.",
      "Les choix de course et d'entraînement tiennent compte de l'état réel de l'effectif plutôt que d'une lecture purement théorique.",
      "La 1.6.0 devient la base officielle pour un pilotage plus fiable, plus transverse et plus lisible du club.",
    ],
  },
];