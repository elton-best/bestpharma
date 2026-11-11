# Recette courante : MFA obligatoire et export contrôlé

Les décisions métier ultérieures rendent le MFA obligatoire pour les administrateurs et coordinateurs. La commande `npm test` exécute désormais `mandatory.cjs` (également `npm run test:policy`). Elle exige un compte de recette **jetable**, pas vos comptes de démonstration habituels.

Prérequis : API Laravel locale migrée, frontend mode API, configuration MFA obligatoire laissée active. Installer les dépendances via `npm ci` dans ce dossier. Depuis `backend/`, créer la fixture :

```sh
php tests/browser-mfa-fixture.php create
```

Cette commande affiche uniquement l’email de la fixture. Depuis `scripts/browser/`, fournir cet email à la recette :

```sh
BESTPHARMA_MFA_TEST_EMAIL=<email-affiché> npm test
```

**Même si le test échoue**, désactiver ensuite le compte jetable depuis `backend/` :

```sh
php tests/browser-mfa-fixture.php disable <email-affiché>
```

Ce helper CLI refuse les environnements autres que local/testing et ne désactive que ses propres fixtures, identifiées par leur préfixe et leur nom. Le mot de passe de recette fictif est codé dans le test ; il ne doit servir à aucun compte réel. La recette configure un authentificateur uniquement sur cette fixture et ne révèle aucun secret ni code. Aucune boîte locale de liens secrets n’est nécessaire pour ce scénario.

Le scénario vérifie la redirection obligatoire, le refus API direct, la configuration TOTP, la révocation des sessions, la reconnexion, l’absence de désactivation et le téléchargement CSV confirmé avec événement d’audit.

## Ancienne recette de référence

Les scripts registration/security/logo/access/navigation/mobile et `npm run test:baseline` correspondent à la recette précédant l’obligation MFA et la confirmation humaine d’habilitation. Ils restent des références historiques ; **ils ne sont pas compatibles tels quels avec des comptes privilégiés non enrôlés sous la nouvelle règle**. Ne pas désactiver la règle de production pour obtenir un résultat vert. Les résultats historiques sont identifiés comme tels dans la documentation. Les nouveaux contrôles serveur de MFA/export/habilitation sont dans `MandatoryMfaAndExportTest` et la recette courante ci-dessus.

Tous les tests navigateur refusent les origines non locales. Variables facultatives : `BESTPHARMA_UI_URL`, `BESTPHARMA_API_URL`, `CHROMIUM_EXECUTABLE`. Sans chemin système, le binaire npm Sparticuz est utilisé. Les bibliothèques système doivent être disponibles ; le sandbox de recette utilise `LD_LIBRARY_PATH=/tmp/al2023/lib`. Google/SMTP réels ne sont pas prétendus validés par ces tests.

## Première tranche M2 : demandes d’accompagnement

Créer une **nouvelle** fixture avec son officine dédiée (ne pas réutiliser un compte déjà enrôlé) :

```sh
# Depuis backend/
php tests/browser-mfa-fixture.php create --office
# Depuis scripts/browser/
BESTPHARMA_MFA_TEST_EMAIL=<email-affiché> npm run test:support
# Depuis backend/, même en cas d’échec
php tests/browser-mfa-fixture.php disable <email-affiché>
```

Le scénario rejoue MFA/export M1, puis enregistre un brouillon M2, recharge la page, soumet après confirmation, retire avec motif et vérifie la conservation après rechargement. Il exige zéro erreur JavaScript. Le nettoyage désactive le compte, révoque ses jetons et archive son officine fictive ; il ne purge pas les demandes.


## Stock — pages autonomes (démo)

`npm run test:stock` utilise par défaut `http://127.0.0.1:3000` en **mode démonstration**. La recette est en lecture seule et n’exige pas de fixture MFA. Elle parcourt les 13 URL, contrôle l’absence de barre d’onglets répétée, les files FEFO/rappels, la consultation en modale et les emplacements sur viewport mobile. Aucun stock partagé n’est écrit ou restauré.

Si les bibliothèques Chromium ne sont pas sur le chemin système, fournir le `LD_LIBRARY_PATH` de l’environnement. Dans le sandbox restauré courant :

```sh
LD_LIBRARY_PATH=/home/user/.cache/bestpharma-runtime/al2/package/native/lib:/home/user/.cache/bestpharma-runtime/package/native/lib npm run test:stock
```

Ce chemin appartient au runtime local, pas au code applicatif ni à une configuration de production.

## Stock connecté — réception et comptage

Créer une fixture **neuve** depuis `backend/` :

```sh
php tests/browser-mfa-fixture.php create --office
```

Puis depuis `scripts/browser/` :

```sh
BESTPHARMA_MFA_TEST_EMAIL=<email-affiché> npm run test:stock-api
```

Le scénario utilise le port 3001 par défaut, configure le MFA, crée produit/emplacement, réceptionne en quarantaine, lève la quarantaine avec motif puis enregistre un écart de comptage et vérifie la persistance. Ne pas le lancer sur un compte réel. Les bibliothèques Chromium du runtime doivent être sur `LD_LIBRARY_PATH` si nécessaire (voir recette démo ci-dessus).

**Même en cas d’échec**, nettoyer depuis `backend/` :

```sh
php tests/browser-mfa-fixture.php disable <email-affiché>
```

La fixture et son officine sont désactivées/archivées, pas purgées. Aucun document réglementaire ni donnée patient n’est créé.


## M2 — Diagnostic configurable et versionné

Créer une fixture neuve depuis `backend/` :

```sh
php tests/browser-mfa-fixture.php create --office --mission
```

Depuis `scripts/browser/`, avec les bibliothèques Chromium sur le chemin système ou le `LD_LIBRARY_PATH` du runtime décrit plus haut :

```sh
BESTPHARMA_MFA_TEST_EMAIL=<email-affiché> npm run test:diagnostics
```

Le scénario configure le MFA puis crée un modèle sans grille préremplie, ajoute une question fictive, publie, crée le diagnostic, renseigne une réponse non applicable justifiée, enregistre, soumet, partage et vérifie sa persistance après rechargement. L’API/front local utilise le port 3001 par défaut. Aucune grille réglementaire ni donnée patient.

**Même en cas d’échec**, depuis `backend/` :

```sh
php tests/browser-mfa-fixture.php disable <email-affiché>
```

`--mission` prépare directement les droits et une mission active **de fixture seulement** : ce test ne remplace pas la recette du circuit d’approbation de l’équipe. Le helper reste interdit hors local/testing ; il ne doit pas être exposé par HTTP.
