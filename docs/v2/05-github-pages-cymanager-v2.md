# Cymanager V2 - Mise en ligne GitHub Pages (repo Cymanager_V2)

## 1. Prérequis
- Le repo cible est: Cymanager_V2.
- La publication se fait via GitHub Actions.

## 2. Configuration Vite
Dans le fichier de config Vite du nouveau repo:
- définir base sur /Cymanager_V2/

Sans cette valeur, les assets risquent de ne pas se charger sur GitHub Pages.

## 3. Workflow Actions
Le workflow de déploiement doit couvrir:
- checkout
- setup node
- npm ci
- npm run build
- configure-pages
- upload artifact dist
- deploy-pages

## 4. Paramètres GitHub Pages
Dans le repo Cymanager_V2:
- Settings > Pages
- Source: GitHub Actions

## 5. Permissions workflow
Vérifier dans le workflow:
- pages: write
- id-token: write

## 6. Vérification post-déploiement
- Ouvrir l'URL Pages.
- Vérifier chargement CSS/JS.
- Vérifier refresh direct sur une route interne.
- Vérifier absence d'erreur base path dans la console.

## 7. Checklist rapide avant premier push
- package.json présent et scripts build valides.
- base Vite alignée avec le nom exact du repo.
- workflow présent dans .github/workflows.
- branche de push alignée avec le trigger du workflow.

## 8. Dépannage express
- Symptôme: page blanche après déploiement.
  - Cause probable: base Vite incorrecte.

- Symptôme: 404 sur assets.
  - Cause probable: mauvais chemin de publication ou base path.

- Symptôme: workflow OK mais pas de site.
  - Cause probable: source Pages non configurée sur GitHub Actions.
