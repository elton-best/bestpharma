# Plan de remise à niveau — preuve avant extension

État relevé le 6 novembre 2026, sur la branche de travail Arena après intégration de `main`.

## Ordre d'exécution

Chaque lot doit comporter ses tests, ses limites connues et un bilan avant le suivant.
Aucune déclaration de certification ABMed ne découle de ces travaux.

1. **Socle de validation et inventaire** (démarré)
   - Node 22 déclaré dans `.nvmrc` et les contraintes des paquets.
   - CI activée sur les branches Arena ; installation reproductible, tests, types et compilation.
   - Inventaire technique reproductible : `npm run inventaire:corpus`.
   - Corriger toutes les erreurs de types, puis aligner les tests de réception sur les contrôles obligatoires sans rendre vendable un lot non contrôlé.
2. **Vérité des preuves et sécurité**
   - Retirer les résultats d'intégrité fictifs et les allégations non démontrées.
   - Vérifier la signature côté serveur, limiter les tentatives, lier la signature à une version immuable.
   - Construire et tester le chaînage d'audit, y compris une altération volontaire.
   - Confirmer la révocation des secrets potentiellement divulgués sur la machine d'origine. Ne jamais recopier leurs valeurs dans le dépôt.
3. **Référentiel et réconciliation documentaire**
   - Obtenir le PDF officiel ABMed, tracer sa provenance et son empreinte.
   - Extraire et faire relire les articles par un pharmacien/RMQ ; ne pas fabriquer les exigences manquantes.
   - Réconcilier les lignes de l'inventaire Excel avec les fichiers : présents, absents, annexes, doublons et versions.
   - Ne pas transformer une cible commerciale en compteur de données disponibles.
4. **GED et bibliothèque**
   - Versions de fichiers privées par officine, empreinte serveur, droits, diffusion, accusés et conservation.
   - Import contrôlé et idempotent, avec rapport d'erreurs et sans publication des données nominatives comme modèles génériques.
5. **Recette Laravel et pilote**
   - Importer un jeu de recette explicitement distinct des données réelles.
   - Tester isolation, stock FEFO, péremptions, visa, caisse et numérotation sur PostgreSQL.
   - Sauvegarde restaurée en test, mode inspecteur, puis validation terrain.

## Bilan du premier contrôle

- Corpus local : **63 fichiers**. `inventaire-corpus.json` contient chemins, tailles, extensions, empreintes SHA-256 et doublons binaires. Il ne prouve ni validation documentaire, ni conformité, ni antériorité.
- Le PDF du guide BPD a été fourni par l’utilisateur et conservé dans `references/abmed/guide-bpdisp.pdf`. Extraction contrôlée des 267 numéros et de leurs segments textuels, avec empreinte et pages sources ; relecture métier et import versionné encore requis. Voir `references/abmed/README.md`.
- Tests frontend : **23 réussis** ; compilation de production réussie.
- Vérification des types : **aucune erreur** après correction des contrats de composants, des champs officine/stock/facture et des requêtes comptables. Aucun contournement global du typage.
- Comptabilité : suppression des écritures et clôtures fictives injectées en cas d’échec API ; message explicite de données incomplètes.
- Réception : les tests existants fournissent désormais les contrôles des lots vendables ; un lot sans contrôles est ajouté pour vérifier son exclusion du total disponible et du choix FEFO. Tests PHP à exécuter en CI, non déclarés réussis localement.
- PHP indisponible dans cet environnement : les résultats backend et les comptes PostgreSQL du rapport fourni ne sont pas revérifiés localement. La CI doit exécuter les tests avec PostgreSQL.
- Contrôle ciblé des secrets : pas d'identifiant dans l'URL du remote de cette copie ; aucun motif de jeton GitHub, clé AWS classique ou clé privée trouvé dans les fichiers suivis actuels. Ce contrôle n'est pas un audit complet : historique Git, fichiers locaux non suivis, systèmes externes et révocation restent à vérifier.

## Prochain lot

Faire exécuter les tests backend en CI, puis sécuriser les réponses d’audit et les validations documentaires. Le journal contient encore des calculs de preuve simulés : le succès de la compilation ne vaut pas validation de l’intégrité. L’import du référentiel complet reste conditionné à sa relecture métier et à une stratégie préservant les anciennes cotations.

