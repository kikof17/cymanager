# Cymanager

Cymanager est une application React + TypeScript orientée gestion de club Cycling Manager. Elle centralise le roster, les transferts, le calendrier, les résultats, la finance et les paramètres du club dans une interface locale persistée en localStorage.

## État produit

La version applicative courante est la 1.5.0.

Cette version clôt le cycle mémoire et traçabilité du club avec :

- historique Transferts et shortlist
- journal de gestion transverse sur Paramètres, Système, Transferts, Calendrier et Résultats
- snapshots roster hebdomadaires avec forme, âge, valeur, salaire et total
- lecture semaine en cours vs semaine passée sur l'effectif
- alertes métier filtrables et persistantes sur la page Effectif
- backup club intégrant les nouveaux domaines d'historique

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

## Repères fonctionnels

- page Effectif : lecture sportive et capitalistique du roster, timeline coureur, alertes métier
- page Transferts : comparatif marché, shortlist, historique des recrutements et imports
- page Calendrier / Résultats : suivi des courses, statuts, enregistrement des résultats et traçabilité
- page Paramètres : réglages club, changelog de release, backup/import et diagnostic de stockage

## Roadmap

Le cap de la 1.5.0 est désormais stabilisé autour de la mémoire club.
Le prochain chantier majeur visé est la 1.6.0, avec une logique plus transverse entre identité des courses, validation des résultats, stratégie d'équipe et recommandations métier.
