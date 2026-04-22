# Cymanager V2 - Wireframes texte

## 1. Cockpit (desktop)

Disposition globale:
- Header sticky: Saison X | Semaine Y/10 | Solde | Alertes.
- Ligne 1: Timeline saison 10 semaines.
- Ligne 2: grille 3 colonnes.

Colonne A - A faire maintenant:
- Carte Inscriptions.
- Carte ODC.
- Carte Entraînement.

Colonne B - Risques:
- Forme critique.
- Effectif limite.
- Sponsor.
- Finance.

Colonne C - Impact semaine:
- Points estimés.
- Primes estimées.
- Forme moyenne.
- Solde prévisionnel.

Interactions:
- Clic carte => ouvre panneau latéral de correction rapide.
- Clic semaine dans timeline => recharge contexte de la semaine ciblée.

## 2. Planning semaine (desktop)

Disposition:
- Gauche: tableau courses de la semaine.
- Droite: détail course sélectionnée.

Tableau (gauche):
- Jour
- Type (U21/C2/U25/C1/GT/MT)
- Profil
- Inscrits
- ODC
- Risque
- Action

Détail course (droite):
- Bloc sélection coureurs.
- Bloc rôle ODC.
- Bloc vérifications (forme, catégorie, sponsor).
- Bouton valider.

## 3. Effectif (desktop)

Disposition:
- Haut: onglets Tous/Pros/U25/U21/Indisponibles.
- Bas: split view.

Gauche (tableau):
- Nom
- Âge
- Catégorie
- Forme
- Notes clés
- Valeur
- Salaire
- Disponibilité

Droite (fiche coureur):
- Profil synthétique.
- Points forts/faibles.
- Risque forme.
- Historique court.

## 4. Entraînement (desktop)

Disposition:
- Haut: 3 cartes groupes d'entraînement.
- Bas: liste coureurs par groupe.

Carte groupe:
- Type entraînement
- Intensité
- Nombre coureurs
- Impact forme moyen
- Alertes

## 5. Finances (desktop)

Disposition:
- Header KPI: Solde, Delta, Runway.
- Grille 2 colonnes.

Colonne A:
- Entrées prévues semaine.
- Sorties prévues semaine.

Colonne B:
- Projection J+7/J+14.
- Simulateur simple (achat/vente/upgrade).

## 6. Mobile

Principes:
- Même architecture, mode mono-colonne.
- Sections repliables.
- Actions clés visibles en premier écran:
  - Alertes critiques
  - Inscriptions manquantes
  - Validation entraînement

## 7. Règles anti-scroll
- Pas de page monolithique.
- Données secondaires dans tiroirs ou sections repliables.
- Tableau dense activable pour les power users.
- Filtres persistants pour éviter les re-saisies.
