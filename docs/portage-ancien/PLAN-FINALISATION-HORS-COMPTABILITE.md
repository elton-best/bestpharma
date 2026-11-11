# Plan de finalisation BEGPHARMA hors comptabilité

## Objectif et périmètre

Amener les parcours métier BEGPHARMA hors comptabilité à un état cohérent, testable
et recetté, en s'appuyant sur les cahiers des charges du dépôt. La présence d'un
écran, d'une route API ou d'une migration ne vaut pas validation fonctionnelle.

### Inclus

- Socle d'accès : authentification, rôles, officines, cloisonnement, appareils,
  audit et synchronisation hors ligne.
- Module Qualité/BPD : référentiel, auto-évaluation, locaux, températures,
  pointage, personnel, GED, modèles, non-conformités et échéances.
- Parcours pharmaceutiques et opérationnels hors comptabilité : produits, lots,
  FEFO, inventaires, rappels, déchets, registres réglementaires, préparations,
  dispensation, ventes et sessions de caisse.
- Tests automatisés, recette métier, documentation d'installation et préparation
  d'un pilote contrôlé.

### Hors périmètre de réalisation

- Comptabilité SYSCOHADA, écritures comptables et états financiers.
- Trésorerie, fiscalité, déclarations, paie et fonctions financières connexes.
- Intégrations financières ou réglementaires nécessitant un contrat, des clés,
  une certification ou une procédure officielle qui ne sont pas fournis.

Les écrans et le code existants hors périmètre ne sont pas supprimés. Ils ne doivent
pas être présentés comme livrés ou validés par le présent plan.

## Règles de conduite

1. Garder les fonctionnalités existantes et corriger la cause des défauts, sans
   réécriture globale ni suppression de données.
2. Pour chaque exigence incluse, suivre le même état : **à inventorier**,
   **implémentée à vérifier**, **partielle**, **bloquée par décision métier**,
   **validée par test** ou **validée en recette**.
3. Ne pas fabriquer de contenu réglementaire, de signature, de preuve, de données
   de démonstration présentées comme réelles, ni de validation ABMed.
4. Chaque lot doit préciser sa portée, ses tests, ses limites et les décisions
   demandées avant d'enchaîner.
5. Les tests de données doivent utiliser une base et des comptes explicitement
   identifiés comme recette, jamais une base d'officine en exploitation.

## Lots de travail et critères de sortie

### Lot 0 — Débloquer et établir une référence reproductible

- [ ] Utiliser Node 22 conformément à `.nvmrc` et aux contraintes npm.
- [ ] Installer les dépendances frontend et Composer de façon reproductible.
- [ ] Préparer une configuration locale de recette sans reprendre de secrets réels.
- [ ] Vérifier la disponibilité de PostgreSQL 16 et des extensions PHP requises.
- [ ] Exécuter et consigner les tests frontend, le contrôle TypeScript, le build,
  les tests Laravel, les migrations et les scripts de contrôle documentaire.
- [ ] Comparer les résultats CI au commit de travail courant, pas à un ancien bilan.

**Sortie :** un rapport de référence indiquant les commandes réellement exécutées,
les résultats et les blocages. Aucun résultat n'est présumé réussi.

### Lot 1 — Fermer les décisions métier/réglementaires

- [ ] Faire valider par le pharmacien/RMQ le guide ABMed fourni, sa version, ses
  267 articles et leur interprétation.
- [ ] Valider les pondérations, règles de cotation et seuils d'alerte.
- [ ] Valider rôles et permissions, règle de présence du pharmacien, correction
  rectificative des registres, conservation et responsabilités.
- [ ] Confirmer la liste, le contenu et le statut des modèles documentaires.
- [ ] Rapprocher le corpus du classeur d'inventaire et qualifier les pièces sans
  convertir automatiquement un statut documentaire en approbation.

**Sortie :** décisions versionnées avec responsable, date et références sources.
Les points non validés restent explicitement bloqués, pas codés par supposition.

### Lot 2 — Socle de sécurité et intégrité

- [ ] Recetter l'authentification/MFA et les rôles avec des comptes distincts.
- [ ] Vérifier l'isolation inter-officines sur les endpoints et les opérations
  d'écriture, avec le rôle PostgreSQL applicatif prévu.
