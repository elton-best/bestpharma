> **Bilan courant :** voir [la clôture technique locale et les conditions de production](CDC_01_RECETTE_FINALE.md). Les avancements et réserves des tranches historiques ci-dessous sont à lire à la lumière de ce bilan.

> **Actualisation CDC 01 :** voir [état de recette du 10 novembre 2026](CDC_01_ETAT_2026_11_10.md). Les contrats et limites historiques ci-dessous ne décrivent pas tous les nouveaux développements. Le CDC complet reste en cours.

# Module 01 — intégration API, tranche officine et accès

10 novembre 2026. Cette tranche connecte les extensions de démonstration au backend Laravel/PostgreSQL ; elle complète les API inscription, instruction et équipe existantes. **Ce n’est pas encore la couverture exhaustive du CDC v1.1.**

## Disponible réellement

- Profil personnel : nom et téléphone modifiables, email et indicateur de vérification consultables ; aucun changement d’identité ou de privilège par ces formulaires.
- Liste des espaces autorisés via `/me` ; choix explicite après connexion si plusieurs officines actives ; sélecteur en modale dans la sidebar. Le changement fait une navigation complète pour vider l’état UI de l’ancien tenant.
- Fiche officine : nom, pays, département, commune, adresse, contact principal, téléphone et email ; édition réservée aux administrateurs actifs. Slug, statut, organisation et privilèges ne sont pas assignables.
- Contacts multiples, ajout/modification/désactivation avec conservation de la fiche. Un contact n’est pas automatiquement un utilisateur.
- Coordination distincte du rôle plateforme, annuaire de métadonnées minimal et proposition d’affectation pour un accompagnateur éligible.
- Approbation ou refus par un administrateur de l’officine, retrait motivé, portée et période immuables. Un changement requiert une nouvelle proposition après retrait/refus/expiration.
- Accès accompagnateur contrôlé sur chaque requête : statut approuvé, dates inclusives en `Africa/Porto-Novo`, officine active, utilisateur toujours éligible et permissions explicites. Le refus, l’expiration et le retrait cessent l’accès sans attendre l’expiration du token.
- Historique limité aux événements autorisés du socle/équipe, sans payload brut ni notes internes.
- Formulaires, consultations, approbations et confirmations en modales ; blocage pendant sauvegarde, avertissement avant abandon de saisie dans les nouveaux éditeurs API, conflits de version affichés sans annoncer de réussite.

## Permissions et séparation

`is_support_coordinator` autorise uniquement l’annuaire officines/accompagnateurs et les métadonnées d’affectation, **pas les données métier**. `is_platform_admin` ne confère pas ce rôle ni d’accès officine implicite. Les attributs internes ne sont pas fillable et ne peuvent pas être accordés par l’inscription, les rôles locaux ou le profil personnel.

Les propositions ciblent uniquement des comptes internes existants `is_support_staff`. Leur création/gestion par une interface d’administration reste à livrer ; aucun utilisateur n’est promu par simple recherche d’email.

Catalogue initial des droits accompagnateurs :
- `officine.read` : fiche générale, sans contacts supplémentaires, historique ni administration ;
- `qualite.read` : lecture des actions qualité si le module qualité est actif.

Aucun droit d’écriture, équipe, invitation, administration ou module clinique. Le périmètre textuel décrit la proposition ; les permissions ci-dessus sont les contrôles techniques effectifs. Le périmètre fin par mission appartiendra au module 02 serveur.

Une appartenance suspendue ne peut pas être contournée par une affectation parallèle. L’auto-approbation de sa propre affectation est interdite. Aucune session d’accompagnateur n’obtient de token différent ou de droit admin à l’approbation : les droits sont recalculés par le middleware.

## Données et concurrence

Migration additive `000007_extend_officine_access` : champs de profil et versions, attributs internes d’utilisateur, `officine_contacts`, `officine_support_assignments`, clés étrangères et index. Aucun effacement de données existantes.

Fiche personnelle, officine et contacts disposent de versions optimistes. Les affectations ont une version et une clé d’idempotence obligatoire. Même clé et même contenu → même identifiant ; même clé avec contenu différent → 409. Une affectation en attente/approuvée non expirée empêche une seconde proposition pour le même accompagnateur/officine.

Verrou officine partagé avec les opérations équipe, relecture de l’administration après verrou, verrou de la décision d’affectation, écriture et audit dans la même transaction. Deux décisions concurrentes sur la même version → **200 + 409**, vérifié sur PostgreSQL via HTTP multithread.

## API

Toutes les routes nécessitent Sanctum. Routes `officine/*` avec header `X-Officine-ID` et contrôle tenant à chaque appel.

