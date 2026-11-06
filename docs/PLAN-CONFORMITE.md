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
