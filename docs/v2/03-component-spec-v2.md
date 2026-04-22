# Cymanager V2 - Spécification des composants

## 1. Layout

### AppShellV2
Rôle:
- Structure globale de l'application.

Responsabilités:
- Header sticky.
- Navigation latérale.
- Zone contenu avec panneaux.

### StickySeasonHeader
Rôle:
- Afficher contexte saison/semaine en permanence.

Props minimales:
- seasonNumber
- weekNumber
- divisionLabel
- balance
- criticalAlertsCount

### SplitPane
Rôle:
- Répartir liste/détail avec largeur ajustable.

## 2. Composants métier

### SeasonTimeline
Rôle:
- Afficher les 10 semaines d'une saison.

Props minimales:
- currentWeek
- selectedWeek
- weekStatuses
- onWeekSelect

### WeekChecklist
Rôle:
- Présenter les tâches hebdo à valider.

Props minimales:
- items
- onOpenItem
- onMarkDone

### RiskStack
Rôle:
- Empiler les alertes par sévérité.

Props minimales:
- risks
- onRiskClick

### RaceWeekBoard
Rôle:
- Vue planning des courses de la semaine.

Props minimales:
- races
- onRaceSelect
- onQuickFix

### RiderAvailabilityChip
Rôle:
- Normaliser l'état de disponibilité coureur.

États:
- available
- low-form
- injured
- ineligible-category

### TrainingPlanBoard
Rôle:
- Gérer les 3 groupes d'entraînement max.

Props minimales:
- groups
- riders
- impacts
- onEditGroup

### FinanceProjectionPanel
Rôle:
- Afficher projection budget court terme.

Props minimales:
- balance
- incoming
- outgoing
- projection7d
- projection14d

## 3. Composants utilitaires

### SeverityBadge
- Standard de couleur et label pour les niveaux info/attention/critique.

### ContextTabs
- Onglets de contexte par section.

### PersistedFilterBar
- Filtres persistants en localStorage.

## 4. Conventions techniques

### Nommage
- Dossier: src/components/v2/
- Fichiers: PascalCase.tsx

### Typage
- Types centralisés dans src/types/v2/
- Props strictes et explicites.

### Accessibilité
- Focus visible.
- Navigation clavier.
- Labels explicites pour actions rapides.

### Performance
- Virtualisation pour tableaux volumineux.
- Mémorisation des calculs de projection.

## 5. Ordre d'implémentation recommandé
1. AppShellV2
2. StickySeasonHeader
3. SeasonTimeline
4. WeekChecklist + RiskStack
5. RaceWeekBoard
6. TrainingPlanBoard
7. FinanceProjectionPanel
