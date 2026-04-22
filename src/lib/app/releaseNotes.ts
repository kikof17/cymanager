export const RELEASE_VERSION = __APP_VERSION__;
export const RELEASE_NAME = "Version 1.7.2 - interface épurée avec onglets et sections repliables";

export const RELEASE_HIGHLIGHTS: string[] = [
  "Simulateur d'impact recrutement : solde avant/après, charge fixe, autonomie projetée et verdict feu rouge.",
  "Cycle de vie coureur : alerte pic de valeur dépassé (Pro > 30 en déclin multi-semaines) et talents U21 en progression constante.",
  "Todo actionnable : chaque tâche auto porte un lien direct vers la section applicative concernée.",
  "Polissage UX : recommandations croisées pliables, badge-lien vert sur les todos, styles message-box enrichis.",
];

export const RELEASE_CHANGELOG: Array<{
  title: string;
  items: string[];
}> = [
  {
    title: "Cap produit",
    items: [
      "Permettre des décisions de transfert et de cycle de vie basées sur des projections chiffrées plutôt que sur l'intuition.",
      "Rendre chaque tâche automatique directement actionnable en un clic vers la section concernée.",
      "Consolider l'expérience utilisateur avec des blocs repliables et des signaux visuels cohérents.",
    ],
  },
  {
    title: "Lot 1 — Simulation financière recrutement",
    items: [
      "Simulateur d'impact recrutement dans la page Transferts : solde avant/après, charge fixe hebdo avant/après, autonomie résiduelle en semaines.",
      "Verdict automatique feu rouge / vigilance / safe selon le ratio solde projeté / réserve de sécurité.",
      "Module pur recruitmentSimulator.ts réutilisable pour extensions futures.",
    ],
  },
  {
    title: "Lot 2 — Cycle de vie coureur",
    items: [
      "Alerte «pic de valeur probablement dépassé» pour les coureurs Pro > 30 ans avec 2+ semaines consécutives de déclin de valeur.",
      "Indicateur «talent U21 en progression constante» pour les jeunes avec 2+ semaines consécutives de hausse de total.",
      "Compteur d'alertes critiques enrichi avec la nouvelle catégorie «Pic de valeur dépassé».",
      "Nouveau filtre «peak-passed» dans la toolbar de l'historique coureurs.",
    ],
  },
  {
    title: "Lot 3 — Todo actionnable",
    items: [
      "Champ entityLink ajouté au type TodoItem : label + href vers la section applicative concernée.",
      "Tous les todos auto clés portent désormais un lien : effectif, entraînement, courses, résultats, installations.",
      "Badge vert cliquable «Aller à → section» affiché inline dans chaque todo concerné.",
    ],
  },
  {
    title: "Lot 4 — Polissage UX",
    items: [
      "Composant CollapsibleBox réutilisable : message-box pliable/dépliable avec chevron et état contrôlé.",
      "Recommandations croisées dans Finance et Statistiques encapsulées dans CollapsibleBox.",
      "Styles app.css enrichis : collapsible-box-header, chevron, todo-badge-link vert.",
    ],
  },
];