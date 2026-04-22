# Cymanager V2 - Backlog priorise

## Convention de priorisation
- P0: indispensable pour livrer la base V2
- P1: forte valeur, livré juste après
- P2: amélioration de confort

## Epic 1 - Shell V2 et fondation UX
### Ticket V2-001 (P0)
- Titre: Créer un layout applicatif V2 fixe
- Description: Mettre en place barre haute fixe, navigation gauche et panneau droit contextuel.
- Critères d'acceptation:
  - Le shell s'affiche sur toutes les pages principales.
  - Le panneau droit peut afficher un contenu contextuel.
  - La navigation reste visible sans scroll long.

### Ticket V2-002 (P0)
- Titre: Définir les composants de lecture synthétique
- Description: Ajouter KPI card, alert block, insight card et rule hint.
- Critères d'acceptation:
  - Les composants supportent variation, statut et action.
  - Les couleurs de statut sont homogènes sur tous les composants.

### Ticket V2-003 (P1)
- Titre: Ajouter système de densité d'affichage
- Description: Permettre mode compact/confort pour tables et cartes.
- Critères d'acceptation:
  - Le mode compact affiche plus d'information sans casser la lisibilité.
  - Le choix est persistant localement.

## Epic 2 - Accueil V2 (Cockpit)
### Ticket V2-101 (P0)
- Titre: Construire la vue cockpit
- Description: Afficher KPI prioritaires, alertes critiques et recommandations hebdomadaires.
- Critères d'acceptation:
  - Les 3 actions recommandées sont visibles sans navigation supplémentaire.
  - Les alertes sont triées par sévérité.

### Ticket V2-102 (P1)
- Titre: Journal de gestion compact
- Description: Afficher les événements récents de gestion en format lisible.
- Critères d'acceptation:
  - Le journal est filtrable par type d'événement.
  - Un clic ouvre le détail dans le panneau droit.

## Epic 3 - Effectif V2
### Ticket V2-201 (P0)
- Titre: Remplacer les cartes par table dense pilotable
- Description: Introduire une table principale triable/filtrable avec colonnes configurables.
- Critères d'acceptation:
  - Tri multi-colonnes disponible.
  - Filtres persistants sur catégorie et alertes.

### Ticket V2-202 (P0)
- Titre: Fiche coureur en panneau droit
- Description: Ouvrir un résumé complet du coureur sans quitter la table.
- Critères d'acceptation:
  - Affichage profil, historique récent et recommandations.
  - Aucun changement de page requis.

### Ticket V2-203 (P1)
- Titre: Ajouter tags de risque automatiques
- Description: Surpayé, forme faible, vétéran à risque, potentiel.
- Critères d'acceptation:
  - Les tags sont cohérents avec les seuils métiers.
  - Les seuils sont documentés et traçables.

## Epic 4 - Courses V2
### Ticket V2-301 (P0)
- Titre: Vue planning hebdo compacte
- Description: Proposer un planning court avec accès direct à la préparation.
- Critères d'acceptation:
  - Les courses de la semaine sont visibles en un écran desktop.
  - Sélection de course sans rechargement de page.

### Ticket V2-302 (P0)
- Titre: Grille d'inscription assistée
- Description: Montrer admissibilité, adéquation profil et impact forme.
- Critères d'acceptation:
  - Les contraintes U21/U25/pro sont vérifiées automatiquement.
  - Les conflits bloquants sont signalés avant validation.

### Ticket V2-303 (P1)
- Titre: Présets ODC
- Description: Permettre sauvegarde et réutilisation de tactiques.
- Critères d'acceptation:
  - Sauvegarde de présets par type de course.
  - Application d'un preset en un clic.

## Epic 5 - Entraînement V2
### Ticket V2-401 (P0)
- Titre: Matrice d'entraînement par cohorte
- Description: Affectation rapide par groupe de coureurs.
- Critères d'acceptation:
  - Affectation en lot possible.
  - Visualisation claire des 3 axes actifs.

### Ticket V2-402 (P1)
- Titre: Simulation impact hebdo
- Description: Montrer tendance forme/progression selon choix.
- Critères d'acceptation:
  - Simulation visible avant validation.
  - Message d'alerte en cas de stratégie risquée.

## Epic 6 - Finances V2
### Ticket V2-501 (P0)
- Titre: Dashboard financier synthétique
- Description: Afficher net hebdo, tendances et marge de sécurité.
- Critères d'acceptation:
  - Seuil de faillite visible en permanence dans le module.
  - Décomposition recettes/dépenses claire en un écran.

### Ticket V2-502 (P1)
- Titre: Simulation court terme
- Description: Projeter 2 à 4 semaines selon hypothèses simples.
- Critères d'acceptation:
  - Paramètres simulation modifiables.
  - Résultat exprimé en risque faible/moyen/fort.

## Epic 7 - Guide/FAQ V2
### Ticket V2-601 (P1)
- Titre: Base de connaissances en fiches
- Description: Convertir les contenus longs en fiches actionnables.
- Critères d'acceptation:
  - Chaque fiche contient objectif, règles, erreurs fréquentes.
  - Lecture mobile optimisée.

### Ticket V2-602 (P1)
- Titre: Recherche unifiée
- Description: Moteur de recherche pour retrouver règle et conseil.
- Critères d'acceptation:
  - Recherche par mots-clés et formulation naturelle.
  - Résultats classés par pertinence.

## Plan de livraison suggéré
- Lot A (P0): V2-001, V2-002, V2-101, V2-201, V2-202, V2-301, V2-302, V2-401, V2-501
- Lot B (P1): V2-003, V2-102, V2-203, V2-303, V2-402, V2-502, V2-601, V2-602
- Lot C (P2): ajustements UX avancés, micro-optimisations et expérimentation

## Définition de done transversale
- Comportement responsive validé desktop/tablet/mobile.
- Aucun bloc critique d'accessibilité.
- Aucune régression fonctionnelle P0 détectée.
- Mesure analytique branchée sur les vues clés.
