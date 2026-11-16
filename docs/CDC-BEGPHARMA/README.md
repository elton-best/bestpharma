# CDC BEGPHARMA — Cahier des charges complet du projet

**Dossier consolidé · version 1.0 · 12 novembre 2026 · branche `arena/a2e9c195-bestpharma`**

Ce dossier contient le cahier des charges **de tout le projet BEGPHARMA** : les **24 écrans** de l'application, leurs **132 sections d'interface** analysées en **162 zones fonctionnelles**, et les **1 218 objets numérotés** qui en découlent (exigences, modales, graphiques, règles globales, lots de livraison, anomalies relevées).

Il est issu de l'audit du code réellement livré et de vérifications exécutées en direct sur la pile de démonstration — **aucune exigence n'est hypothétique** : chacune est ancrée dans un fichier, une ligne, une route ou une réponse HTTP mesurée.

## Contenu du dossier

```
CDC-BEGPHARMA/
├── README.md                        ce fichier
├── 00-Document-maitre.md            POINT D'ENTRÉE — tout le projet, chaque section
├── 01-CDC-fonctionnel-Tableau-de-bord-Comptoir-Caisse-Groupe.md
├── 02-CDC-reel-interfaces-telemetrie-Tableau-de-bord-Groupe-Comptoir-Caisse.md
├── 03-CDC-reel-cartographie-18-ecrans-restants.md
├── 04-CDC-reel-Presences-Pointage-Badges.md
├── 05-CDC-reel-Stock-Magasin-Stupefiants-Preparations.md
├── 06-CDC-reel-Qualite-GED-Finance-Compte-Securite.md
├── 07-Cahier-des-charges-Qualite-BPD-ABMed.md
└── annexes/
    ├── A-etat-reel-par-section.md   162 zones, leur état réel, les 33 zones « faux »
    ├── B-index-des-243-modales.md   M-01 → M-243, une ligne par modale
    ├── C-index-des-codes.md         tous les codes des 7 cahiers, plages et effectifs
    ├── D-criteres-d-acceptation.md  10 critères globaux + 14 grep de recette
    ├── recette-grep.sh              script exécutable des 14 contrôles — état de départ 0/14
    ├── E-parite-api.md              9 routes en 501, 12 orphelines, 35 contrôleurs
    └── F-sources/                   document client d'origine et note d'exclusions
```

## Par où commencer

| Vous voulez… | Ouvrez |
| --- | --- |
| **Tout comprendre en un seul document** | `00-Document-maitre.md` |
| Savoir ce qui est vrai aujourd'hui dans l'application | annexe **A**, puis §8 du maître |
| Implémenter un lot | §9 du maître (trouver le lot) → le cahier qui le porte → §5 et §7 du maître |
| Recetter une livraison | annexe **D**, puis `bash CDC-BEGPHARMA/annexes/recette-grep.sh` |
| Comprendre pourquoi la démo échoue sur certains écrans | annexe **E**, §8.2 du maître |
| La spécification qualité opposable à ABMed | cahier **07** (il **fait foi**), puis §4.6 du maître |
| La liste de toutes les modales à construire | annexe **B** |

## Les sept cahiers

| # | Nature | Périmètre | Lignes |
| --- | --- | --- | --- |
| **01** | le **quoi** fonctionnel | 6 écrans Comptoir & Caisse, Groupe, Tableau de bord | 895 |
| **02** | le **comment visible** + télémétrie | mêmes 6 écrans, M-01→M-42, G-01→G-20, L1→L7 | 806 |
| **03** | la **cartographie** | 18 écrans restants, M-43→M-127, G-21→G-56, RG-01→12, L8→L14 | 523 |
| **04** | **approfondissement** | Présences, Pointage, Badges, Personnel, art. 1.11, L15→L20 | 892 |
| **05** | **approfondissement** | Stock, Magasin, Stupéfiants, Préparations, L21→L26 | 840 |
| **06** | **approfondissement** | Qualité, GED, Finance, Compte, Sécurité, L27→L33 | 1001 |
| **07** | **fait foi** pour la qualité | les 9 pages Qualité & BPD ABMed | 772 |

