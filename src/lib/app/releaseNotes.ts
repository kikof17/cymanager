export const RELEASE_VERSION = __APP_VERSION__;
export const RELEASE_NAME = "Version 1.8.0 - Drawer coureur, split view effectif et intersaison";

export const RELEASE_HIGHLIGHTS: string[] = [
  "Drawer coureur : clic sur une ligne effectif ouvre un panneau lateral avec profil, stats, finance et deltas vs semaine precedente.",
  "Split view Effectif avec onglets Pro / U25 / U21 / Indispos et compteurs dynamiques.",
  "Delta forme dans le bandeau saison : evolution de la forme moyenne vs snapshot precedent.",
  "Changement de saison : bouton Cloture la saison dans les parametres - snapshot, increment saison et journal.",
  "Saison configurable : numero et date de depart stockes dans les parametres club, plus de constante hard-codee.",
];

export const RELEASE_CHANGELOG: Array<{
  title: string;
  items: string[];
}> = [
  {
    title: "Cap produit",
    items: [
      "Passer du tableau brut a un cockpit decisionnel : chaque coureur doit etre lisible en un clic sans quitter la page.",
      "Donner de la temporalite aux KPIs : deltas semaine sur forme, valeur et salaire pour capter les tendances.",
      "Formaliser le cycle de vie saisonnier : cloture propre avec snapshot, journal et mise a jour du compteur saison.",
    ],
  },
  {
    title: "Drawer coureur",
    items: [
      "Panneau lateral sticky (RiderDrawer) : profil cycliste, forces/faiblesses, barres de stats colorees par seuil.",
      "KPIs finance : salaire/semaine, valeur marche, primes 7j avec deltas colores vs snapshot precedent.",
      "Detail foncier : endurance, resistance, recuperation avec barres visuelles.",
      "Badges categorie colores (Pro / U25 / U21) et statut forme/blessure integres.",
      "Re-clic sur la ligne selectionnee ferme le drawer ; clic hors ligne ouvre un nouveau profil.",
    ],
  },
  {
    title: "Split view Effectif",
    items: [
      "Grille 1fr / 400px activee a l'ouverture du drawer, colonne unique sinon.",
      "Onglets Pro / U25 / U21 / Indispos avec compteurs dynamiques.",
      "Indispos = coureurs avec forme < 35 ou blessure active non vide.",
      "Ligne cliquable (cursor pointer + hover) et mise en surbrillance de la selection active.",
      "Responsive < 900px : drawer passe en colonne unique sous la table.",
    ],
  },
  {
    title: "Delta forme (SeasonHeader)",
    items: [
      "Forme moyenne de l'effectif calculee a chaque render et comparee au snapshot RiderHistory precedent.",
      "Badge Forme +X / -X en vert/rouge dans le bandeau sticky saison, a cote du solde.",
    ],
  },
  {
    title: "Changement de saison",
    items: [
      "Bouton Cloture la saison dans Parametres avec ConfirmDialog detaillant les actions.",
      "A la confirmation : snapshot effectif capture, compteur saison incremente, date de depart avancee de 70 jours.",
      "Le vieillissement et la reclassification Pro/U25/U21 restent geres a l'import des coureurs.",
      "Entree journal de gestion de type season-transition creee automatiquement.",
    ],
  },
  {
    title: "Saison configurable",
    items: [
      "Champs baseSeason et seasonStartIso ajoutes a ClubSettings (localStorage).",
      "SeasonHeaderV2 lit la saison depuis les settings au lieu de constantes compilees.",
      "Retrocompatibilite totale : fallback sur saison 97 / 15 avril 2026 si aucune valeur stockee.",
    ],
  },
];
