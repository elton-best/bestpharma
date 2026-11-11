# Stock — première tranche connectée à Laravel/PostgreSQL

## Périmètre

Les 13 interfaces Stock séparées restent accessibles par le menu latéral, sans barre d’onglets répétée. En mode API, leurs données proviennent désormais du registre serveur ; les données fictives locales ne sont jamais utilisées en remplacement d’une erreur API. Une officine sans données a un registre vide.

Opérations disponibles, toutes confirmées en modale : création de produit et d’emplacement, réception initiale d’un lot en quarantaine, levée motivée, transfert, comptage avec correction par écart, mise en quarantaine, blocage par rappel interne et sortie vers déchets. FEFO, recherche de code, péremptions et valorisation indicative utilisent ces mêmes données serveur.

La mutation d’un état de lot est portée par un lot central : tous ses soldes d’emplacements sont bloqués ensemble. Un transfert crée ou alimente un solde destination du même lot et ne modifie ni la quantité physique totale ni sa valeur brute.

## Modèle et API

Migration `2026_11_10_000013_create_stock_register` :

- `stock_products` : code unique par officine, nom, unité et seuil indicatif.
- `stock_locations` : emplacements par officine.
- `stock_batches` : identité produit/lot, date exacte, coût unitaire et état central.
- `stock_balances` : quantité par lot/emplacement, relations composites garantissant la même officine.
- `stock_operations` : registre des opérations, auteur, motif, quantité/écart, soldes source/destination, révision et clé de rejeu.
- `stock_workspaces` : révision de l’espace stock de l’officine.

GET `/api/v1/stock/workspace` retourne un instantané cohérent dans le format partagé par les interfaces. Les identifiants sont sérialisés en chaînes, pas rapprochés des identifiants de la démo.

POST `/api/v1/stock/operations` : `request_key`, `revision`, `confirmed`, `command`, `input`. Le serveur valide uniquement les champs propres à l’opération ; un client ne peut pas injecter officine, auteur, état de lot ou solde initial arbitraire.

## Garanties implémentées

- Authentification, officine active, compte actif, appartenance administrateur active et MFA privilégié côté serveur. Les rôles plateforme/coordinateur n’accordent aucun accès Stock automatique. Permissions Stock déléguées non encore définies : cette tranche est réservée aux administrateurs.
- Transaction et verrou de l’officine pour sérialiser les opérations et les lectures d’instantané. Les opérations recontrôlent l’appartenance active sous verrou.
- Révision périmée refusée (409). Rejeu d’une même clé et du même contenu par le même auteur sans double mouvement ni double audit. Même clé avec autre contenu refusée.
- Quantités entières, pas de stock négatif. Contrôles SQL PostgreSQL et triggers SQLite pour le solde non négatif ; relations composites inter-officines ; clés uniques.
- Réception refusée à échéance atteinte ; entrée en quarantaine. Transfert refusé pour un lot périmé, en quarantaine ou rappelé. Un rappel ne peut pas être levé ou rétrogradé par ce parcours.
- Comptage : vérification de la quantité attendue et ajout d’un événement de correction, sans modifier les opérations précédentes.
- Pas de route de suppression du registre. Sortie déchets sans suppression du lot.
- Audit socle des opérations avec révision, sans motif ou texte métier dans le journal d’accès. Motifs métier conservés dans le registre Stock de l’officine autorisée.
- Réponse de lecture `no-store`. Une erreur d’autorisation efface les données affichées et ne déclenche aucun fallback fictif.
- Quantité par solde limitée à 1 000 000 ; coût unitaire entier limité à 1 000 000 000 FCFA. Une opération dont la valeur brute totale dépasserait la précision entière sûre de l’interface est annulée.

## Règles provisoires et limites fonctionnelles

Les règles conservatrices de la démonstration sont explicites, pas déclarées obligations réglementaires : date exacte requise et blocage dès le jour d’échéance, quantités en unités entières, contrôle de réception représenté par une levée motivée. Dates mois/année, conditionnements fractionnables, droits délégués et séparation de validation restent à définir avec le métier.

- L’instantané est limité à **5 000 lignes par collection** (produits, emplacements, soldes et opérations). Au-delà, le serveur refuse explicitement le chargement au lieu de tronquer silencieusement ; une pagination serveur et des agrégats seront nécessaires pour un grand registre.
- Aucune réception complémentaire sur un lot déjà enregistré. Pas de commandes fournisseurs, bordereaux joints, contrôle fournisseur ou rapprochement achat.
- Pas de sortie de dispensation/vente, réservation, retour fournisseur/client ou contrepassation dédiée. L’écart d’inventaire motivé n’est pas présenté comme une contrepassation universelle.
- Rappel **interne de blocage uniquement** : aucun envoi externe, alerte officielle, notification client ni preuve de récupération.
- Sortie déchets : aucun prestataire, bordereau d’enlèvement, attestation ou preuve de destruction.
- Scan : recherche par code produit via saisie/lecteur clavier ; pas de décodage GS1/DataMatrix, caméra, sérialisation ni authentification médicament.
- Valorisation : coût de réception × quantités, indicative ; pas de CUMP, méthode FIFO comptable, taxes, dépréciation, écritures SYSCOHADA ni rapprochement comptable.
- Pas de procédure hors ligne ou de synchronisation multi-appareils pour le Stock API.

Ces limites empêchent de déclarer le Stock complet pour une exploitation réelle.

## Recette exécutée

- Migration appliquée localement et exécutée par les suites sur SQLite et PostgreSQL.
- **111 tests backend / 705 assertions** sur chacun des deux moteurs. Dont 9 tests Stock : isolation, droits/MFA/suspension, idempotence, révisions, réception, blocages, transfert/valeur, rappels, inventaire, déchets, contraintes SQL et liens inter-officines.
- **108 tests frontend / 22 fichiers**, build TypeScript/Vite réussi. Les tests API utilisent un état serveur vide et vérifient l’envoi de la révision/clé, sans stockage local.
- **Chromium Stock API réussi** : compte privilégié jetable, MFA obligatoire, produit persistant après rechargement, emplacement, réception en quarantaine, levée, écart de comptage et conservation après rechargement ; zéro erreur JavaScript. Fixture désactivée, jetons révoqués et officine fictive archivée en fin de recette, sans purge du registre.
- **Chromium démo réussi** : 13 interfaces autonomes, absence de barre répétée, FEFO, files de blocage, modale de lot et mobile ; zéro erreur JavaScript.
- Les tests de révision et les verrous ne sont pas une recette de charge/concurrence en conditions de production. Scanners physiques, Docker, restauration, déploiement et validation pharmaceutique réelle non revendiqués.

## Voir et reproduire

- Aperçu connecté **port 3001**, compte administrateur avec MFA, sélectionner son officine, puis menu Stock. Commencer par créer un produit et un emplacement, puis réceptionner le lot.
- Aperçu démo **port 3000**, exemples isolés dans le navigateur.
- Recette navigateur : `scripts/browser/README.md`, commande `npm run test:stock-api` avec une fixture neuve créée par `php tests/browser-mfa-fixture.php create --office`.
