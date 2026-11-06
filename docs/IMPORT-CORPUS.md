# Import groupé du corpus — mode opératoire et bilan

> **Validation complète du 6 novembre 2026 :** les migrations et les tests Laravel/PostgreSQL ainsi que les contrôles frontend et documentaires ont réussi dans la [CI du commit ead99c5](https://github.com/elton-best/begpharma/actions/runs/42224142108). Les mentions ci-dessous de tests non exécutés localement décrivent la limite de l’environnement local, désormais complétée par cette validation distante. Aucun import dans une officine en exploitation ni bascule de l’aperçu vers Laravel n’est revendiqué.


## Lot préparé

Le manifeste `manifeste-import-corpus.json` contient les **62 fichiers documentaires** du dossier source (dont le classeur d'inventaire) ; **une illustration est exclue**. Les **91 lignes d'inventaire** sont conservées comme données de rapprochement, pas transformées artificiellement en fiches approuvées.

Les codes sont recherchés dans les DOCX (corps, en-têtes et pieds), XLSX, ODT et PDF. Les cinq anciens DOC restent importables comme originaux, mais leur texte n'a pas été extrait. Des codes absents de l'inventaire sont repérés dans 22 fichiers : ce sont des points de contrôle, pas nécessairement des erreurs de cartouche, car une procédure peut citer d'autres documents. Voir le rapport `manifeste-import-corpus.md`.

Aucune correspondance issue de la proximité des noms ou d'une référence citée n'est promue automatiquement en code officiel.

## Stratégie source-first

Un fichier = une fiche source privée, brouillon, avec un code technique `SRC-…`. Le processus QAM sert au classement documentaire provisoire, pas à une attribution métier validée. Le titre vient du nom du fichier. Le texte rappelle la nécessité d'une vérification. L'opérateur du dépôt n'est pas présenté comme auteur du contenu original.

Les originaux nominatifs restent dans l'officine explicitement choisie. Ils ne deviennent pas des modèles génériques de démonstration.

La requalification s'effectue ensuite dans la GED : ouvrir la source, télécharger et examiner le cartouche, utiliser **Qualifier la fiche**, saisir le code documentaire vérifié, le type, le processus et le texte descriptif. Titulaire/promoteur/RMQ sont habilités à cette qualification. Un code source ou un type `piece_source` bloque l'approbation, qui conserve son étape distincte de confirmation serveur.

Ces fiches sources ne remplacent pas les 91 entrées de l'inventaire. Annexes, variantes et documents sans fichier autonome restent à rapprocher ; aucun nombre de documents « manquants » n'est fabriqué par soustraction.

## Exécution sous Laravel

Après sauvegarde, configuration du stockage privé et application des migrations, depuis la racine :

```sh
python -m pip install -r scripts/requirements-corpus.txt
python scripts/rapprocher-corpus.py --check
python scripts/preparer-import-corpus.py --check
cd backend
php artisan ged:importer-corpus ../docs/manifeste-import-corpus.json '../0000. DIGIT ABMEB' --verifier
```

Puis utiliser `ged:importer-corpus` sans `--verifier`, avec `--officine` et `--operateur` définis à partir des identifiants réels d'une officine et d'un utilisateur existants. Aucune officine ni identité n'est créée implicitement. L'opérateur doit être actif, rattaché à l'officine et titulaire/promoteur/RMQ.

L'exécution CLI est une opération d'administration attribuée à l'opérateur désigné ; elle ne prouve pas une authentification interactive de celui-ci et ne crée aucune signature ou approbation.

## Garanties d'import

- Avant écriture : format du manifeste, fichiers présents, taille, empreintes, clé source et confinement dans le répertoire source. Refus des répétitions et sorties de répertoire.
- Sous verrou d'officine : import transactionnel des nouvelles fiches, métadonnées des pièces et reçus. Les fichiers sont copiés en stockage privé et leur copie est vérifiée.
- Une clé `(officine, chemin source + empreinte)` empêche les doublons lors de relances ou d'imports de manifestes successifs. Les documents déjà retravaillés ne sont pas écrasés.
- Lors d'une relance, les pièces existantes sont revérifiées. Une pièce manquante ou altérée arrête l'import, elle n'est pas déclarée saine ni remplacée silencieusement.
- En cas d'échec, la transaction est annulée et une suppression des nouveaux fichiers est tentée. Un arrêt brutal ou une panne du disque exige une réconciliation des fichiers orphelins ; DB et disque ne constituent pas une transaction distribuée.
- Les reçus d'import et de provenance sont protégés et audités. Aucun statut « Validé » du classeur ne devient une approbation applicative.

## Interface

Dans Documents, **Consulter les imports** affiche les seuls reçus renvoyés par Laravel : sources créées ou présentes, lignes d'inventaire à rapprocher, empreinte du manifeste et date serveur. Une panne n'affiche ni import réussi ni compteur vide présenté comme vérifié.

## Contrôles et limites

Exécutés localement : génération reproductible, quatre tests Python, vérificateur PHP pur des 62 sources avec refus d'altération/traversée/doublon, syntaxe PHP, tests SQL PostgreSQL des reçus protégés, types frontend, tests frontend et compilation.

Tests PHPUnit écrits : import complet, relance sans doublon, zéro approbation automatique, consultation du reçu, blocage d'une source non qualifiée et qualification suivie d'approbation. Leur exécution complète dépend de l'environnement Laravel/Composer ; ne pas confondre code testé partiellement et import effectivement réalisé dans une officine.

Ce lot ne prétend pas résoudre l'authenticité juridique des originaux, la lecture des anciens DOC, l'antivirus, le PDF/A, l'anonymisation des modèles, la diffusion ou le rapprochement métier final.
