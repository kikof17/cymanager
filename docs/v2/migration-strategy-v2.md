# Cymanager V2 - Strategie de migration progressive

## Objectif
Faire évoluer l'interface vers V2 sans casser les usages actuels ni risquer une régression globale.

## Contraintes
- Préserver la stabilité de la version actuelle.
- Limiter les gros refactors transverses en une seule livraison.
- Permettre validation utilisateur à chaque étape.

## Strategie
- Approche incrémentale par couches:
  - Couche 1: shell et composants communs
  - Couche 2: modules prioritaires
  - Couche 3: base de connaissance et optimisations
- Livraisons courtes avec retours rapides.
- Mesure systématique avant/après sur temps de tâche et scroll.

## Phases de migration

## Phase 0 - Préparation
- Créer la branche dédiée V2.
- Poser la documentation blueprint + backlog.
- Identifier les composants UI réutilisables existants.
- Définir les conventions de nommage et de statuts visuels.

## Phase 1 - Fondation technique UI
- Implémenter le nouveau layout de base sans changer la logique métier.
- Introduire les nouveaux composants de synthèse.
- Vérifier la compatibilité responsive.
- Brancher les métriques d'usage de base.

## Phase 2 - Migration module Accueil
- Construire le cockpit avec données déjà disponibles.
- Ajouter alertes et recommandations prioritaires.
- Tester la lisibilité et le temps de compréhension.

## Phase 3 - Migration module Effectif
- Passer sur table dense et panneau droit.
- Ajouter filtres persistants.
- Ajouter tags de risque automatiques.

## Phase 4 - Migration module Courses
- Introduire planning compact.
- Ajouter la grille d'inscription assistée.
- Ajouter les présets ODC.

## Phase 5 - Migration modules Entraînement et Finances
- Entraînement: matrice et simulation.
- Finances: dashboard synthétique et projection court terme.

## Phase 6 - Migration Guide/FAQ
- Découper le contenu en fiches.
- Ajouter recherche unifiée.
- Lier les fiches aux écrans contextuels via le panneau droit.

## Gestion du risque
- Utiliser un flag interne pour activer/désactiver certaines vues V2.
- Isoler les changements par PR module.
- Éviter les changements simultanés UI + logique métier profonde.
- Prévoir un protocole de rollback écran par écran.

## Qualité et validation
- Tests manuels orientés tâches réelles:
  - Préparer une course complète
  - Ajuster entraînement hebdo
  - Vérifier viabilité financière
- Vérifier absence de régressions critiques sur les pages existantes.
- Contrôler les performances de rendu sur tables volumineuses.

## Recommandation de branches
- master: stable, production
- feature/v2-foundation: fondation V2
- feature/v2-roster: module effectif V2
- feature/v2-races: module courses V2
- feature/v2-finance-training: finances et entraînement V2
- feature/v2-knowledge: guide et FAQ V2

## Cadence de livraison
- 1 PR fondation
- 1 PR par module prioritaire
- revue fonctionnelle courte à chaque PR
- fusion sur feature/v2-foundation puis vers master quand socle validé

## Critères de bascule V2
- Les modules P0 migrés sont stables.
- Le temps pour accomplir les tâches clés baisse de manière mesurable.
- Le taux d'erreur de configuration course diminue.
- Le feedback utilisateur confirme la meilleure lisibilité.
