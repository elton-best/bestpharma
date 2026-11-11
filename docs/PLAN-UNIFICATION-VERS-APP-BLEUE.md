# Unification vers l’application bleue BestPharma

## Décision utilisateur

L’application de référence est `bestpharma/` (Laravel modulaire + Vue). L’ancienne application située à la racine (`backend/` + `frontend/`) doit être remplacée après portage des fonctions absentes. Ne pas recopier ses frameworks ni fusionner directement ses migrations. Garder le dépôt Git et les sources CDC/métier utiles.

## Garde-fous

- Ne pas retirer l’ancien code tant que les domaines utiles ne sont pas portés et testés dans la cible.
- Ne pas supprimer les CDC, procédures, corpus ou l’historique Git avec le code applicatif.
- Traiter les résultats de tests comme preuve par domaine, pas comme preuve de livraison complète.
- Les écrans, services tiers et qualificatifs réglementaires non validés restent explicitement indisponibles ou en attente.
- Les comptes et données de démo restent fictifs; les secrets réels ne sont pas copiés.

## État local de démarrage

- Front officine : `http://localhost:3001` (API mode, proxy vers `:8002`).
- Back-office : `http://localhost:3002` (proxy API vers `:8002`).
- API Laravel : `http://localhost:8002/api/v1/health`.
- PostgreSQL cible isolé : `127.0.0.1:5433`, bases `bestpharma` et `bestpharma_test`, cluster sous `~/.local/share/bestpharma-blue-postgres` (persistant entre redémarrages).
- PHP disponible : 8.3.6 alors que le manifeste cible exige PHP `^8.4`. Les dépendances ont été installées en ignorant ce seul prérequis Composer pour démarrer et évaluer localement; ceci n’est pas une configuration supportée ni production.
- La base cible `bestpharma` est initialisée (27 migrations) et contient le seed local (3 comptes fictifs). La base `bestpharma_test` est séparée. Ne pas lancer `migrate:fresh` sur la base démo.
- Docker absent. `SESSION_DRIVER=file`, `CACHE_STORE=file`, `QUEUE_CONNECTION=sync` dans le `.env` local afin de ne pas dépendre de Redis.

## Portages en cours / état initial

| Domaine | Cible avant portage | Action / état |
|---|---|---|
| M01 accès et M02 accompagnement | Déjà présents dans la cible, avec API/UI et tests; comparer les invariants aux anciens tests, éviter les doublons. | À réconcilier, pas à recopier. |
| Températures / chaîne du froid | Pas de parcours API/UI équivalent. | Première tranche portée; seuils/conformité non inventés. API/UI tests ajoutés. |
| Documents / GED | Service cible était un placeholder. | GED, import privé en quarantaine, qualification/approbation humaine, canevas versionnés et suivis avec conflit 409 portés et testés; aucune source historique n’est approuvée par défaut. |
| POS / caisse / dispensation | Services cible majoritairement placeholders. | POS espèces, FEFO et reçu interne; demandes de dispensation avec confirmation humaine/visa explicite et FEFO atomique portés et testés. Paiements/fiscalité restent désactivés. |
| Auto-évaluation BPD / NC-CAPA | Pas de référentiel BPD approuvé dans la cible; l’ancien contrôleur NC expose des transitions insuffisamment contraintes et sans test Feature dédié identifié. | Auto-évaluation explicitement indisponible; l’UI sépare désormais Actions qualité des NC/CAPA encore planifiées. Aucun score, grille, seuil ni fermeture réglementaire inventés. |
| Appareils autorisés | API absente de la cible. | Tenancy : empreinte HMAC, transitions versionnées, audit, isolation et MFA; testé. |
| Synchronisation hors ligne | Seule une tranche de demandes brouillon est établie comme utile. | Push API de brouillons idempotent, conflits `409`, horodatages client/serveur distincts et contrôle tenant; testé. |
| Consolidation, gardes, RH et équipements hors températures | Parité incomplète ou non établie. | Inventaire/portage ultérieur limité aux parcours soutenus par CDC, contrôleurs et tests réels. |

## Recette du 11 novembre 2026

- Front Vue : **132 tests passent**, typecheck et build réussis après raccords POS/Dispensation/Appareils et GED. Après le dernier libellé de navigation, les tests ciblés de navigation (6) passent également.
- Admin Vue : typecheck/build réussis.
- Backend Laravel, sur PostgreSQL isolé `bestpharma_test` : **160 tests / 1 088 assertions passent**; POS, FEFO, idempotence, GED/corpus, appareils, sync, import CSV, horodatage explicite et isolation testés.
- Migrations cible : **27 appliquées**, aucune en attente, sur PostgreSQL `bestpharma`.
- Réserve : vérification faite sous PHP 8.3.6 après `composer install --ignore-platform-req=php`; le projet demande PHP 8.4. Les tests passent, mais l’environnement reste hors contrainte déclarée et doit être revalidé sous PHP 8.4.
- Serveurs locaux (relancés depuis le chemin persistant `/home/beg2/elton/bestpharma` après remappage du workspace) : API `:8002`, SPA `:3001`, admin `:3002`; PostgreSQL `:5433`. Les fronts sont en mode API; API directe et proxys `/api/v1/health` répondent `200`.

## Critères avant retrait des anciens dossiers applicatifs

1. Inventaire signé des fonctions effectivement présentes dans l’ancien et décision pour chaque domaine : porter, déjà couvert dans la cible, ou ne pas reprendre (démo, doublon, règle non validée).
2. Pour chaque fonction retenue : API/migrations compatibles avec le tenant cible, écrans Vue, autorisations serveur et tests de transitions, erreurs, répétitions et isolement.
3. Migrations testées sur `bestpharma_test`; tests frontend/build sur Node 22; recettes navigateur ciblées lorsque pertinentes.
4. Fonctions non validées (paiements, e-MECeF, règles cliniques/réglementaires) restent désactivées et libellées.
5. Procédures, CDC, tests de référence et rapports nécessaires sont archivés dans `bestpharma/docs/`.
6. Après validation, retirer uniquement l’ancien code applicatif racine (et ses scripts de lancement dédiés). Préserver `.git`, les CDC/procédures transférés et les références externes utiles. Les bases sont des données distinctes et ne sont pas supprimées par cette étape.
