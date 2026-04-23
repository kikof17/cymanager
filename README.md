# Cymanager

Cymanager est une application React + TypeScript orientée gestion de club Cycling Manager. Elle centralise le roster, les transferts, le calendrier, les résultats, la finance et les paramètres du club dans une interface locale persistée en localStorage.

## État produit

La version applicative courante est la 2.1.0.

Cette version ouvre le cycle V2 (multi-saison + UX compacte) avec :

- cockpit Accueil compact en onglets avec timeline de saison
- planification multi-saison avec jalons sportifs/finance/entraînement
- calendrier enrichi d'une timeline et des deadlines hebdomadaires
- guide débutant et FAQ en modes QuickStart/Référence avec recherche et filtres
- robustesse renforcée de migration localStorage et cohérence responsive desktop/mobile

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

Le socle 2.1.0 est désormais posé autour d'un pilotage compact et multi-saison.
Le prochain chantier majeur peut se concentrer sur l'automatisation des recommandations et le polissage des workflows métier.
