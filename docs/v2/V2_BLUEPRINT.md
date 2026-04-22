# Cymanager V2 - Blueprint Produit

Date: 22/04/2026
Auteur: Copilot
Statut: Proposition initiale validable

## 1. Objectifs V2

### 1.1 Objectifs utilisateur
- Réduire fortement le scroll vertical.
- Améliorer la lisibilité et la priorisation de l'information.
- Structurer toute l'expérience autour du cycle saisonnier du jeu.

### 1.2 Objectifs métier
- Faciliter les décisions hebdomadaires (inscription, ODC, entraînement, finance).
- Réduire les oublis critiques (inscriptions, seuils de forme, contraintes sponsor, limite effectif).
- Donner une projection simple des impacts (points, primes, forme, cash).

### 1.3 Contraintes jeu à refléter explicitement
- Une saison dure 10 semaines.
- Rythme hebdomadaire: U21 mardi, C2 mercredi/vendredi, U25 samedi, C1 dimanche, entraînement nuit mercredi-jeudi, MAJ économique nuit dimanche-lundi.
- Catégories U21/U25 déterminées à l'intersaison.
- Limite de 25 coureurs.
- Sensibilité sponsor sur certaines courses (minimum d'inscrits).

## 2. Principes UX V2 (anti-scroll)

### 2.1 Shell d'application
- Header sticky compact avec contexte global: Saison, Semaine, division, solde, alertes.
- Colonne navigation fixe à gauche.
- Zone centrale en vues panneau + détail, sans longues pages empilées.

### 2.2 Patterns de lecture
- Mode Split: liste à gauche, détail à droite.
- Tiroirs latéraux pour les détails profonds au lieu d'ouvrir une page complète.
- Onglets contextuels pour éviter la répétition de sections en longueur.
- Filtres persistants par page et densité d'affichage réglable (Confort / Dense).

### 2.3 Hiérarchie visuelle unifiée
- Vert: OK.
- Orange: attention.
- Rouge: critique.
- Bleu: information.
- Même logique visuelle pour forme, finances, effectif, entraînement et calendrier.

## 3. Information Architecture (Sitemap)

- Cockpit saison
- Planning semaine
- Effectif
- Entraînement
- Courses et résultats
- Finances
- Transferts
- Paramètres

### 3.1 Cockpit saison
- Résumé semaine en cours.
- Timeline des 10 semaines de la saison.
- Alertes priorisées.
- KPI décisionnels.

### 3.2 Planning semaine
- Courses de la semaine (U21, C2, C2, U25, C1 + tours le cas échéant).
- État des inscriptions.
- Contrôles ODC rapides.
- Contrôles contraintes sponsor.

### 3.3 Effectif
- Tableau compact triable et filtrable.
- Vues rapides: Pro, U25, U21, indisponibles.
- Détail coureur en panneau latéral.

### 3.4 Entraînement
- Groupes de la semaine (max 3 types).
- Simulation d'impact forme + progression.
- Alertes de cohérence (course/tour/blessure).

### 3.5 Courses et résultats
- Calendrier complet de saison.
- Semaine active priorisée.
- Enregistrement résultat simplifié et traçabilité.

### 3.6 Finances
- Solde courant + projection J+7 et J+14.
- Détail recettes/dépenses attendues.
- Alertes de risque faillite.

### 3.7 Transferts
- Marché avec filtres compacts.
- Shortlist.
- Impact masse salariale et budget avant validation.

### 3.8 Paramètres
- Configuration club.
- Sauvegarde/import.
- Préférences d'affichage (densité, tri par défaut).

## 4. Wireframes texte (version fonctionnelle)

## 4.1 Cockpit saison

Disposition:
- Ligne 1: bandeau contexte global (Saison X | Semaine Y/10 | Solde | Alertes critiques).
- Ligne 2: timeline saison 10 cases cliquables.
- Ligne 3: trois colonnes fixes.

Colonne A - A faire maintenant:
- Inscriptions manquantes.
- ODC à compléter.
- Entraînement non validé.

Colonne B - Risques:
- Coureurs sous seuil de forme.
- Effectif > 25.
- Sponsor non couvert.
- Trésorerie en zone critique.

Colonne C - Impact semaine:
- Projection points.
- Projection primes.
- Variation forme moyenne.
- Solde prévisionnel.

## 4.2 Planning semaine

Disposition:
- Tableau compact par jour.
- Chaque ligne course contient:
  - Type de course.
  - Profil.
  - Coureurs inscrits.
  - Statut ODC.
  - Indicateur risque.
  - Action rapide.

Panneau latéral au clic:
- Sélection coureurs.
- ODC simplifiés.
- Vérification forme et catégorie.

## 4.3 Effectif

Disposition:
- Gauche: tableau coureurs (densité dense possible).
- Droite: fiche détaillée coureur.

Colonnes minimales:
- Nom, âge, catégorie.
- Forme.
- Notes clés contextuelles.
- Valeur / salaire.
- Statut disponibilité semaine.

## 4.4 Finances

Disposition:
- KPI bandeau: Solde, delta semaine, runway.
- Bloc projection:
  - Entrées attendues (primes, sponsor, boutique, SS).
  - Sorties attendues (salaires, entretiens).
- Bloc scénarios rapides:
  - Avec / sans achat transfert.
  - Avec / sans upgrade installation.

## 5. Bibliothèque de composants V2

### 5.1 Composants layout
- AppShellV2
- StickySeasonHeader
- SplitPane
- SideDrawer
- DenseDataTable

### 5.2 Composants métier
- SeasonTimeline
- WeekChecklist
- RiskStack
- KpiDeltaCard
- RaceWeekBoard
- RiderAvailabilityChip
- TrainingPlanBoard
- FinanceProjectionPanel
- SponsorConstraintBadge

### 5.3 Composants utilitaires
- SeverityBadge
- ContextTabs
- PersistedFilterBar
- EmptyStateCompact

## 6. Modèle de navigation

Niveau 1:
- Cockpit
- Planning
- Effectif
- Entraînement
- Courses
- Finances
- Transferts
- Paramètres

Niveau 2:
- Onglets de contexte par section (ex: Effectif = Tous, Pro, U25, U21, Indisponibles).

Niveau 3:
- Détail dans tiroirs, sans casser la vue active.

## 7. Plan de migration V1 vers V2

### Phase A - Fondations UI et cycle saison
- Créer AppShell V2.
- Introduire un SeasonContext unique (saison, semaine, jalons).
- Poser les tokens visuels (couleurs, densité, spacing).

### Phase B - Cockpit et Planning
- Livrer Cockpit saison complet.
- Livrer Planning semaine avec actions rapides.
- Connecter alertes métier prioritaires.

### Phase C - Effectif et entraînement
- Migrer la page Effectif en split + drawer.
- Migrer la page Entraînement en mode 3 groupes max lisibles.
- Ajouter contrôle cohérence course/forme/blessure.

### Phase D - Finance et transferts
- Ajouter projection cash hebdo.
- Afficher impact salarial avant action transfert.
- Ajouter signaux de risque faillite plus explicites.

### Phase E - Stabilisation
- Tests métier.
- Tests responsive desktop/mobile.
- Polissage accessibilité et performances.

## 8. Critères d'acceptation V2 (premier niveau)

- 80% des actions hebdo principales faisables sans quitter Cockpit + Planning.
- Diminution perceptible du scroll vertical global sur les tâches les plus fréquentes.
- Toutes les alertes critiques visibles dans le header sans ouvrir une page secondaire.
- Aucun flux clé (inscription, ODC, entraînement, finance) ne dépend d'un long parcours multi-pages.
- Cohérence saison/semaine maintenue dans toutes les sections.

## 9. GitHub Pages et nouveau repo Cymanager_V2

Pour le nouveau repo, ajuster la base Vite au nom du repo cible.
Exemple attendu si repo nommé Cymanager_V2:
- base: /Cymanager_V2/

Le workflow GitHub Actions actuel (build + upload dist + deploy pages) est valide en structure.
Checklist:
- Activer GitHub Pages source = GitHub Actions.
- Vérifier permissions workflow pages + id-token.
- Vérifier base path Vite cohérent avec le nom exact du repo.

## 10. Backlog de démarrage (10 jours)

Jour 1-2:
- AppShell V2, header sticky, navigation.

Jour 3-4:
- SeasonTimeline et WeekChecklist.

Jour 5-6:
- Planning semaine + actions rapides inscriptions/ODC.

Jour 7-8:
- Effectif split view + drawer coureur.

Jour 9:
- Finance projection simplifiée.

Jour 10:
- QA et ajustements UX.

## 11. Décisions à valider avec toi

- Niveau de densité par défaut (Confort ou Dense).
- Priorité produit initiale entre Effectif et Planning.
- Format mobile prioritaire (tableau compact ou cartes).
- Stratégie de migration: big bang ou progressive page par page.
