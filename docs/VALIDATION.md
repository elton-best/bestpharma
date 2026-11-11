> **Bilan courant :** voir [la clôture technique locale et les conditions de production](CDC_01_RECETTE_FINALE.md). Les avancements et réserves des tranches historiques ci-dessous sont à lire à la lumière de ce bilan.

> **Actualisation CDC 01 :** voir [état de recette du 10 novembre 2026](CDC_01_ETAT_2026_11_10.md). Les contrats et limites historiques ci-dessous ne décrivent pas tous les nouveaux développements. Le CDC complet reste en cours.

# État prioritaire — module 01 connecté au serveur

Le module 01 dispose désormais d’API et d’écrans connectés pour profils, fiche officine, contacts, sélecteur d’officine, propositions/approbations/retraits d’accompagnateurs et historique. **43 tests backend / 201 assertions** passent sur SQLite et PostgreSQL, **67 tests frontend** passent, **33 contrôles HTTP** et **9 contrôles Chromium API** réussissent. Le module 02 reste en démonstration locale. Cette intégration n’est pas encore la couverture exhaustive du CDC module 01.

Guide actuel et reste à livrer : [MODULE_01_API.md](MODULE_01_API.md). Les sections suivantes sont l’historique de la tranche précédente et leurs réserves M01 « non connecté » ne décrivent plus l’état actuel.

---

# Dernière tranche — navigation ERPSAAS et démo M01/M02

Les deux CDC reçus sont conservés dans `docs/cdc/`. Navigation cible à neuf groupes, sidebar réductible et accordéons ; exemples persistants pour officines, accès accompagnateurs, demandes et missions. Toutes les opérations utilisent des modales.

**61 tests frontend / 13 fichiers passent**, TypeScript + Vite passent. Smoke réel Chromium desktop/mobile : 11 contrôles réussis, aucune erreur JavaScript relevée. Les extensions M01/M02 sont une démonstration locale, pas de nouvelles API. Leur mode API indique explicitement leur indisponibilité ; aucune donnée fictive n’y est injectée.

Guide de recette, correspondance CDC et fonctions restant à développer : [MODULES_01_02_DEMO.md](MODULES_01_02_DEMO.md). Le bilan backend ci-dessous concerne uniquement les API précédentes.

---

# État actuel — validation réelle du 10 novembre 2026

Cette section remplace les réserves historiques « PHP/Composer absents » des lots ci-dessous.

| Vérification | Résultat |
|---|---|
| Dépendances PHP | 189 installées, composer.lock et composer validate valides |
| Migrations + seed local | Réussis, PostgreSQL 16.15 |
| Tests Laravel SQLite | **29 tests, 120 assertions réussis** |
| Tests Laravel PostgreSQL 16 | **29 tests, 120 assertions réussis** |
| HTTP réel Laravel/PostgreSQL/Redis | **41 contrôles réussis**, dont acceptation et retrait de droits concurrents |
| Redis 7.4.12 | PING, écriture/lecture/suppression via cache Laravel réussis |
| Frontend | **42 tests**, TypeScript + build Vite réussis |
| Proxy navigateur | `/api/v1/health` répond via Vite en mode API |
| Docker / workflow GitHub | Configuration ajoutée/corrigée, non exécutée ici |

Détails, reproduction et limites : [BACKEND_VALIDATION.md](BACKEND_VALIDATION.md).
L’aperçu API demeure une validation avec données fictives, pas une plateforme de production. Aucun audit navigateur visuel ni audit de sécurité exhaustif effectué. Les sections suivantes sont l’historique des lots.

---

# Harmonisation des actions en modale

Exigence utilisateur : Ajouter, Voir, Modifier, Inviter et Confirmer en modale pour les écrans actuels et futurs. Composant commun AppModal, consultations en lecture seule, formulaires et erreurs contextuelles, confirmations applicatives (plus de fenêtres natives du navigateur).

**42 tests frontend réussis**, build TypeScript + Vite réussi. Gestion du focus, Échap, verrouillage pendant sauvegarde, retour au déclencheur et révocation testés sous jsdom. Pas d’audit visuel/lecteur d’écran effectué dans un navigateur réel. Backend désormais exécuté ; voir le bilan actuel ci-dessus.

Voir `UI_CONVENTIONS.md`.

---

# Lot Équipe & droits — 10 novembre 2026

Nouvel espace `/equipe`, rôles locaux personnalisés, multi-affectations par cases à cocher, suspension, plusieurs administrateurs, protection du dernier administrateur actif et invitations manuelles à usage unique (7 jours).

- **32 tests frontend passent**, build TypeScript + Vite réussi.
- **28 tests backend écrits, non exécutés** ; PHP/Composer absents.
- **207 fichiers PHP analysés syntaxiquement** (analyse statique uniquement).
- API avec isolation par officine, contrôle d’administration, token d’invitation haché, vérification d’identité pour les comptes existants et audit.
- Aucun envoi d’email automatique et aucune habilitation clinique implicitement accordée.
- Spécification, modes démo/API et limites : `TEAM_ACCESS.md`.

Les sections ci-dessous documentent les lots antérieurs et leur validation à la date de livraison ; les chiffres actuels sont ceux indiqués ci-dessus.

---

# Lot ouverture d’officine — 10 novembre 2026

