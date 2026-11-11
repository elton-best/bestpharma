# Validation backend réelle — 10 novembre 2026

## Environnement et résultats

Exécution native, sans Docker : PHP 8.4.27, Composer 2.10.3, Laravel 12.64.0, PostgreSQL 16.15, Redis 7.4.12. Runtime temporaire hors Git, services PostgreSQL/Redis liés à loopback uniquement. Bases distinctes `bestpharma_app` et `bestpharma_test`.

- Installation des 189 dépendances verrouillées + `composer validate` réussis.
- 7 migrations et seed local exécutés sur PostgreSQL.
- `php artisan test` : **29 tests / 120 assertions**, sans avertissements, sur SQLite mémoire puis PostgreSQL 16.
- Frontend : **42 tests / 9 fichiers**, vérification TypeScript + build Vite réussis.
- Redis : PING, cache Laravel put/pull et suppression confirmés.
- `scripts/validate-api.py` : **41 contrôles HTTP réussis** sur le serveur Laravel, PostgreSQL et Redis réels.

## Parcours HTTP vérifié

Inscription fictive → absence de droits métier → instruction BEG → compléments → correction demandeur → nouvelle instruction → activation. Activation directe refusée. Compte demandeur interdit sur les routes plateforme.

Création/liste d’action qualité, clôture refusée sans bilan puis acceptée avec bilan ; rôles lecture/écriture, invitation et acceptation, droits réellement effectifs, suspension immédiatement appliquée au token existant, protection du dernier administrateur. Refus d’autre officine et ressource étrangère invisible. Logout révoque le token.

Avec **4 workers PHP**, deux acceptations simultanées du même lien donnent **201 + 422**. Deux administrateurs qui retirent simultanément leurs propres droits donnent **200 + 409** : au moins un administrateur actif reste présent. Ces deux tests HTTP reproduisent les transactions concurrentes sur PostgreSQL, contrairement aux tests unitaires séquentiels.

## Corrections issues de l’exécution

1. Assertion sur colonne JSON rendue portable (décodage de la valeur plutôt qu’égalité SQL JSON non supportée par PostgreSQL).
2. Limiteurs nommés séparés : login, inscription, acceptation, invitation et instruction ne consomment plus le même quota par IP. Login limité aussi par compte + IP. Un test protège cette séparation.
3. Garde de tests avant `RefreshDatabase` : environnement testing et SQLite mémoire / fichier `_test.sqlite`, ou PostgreSQL dont la base finit par `_test`. Une base applicative ne doit jamais être utilisée par la suite.
4. Diagnostics Horizon et Telescope explicitement fermés par défaut, en attente de politique d’accès.
5. Dockerfile ajusté aux extensions des dépendances et aux tests SQLite ; setup Docker reproductible, frontend Compose en mode API. **Non exécutés dans ce sandbox sans Docker.**
6. Workflow actif ajouté à `.github/workflows/bestpharma-validation.yml` dans la racine du dépôt parent (SQLite/PostgreSQL + interfaces). Le workflow imbriqué du sous-projet n’est pas exécuté par ce dépôt. **Aucun lancement GitHub revendiqué.**

## Reproduire

Installer PHP 8.4 + extensions, Composer, PostgreSQL 16 et Redis 7, copier `backend/.env.example` vers `.env`, configurer des accès locaux, puis :

```bash
cd backend
composer install
php artisan key:generate
php artisan migrate --seed
php artisan test
# Base dédiée créée au préalable ; remplacer les accès locaux :
DB_CONNECTION=pgsql DB_HOST=127.0.0.1 DB_PORT=5433 DB_DATABASE=bestpharma_test DB_USERNAME=postgres DB_PASSWORD=secretpassword php artisan test
PHP_CLI_SERVER_WORKERS=4 php artisan serve --host=0.0.0.0 --port=8000 --no-reload
```

Dans un second terminal, depuis `bestpharma/` :

```bash
python3 scripts/validate-api.py
# Puis, aperçu connecté (le navigateur utilise le proxy relatif /api) :
cd frontend
VITE_DATA_MODE=api VITE_VALIDATION_MODE=true API_PROXY_TARGET=http://127.0.0.1:8000 npm run dev -- --port 3001
```

Le script HTTP refuse les hôtes distants et crée de nouveaux dossiers fictifs persistants à chaque exécution. Il utilise uniquement les comptes du seed local ; valeurs alternatives par `BESTPHARMA_REVIEW_EMAIL/PASSWORD` et `BESTPHARMA_ADMIN_EMAIL/PASSWORD`. Il ne journalise pas les tokens/mots de passe. Ne jamais le lancer sur une base réelle. Le seed refuse la production.

Pour Docker de développement : `./scripts/setup-docker.sh`. Les clés déjà présentes ne sont pas régénérées ; aucun volume n’est supprimé. Cette procédure doit encore être testée sur un hôte Docker.

## Limites restantes

- Aucune donnée réelle, aucun usage médical ou de production, aucun audit de sécurité exhaustif.
- Aucun test graphique de bout en bout dans un navigateur, ni audit lecteur d’écran ; HTTP et jsdom ne les remplacent pas.
- Aucun envoi d’email, vérification d’adresse, reset mot de passe ou parcours multi-officine complet dans l’UI.
- GED en attente des documents BestPharma, pas de modèles ERP repris ; CAPA complet non livré.
- `admin/` séparé reste un canevas : instruction BEG fonctionnelle dans le frontend principal.
- Redis temporaire sans persistance ; avertissement système overcommit signalé par Redis, aucun réglage noyau modifié. Sauvegarde, restauration, TLS, exploitation et durcissement restent à valider.
- `doctrine/annotations` signalé abandonné à l’installation ; aucun audit de vulnérabilités Composer en ligne effectué dans ce réseau restreint.