| Routes | Accès |
|---|---|
| `GET/PUT /api/v1/me` | Compte authentifié ; liste de ses espaces uniquement |
| `GET /api/v1/officine` | Membre actif, ou accompagnateur avec `officine.read` |
| `PUT /api/v1/officine` | Administrateur actif + version |
| `GET/POST /api/v1/officine/contacts` | Administrateur actif |
| `PUT /api/v1/officine/contacts/{id}` | Administrateur actif + version, lookup scoped |
| `GET /api/v1/officine/history` | Administrateur actif, derniers 100 événements autorisés |
| `GET /api/v1/officine/support` | Administrateur actif |
| `POST /api/v1/officine/support/{id}/decision` | Administrateur actif, décision + version + motif si refus/retrait |
| `GET /api/v1/platform/support-directory` | Coordinateur, métadonnées uniquement |
| `GET/POST /api/v1/platform/officines/{id}/support` | Coordinateur, métadonnées/proposition uniquement |

## Essayer l’aperçu connecté

Utiliser **l’aperçu API sur port 3001**, pas la démonstration locale port 3000. Les données restent **fictives**, enregistrées réellement dans PostgreSQL de validation.

Seeder limité à `local/testing` (ne jamais utiliser ces comptes en production) :
- `admin@bestpharma.bj` / `password` : administrateur de deux officines fictives ;
- `beg@bestpharma.bj` / `password` : instruction plateforme et coordination attribuées explicitement par le seed ;
- `accompagnateur@bestpharma.bj` / `password` : compte éligible sans accès avant approbation.

1. Compte BEG : ouvrir **Coordination des accès** (`/beg/accompagnateurs`), choisir une officine, proposer l’accompagnateur, une période et des permissions.
2. Compte admin, dans une autre session privée : choisir la même officine, ouvrir **Accompagnateurs**, consulter les droits et approuver en modale.
3. Compte accompagnateur : se connecter, consulter uniquement les éléments permis. Les routes équipe et écriture qualité restent refusées.
4. Admin : retirer l’accès avec motif. Recharger la session accompagnateur : son accès est refusé immédiatement.
5. Admin : modifier la fiche, créer/désactiver un contact, consulter l’historique et changer d’officine via la sidebar. Les données de l’ancien espace ne sont pas réutilisées.

## Validation exécutée

- Migrations + seed exécutés sur PostgreSQL 16.15.
- **43 tests backend, 201 assertions**, passent sur SQLite mémoire **et** PostgreSQL 16.15. 14 nouveaux tests couvrent profils, contacts, périmètres, accès accompagnateurs, versions, idempotence, motifs, état du module et tenant, données sensibles et retrait immédiat.
- `python3 scripts/validate-module1.py` : **33 contrôles HTTP réels réussis**, dont approbation concurrente 200/409 et refus au même token après retrait. Script local uniquement, données fictives persistantes, aucune sortie de token ou mot de passe.
- **67 tests frontend, 14 fichiers**, vérification TypeScript et build Vite réussis.
- **9 contrôles Chromium headless réels réussis** sur l’aperçu API : proposition coordination, choix multi-officine, fiche persistée après reload PostgreSQL, contact, approbation en modales imbriquées, connexion par affectation, refus au même navigateur après retrait, changement de tenant sans ancien état UI, aucune erreur JavaScript.
- Le test navigateur a révélé et corrigé une boucle initiale de 401 : montage de l’application après `router.isReady()` et absence d’appel `/me` sans token.

Les 33 contrôles s’ajoutent au script historique `validate-api.py` (lifecycle/équipe). Les chiffres historiques de ce dernier ne sont pas un substitut à une nouvelle exécution. Docker et GitHub CI n’ont toujours pas été exécutés dans ce sandbox.

## Reste à couvrir dans le CDC module 01

- Vérification email avant soumission, récupération de mot de passe, envoi des invitations, notifications/outbox et suivi de livraison.
- Google OAuth, association authentifiée des comptes et MFA ; aucune connexion fournisseur fictive.
- Brouillons d’inscription, champs de localisation détaillés, logo et pièces privées (liste des justificatifs métier toujours à décider).
- Instruction avec assignation d’instructeur, versions explicites et historique complet partagé/interne ; la validation existante conserve ses états et limites précédentes.
- Suspension/réactivation/archivage via un workflow plateforme dédié et politique métier ; les accès sont déjà refusés si le statut n’est plus actif en base, mais aucune interface de changement de statut n’est livrée ici.
- Gestion de l’équipe interne de coordination, permissions accompagnateurs plus fines, délai spécifique de réponse/expiration des propositions configurable, relances.
- Politique de conservation, audit sécurité complet, exploitation et sauvegardes.

Module 02 reste un prototype local ; il ne crée pas de mission réelle et ne contourne aucun contrôle du module 01. Aucune intervention sur Supabase.
