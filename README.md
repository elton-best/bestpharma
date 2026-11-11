> **M2 — constats, première tranche connectée :** [périmètre et limites](docs/CDC_02_CONSTATS.md). 138 tests backend / 927 assertions sur chaque base et 124 tests frontend ; recette navigateur des constats encore non validée. Pas de lien M4 simulé ni de qualification automatique.

> **M2 — diagnostics configurables connectés :** [modèles publiés, instantanés et partage explicite](docs/CDC_02_DIAGNOSTICS.md). 134 tests backend / 874 assertions sur SQLite et PostgreSQL ; 121 tests frontend, build et Chromium diagnostic réussis. Aucun score ni grille réglementaire inventé. Le M2 complet reste ouvert.

> **M2 — visites et comptes rendus connectés :** [périmètre, confidentialité et recette](docs/CDC_02_VISITES_COMPTES_RENDUS.md). 126 tests backend / 811 assertions sur SQLite et PostgreSQL ; 116 tests frontend et build validés. Diagnostics, plans et échanges ont depuis été connectés en tranches ultérieures ; livrables, bilan et clôture restent ouverts.

> **M2 — plan versionné et échanges de mission :** [API, workflow et limites](docs/CDC_02_PLANS_ACTIONS.md). Première tranche connectée : brouillon privé, validation officine, notes internes filtrées, commentaires partagés et outbox. Bilan, livrables, pièces jointes d’échanges et clôture restent ouverts.

> **M3/M4 — Documents & actions :** [état d’implémentation et limites](docs/CDC_03_04_IMPLEMENTATION.md). M3 conserve sa GED privée/canevas approuvés ; M4 ajoute le registre versionné et l’intégration idempotente des plans M2 approuvés.

> **M2 — équipe et pilotage connectés :** [décisions validées, accès approuvés, recette et reste à faire](docs/CDC_02_EQUIPE_ET_PILOTAGE.md). 118 tests backend / 750 assertions sur SQLite et PostgreSQL ; 112 tests frontend et build validés. Le M2 complet n’est pas encore terminé.

> **Stock connecté — première tranche :** [registre PostgreSQL, opérations et recette](docs/STOCK_API.md). Les 13 interfaces utilisent désormais les données Laravel en mode API ; la démo reste indépendante. Régression : **111 tests backend / 705 assertions sur SQLite et PostgreSQL**, **108 tests frontend**, build et Chromium Stock API/démo réussis. Achats, dispensation, réception complémentaire et comptabilité restent hors périmètre.

> **Section Stock intégrée en démonstration :** [13 rubriques, parcours, tests et limites](docs/STOCK_INTEGRATION.md). Réception, lots, FEFO, emplacements, mouvements, inventaires, rappels simulés, déchets et valorisation indicative. Backend Stock non raccordé ; ne pas utiliser pour une activité réelle.

> **Dernière tranche M2 :** [proposition de mission et accord explicite de l’officine](docs/CDC_02_PROPOSITIONS_MISSIONS.md). Régression : 102 tests backend / 608 assertions sur SQLite et PostgreSQL ; 88 tests frontend et build validés. Parcours Chromium de cette tranche encore à exécuter.

> **Règles métier actualisées :** [MFA obligatoire, contrôle humain et export du journal](docs/CDC_01_DECISIONS_APPLIQUEES.md). Ces décisions remplacent les réserves correspondantes ci-dessous.

> **Module 01 :** [clôture technique locale, résultats et conditions de mise en production](docs/CDC_01_RECETTE_FINALE.md).

> **État actuel (10 novembre 2026) :** M1 avec décisions métier appliquées ; première tranche M2 connectée (brouillon, soumission, retrait motivé). Régression : **96 tests backend / 539 assertions sur SQLite et PostgreSQL**, **80 tests frontend**, build frontend et scénario Chromium M2 réussis. Le reste du M2 demeure en démonstration, sans accès métier implicite pour les coordinateurs. Voir [périmètre et recette M2](docs/CDC_02_PREMIERE_TRANCHE.md). Données fictives uniquement ; mise en production non validée.

# BEGPHARMA — Plateforme SaaS pour officines

**SaaS tout-en-un pour officines** : gestion pharmaceutique (catalogue, lots FEFO, dispensation, caisse), système qualité BPD (10 chapitres, CAPA, auto-inspections) et accompagnement BEG. Objectif : réduire la paperasse, conserver des preuves, suivre les actions dans le temps.

> L'officine reste responsable de ses activités. BEG accompagne et fournit le service. L'ABMed est distincte de BEG. Aucune activation, score ou export ne vaut autorisation d'exercice, validation officielle ou certification. Voir `docs/CDC_General_Socle.md`.

## Monorepo
```
bestpharma/
├── backend/    # Laravel 12 — API DDD modulaire (app/Modules/*)
├── frontend/   # Vue 3 SPA officine (PrimeVue + Tailwind)
├── admin/      # Vue 3 back-office BEG (PlatformAdmin)
├── docker/     # Dockerfiles backend/frontend
├── docs/       # CDC, architecture, modules, rôles, design system
├── scripts/    # setup, seed, tests
└── docker-compose.yml
```

## Stack (identique ERPSAAS)
- **Backend :** Laravel 12 / PHP 8.4, PostgreSQL 16, Redis, Sanctum, Spatie Permission, Horizon, Telescope/Pulse
- **Frontend :** Vue 3.5 + TypeScript + Vite, Pinia, Vue Router, PrimeVue 4 + TailwindCSS, TanStack Query, Vee-Validate + Zod
- **Design :** Manrope (corps) / Bricolage Grotesque (titres) / Instrument Serif italique (accents `.accent-serif`)

