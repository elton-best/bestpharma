# AIFAC Android

L'application Android AIFAC est une coque Capacitor qui charge la plateforme TanStack Start déployée sur :

`https://ai-factory.eltonhounnou.me`

Elle nécessite donc une connexion Internet pour les fonctions principales.

## Générer les ressources visuelles

```bash
npm run android:assets
```

Cette commande régénère les icônes et écrans de démarrage à partir des sources de `resources/android/`.

## Synchroniser le projet natif

```bash
npm ci --legacy-peer-deps
npm run android:sync
```

## Générer un APK de test localement

Prérequis : JDK 21 et Android SDK 36.

```bash
npm run android:build
```

APK généré :

`android/app/build/outputs/apk/debug/app-debug.apk`

L'APK de debug est signé automatiquement avec une clé de développement. Il sert uniquement aux tests et ne doit pas être publié sur Google Play.

## Générer l'APK avec GitHub Actions

1. Ouvrir l'onglet **Actions** du dépôt GitHub.
2. Sélectionner le workflow **Android APK**.
3. Choisir **Run workflow** et la branche `main` (ou `ai-factory-build`).
4. Lorsque le build est terminé, télécharger l'artifact **AIFAC-debug-apk**.
5. Extraire `AIFAC-debug.apk`, puis le transférer sur le téléphone Android.

Android peut demander l'autorisation d'installer une application provenant du navigateur ou du gestionnaire de fichiers.

## Publication future

Une publication Google Play nécessitera une clé de signature de production. Cette clé et ses mots de passe ne doivent jamais être ajoutés au dépôt Git.