## Les cinq constats qui résument le projet

1. **9 routes renvoient `501` en démonstration alors que le contrôleur Laravel existe.** Dont `POST /api/upload`, qui bloque tout téléversement de l'application. → lot **L21**, à livrer en premier.
2. **33 zones affichent un fait inexistant.** Dossier PRA « 100 % Réussie (Chiffrée) », revue de direction à 94.2 %, certificat d'étalonnage `CERT-2026-042`, états financiers SYSCOHADA, rapport d'heures « 412 h », délai moyen de NC « 4.2 jours ». Un inspecteur qui imprime l'un de ces documents reçoit une déclaration fausse. → **RG-35**.
3. **Des secrets sont écrits en clair côté client** : 10 codes de secours MFA, le jeton e-MECeF `dgi_live_sec_…`, les codes PIN des employés renvoyés par l'API. → **RG-07**, **RG-16**.
4. **Le corpus de référence existe et n'est pas branché** : `references/canevas/catalogue.json` contient 62 documents hashés `sha256` ; l'interface annonce « 59 modèles » ; l'API de démonstration en renvoie **3, vides**. → **RG-41**, lot **L28**.
5. **10 tables seulement sont sous trigger d'audit et RLS** ; plus de 30 tables métier — dont `pointages`, `stock_lots`, `registre_stupefiants`, `ecritures_syscohada` — ne le sont pas. → **RG-37**, lot **L29**.

## Chiffres clés

| | |
| --- | --- |
| Écrans | 24 routes · 34 entrées de barre latérale |
| Sections | 132 d'interface · **162 zones fonctionnelles** analysées |
| Objets numérotés | **1 218** |
| Exigences fonctionnelles | 493 |
| Modales | 243 (M-01 → M-243) |
| Graphiques | 124 (G-01 → G-124) |
| Règles globales | 44 (RG-01 → RG-44) |
| Lots de livraison | 33 (L1 → L33) |
| Anomalies relevées | **191**, dont **11 vérifiées par exécution** |
| État réel | 37 zones réelles · 37 partielles · 28 vitrines · 27 mortes · **33 fausses** |
| Code audité | ≈ 39 000 lignes d'écrans · 35 contrôleurs Laravel · 148 routes |

## Pile de démonstration

```bash
node mock-backend.mjs              # API de démonstration, 0.0.0.0:8001
cd frontend && npm ci && npm run dev   # Vite, 0.0.0.0:5174, proxy /api -> 127.0.0.1:8001
```

Comptes : `promoteur@`, `pharmacien@`, `dispensateur@`, `agent.b@` (domaine `@begpharma.bj`) · mot de passe `Begpharma2026!` · code MFA `123456` · secret TOTP `JBSWY3DPEHPK3PXP`.

## Provenance

Les sept cahiers sont **aussi présents à la racine du dépôt** sous leur nom d'origine `BEGPHARMA — …md`, commités dans `7cda001`, `f087d7e`, `16106de`, `7b37aa3` et `5b8becf`. Ce dossier en est la copie ordonnée et numérotée. **En cas de divergence, la racine fait foi pour les cahiers 01 → 07 ; ce dossier fait foi pour le document maître et les annexes.**

Sources réglementaires : `references/abmed/guide-bpdisp.pdf` (267 articles, art. 1.11 pour le pointage), `references/canevas/catalogue.json` (62 documents), `README.md` et `docs/` du dépôt.

## Contrainte du dépôt

`frontend/AGENTS.md` : le projet est connecté à Lovable — **ne pas réécrire l'historique git publié** (pas de `force push`, de `rebase`, d'`amend` ni de `squash` sur des commits poussés) et garder la branche en état de marche.
