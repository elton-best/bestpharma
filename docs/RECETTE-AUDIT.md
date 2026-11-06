# Audit : preuves réelles et limites d'exploitation

> **Validation complète du 6 novembre 2026 :** les migrations et les tests Laravel/PostgreSQL ainsi que les contrôles frontend et documentaires ont réussi dans la [CI du commit ead99c5](https://github.com/elton-best/begpharma/actions/runs/42224142108). Les mentions ci-dessous de tests non exécutés localement décrivent la limite de l’environnement local, désormais complétée par cette validation distante. Aucun import dans une officine en exploitation ni bascule de l’aperçu vers Laravel n’est revendiqué.


## Livré

- Les nouvelles entrées sont chaînées par officine à l'insertion dans PostgreSQL : séquence dédiée, empreinte précédente, SHA-256 de la ligne (hors empreinte courante).
- La sérialisation JSONB et le hachage restent côté PostgreSQL. Les identifiants globaux ne sont pas pris pour des numéros de séquence par officine.
- Un verrou transactionnel sérialise les insertions concurrentes ; un index unique protège les séquences. Ce verrou global peut limiter le débit : le mesurer avant déploiement multi-officines.
- Le contrôleur ne fabrique plus d'empreintes au moment de la lecture. L'endpoint recalcule les empreintes et vérifie les liens et la continuité sur un même instantané SQL.
- Les anciennes entrées ne sont pas réécrites. Une couverture partielle ou un journal vide n'est pas déclaré conforme. Les anciennes entrées sans officine ne sont pas attribuées arbitrairement à une pharmacie.
- Le trigger métier prend désormais l'officine depuis les données de toutes les tables auditées qui portent ce champ, pas seulement les tables du socle initial.
- Les consultations et vérifications exigent un rattachement actif et le rôle promoteur, titulaire ou RMQ.
- L'écran expose les opérations renvoyées par l'API, des filtres de dates/opérations, la pagination et un export de la page consultée. Les simulations de certificat, de signature d'export, d'import de scellé et de racine Merkle ont été retirées. L'export CSV n'est pas une archive signée ni un export exhaustif.

## Validation exécutée le 6 novembre 2026

Une instance native **PostgreSQL 16.14** a été démarrée pour la recette, distincte de toute base officinale. Le test crée puis supprime sa propre base. Les instructions SQL de migration et de vérification sont lues depuis les fichiers Laravel, et non recopiées dans un faux moteur.

Scénarios réussis : journal vide ; empreintes et séparation des officines ; ajouts simultanés avec continuité ; refus UPDATE/DELETE/TRUNCATE ; première altération détectée après simulation d'une intervention administrateur ; historique non chaîné identifié.

```sh
npm ci
# Définir AUDIT_TEST_ADMIN_URL vers une instance PostgreSQL DE RECETTE
# avec droit CREATE DATABASE ; ne jamais afficher son mot de passe dans un rapport.
npm run test:audit-postgres
```

La CI rejoue cette recette sur PostgreSQL 16. Les tests PHPUnit couvrant l'API et les droits sont écrits, mais n'ont pas été exécutés localement : Laravel et ses dépendances ne sont pas démarrés ici. La vérification syntaxique PHP, les types frontend, les tests frontend et la compilation ont été exécutés séparément.

## Avant bascule de l'application sur Laravel

1. Installer PHP avec PDO PostgreSQL et Composer, puis les dépendances Laravel.
2. Configurer une base de recette distincte, les secrets d'environnement et les droits de connexion. Les migrations requièrent un compte propriétaire ; l'application ne doit pas utiliser un superutilisateur PostgreSQL.
3. Exécuter `php artisan migrate` puis `php artisan test` et les tests d'autorisation/RLS avec le rôle applicatif réel.
4. Vérifier le routage de toutes les opérations métier auditées. Ce lot ne crée pas de triggers sur les tables qui n'étaient pas déjà auditées.
5. Configurer `BACKEND_URL` de Vite vers Laravel et redémarrer l'aperçu. Le serveur de démonstration n'est pas la base réelle et n'est pas une preuve de fonctionnement Laravel.
6. Importer les produits et lots uniquement depuis un fichier fourni et validé par l'officine. Pas de transformation de ventes fictives en historique réel. Les jeux de recette doivent rester identifiés comme tels.

## Ce qui n'est pas garanti

Un administrateur PostgreSQL peut désactiver les triggers et reconstruire l'ensemble du journal. Il faut des sauvegardes contrôlées, un rôle applicatif limité et un ancrage externe pour renforcer la résistance à cette menace. Ce chaînage n'est pas une signature électronique qualifiée, une certification ABMed ni une preuve d'antériorité des entrées historiques. Les signatures PIN et la GED versionnée restent des lots distincts.