## Lot de préparation versionnée

Migration et commande `bpd:preparer` ajoutées : instantané en relecture, identité de contenu, import sans doublon et lien nullable depuis les campagnes. Aucun référentiel actif remplacé. Vérificateur pur exécuté avec PHP WebAssembly sur la source et sur quatre cas de refus ; syntaxe des nouveaux fichiers contrôlée. Validation de la migration et du comportement transactionnel PostgreSQL encore attendue en CI.

## Lot audit réel

Chaînage et vérification PostgreSQL implémentés, contrôleur protégé par rôle/officine, écran débarrassé des scellés simulés. Recette SQL exécutée avec succès sur PostgreSQL natif 16.14, y compris insertions concurrentes et altération. Voir `RECETTE-AUDIT.md`. Ne pas confondre cette recette avec un backend Laravel en exploitation : API PHP complète et droits applicatifs encore à valider.

## Lot approbation documentaire

Frontend et backend liés par une empreinte serveur et une confirmation du mot de passe du compte (pas un PIN non provisionné). Copie textuelle et métadonnées d'approbation conservées, limitation des tentatives, historique et révision sans perte de copie. Triggers testés sur PostgreSQL natif ; tests de modale ajoutés. Faux émargements/diffusion retirés. Voir `APPROBATION-DOCUMENTAIRE.md` pour les limites, notamment l'absence de signature qualifiée et la validation API Laravel encore attendue.

## Lot GED de fichiers

Stockage privé dédié, pièces conservées par version, historique, téléchargement authentifié avec vérification de l’empreinte et manifeste inclus dans les nouvelles approbations. Tests frontend et SQL PostgreSQL exécutés ; tests HTTP Laravel écrits mais non exécutés localement. Import du corpus, antivirus, conversion PDF/A, diffusion et sauvegardes restent distincts. Voir `GED-FICHIERS.md`.

## Rapprochement de l'inventaire et du corpus

Lecture reproductible de l'onglet `Inventaire` (sans réécriture du classeur) et inventaire des fichiers actuels, avec empreintes. Rapports : `rapprochement-corpus.md` et `rapprochement-corpus.json`.

Résultat : 91 codes uniques, 14 processus, 63 fichiers. Types : 14 PRO, 9 MOP, 63 FOR, 5 ENR. États du classeur : 88 terminés, un en cours, un à établir et un sans état renseigné. Cela corrige l'omission d'une ligne dans le résumé initial.

La proximité des noms propose des pistes pour 56 lignes ; 35 n'ont pas de piste suffisante par ce seul critère. Huit fichiers sont sollicités comme première piste par plusieurs lignes : rapprochements ambigus, pas doublons binaires prouvés. Aucun fichier n'est confirmé ni importé automatiquement. Les annexes et variantes doivent être examinées dans le contenu ; il serait incorrect de conclure à des documents absents en soustrayant simplement le nombre de fichiers du nombre de lignes.

Commande de reproduction : `python scripts/rapprocher-corpus.py`, après installation de `scripts/requirements-corpus.txt`. Contrôle : option `--check` et `python -m unittest discover -s scripts/tests` (trois tests exécutés avec succès). La CI rejoue ces contrôles. Prochaine étape : lire les cartouches/codes des documents pour lever les ambiguïtés et établir un manifeste d'import explicite, sans transférer les statuts « Validé » en approbations applicatives.

## Lot groupé de préparation et d'import du corpus

Manifeste complet de 62 fichiers documentaires et une illustration exclue ; lecture des codes DOCX/XLSX/ODT/PDF sans attribution implicite. Commande Laravel de vérification/import privé, reçus protégés, relance sans doublon, aperçu des imports et qualification des fiches dans la GED. Les sources non qualifiées restent bloquées à l'approbation. Les 91 lignes d'inventaire sont conservées séparément des fiches sources. Documentation et limites dans `IMPORT-CORPUS.md` ; ne pas déclarer les fichiers importés en base tant que la commande n'a pas été exécutée sur le backend cible.
