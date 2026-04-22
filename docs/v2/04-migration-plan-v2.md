# Cymanager V2 - Plan de migration exécutable

## Objectif
Migrer progressivement de V1 vers V2 sans rupture fonctionnelle et en conservant la livraison continue.

## Stratégie
- Migration incrémentale par écrans.
- Coexistence V1/V2 temporaire.
- Validation métier hebdomadaire à chaque incrément.

## Phase 0 - Préparation (2 à 3 jours)

### Livrables
- AppShell V2 minimal.
- Theme tokens V2.
- Context global Saison/Semaine.

### Tâches
- Créer structure src/components/v2.
- Créer types v2 de base.
- Ajouter feature flag V2_ENABLED.

### Sortie attendue
- Application compilable avec shell V2 isolé.

## Phase 1 - Cockpit et planning (1 semaine)

### Livrables
- Cockpit V2 fonctionnel.
- Planning semaine V2.

### Tâches
- Implémenter timeline 10 semaines.
- Implémenter checklist hebdo.
- Connecter alertes critiques (forme, effectif, sponsor, finance).
- Implémenter board courses semaine.

### Critères d'acceptation
- Les tâches hebdo critiques visibles en moins de 2 interactions.
- Pas de scroll long pour valider les actions de base.

## Phase 2 - Effectif et entraînement (1 semaine)

### Livrables
- Effectif split view + drawer.
- Entraînement 3 groupes max.

### Tâches
- Migrer tableau effectif en dense view.
- Ajouter statut disponibilité unifié.
- Implémenter alertes cohérence entraînement.

### Critères d'acceptation
- Consultation et décision coureur sans navigation de page supplémentaire.

## Phase 3 - Finances et transferts (1 semaine)

### Livrables
- Projection budget J+7/J+14.
- Impact transfert avant validation.

### Tâches
- Construire calculateur projection hebdo.
- Afficher impact masse salariale instantané.
- Ajouter alertes risque faillite plus visibles.

### Critères d'acceptation
- Toute action de transfert expose son impact budget avant confirmation.

## Phase 4 - Stabilisation (3 à 5 jours)

### Livrables
- QA métier et UX.
- Ajustements responsive.

### Tâches
- Revue cohérence saison/intersaison.
- Tests desktop/mobile.
- Nettoyage composants V1 obsolètes.

## Plan de tests minimal

### Tests métier
- Saison de 10 semaines correctement représentée.
- Catégories U21/U25 conformes à l'intersaison.
- Limite 25 coureurs correctement signalée.
- Alertes sponsor visibles quand contrainte non satisfaite.

### Tests UX
- Réduction du scroll sur Cockpit et Planning.
- Lisibilité des états critiques.

### Tests techniques
- Build Vite.
- Lint.
- Déploiement Pages réussi.

## Risques et mitigations

- Risque: dérive de scope.
  - Mitigation: valider en fin de phase avant d'ouvrir la suivante.

- Risque: dette de coexistence V1/V2.
  - Mitigation: suppression V1 planifiée en phase 4.

- Risque: incohérences métier dans les alertes.
  - Mitigation: checklists de validation alignées sur FAQ/guide.
