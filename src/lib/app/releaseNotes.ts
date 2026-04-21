export const RELEASE_VERSION = __APP_VERSION__;
export const RELEASE_NAME = "Version 1.5.0 - mémoire club stabilisée";

export const RELEASE_HIGHLIGHTS: string[] = [
  "Historique club consolidé sur les transferts, la shortlist, les décisions de gestion et le roster.",
  "Snapshots roster enrichis avec forme, âge, valeur, salaire et lecture semaine en cours vs semaine passée.",
  "Alertes métier filtrables et persistantes pour suivre dérive salariale, décrochage de valeur et rendement vétéran.",
  "Traçabilité transverse entre Paramètres, Calendrier, Résultats, Système et backup club.",
];

export const RELEASE_CHANGELOG: Array<{
  title: string;
  items: string[];
}> = [
  {
    title: "Cap produit",
    items: [
      "Donner une mémoire explicite au club au lieu de dépendre d'états volatils ou de lectures implicites.",
      "Rendre les décisions de gestion, les imports et l'évolution de l'effectif auditables dans le temps.",
      "Transformer la page Effectif en poste de lecture sportive et capitalistique du roster.",
    ],
  },
  {
    title: "Livrables stabilisés",
    items: [
      "Historique Transferts et shortlist avec storage dédié, affichage métier et inclusion dans le backup club.",
      "Journal de gestion transverse étendu à Paramètres, Système, Transferts, Calendrier et Résultats.",
      "Historique roster hebdomadaire avec KPIs de capital, alertes d'âge, alertes métier, filtres persistants et lecture timeline par coureur.",
    ],
  },
  {
    title: "Impact utilisateur",
    items: [
      "Le club peut être relu comme une histoire de décisions, de recrutements et d'évolution sportive plutôt qu'un simple état instantané.",
      "Un retour sur la page Effectif reprend la même lecture grâce à la persistance des filtres et du coureur sélectionné.",
      "La v1.5.0 sert désormais de base stable avant d'attaquer la 1.6.0 et les recommandations métier transverses.",
    ],
  },
];