# Cymanager

Cymanager est une application React + TypeScript orientée gestion de club Cycling Manager. Elle centralise le roster, les transferts, le calendrier, les résultats, la finance et les paramètres du club dans une interface locale persistée en localStorage.

## État produit

La version applicative courante est la 1.6.0.

Cette version ouvre le cycle recommandations métier et cohérence transverse du club avec :

- identité stable des courses et migration des anciennes références
- validation et réparation des résultats rattachés aux courses
- recommandations croisées entre entraînement, finance, résultats et statistiques
- lecture des indisponibilités effectif selon blessure et forme critique
- historique hebdomadaire des indisponibilités intégré au backup club
- plan d'entraînement limité à 3 types hebdomadaires avec intensité proposée

## Stack technique

- React 19
- TypeScript 6
- Vite 8
- localStorage comme persistance principale

## Commandes utiles

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Déploiement

Le site est publié automatiquement via GitHub Actions à chaque push sur la branche master.
Il n'y a pas de commande de déploiement manuelle à lancer localement.

## Client lourd Windows

Une version desktop installable est disponible en plus du site web.
La publication GitHub Pages reste inchangée.

Commandes utiles :

```bash
npm run desktop:dev
npm run desktop:build
```

- `desktop:dev` : lance Vite + Electron pour développer le client lourd.
- `desktop:build` : génère un installateur Windows NSIS dans `desktop-dist/`.

Au premier lancement, l'application desktop ouvre un assistant d'initialisation pour saisir les informations manager/equipe (nom d'equipe, ID, pays, saison, date de depart).

## Repères fonctionnels

- page Effectif : lecture sportive et capitalistique du roster, timeline coureur, alertes métier
- page Transferts : comparatif marché, shortlist, historique des recrutements et imports
- page Calendrier / Résultats : suivi des courses, statuts, enregistrement des résultats et traçabilité
- page Paramètres : réglages club, changelog de release, backup/import et diagnostic de stockage

## Roadmap

Le socle 1.6.0 est désormais posé autour de la cohérence transverse du club.
Le prochain chantier majeur peut se concentrer sur le polissage produit, l'affinage UX et les prochains signaux d'aide à la décision.