- [ ] Recetter l'audit, les validations documentaires et les pièces versionnées,
  y compris les refus d'accès, les conflits de version et l'altération.
- [ ] Corriger les parcours qui affichent un succès ou des données fiables quand
  l'API est indisponible.
- [ ] Confirmer protection des secrets, limitations d'essais, journaux expurgés,
  sauvegarde et restauration de recette.

**Sortie :** tests backend et SQL verts sur PostgreSQL 16 pour les scénarios
critiques ; limites de confiance et procédures d'exploitation documentées.

### Lot 3 — Terminer les parcours Qualité/BPD

- [ ] Auto-évaluation : version active du référentiel, campagnes, cotations,
  preuves, CAPA, rapport et conservation de l'historique.
- [ ] Températures et locaux : relevés, fréquences, signatures, excursions,
  équipements/étalonnages, nettoyage et traitement des non-conformités liées.
- [ ] Personnel et pointage : dossiers, qualifications, présence, corrections,
  horaires, règle du pharmacien et droits d'accès.
- [ ] GED et modèles : dépôt privé, version, approbation, téléchargement,
  qualification des sources, import contrôlé et limites de diffusion.
- [ ] Non-conformités et échéances : cycle complet, responsabilités, rappels,
  retards, clôture et vérification d'efficacité.
- [ ] Barre de bord qualité, mode inspecteur et export : n'afficher que des
  données issues de sources confirmées.

**Sortie :** matrice de couverture des critères P1 du cahier Qualité/BPD ; tests
de non-régression et recette sur mobile/tablette pour les parcours critiques.

### Lot 4 — Terminer les opérations officinales hors comptabilité

- [ ] Produits, lots, réceptions et statuts de stock ; aucun lot non contrôlé,
  périmé, rappelé, en quarantaine ou à évaluer ne peut être vendu.
- [ ] FEFO, inventaires, mouvements, retours, rappels, déchets et registres :
  numérotation, droits, pièces, traces et écritures rectificatives.
- [ ] Dispensation : contrôles pharmaceutiques réellement exigés, présence du
  pharmacien selon la règle validée, validation et traçabilité.
- [ ] Vente et caisse : ouverture, encaissement, annulation, clôture et gestion
  d'indisponibilité sans créer de ventes ou reçus fictifs.
- [ ] Laisser hors intégration effective tout paiement, reçu normalisé ou service
  nécessitant des accès et une validation externe ; rendre son état indisponible
  clairement plutôt que simuler une réussite.

**Sortie :** tests de parcours API/UI couvrant les règles de sécurité et de stock,
avec données de recette clairement identifiées.

### Lot 5 — Synchronisation hors ligne et usage terrain

- [ ] Tester la file hors ligne, l'idempotence, l'ordre des opérations et la
  conservation des heures locale et serveur.
- [ ] Définir explicitement les opérations permises hors ligne et celles qui
  doivent attendre une validation serveur.
- [ ] Tester reconnexion, conflits, doublons, erreurs partielles et reprise après
  fermeture/rechargement.
- [ ] Recetter les formulaires sur téléphone/tablette et vérifier les états réseau,
  chargement, erreur, conflit et succès.

**Sortie :** scénarios automatisés de synchronisation réussis et recette manuelle
hors ligne documentée ; aucun visa ou horodatage serveur simulé.

### Lot 6 — Pilote et clôture

- [ ] Préparer un jeu de recette séparé des données réelles et un guide de test
  par rôle.
- [ ] Faire exécuter la recette par des utilisateurs métier (pharmacien/RMQ,
  promoteur, dispensateur, magasinier).
- [ ] Tester la sauvegarde et la restauration, le déploiement, la supervision et
  la procédure de retour arrière.
- [ ] Corriger les défauts bloquants, publier le bilan des écarts restants et
  faire approuver le périmètre pilote.

**Sortie :** procès-verbal de recette et décision explicite de pilote. Cela ne
constitue pas une certification réglementaire.

## Ordre de priorité

1. Lot 0 : sans environnement reproductible, aucune affirmation de validation.
2. Lot 1 : les règles réglementaires et métier doivent être connues avant de
   déclarer la conformité.
