# Cymanager V2 - Blueprint UX/UI

## Objectifs produit
- Réduire fortement le scroll vertical.
- Améliorer la clarté de lecture des données clés.
- Rendre les décisions de gestion plus rapides et plus fiables.
- Conserver la richesse métier sans noyer l'utilisateur.

## Principes de conception
- Une page = un objectif principal.
- Résumé d'abord, détail au clic.
- Densité contrôlée: moins de texte narratif, plus de signaux visuels.
- Navigation constante: moins de changements de contexte.
- Règles et explications accessibles à la demande.

## Architecture d'interface cible
- Barre haute fixe:
  - Saison / semaine
  - Division active
  - Trésorerie
  - Alertes critiques
  - Recherche globale
- Navigation gauche:
  - Accueil
  - Effectif
  - Courses
  - Entraînement
  - Finances
  - Transferts
  - Résultats
  - Paramètres
- Zone centrale:
  - Vue principale du module
- Panneau droit contextuel:
  - Détails de l'élément sélectionné
  - Règles associées
  - Actions rapides

## Design system fonctionnel
### Règles visuelles
- Vert: conforme et stable
- Orange: vigilance
- Rouge: risque immédiat
- Bleu: information neutre

### Typologie des blocs
- KPI card: métrique + variation N-1 + mini tendance
- Data table dense: tri, filtres, colonnes épinglées
- Insight card: recommandation actionnable
- Rule hint: rappel d'une règle métier contextuelle
- Alert block: raison + impact + action proposée

### Lisibilité des données
- Toujours afficher la variation relative et absolue quand possible.
- Nommer les indicateurs avec des libellés courts et stables.
- Ne jamais mélanger règle métier et valeur calculée dans le même bloc.
- Montrer les unités de façon systématique.

## Blueprint par écran

## 1) Accueil V2 (Cockpit)
### Objectif
Donner en 30 secondes un état global et les 3 prochaines actions utiles.

### Above the fold
- KPI de pilotage (4 à 6): caisse, masse salariale, forme moyenne, points semaine, alertes.
- Bloc alertes priorisées.
- Bloc recommandations de la semaine.

### En dessous (sans scroll sur desktop standard si possible)
- Mini calendrier courses à venir.
- Journal de gestion compact (dernières décisions importantes).
- Résumé effectif (Pro/U25/U21) en trois colonnes.

## 2) Effectif V2
### Objectif
Analyser vite la valeur sportive et le risque effectif.

### Structure
- Table principale dense (colonnes configurables).
- Filtres persistants (catégorie, âge, forme, alertes).
- Panneau droit sur sélection coureur:
  - Profil synthétique
  - Historique récent
  - Recommandations entraînement/usage course

### Clarté
- Tags automatiques: Surpayé, Forme faible, Potentiel, Vétéran à risque.
- Colonnes delta semaine pour valeur, salaire, forme.

## 3) Courses V2
### Objectif
Préparer les inscriptions et ODC avec moins d'allers-retours.

### Structure
- Planning hebdo compact.
- Sélecteur de course en bandeau.
- Grille coureurs admissibles + indicateur d'adéquation au profil.
- Panneau droit ODC:
  - Présets
  - Leaders/équipiers/électron libre
  - Projection de perte de forme

### Aide contextuelle
- Avertissements automatiques sur contraintes de catégorie et forme minimale.

## 4) Entraînement V2
### Objectif
Arbitrer rapidement entre progression et récupération de forme.

### Structure
- Matrice coureurs x entraînements assignés.
- Mode simulation impact attendu (forme + progression probable).
- Regroupement par cohorte (jeunes, pros, vétérans).

### Décision assistée
- Recommandation de répartition sur 3 axes d'entraînement.
- Alerte sur conflits (tour en cours, blessure, forme critique).

## 5) Finances V2
### Objectif
Lire le risque financier en un coup d'oeil.

### Structure
- Résultat net hebdo + tendance 4 semaines.
- Décomposition revenus/dépenses.
- Simulation simple à horizon 2 à 4 semaines.
- Actions rapides (vente, réduction installation, arbitrage dépenses).

### Clarté
- Tableau flux classé par impact.
- Mise en évidence du seuil de faillite et de la marge de sécurité.

## 6) Transferts V2
### Objectif
Mieux acheter/vendre avec une vision rentabilité/risque.

### Structure
- Liste des cibles avec score de pertinence.
- Shortlist centralisée.
- Comparateur coureur actuel vs cible.

### Garde-fous
- Alerte salaire non soutenable selon division.
- Alerte risque retraite en intersaison.

## 7) Base de connaissance V2 (Guide + FAQ)
### Objectif
Remplacer les blocs longs par des réponses actionnables.

### Structure
- Recherche sémantique en langage naturel.
- Fiches courtes par objectif.
- Section "Règle officielle" et section "Conseil pratique" séparées.
- Checklists hebdomadaires (débutant, stabilisation, montée).

## Responsive
- Desktop: layout 3 zones (nav, centre, panneau droit).
- Tablet: panneau droit en tiroir.
- Mobile: navigation basse + fiches repliables, priorité aux actions.

## KPIs de succès V2
- Diminution du scroll moyen par session.
- Diminution du temps pour préparer une course.
- Diminution des erreurs d'inscription/ODC.
- Augmentation de l'usage des vues synthétiques.
- Baisse des actions menant à un risque de faillite non anticipé.