## Vérifications locales
```bash
cd frontend && npm ci && npm run build
cd ../admin && npm ci && npm run build
```
Les builds et les 42 tests du frontend sont validés. PHP 8.4.27, Composer 2.10.3, PostgreSQL 16.15 et Redis 7.4.12 ont été exécutés nativement dans le sandbox ; migrations et seed local réussis. `composer.lock` verrouille les 189 dépendances installées. Docker reste absent : les fichiers Compose/Dockerfile corrigés doivent encore être exécutés sur un hôte Docker. Voir `docs/VALIDATION.md` et `docs/BACKEND_VALIDATION.md`.

### Démarrage Docker de développement (à valider sur hôte Docker)
```bash
./scripts/setup-docker.sh
```
Le frontend sur `http://localhost:3001` est alors en mode API, proxy relatif vers Laravel. PostgreSQL et Redis sont exposés sur loopback seulement. Ne pas réutiliser ces comptes et secrets de développement en production.

### Tests backend
```bash
cd backend
php artisan test  # SQLite mémoire par défaut
DB_CONNECTION=pgsql DB_HOST=127.0.0.1 DB_PORT=5433 DB_DATABASE=bestpharma_test DB_USERNAME=postgres DB_PASSWORD=secretpassword php artisan test
```
Créer préalablement une base **séparée** `bestpharma_test`. Les tests refusent toute base PostgreSQL sans suffixe `_test` avant les migrations destructives. Pour le parcours HTTP sur données fictives, lancer l’API avec `PHP_CLI_SERVER_WORKERS=4`, puis `python3 scripts/validate-api.py` depuis la racine du projet. Ce script crée des dossiers fictifs persistants et exige une API locale et le seed local.

## Modules (25)
Socle Phase 1 : Tenancy, ACL, Users, Workflow, Administration, Parametrage, PlatformAdmin, Accompagnement, Qualite, Documents, Personnel, LocauxEquipements.
Phase 2 : Catalogue, Achats, Stock, Dispensation, VentesCaisse, Vigilance.
Phase 3 : Comptabilite, Tresorerie, Paie, Fiscalite.
Transverse : Dashboard, Reporting, Notifications.

Détails : `docs/MODULES.md`, `docs/ARCHITECTURE.md`, `docs/ROLES.md`.

## Phases CDC
- **Phase 0** — Cadrage et fondations (matrice BPD article par article, catalogue modèles, dictionnaire données)
- **Phase 1** — Socle SaaS + qualité BPD (5 lots : 1.1 inscriptions/droits/GED/NC-actions, 1.2 équipements/températures, 1.3 catalogue/lots/dispensation, 1.4 achats/retours/rappels/déchets, 1.5 auto-inspections/grille/pilotage)
- **Phase 2** — Achats, stock, vente, caisse, paiements (FeexPay à confirmer)
- **Phase 3** — Comptabilité, trésorerie, paie
- **Phase 4** — Extensions (e-commerce, livraison, app patient — à décider)

## Emplacement et GitHub
Projet indépendant dans `bestpharma/`, conservé dans la branche de travail Arena actuelle pour sauvegarde. Aucun dépôt distant BestPharma créé et aucun push effectué. L’extraction vers son propre dépôt GitHub sera une étape distincte après validation.

## Convention d’interface
Les actions Ajouter, Voir, Modifier, Inviter et Confirmer utilisent une modale commune, conformément à la demande utilisateur. Voir `docs/UI_CONVENTIONS.md`.

## Nouvelle navigation et premiers modules (CDC reçus)

La démo présente toutes les rubriques demandées avec accordéons et sidebar repliable, puis les modules **01 — Officines & accès** et **02 — Accompagnement** avec données fictives. Commencer sur `/dashboard`, puis `/dashboard/officine`, `/dashboard/accompagnateurs` et `/dashboard/accompagnement`. Les modules futurs sont signalés « à venir ».

Guide complet, parcours et limites : [docs/MODULES_01_02_DEMO.md](docs/MODULES_01_02_DEMO.md). Les fichiers CDC originaux sont dans `docs/cdc/`. Le nom de produit BestPharma est conservé. Les extensions démo M01/M02 ne doivent pas être confondues avec les anciennes API validées.

## Module 01 connecté (dernière tranche)

Aperçu API port 3001, `/login`, puis choix d’officine. Fiche, contacts, profil personnel, historique et approbation/retrait des accès accompagnateurs sont enregistrés dans PostgreSQL. La coordination dispose d’une vue dédiée sans accès métier implicite. Lire [docs/MODULE_01_API.md](docs/MODULE_01_API.md) pour les parcours, comptes fictifs et écarts restants au CDC. La migration est additive ; lancer `php artisan migrate --seed` uniquement dans la base de développement, puis `python3 scripts/validate-module1.py` pour le smoke local.

## Avancement CDC 01

Voir [la recette actualisée et les réserves de clôture](docs/CDC_01_ETAT_2026_11_10.md). Identité, brouillons, outbox et administration ont été étendus ; SMTP/Google réels et la recette exhaustive restent à terminer.

Ajouts de la dernière tranche : codes de secours MFA, état global des comptes et logo privé. [Matrice de traçabilité CDC 01 et réserves](docs/CDC_01_TRACABILITE.md).