3. Lot 2 : sécurité et cloisonnement avant les données et opérations réelles.
4. Lots 3 et 4 : parcours BPD et opérations officinales.
5. Lot 5 : offline après définition des règles de synchronisation.
6. Lot 6 : pilote seulement après recette et sauvegarde restaurée.

Les lots peuvent être découpés en petites livraisons, mais un lot n'est pas
terminé parce que son interface existe ou que le build passe.

## Journal initial

| Lot | État | Résultat / blocage | Prochaine action |
|---|---|---|---|
| 0 — Référence reproductible | Partiellement validé — contrôle documentaire Python incomplet | Référence antérieure : Node 22.23.4, PHP 8.3.6 ; frontend : 71 tests, types et build passent; suite PHPUnit : 69 tests / 641 assertions. Nouvelle recette du 11/11/2026 : Node 22.23.4 disponible (le Node par défaut du shell est 18.20.8); PostgreSQL 16.15 isolé sous `/tmp/opencode`, écoute locale `127.0.0.1:55432`. Base `bestpharma_dev` identifiée, 30 migrations appliquées, seeder exécuté une fois sur la base vide : 5 comptes actifs, 2 officines, 6 rattachements; mot de passe du compte `demo@begpharma.bj` vérifié. Base `bestpharma_test` séparée créée pour la recette; suite de tests après portage M02 en attente. Tests Python non exécutés : `openpyxl` absent, `python3-venv` et pip système indisponibles ; aucune installation système tentée. | Exécuter et consigner tests frontend/backend sur Node 22 et la base PostgreSQL de test dédiée ; compléter les tests documentaires dans un environnement Python isolé avec dépendances épinglées; conserver les bases temporaires distinctes et ne jamais réutiliser une base d'exploitation |
| 1 — Décisions métier | Bloqué par validation métier | Les décisions réglementaires ne doivent pas être inventées | Organiser la validation pharmacien/RMQ |
| 2 — Sécurité et intégrité | Partiel — correctifs de cloisonnement ajoutés, recette partielle | Fiche officine limitée aux affectations actives ; modifications réservées aux rôles habilités ; rattachement limité au créateur ; synchronisation hors ligne limitée aux paramètres, rôles habilités et officines rattachées, avec verrou transactionnel. Tests d'isolation et de rejeu réussis dans la recette PostgreSQL locale. MFA, RLS sous rôle applicatif non privilégié, appareil, refus d'accès sur toutes les API et revue des permissions restent à recetter. | Étendre les tests inter-officines à tous les contrôleurs et valider la RLS avec le rôle PostgreSQL applicatif prévu |
| 3 — Qualité/BPD | Partiel / à inventorier | Import CSV température limité aux colonnes nommées avec date/heure/température ; humidité et min/max restent nulles si absentes ; lignes invalides rapportées. Un historique sans relevé retourne un taux de conformité null. Les fiches d'excursion automatiques n'affirment plus qu'une quarantaine ou une analyse de cause a été faite. Seuils et gravités restent à valider par le pharmacien/RMQ ; couverture P1 toujours à établir. | Construire la matrice P1 et faire valider le référentiel, les seuils, les gravités et le traitement des excursions en recette |
| 4 — Opérations officinales | Partiel / à inventorier | API et écrans présents ; consolidation/gardes ajoutées au dernier jalon ; scores BPD, gardes et transferts ne fabriquent plus de preuve vide côté Laravel. Vente comptoir limitée aux espèces avec session ouverte ; paiement externe indisponible sans vente fictive, certification e-MECeF et écritures comptables simulées retirées du parcours ; reçu UI explicitement interne/non certifié. Suite API POS/consolidation exécutée sur la base temporaire : 8 tests / 55 assertions réussis. | Poursuivre l'inventaire des opérations, leur recette API/UI et garder tout service externe indisponible jusqu'à configuration et validation |
| 5 — Hors ligne | À vérifier | File locale et endpoint de synchronisation existent ; couverture par domaine inconnue | Établir les contrats offline et les tests |
| 6 — Pilote | Non démarré | Pas de preuve de recette terrain dans le dépôt | Après sortie des lots 0 à 5 |