## Ajouts
- Inscription en trois étapes (`/register`) : compte, officine, attestation et récapitulatif.
- Dossier initialement en attente, sans permission métier ni module activé.
- Suivi demandeur (`/application`), correction et nouvelle soumission uniquement après demande de compléments.
- Vue BEG (`/beg/inscriptions`) : liste, consultation, prise en instruction, demande de compléments, refus motivé ou activation.
- Simulation dans l’aperçu : les vues demandeur et BEG utilisent les mêmes dossiers fictifs dans localStorage. Aucune authentification ni restriction métier n’est simulée comme une protection réelle.
- Mode API : décisions réservées à `is_platform_admin`, attribut non assignable par l’inscription. Verrouillage des dossiers pendant les transitions, audit transactionnel et protections contre les doubles décisions.
- Activation limitée au module qualité et aux permissions `qualite.read` / `qualite.write`. Aucun droit clinique ou gestionnaire universel accordé.
- Compte en attente autorisé à se connecter uniquement pour suivre son dossier ; le middleware refuse toujours l’accès aux données métier.
- Aucun e-mail envoyé, aucune pièce jointe demandée ou vérifiée, aucune vérification réglementaire automatique. La vérification d’adresse e-mail et la récupération de mot de passe restent à développer.

## Vérifications du lot
- **19 tests frontend réussis**, incluant parcours d’inscription, transitions, motifs obligatoires, corrections et absence de mot de passe dans les données locales.
- Build TypeScript + Vite réussi.
- **203 fichiers PHP analysés syntaxiquement** avec php-parser (ceci ne remplace pas PHP ni une exécution des tests).
- 6 tests Feature supplémentaires rédigés pour l’ouverture, portant le total backend à 17 ; non exécutés (PHP/Composer absents).
- L’aperçu reste exclusivement une démonstration fictive, pas un environnement de production.

## Essayer le circuit complet
1. Depuis Connexion, choisir « Ouvrir mon espace officine », puis saisir des informations fictives.
2. Soumettre et consulter « Mon dossier d’ouverture ».
3. Ouvrir « Instruction BEG (démo) », consulter le dossier puis commencer l’instruction.
4. Demander des compléments avec un motif ; revenir au suivi demandeur, actualiser, corriger et soumettre à nouveau.
5. Reprendre l’instruction puis activer ; revenir au suivi pour accéder à l’officine.

## Développement serveur
Le seeder local/testing crée désormais aussi `beg@bestpharma.bj` / `password` pour l’instruction BEG. Ce compte fictif ne peut être créé par le seeder en production. L’API doit être installée, migrée et testée avant utilisation. La vue BEG fonctionnelle est intégrée à l’interface principale pour ce lot ; le frontend séparé `admin/` reste un canevas.

---

# Première tranche — 10 novembre 2026

## Disponible dans l’aperçu
- Navigation responsive officine, avec typographies BestPharma.
- Tableau de bord calculé à partir des actions qualité.
- Création, modification, recherche, filtres, échéances dépassées.
- Clôture avec bilan obligatoire ; aucune suppression pour éviter de perdre le suivi.
- Données fictives persistées dans le navigateur, mode clairement indiqué et réinitialisable.
- Espace Documents en attente des fichiers BestPharma ; aucun modèle ERP repris.

## Backend codé (non exécuté dans ce sandbox)
- Connexion email/mot de passe, token Sanctum expirant après 8 heures, déconnexion avec révocation.
- Accès à une officine active par appartenance vérifiée, module activé et permissions explicites `qualite.read` / `qualite.write` par membre.
- Création, liste et modification d’actions qualité avec validation serveur, scoping officine et trace d’audit transactionnelle.
- Aucun octroi de permission à partir d’un simple intitulé de rôle ou d’un header client.
- Nettoyage du contexte tenant en fin de requête et lecture vide sans contexte.
- 11 tests Feature rédigés : isolation, refus d’accès, validation, permissions, connexion/déconnexion.

Ces permissions constituent un premier mécanisme limité au module qualité, pas encore l’interface de rôles personnalisés prévue au CDC. Le bilan saisi ne remplace pas une vérification d’efficacité ni un workflow d’approbation CAPA complet.

## Vérifications exécutées
- `cd frontend && npm test` : 19 tests réussis, dont parcours modal, recherche et bilan requis (jsdom).
- `cd frontend && npm run build` : vérification TypeScript + build Vite réussis.
- Backend, PostgreSQL, Docker : non exécutés, PHP/Composer/Docker absents.
- Pas de test navigateur graphique effectué ; responsive défini par CSS, non audité visuellement.

## Connexion future à Laravel
1. Installer PHP 8.4 et les extensions, Composer, PostgreSQL et Redis.
2. Dans `backend/` : copier `.env.example`, installer Composer, générer la clé, migrer. `php artisan db:seed` est réservé à un environnement local/testing. Il crée un compte de démonstration `admin@bestpharma.bj` / `password` ; jamais en production.
3. Exécuter `php artisan test`. Le test utilise SQLite en mémoire (extension pdo_sqlite nécessaire). Revalider aussi les migrations et l’isolation sur PostgreSQL.
4. Démarrer Laravel sur 8000 et configurer le frontend : `VITE_DATA_MODE=api`, `API_PROXY_TARGET=http://127.0.0.1:8000`.
5. Redémarrer Vite, ouvrir `/login`. Aucun repli silencieux sur les exemples locaux en mode API.

## À suivre
- Récupération de mot de passe, vérification email et Google ; notifications et pièces du dossier.
- Gestion des membres, rôles multi-affectations et habilitations validées avec le métier.
- Intégration des fichiers BestPharma, GED, versionnage et approbation.
- CAPA complet : causes, preuves, contrôles d’efficacité, historique métier et validation pharmacien.
- Pagination, concurrence d’édition, tests d’intégration PostgreSQL, revue sécurité avant toute donnée réelle.

Aucun dépôt GitHub distant créé et aucun push effectué.
