export const RELEASE_VERSION = __APP_VERSION__;
export const RELEASE_NAME = "Version 1.4.0";

export const RELEASE_HIGHLIGHTS: string[] = [
  "Sauvegarde complète du club avec import contrôlé avant application.",
  "Normalisation plus stricte des données locales au chargement.",
  "Réconciliation financière renforcée et audit visible dans Finance.",
  "Diagnostic des données avec nettoyage guidé des éléments isolés.",
];

export const RELEASE_CHANGELOG: Array<{
  title: string;
  items: string[];
}> = [
  {
    title: "Sécurité des données",
    items: [
      "Export / import complet du club avec schéma versionné v2.",
      "Aperçu détaillé du backup avant import effectif.",
      "Compatibilité maintenue avec les backups de schéma v1.",
    ],
  },
  {
    title: "Intégrité applicative",
    items: [
      "Nettoyage automatique des données invalides pour les todos, résultats, profils calendrier, réglages de course et dernière course.",
      "Détection des éléments isolés entre calendrier, résultats, profils et réglages.",
      "Actions de nettoyage guidées depuis Paramètres.",
    ],
  },
  {
    title: "Pilotage club",
    items: [
      "Audit de réconciliation dans Finance avec réserve, masse salariale et écritures synchronisées.",
      "Visibilité plus claire sur les sections normalisées lors d'un import.",
      "Version et changelog désormais visibles directement dans l'application.",
    ],
  },
];