# BEGPHARMA — Cahier des charges de projet · Document maître

**CDC consolidé — l'ensemble du projet, chaque écran, chaque section**
Version 1.0 · 12 novembre 2026 · Branche `arena/a2e9c195-bestpharma`

Ce document est le **point d'entrée unique** du cahier des charges BEGPHARMA. Il spécifie les **24 écrans** de l'application et leurs **132 sections**, renvoie pour chacune vers le volet détaillé qui la spécifie, et consolide les exigences transverses, la télémétrie, les règles globales, le registre des défauts et le plan de livraison.

| | |
| --- | --- |
| Périmètre | 24 routes · 34 entrées de barre latérale · 132 sections d'interface, analysées en **162 zones fonctionnelles** · ≈ 39 000 lignes de code d'écrans |
| Écrans | 6 du périmètre Comptoir & Caisse + 18 du périmètre Qualité, Stock, Finance et Compte |
| Documents | 7 cahiers (01 → 07) + 5 annexes (A → E) + sources (F) |
| Objets numérotés | **1 218** : 556 exigences fonctionnelles · 243 modales · 124 graphiques · 44 règles globales · 33 lots · 191 anomalies · 15 interfaces · 10 tableaux · 2 non-fonctionnelles |
| Défauts relevés | **191 anomalies codées**, sourcées `fichier:ligne`, dont **11 vérifiées par exécution** sur la pile de démonstration |
| Méthode | Audit du code livré → vérification en direct sur la pile de démonstration → spécification de la cible |

---

## Sommaire

1. [Comment utiliser ce cahier des charges](#1--comment-utiliser-ce-cahier-des-charges)
2. [Architecture et conventions du projet](#2--architecture-et-conventions-du-projet)
3. [Cartographie complète — 24 écrans, 132 sections](#3--cartographie-complète--24-écrans-132-sections)
4. [Spécification section par section](#4--spécification-section-par-section)
5. [Socle transversal commun à toutes les sections](#5--socle-transversal-commun-à-toutes-les-sections)
6. [Télémétrie consolidée](#6--télémétrie-consolidée)
7. [Règles globales RG-01 → RG-44](#7--règles-globales-rg-01--rg-44)
8. [Registre consolidé des défauts](#8--registre-consolidé-des-défauts)
9. [Plan de livraison L1 → L33](#9--plan-de-livraison-l1--l33)
10. [Traçabilité documentaire](#10--traçabilité-documentaire)
- [Annexes A → F](#annexes)

---

## 1 — Comment utiliser ce cahier des charges

### 1.1 Les sept cahiers

| # | Document | Nature | Périmètre |
| --- | --- | --- | --- |
| **00** | *Document maître* (ce fichier) | consolidation et index | tout le projet, 132 sections |
| **01** | *CDC fonctionnel — Tableau de bord, Comptoir & Caisse, Groupe* | le **quoi** fonctionnel | 6 écrans, 895 l. |
| **02** | *CDC réel — interfaces & télémétrie (Tableau de bord, Groupe, Comptoir & Caisse)* | le **comment visible** | mêmes 6 écrans, M-01→M-42, G-01→G-20, RG-T/C/D/F, L1→L7, 806 l. |
| **03** | *CDC réel — cartographie des 18 écrans restants* | la **cartographie** | 18 écrans, TAB-01→06, D-01→17, I-07→15, M-43→M-127, G-21→G-56, RG-01→12, L8→L14, 523 l. |
| **04** | *CDC réel — Présences, Pointage & Badges (art. 1.11)* | **approfondissement** | 2 écrans + 4 modules, DEF-01→25, INC-01→08, TAB-07→10, M-128→M-157, G-57→G-68, RG-13→24, L15→L20, 892 l. |
| **05** | *CDC réel — Stock, Magasin, Stupéfiants & Préparations* | **approfondissement** | 4 fichiers, constats transverses vérifiés par exécution, INC-09→18, M-158→M-199, G-69→G-96, RG-25→34, L21→L26, 840 l. |
| **06** | *CDC réel — Qualité, GED, Finance, Compte & Sécurité* | **approfondissement** | 13 écrans, INC-19→28, M-200→M-243, G-97→G-124, RG-35→44, L27→L33, 1 001 l. |
| **07** | *Cahier des charges de la section « Qualité & BPD ABMed »* | **fait foi** | les 9 pages qualité, 772 l. |

### 1.2 Ordre de lecture selon le profil

| Vous êtes… | Lisez dans cet ordre |
| --- | --- |
| **Agent de développement** qui implémente un lot | §9 du maître (trouver le lot) → le volet qui le porte → §5 du maître (socle transversal) → §7 (règles globales) → annexe C (index des codes) |
| **Chef de projet** qui planifie | §3 (cartographie) → §8 (défauts) → §9 (plan de livraison) → annexe D |
| **Responsable qualité / pharmacien** | §4 (sa section) → volet 07 (fait foi pour la qualité) → volet 04 §2.10 → annexe A |
| **Inspecteur ABMed** | volet 07 → §4 groupe 6 → annexe A (ce qui est réel aujourd'hui, ce qui reste à faire) |
| **Nouveau venu sur le code** | §2 (architecture) → §5 (socle transversal) → volet 05 §0 (constats vérifiés par exécution) |

### 1.3 Convention de priorité

| Priorité | Définition | Exemples |
| --- | --- | --- |
| **P0** | Bloque la démonstration ou produit une déclaration fausse | 9 endpoints en `501`, 3 documents imprimables fictifs, balance des stupéfiants vide par défaut |
| **P1** | Empêche la conformité réglementaire ou expose un secret | codes de secours MFA en clair, jeton e-MECeF côté client, registres sans trigger d'audit, signature non vérifiée |
| **P2** | Dégrade la fiabilité métier | replis silencieux, seuils dupliqués six fois, matricules tirés au sort, paramètres non appliqués |
| **P3** | Dette de cohérence et de maintenance | `<table>` bruts, libellés hors `i18n/fr.ts`, absence d'ancres de test, sections vitrines |

### 1.4 Règle de lecture des états

Dans toutes les tables de ce cahier, la colonne **État réel** emploie cinq valeurs :

| Valeur | Sens |
| --- | --- |
| **réel** | l'écran appelle un endpoint qui existe, fonctionne en démonstration et restitue des données serveur |
| **partiel** | certaines fonctions sont réelles, d'autres sont en état local ou statiques |
| **vitrine** | l'interface est rendue mais aucune donnée ne vient du serveur |
| **mort** | un contrôle existe dans le JSX mais rien ne se produit, ou l'endpoint renvoie une erreur en démonstration |
| **faux** | l'interface affiche une valeur ou un document qui décrit un fait inexistant |

### 1.5 Levée d'ambiguïté des codes

Les sept cahiers ont été rédigés par vagues successives. Trois familles de codes sont **réutilisées avec des numérotations différentes** selon le cahier. Règle de lecture : **un code est toujours précédé du numéro de cahier** (`06/PAR-03`, `07/POI-04`, `04/PRS-28`). Dans ce document maître, la colonne « Réf. » porte ce préfixe implicite par groupe.

| Famille | Cahier | Écran | Plage | Sens |
| --- | --- | --- | --- | --- |
| `PAR-nn` | **04** | `pointage?tab=parametres` | PAR-01→06 | paramètres de l'art. 1.11 (tolérance, mode présence) |
| `PAR-nn` | **06** | `parametres` | PAR-01→09 | paramètres d'officine (11 sections) |
| `TEM/LOC/AUT/DOC/MOD/NCC/ECH-nn` | **07** | 9 pages qualité | TEM-01→12, LOC-01→13, AUT-01→14, DOC-01→18, MOD-01→10, NCC-01→13, ECH-01→12 | exigences **fonctionnelles** — c'est le cahier qui **fait foi** |
| `TEM/LOC/AUT/DOC/MOD/NCC/ECH-nn` | **06** | mêmes 9 pages + 4 autres | TEM-01→18, LOC-01→16, AUT-01→14, DOC-01→18, MOD-01→12, NCC-01→14, ECH-01→12 | exigences **d'implémentation** ancrées dans le code livré ; elles précisent le cahier 07 sans le contredire |
| `POI-nn` / `PER-nn` | **07** | `pointage`, `personnel` | POI-01→16, PER-01→18 | mêmes écrans que `PRS/BDG/DOS/PLN/RPT-nn` du cahier **04**, vus sous l'angle qualité ABMed |

Familles propres au cahier **07** (aucune collision) : `AE-01→06`, `EN-01→12`, `FI-01→04`, `LI-01→04`, `PL-01→04`, `RH-02→07`, `DSH-10→11`.

Familles **continues et sans collision** d'un cahier à l'autre : `M-01→243` (modales), `G-01→124` (graphiques), `RG-01→44` (règles globales), `L1→L33` (lots), `INC-01→28` (incohérences), `TAB-01→10` (tableaux), `I-01→15` (interfaces), `D-01→17` (défauts d'interface du volet 03), `DEF-01→25` (volet 04), `BDG-D1→D9` (volet 04).

---

## 2 — Architecture et conventions du projet

### 2.1 Pile technique

| Couche | Technologie | Détail |
| --- | --- | --- |
| Frontend | TanStack Router + Vite 8 + React 19 | `frontend/`, port 5174, `host 0.0.0.0`, `allowedHosts: true`, `hmr.clientPort 443`, proxy `/api` → `BACKEND_URL \|\| http://127.0.0.1:8001` |
| Backend | Laravel 11 / PHP 8.3 | `backend/`, 35 contrôleurs `Api/`, `routes/api.php` (275 l.) |
| Base | PostgreSQL 16 | RLS par officine, triggers d'audit, `fn_audit_trigger()`, `user_officines()` |
| API de démonstration | Node sans dépendance | `mock-backend.mjs` (108 Ko), port 8001, `0.0.0.0`, état persisté dans `mock-data/persistance-demo.mjs` |
| Authentification | Sanctum + MFA TOTP | verrou d'inactivité 15 min (`423 SESSION_LOCKED_INACTIVITY`) |
| Graphiques | `recharts` ^2.15.4 | **3 fichiers seulement** : `components/tableau-de-bord.tsx` (`LineChart`), `auto-evaluation.tsx` (`BarChart`), `temperatures.tsx` (`LineChart`). `components/ui/chart.tsx` n'est **jamais importé**. `comptabilite.tsx` dessine son `PieChart` à la main en SVG |
| PDF et export | `jspdf` ^4.2.1, `html2canvas` ^1.4.1 | `lib/export-utils.ts` |
| Hors ligne | `dexie` ^4.0.11 | `lib/offline/outbox.ts` — **jamais appelé par le code applicatif** |
| Fuseau | `Africa/Porto-Novo` | `lib/format.ts` côté client ; `APP_TIMEZONE=UTC` côté serveur — **divergence à corriger** |

### 2.2 Conventions du dépôt

| Convention | Source | État |
| --- | --- | --- |
| « Tout libellé d'interface vient d'ici » | `src/lib/i18n/fr.ts:1` | appliquée par **4 écrans sur 24** |
| Ne pas réécrire l'histoire git publiée (projet connecté à Lovable) | `frontend/AGENTS.md` | respectée : aucun `push --force`, aucun `rebase`, aucun `amend` |
| Garder la branche dans un état fonctionnel | `frontend/AGENTS.md` | `npm run typecheck` et `npm test` doivent passer |
| Toute route implémentée **deux fois** (Laravel et mock) | volet 01 §8.1 | **9 routes en défaut** (annexe E) |
| Toute nouvelle route `GET` exige une fixture | `src/test/ecrans-demo.test.tsx` lève sur clé manquante | 14 écrans testés, 10 absents |
| Codes métier issus des cahiers ABMed | volets 01 et 07 | POI/PER/STO/TEM/LOC/AUT/DOC/MOD/NCC/ECH/CAI/VTE/FPX/POS/DSP/FDG/TDB/CGL/GRD |

### 2.3 Mécanismes d'onglets — trois familles coexistent

| Famille | Mécanisme | Écrans | URL |
| --- | --- | --- | --- |
| **A** | `SelecteurFiltrable` seul, alimenté par une constante `SECTIONS` locale | 18 écrans | `?tab=` transmis par la barre latérale, mais sous-sections en état local |
| **B** | `SelecteurFiltrable` **et** `Tabs` Radix pilotés par le même état | `pointage.tsx` | aucune |
| **C** | `Tabs` Radix seul, ou `sectionActive` en `useState` | `comptabilite`, `compte`, `parametres`, `securite` | aucune |

**Exigence TAB-01→TAB-10** (volets 03 et 04) : conserver `SelecteurFiltrable`, rendre chaque section lien profond, remonter les sous-sections dans l'URL, ajouter `validateSearch`, et ramener les familles B et C à la famille A.

### 2.4 Socle réglementaire

| Référence | Portée |
| --- | --- |
| Guide des Bonnes Pratiques de Dispensation — ABMed, Bénin | **267 articles** ; art. 1.11 (présence physique continue du pharmacien), art. 5.2 (traçabilité FEFO) |
| Cahier des charges maître (§1 → §13.7) | `annexes/F-sources/Cahier des charges BEGPHARMA.docx` |
| Consignes métier complémentaires | `annexes/F-sources/on a pas besoin de mettre.txt` : préférer art. 5.2 à « BPD-5 · TRAÇABILITÉ FEFO · STO-03 / Art. 5.8 » ; STO-14 rappel → quarantaine automatique + ventes bloquées ; seuils 90 j / 45 j / 10 j / veille / bloqué |
| Corpus documentaire de référence | `references/canevas/catalogue.json` : **62 documents**, chacun avec `sha256` et structure en `parties`, 5 rubriques |
| SYSCOHADA / OHADA | plan comptable, comptes 5311/5121, 7011, 4431 |
| e-MECeF / DGI | facturation électronique, TVA 18 % groupe B |

### 2.5 Comptes de démonstration

| Compte | Particularité |
| --- | --- |
| `promoteur@begpharma.bj` | 2 officines → accès Consolidation Groupe |
| `pharmacien@begpharma.bj` | officine unique |
| `dispensateur@begpharma.bj` | comptoir |
| `agent.b@begpharma.bj` | second agent |
| Mot de passe | `Begpharma2026!` |
| MFA | code de démo `123456`, TOTP `JBSWY3DPEHPK3PXP` |

**Démarrage** : `node mock-backend.mjs` puis `npm run dev --prefix frontend` — ou `npm run dev:all`.
**Contrôle** : `npm test --prefix frontend` · `npm run typecheck --prefix frontend` · `cd backend && php artisan test`.

---

## 3 — Cartographie complète — 24 écrans, 132 sections

### 3.1 Les huit groupes de la barre latérale

| Groupe | Écrans | Sections | Lignes | Volet détaillé |
| --- | --- | --- | --- | --- |
| **1 · Pilotage** | Tableau de bord | 1 | 260 + 615 (composant) | 01, 02 |
| **2 · Groupe & Réseau** | Consolidation Groupe · Pharmacies de Garde | 1 + 1 | 564 + 416 | 01, 02 |
| **3 · Comptoir & Caisse** | Caisse POS Tactile e-MECeF · Dispensation & Ordonnances · Facturation DGI | 1 + 1 + 5 | 893 + 639 + 434 | 01, 02 |
| **4 · Stock** | Stock (11 sections) | 11 | 2 759 + 816 (module) | 03, 05 |
| **5 · Stupéfiants & Préparations** | Registre Stupéfiants · Préparations Magistrales | 9 + 6 | 874 + 746 | 03, 05 |
| **6 · Qualité & BPD ABMed** | Chaîne du froid · Locaux & Matériel · Auto-évaluation · Pointage Présence · Personnel & Ordre B · GED & Procédures · Modèles Types BPD · Non-conformités & CAPA · Échéancier | 6+7+1+7+9+8+4+6+6 | 11 866 | 03, 04, 06, 07 |
| **7 · Gestion & Finance** | Comptabilité SYSCOHADA · Journal d'audit SHA-256 · Appareils autorisés | 6 + 1 + 7 | 2 283 | 03, 06 |
| **8 · Compte & Officine** | Mon profil & Rôle · Paramètres Officine · Sécurité & MFA | 9 + 11 + 8 | 3 522 | 03, 06 |
| **Total** | **24 écrans** | **132 sections** | **≈ 39 000** | 7 cahiers |

> **Deux comptes, deux objets.** Les **132 sections** sont les onglets et cartes visibles dans l'interface. Le §4 les décompose en **162 zones fonctionnelles** : une section qui regroupe plusieurs fonctions distinctes (par exemple le tableau de bord, qui n'a pas d'onglet mais six zones) y est analysée en plusieurs lignes. L'annexe A reprend ces 162 zones une par une, avec leur état réel.

### 3.2 État de synthèse par écran

| Écran | Route | Sections | Lignes | Endpoints réels | Modales | Graph. | i18n | Ancres | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tableau de bord | `/dashboard` | 1 | 260 + 615 | 4 | 2 | 4 | non | 5 `data-tour` | partiel — 17 valeurs en dur |
| Consolidation Groupe | `/dashboard/consolidation` | 1 | 564 | 3 | 4 | 4 | non | 0 | réel |
| Pharmacies de Garde | `/dashboard/gardes` | 1 | 416 | 3 | 3 | 0 | non | 0 | réel |
| Caisse POS Tactile | `/dashboard/vente` | 1 | 893 | 6 | 9 | 0 | non | 0 | partiel — session auto-créée |
| Dispensation | `/dashboard/dispensation` | 1 | 639 | 3 | 7 | 0 | non | 0 | partiel |
| Facturation DGI | `/dashboard/facturation` | 5 | 434 | 4 | 5 | 2 | non | 0 | partiel — TVA à 0 |
| **Stock** | `/dashboard/stock` | 11 | 2 759 | 13 | 4 | 0 | non | 0 | réel — réception sans entité |
| **Stupéfiants** | `/dashboard/stupefiants` | 9 | 874 | 11 | 5 | 0 | non | 0 | partiel — 3 replis silencieux |
| **Préparations** | `/dashboard/preparations` | 6 | 746 | 3 | 1 | 0 | non | 0 | vitrine — 5 sections sur 6 |
| Chaîne du froid | `/dashboard/temperatures` | 6 | 1 157 | 4 | 3 | 1 | non | 0 | réel — seuils dupliqués 6× |
| Locaux & Matériel | `/dashboard/locaux` | 7 | 1 250 | 4 | 4 | 0 | non | 0 | partiel — PRA fictif |
| Auto-évaluation | `/dashboard/auto-evaluation` | 1 (267 art.) | 829 | 4 | 2 | 1 | non | 0 | réel — rapport non branché |
| **Pointage Présence** | `/dashboard/pointage` | 7 | 1 126 | 3 | 6 | 0 | non | 0 | **critique** — scan résolu côté client |
| **Personnel & Ordre B** | `/dashboard/personnel` | 9 | 959 | 3 | 4 | 0 | non | 0 | partiel — Ordre non rattachable |
| GED & Procédures | `/dashboard/documents` | 8 | 899 | 6 | **0** | 0 | non | 0 | partiel — revue de direction fictive |
| Modèles Types BPD | `/dashboard/modeles` | 4 | 562 | 3 | **0** | 0 | non | 0 | **faux** — 3 fiches vides pour 62 |
| Non-conformités & CAPA | `/dashboard/non-conformites` | 6 | 816 | 3 | **0** | 0 | non | 0 | partiel — délais en dur |
| Échéancier | `/dashboard/echeances` | 6 × 3 vues | 1 566 | 4 | 3 | 0 | non | 0 | réel — sources non fédérées |
| Comptabilité SYSCOHADA | `/dashboard/comptabilite` | 6 | 1 060 | 4 (**2 morts**) | 2 | 1 | non | 0 | **faux** — états financiers fictifs |
| Journal d'audit SHA-256 | `/dashboard/journal` | 1 | 115 | 2 (**1 mort**) | 0 | 0 | non | 0 | **mort** — intégrité non vérifiable |
| Appareils autorisés | `/dashboard/appareils` | 7 | 1 108 | 6 (**2 morts**) | 1 | 0 | **oui** | 0 | partiel |
| Mon profil & Rôle | `/dashboard/compte` | 9 | 1 370 | 1 (**mort**) | 4 | 0 | **oui** | 0 | vitrine — 8 sections sur 9 |
| Paramètres Officine | `/dashboard/parametres` | 11 | 1 125 | 3 | 3 | 0 | **oui** | 0 | partiel — 5 utilisateurs fictifs |
| Sécurité & MFA | `/dashboard/securite` | 8 | 1 038 | 8 (**2 morts**) | 3 | 0 | **oui** | 0 | réel — 2 failles de secret |

**Lecture** : 4 écrans seulement importent `i18n/fr.ts` ; 5 `data-tour` existent dans toute l'application (tous sur le tableau de bord) ; **0 `data-testid`** sur les 24 écrans ; 6 écrans utilisent `recharts` ; 22 `<table>` HTML bruts et 227 `<td>` restent à convertir.

---

## 4 — Spécification section par section

Chaque section de l'application est spécifiée ci-dessous : finalité, état réel vérifié, endpoints, exigence cible, et renvoi au volet détaillé. Les codes d'exigence (TDB, CGL, GRD, CAI, VTE, FPX, POS, DSP, FDG, PRS, BDG, DOS, PLN, RPT, PAR, STK, STU, PRE, MAG, TEM, LOC, AUT, DOC, MOD, NCC, ECH, CPT, JRN, APP, CMP, SEC) sont définis dans les volets correspondants.

### 4.1 Groupe 1 — Pilotage

#### `/dashboard` · Tableau de bord — 1 écran, 6 zones

| Zone | Finalité | État réel | Endpoints | Cible | Réf. |
| --- | --- | --- | --- | --- | --- |
| Bandeau d'indicateurs | CA du jour, panier moyen, ordonnances, alertes | **faux** — `DONNEES_VENTES_HEBDO` et `DONNEES_TEMP_24H` codés en dur, `+14.2%`, `4 875 k F`, `318 ord.`, `15 330 F`, replis `4.2`/`21.4`/`98.4`, `263 / 267 critères`, `12 SOPs`, `0 litige critique` | `GET /pointages/actif` (réel) | `GET /dashboard/synthese` unique, 12 indicateurs serveur, aucun repli numérique | 01 TDB-01→17 · 02 §1.2 |
| Centre d'alertes | alertes consolidées par gravité | partiel | — | `GET /dashboard/alertes`, `data-tour="centre-alertes"` (existant), tri par criticité | 01 TDB · 02 M-01→M-08 |
| Graphiques de ventes | évolution CA, répartition | partiel — 4 graphiques `recharts` sur données fixes | — | G-01→G-06 alimentés par `/dashboard/synthese` | 02 §4 |
| Chaîne du froid | températures du jour | **faux** — replis `4.2 °C`, `21.4 °C`, `98.4 %` | `GET …/temperatures/stats` (réel, vérifié `200`) | valeurs réelles, alerte si relevé manquant | 06 TEM-15 |
| Présence pharmaceutique | conformité art. 1.11 | réel | `GET …/pointages/actif` | conserver ; appliquer `mode_presence_pharmacien` | 04 PAR-04 |
| Raccourcis métiers | navigation vers les écrans | réel | — | conserver, ancres `data-tour` | 02 annexe B |

**Exigences** : TDB-01→TDB-17 · RG-T01→RG-T07 · composants partagés `GrilleKpi`, `CentreAlertes`, `BlocHorsLigne`.
**Défauts** : 17 valeurs codées en dur relevées dans le volet 02 §1.2.

### 4.2 Groupe 2 — Groupe & Réseau

#### `/dashboard/consolidation` · Consolidation Groupe — 1 écran

| Zone | Finalité | État réel | Endpoints | Cible | Réf. |
| --- | --- | --- | --- | --- | --- |
| Synthèse multi-officines | CA, stock, alertes agrégés | réel | `GET /promoteur/consolidation` (`PromoteurConsolidationController`, 426 l.) | conserver | 01 CGL-01→12 |
| Comparaison d'officines | classement, écarts | réel | idem | G-07→G-10 | 02 §4 |
| Transferts inter-officines | demandes, réceptions | partiel | `GET /promoteur/transferts`, `POST …/receptionner` | `POST …/transferts` jamais appelé → brancher | 05 INC-23 |
| Présence par officine | pharmacien sur place par site | réel | `pharmacien_present` par officine (`consolidation.tsx:304`) | conserver | 04 RG-18 |

**Exigences** : CGL-01→CGL-12 · RG-C01→RG-C10 · accès réservé au rôle promoteur.

#### `/dashboard/gardes` · Pharmacies de Garde — 1 écran

| Zone | Finalité | État réel | Endpoints | Cible | Réf. |
| --- | --- | --- | --- | --- | --- |
| Calendrier des gardes | périodes attribuées | réel | `GET /gardes` | conserver | 01 GRD-01→10 |
| Déclaration de garde | création d'une période | réel | `POST /gardes` (vérifié `201`), `DELETE /gardes/{id}` (vérifié `200`) | conserver | 05 §0.1 |
| Garde et planning d'équipe | astreinte désignée | **faux** — « Nuit du Samedi 07/11 » et « Dr Félicien AGBO » en dur dans `pointage.tsx:678-679` | — | les gardes viennent de cet écran, jamais dupliquées dans le pointage | 04 PLN-05, DEF-18 |
| Tableau de bord de garde | indicateurs de la période | partiel | — | G-11→G-12 | 02 §4 |

**Exigences** : GRD-01→GRD-10 · RG-D09→RG-D12.

### 4.3 Groupe 3 — Comptoir & Caisse

#### `/dashboard/vente` · Caisse POS Tactile e-MECeF — 1 écran, 9 modales

| Zone | Finalité | État réel | Endpoints | Cible | Réf. |
| --- | --- | --- | --- | --- | --- |
| Recherche de produit | sélection rapide au comptoir | partiel | `GET /produits` | debounce 200 ms, < 500 ms sur 20 000 références, `RechercheProduit` partagé | 01 POS-11→14 · 02 §2 |
| Panier et remise | construction du ticket | réel | — | remise plafonnée par `remise_max_dispensateur` (paramètre existant, non appliqué) | 06 PAR-D05 |
| Paiement et encaissement | espèces, mobile money, carte | partiel | `POST /caisse/ventes`, `POST /caisse/session/{id}/fermer` | FeexPay : `pending` → webhook signé → `successful`/`failed`, idempotence `reference_feexpay` | 01 FPX-01→10 |
| Session de caisse | ouverture, clôture, écart | **défaut** — `VenteCaisseController@store` **crée automatiquement une session** si aucune n'est ouverte, ce qui viole CAI-01 | `GET /caisse/session-active` (vérifié : `CAISSE-2026-0021`) | exception tracée et paramétrée, jamais de création implicite | 01 CAI-01→08 |
| Ticket et rendu | impression du reçu | partiel | `GET /caisse/session/{id}/ticket-x` (jamais appelé) | `RecuNormalise` partagé, préfixe de ticket **unifié** : `TICKET-` côté mock, `TCK-` côté Laravel | 01 §8 · 05 INC-23 |
| Blocage sans pharmacien | règle pivot art. 1.11 | **mort** — `mode_presence_pharmacien = blocage` n'est appliqué nulle part | — | `409 ABSENCE_PHARMACIEN` + dérogation motivée et signée | 04 PAR-04, PAR-05, DEF-24 |

**Exigences** : CAI-01→08 · VTE-01→10 · FPX-01→10 · POS-11→14 · RG-F01→RG-F06 · raccourcis F2/F4/F8/Échap.
**Effet d'une vente validée** (volet 01 §1.4, transaction unique tout-ou-rien) : 1 décrément FEFO → 2 écriture au registre des stupéfiants si applicable → 3 historique thérapeutique et dossier pharmaceutique → 4 reçu e-MECeF → 5 entrée en caisse et session → 6 écritures SYSCOHADA 5311/5121, 7011, 4431 → 7 indicateurs du tableau de bord.

#### `/dashboard/dispensation` · Dispensation & Ordonnances — 1 écran, 7 modales

| Zone | Finalité | État réel | Endpoints | Cible | Réf. |
| --- | --- | --- | --- | --- | --- |
| Assistant de dispensation en 7 étapes | analyse, contrôle, conseil, délivrance | partiel | `POST /dispensations`, `POST /dispensations/{id}/viser` | `AssistantDispensation` partagé, chaque étape horodatée | 01 DSP-01→31 · 02 §2 |
| Ordonnances et prescripteurs | saisie et rattachement | **absent** — aucune table `ordonnances`, `lignes_ordonnance`, `prescripteurs`, `patients` | — | 12 tables nouvelles (volet 01 §8.2) | 01 DSP |
| Analyses pharmaceutique et réglementaire | interventions, refus, substitution | absent | — | `analyses_reglementaires`, `analyses_pharmaceutiques`, `interventions_pharmaceutiques` | 01 §8.2 |
| Conseils délivrés | traçabilité du conseil | absent | — | `conseils_delivres`, `protocoles_conseil` | 01 §8.2 · `PRO-Dispensation et Conseils.docx` |
| Dossier pharmaceutique et consentement | historique patient | absent | — | `dossiers_pharmaceutiques`, `consentements_dp`, restriction d'accès par rôle | 01 DP-01→06 |
| Vigilance et erreurs de délivrance | signalement | absent | — | `notifications_vigilance`, `erreurs_delivrance` | 01 INT-01→05 |
| Blocage sans pharmacien | règle pivot | **mort** | — | idem caisse | 04 PAR-04 |

**Exigences** : DSP-01→DSP-31 · RG-D09→RG-D12 · `SignatureAgent` partagé (M-42).

#### `/dashboard/facturation` · Facturation DGI — 5 onglets

| Onglet | Finalité | État réel | Endpoints | Cible | Réf. |
| --- | --- | --- | --- | --- | --- |
| Factures e-MECeF | émission et statut | partiel | `GET /comptabilite/factures-emecef` (appelé) | service e-MECeF derrière une interface, reçu provisoire hors ligne (FDG-16, POS-14) | 01 FDG-01→16 |
| TVA et groupes fiscaux | déclaration et contrôle | **faux** — « TVA collectée (0%) : 0 FCFA », « 100% Automatique », « 100% Certifié », « Groupe A (0%) » | — | taux depuis `parametres_fiscaux` (18 % groupe B), contrôle `tva_declaree_vs_recalculee` | 02 §1.2 · 06 CPT-D06 |
| Paramètres e-MECeF | environnement et jeton | **faux** — `environnementMECeF` et `tokenMECeF = "dgi_live_sec_994829384729182374"` en clair côté client (`parametres.tsx:108-109`) | — | secret serveur uniquement, état affiché sans valeur | 06 PAR-D01, PAR-01 |
| Journal de facturation | suivi des émissions | partiel | — | journal inaltérable, export signé | 06 JRN |
| Rapprochement comptable | factures ↔ écritures | absent | — | réconciliation automatique, écart critique si ≠ 0 | 06 CPT-08 |

**Exigences** : FDG-01→FDG-16 · RG-F01→RG-F06 · G-13→G-20.

---

### 4.4 Groupe 4 — Stock

#### `/dashboard/stock` · Stock & Magasin — 11 sections, 2 759 lignes, 13 endpoints, 4 modales `ModaleFiche`

| Section | `?tab=` | Finalité | État réel | Endpoints | Cible | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| Vue d'ensemble | `vue-ensemble` | indicateurs de synthèse | **partiel** — les 2 requêtes les plus sensibles avalent leur erreur (`stock.tsx:515-516`) : un `500` affiche « 0 lot périmé » et « 0 FCFA » | `GET /stocks/alertes` (vérifié `200`), `GET /stocks/peremptions` (vérifié `200`), `GET /stocks/valorisation` (vérifié `200`) | 6 indicateurs serveur, aucun repli silencieux, 4 blocs graphiques G-69→G-72 | 05 STK-01→04, RG-26 |
| Produits | `produits` | référentiel produits, 9 sous-sections | partiel — sous-sections en état local, aucune pagination | `GET /produits`, `POST /produits` | pagination serveur, recherche debounce 200 ms, filtres et page dans l'URL, groupe fiscal en liste close | 05 STK-05→10 |
| Lots (FEFO) | `lots` | vie du lot, 9 statuts, 9 sous-sections | réel — les 8 statuts existent (`commercialisable`, `en_attente_controle`, `a_evaluer`, `quarantaine`, `attente_retour`, `rejete`, `dechet`, `epuise`) et les lots bloqués restent visibles (`stock.tsx:508`) | `GET /stocks`, `POST /stocks`, `PUT /stocks/{id}/statut`, `POST …/quarantaine`, `POST …/lever-quarantaine` | **tri FEFO par défaut non désactivable** (art. 5.2), historique des transitions, seuils unifiés 90/45/10 j + veille + bloqué, refus serveur de vendre un lot périmé | 05 STK-11→16 · INC-13 |
| Emplacements | `emplacements` | cartographie physique du stock | **partiel** — `POST /emplacements` existe et n'est **jamais appelé** : impossible de créer un emplacement | `GET /emplacements` (vérifié `200`), `POST /emplacements` (orphelin), `GET /emplacements/{id}` | modale de création branchée, types dont `enceinte_refrigeree` et `armoire_stupefiants` liés à leurs modules | 05 STK-17→20, STK-D04 |
| Mouvements | `mouvements` | journal des entrées et sorties | **partiel** — `POST /mouvements` existe et n'est **jamais appelé** : aucun mouvement manuel possible | `GET /mouvements` (vérifié `200`), `POST /mouvements` (orphelin) | saisie manuelle motivée et signée (ajustement, transfert interne, casse, retour), `source` sur chaque mouvement | 05 STK-21→24 |
| Réception | `reception` | réception de livraison STO-05/06/07 | **partiel** — la check-list de 5 contrôles existe (`alerte_sanitaire_verifiee`, `emballage_intact`, `conformite_livraison`, `dates_conformes`, `chaine_froid_respectee`, `stock.tsx:518`) mais **n'est persistée nulle part** ; aucun objet `reception` n'est créé ; le téléversement du BL échoue (`POST /api/upload` → `501`) | `POST /stocks`, `POST /upload` (**mort**) | entités `receptions` + `lignes_reception`, check-list signée, lots naissant en `en_attente_controle`, rapprochement commande/BL/facture, échec de contrôle → quarantaine + NC | 05 STK-25→30, STK-D05 |
| Inventaires | `inventaires` | campagnes et comptages STO-12 | **réel** — cycle complet (`magasin-avance.tsx:133-177`) | `GET/POST /inventaires`, `GET /inventaires/{id}`, `POST …/lignes/{ligneId}/compter`, `POST …/valider` | **double validation** (annoncée dans `stock.tsx:2172`, absente du code), justification contradictoire des écarts, NC au-delà du seuil, comptage hors ligne | 05 STK-31→35, MAG-D01 |
| Péremptions | `peremptions` | lots à surveiller STO-11 | réel — 4 paliers affichés (`a_6_mois`, `a_3_mois`, `a_1_mois`, `perimes`) | `GET /stocks/peremptions`, table `alertes_peremption` (sous RLS et trigger) | seuils unifiés et paramétrables, retrait dès la date de péremption, `courriels-peremption.tsx` (10 l.) implémenté ou retiré | 05 STK-36→39, INC-13, INC-15 |
| Quarantaine & Rappels | `quarantaine` | blocage sanitaire STO-14 | **partiel** — `POST /rappels` existe mais **ne déclenche ni quarantaine ni blocage de vente** | `GET/POST /rappels`, `POST /rappels/{id}/cloturer`, `POST /stocks/{id}/quarantaine`, `POST …/lever-quarantaine` | effet transactionnel du rappel : lots appariés en quarantaine + `vendable = false` + NC + notification ; levée motivée et signée ; registre inaltérable | 05 STK-40→42, MAG-D02 |
| Déchets | `dechets` | destruction STO-17 | partiel — le cycle existe, le bordereau non | `GET /dechets`, `GET /stocks?vendable=false`, `POST /dechets`, `POST /dechets/{id}/detruire` | bordereau, filière, témoin, **deux signatures** dont le pharmacien responsable | 05 STK-43→44, MAG-D04 |
| Valorisation | `valorisation` | valeur du stock STO-18/19 | réel mais **méthode non déclarée** | `GET /stocks/valorisation` (vérifié `200`, `total: 72000`) | méthode explicite et paramétrable (coût d'acquisition / dernier coût / prix de vente), réconciliation avec la classe 3 SYSCOHADA | 05 STK-45→46, INC-16 |

**Exigences** : STK-01→STK-46 · MAG-D01→D05 · INC-09→INC-18 · M-158→M-177 · G-69→G-78, G-90→G-96 · lots L22→L25.
**Ce qui est juste et doit être conservé** : les 8 statuts de lot, la visibilité des lots bloqués, la check-list de 5 contrôles, le cycle d'inventaire, `ModaleFiche`/`Champ`/`ColonneFiche` (le meilleur modèle de formulaire du dépôt).

### 4.5 Groupe 5 — Stupéfiants & Préparations

#### `/dashboard/stupefiants` · Registre des Stupéfiants — 9 sections, 874 lignes, 11 endpoints, 5 modales

| Section | `?tab=` | Finalité | État réel | Endpoints | Cible | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| Registre | `registre` | registre coté et paraphé | réel — 11 méthodes serveur (`StupefiantController`, 324 l.), le socle réglementaire le plus complet du dépôt | `GET /stupefiants`, `POST /stupefiants`, `POST …/{id}/viser`, `POST …/{id}/rectificative` | numérotation continue annuelle, écriture inaltérable, quantité en lettres **et** en chiffres, solde après écriture, visa par signature vérifiée serveur | 05 STU-01→03, STU-11, STU-21 |
| Balance | `balance` | balance permanente | **dangereux** — `GET /stupefiants/balance` fonctionne (vérifié `200`) mais est enveloppé dans `.catch(() => null)` (`stupefiants.tsx:299`) : **une panne affiche une balance vide, donc « aucun écart »** | `GET /stupefiants/balance` | erreur bloquante au lieu du repli ; tout écart ≠ 0 → alerte critique + NC obligatoire + déclaration au-delà d'un seuil | 05 STU-04→05, STU-D01, RG-26 |
| Ordonnancier | `ordonnancier` | registre chronologique des ordonnances | **partiel** — même repli silencieux (`stupefiants.tsx:307` → `{ data: { data: [] } }`) | `GET /stupefiants/ordonnancier` | numéro d'ordre, prescripteur, patient, produits, renouvellements, date limite ; pas de repli | 05 STU-06 |
| Copies | `copies` | délivrance de copies du registre | **non outillé** — rien ne trace la copie | — | copie journalisée (qui, quand, portée, destinataire), mention « Copie non contrôlée » sauf validation nominative | 05 STU-13, M-185 |
| Inventaire | `inventaire` | comptage contradictoire | réel | `POST /stupefiants/inventaire` | deux compteurs, PV signé, écart justifié | 05 STU-08, M-181 |
| Armoire | `armoire` | contenu physique de l'armoire | **partiel** — repli silencieux (`stupefiants.tsx:303` → `null`) | `GET /stupefiants/armoire` | accès restreint nominativement, rapprochement armoire ↔ balance (G-83) | 05 STU-07 |
| Écarts | `ecarts` | suivi des écarts constatés | vitrine | — | liste réelle, gravité, analyse, NC rattachée, statut de résolution | 05 STU-14, G-80 |
| Destruction | `destruction` | demande et PV de destruction | réel côté endpoint, incomplet côté validation | `POST /stupefiants/demande-destruction` | autorisation préalable, témoin, PV, filière, deux signatures | 05 STU-10, M-183 |
| Rapports | `rapports` | états mensuels | **mort** — `GET /stupefiants/rapport` **existe et n'est jamais appelé** : la section est statique alors que l'endpoint est écrit | `GET /stupefiants/rapport` (orphelin) | brancher : état mensuel, mouvements par produit, écarts, inventaires | 05 STU-12, STU-D02, G-81→84 |

**Exigences** : STU-01→STU-22 · M-178→M-185 · G-79→G-84 · conservation **10 ans** · trigger d'audit et RLS sur `registre_stupefiants` · lot L26.

#### `/dashboard/preparations` · Préparations Magistrales — 6 sections, 746 lignes, 3 endpoints, 1 modale

| Section | `?tab=` | Finalité | État réel | Endpoints | Cible | Réf. |
| --- | --- | --- | --- | --- | --- | --- |
| Registre | `registre` | registre des préparations | réel | `GET /preparations`, `POST /preparations`, `POST …/{id}/viser` | numéro chronologique, préparateur, contrôleur, DLU, numéro de lot, conservation 10 ans | 05 PRE-01, PRE-12→14 |
| Formules | `formules` | catalogue de formules | **faux** — constante locale : `{ nom: "Sirop de Tolu", compo: "Baume de Tolu 2 %, saccharose, eau purifiée", dlu: "14 jours" }` (`preparations.tsx:526`) | — | table `formules_preparation` versionnée et approuvée, indice de révision, aucune valeur en dur | 05 PRE-02→03, PRE-D02 |
| Matières premières | `matieres` | traçabilité des matières | **absent** — rien ne relie une préparation aux lots consommés | — | `matieres_premieres` + `lignes_preparation` → `stock_lots`, décrément FEFO dans la même transaction, pesée avec balance étalonnée | 05 PRE-04→06, PRE-D05 |
| Contrôles | `controles` | contrôle avant libération | absent | — | contrôles (aspect, pH, masse, volume, identité), libération signée, une préparation non libérée ne se dispense pas | 05 PRE-07→08, M-189→190 |
| Étiquettes | `etiquettes` | étiquetage réglementaire | absent — alors que `jspdf` et `html2canvas` sont déjà en dépendances | — | 12 mentions obligatoires, formats réels (flacon, pot, sachet, tube), génération locale, impression journalisée | 05 PRE-09→10, M-191 |
| Rapports | `rapports` | synthèse des préparations | vitrine | — | préparations par forme, taux de conformité des contrôles, écarts de pesée, matières consommées | 05 PRE-11, G-85→89 |

**Exigences** : PRE-01→PRE-18 · M-186→M-193 · G-85→G-89 · lot L26.

---

### 4.6 Groupe 6 — Qualité & BPD ABMed (9 écrans, 54 sections)

> Le **quoi** fonctionnel de ces 9 pages **fait foi** dans le cahier 07 (*Cahier des charges de la section « Qualité & BPD ABMed »*), avec ses codes TEM/LOC/AUT/POI/PER/DOC/MOD/NCC/ECH et ses priorités P1/P2/P3. Les lignes ci-dessous ajoutent l'état réel vérifié, les interfaces cibles et la télémétrie, sans contredire ce cahier.

#### `/dashboard/temperatures` · Chaîne du froid (2-8 °C) — 6 sections

| Section | Finalité | État réel | Endpoints | Cible | Réf. |
| --- | --- | --- | --- | --- | --- |
| Tournée | relevés du jour, matin et soir | **partiel** — la jauge « 85 % réalisés » est figée par `style={{ width: "85%" }}` (`temperatures.tsx:564`) | `GET …/temperatures/stats` (vérifié `200`, renvoie `zones.refrigeree_2_8.matin_fait/soir_fait`) | jauge calculée : relevés faits / relevés attendus | 06 TEM-03, TEM-D02 |
| Zones | enceintes et locaux surveillés | **faux** — plages écrites **cinq fois** en dur (`2.0°C à 8.0°C`, `15.0°C à 25.0°C`, `15.0°C à 26.0°C` aux lignes 177, 227, 239, 251, 887-889) et une sixième fois dans `parametres.tsx:105-106` sous forme de chaînes | — | table `zones_temperature` comme **source unique** des seuils | 06 TEM-01→02, TEM-D01, RG-36 |
| Courbes | historique des relevés | réel — `LineChart` | `GET …/temperatures` | courbes multi-zones avec `ReferenceArea` pour les plages et `ReferenceLine` pour les seuils | 06 TEM-05, G-97 |
| Excursions | dépassements et décisions | **partiel** — l'exemple affiché est en dur : « Enceinte Réfrigérée · 9.8 °C (Dépassement +1.8 °C) » (`temperatures.tsx:706`) ; les 4 décisions existent dans `decisionChoisie` mais **une excursion ne bloque aucun lot** | `POST …/temperatures` | détection automatique, décision obligatoire et signée, **mise en quarantaine des lots de la zone** dans la même transaction, NC pré-remplie | 06 TEM-06→07, TEM-D03, TEM-D05 |
| Rapports | états mensuels | partiel — `window.print()` direct (`temperatures.tsx:1129`), qui imprime toute l'application | `imprimerFicheOfficielle` | impression via le mécanisme interne avec cartouche, jamais `window.print()` | 06 TEM-13→14, TEM-D04, RG-23 |
| Capteurs | parc de mesure | **absent** — aucune entité capteur, aucun étalonnage, alors que `locaux.tsx:560` affiche un certificat fictif | — | table `capteurs` : modèle, zone, étalonnage, échéance, certificat, dérive, statut | 06 TEM-09, TEM-D06 |

**Exigences** : TEM-01→TEM-18 · M-200→M-203 · G-97→G-102, G-105 · registre inaltérable · conservation 10 ans · saisie hors ligne · lot L30.

#### `/dashboard/locaux` · Locaux & Matériel (5M) — 7 sections

| Section | Finalité | État réel | Endpoints | Cible | Réf. |
| --- | --- | --- | --- | --- | --- |
| Équipements | parc matériel | réel | `GET/POST …/equipements` (`EquipementController`, 133 l.) | ajouter type, localisation, criticité, plan de maintenance, étalonnage requis | 06 LOC-01 |
| Maintenance | préventive et corrective | **branchable** — `suivis_documentaires` supporte déjà le type `maintenance` (`mock-backend.mjs:507`) et la table est sous RLS et trigger, mais la section ne l'utilise pas | `GET/POST …/suivis-documentaires/maintenance` (existant) | brancher sur le mécanisme existant via `registre-documentaire.tsx` | 06 LOC-02, LOC-D05 |
| Étalonnage | certificats et échéances | **faux** — « Certificat n° CERT-2026-042 · Organisme : METRO-BENIN · Incertitude ±0.2°C » (`locaux.tsx:560`) | — | table `etalonnages` avec certificat téléversé et échéance ; un étalonnage échu **bloque l'usage** de l'équipement | 06 LOC-03→04, LOC-D03 |
| Nettoyage | plan et registre | réel | `GET/POST …/nettoyages` (`NettoyageController`, 48 l.) | plan par local (`GLO-EN-001`), fréquence, produit, opérateur, visa quotidien | 06 LOC-05→06 |
| Nuisibles | lutte anti-nuisibles | **vitrine** — aucune entité, aucun endpoint | — | table `traitements_nuisibles` : prestataire, type, appâts posés et relevés, plan de localisation, constat | 06 LOC-07, LOC-D05 |
| Conformité | score des locaux | **faux** — « Score : 100% Conforme » en dur (`locaux.tsx:774`) | — | score **calculé** depuis les constats réels (nettoyages, étalonnages, nuisibles, maintenance, température) | 06 LOC-08, LOC-D04 |
| Système & PRA | dossier informatique et plan de reprise | **faux — le défaut le plus grave du volet** : `locaux.tsx:230-270` exporte un dossier PRA entièrement fictif (« Serveur autonome sur site avec réplication cloud chiffrée », « AES-256 avec hachage SHA-256 inaltérable ») et un journal des sauvegardes dont chaque résultat est écrit d'avance (`<td><strong>100% Réussie (Chiffrée)</strong></td>`, ligne 257) | — | généré depuis des faits vérifiables (sauvegardes réellement exécutées, tests de restauration datés et concluants, RPO/RTO mesurés) **ou retiré de l'interface** | 06 LOC-09→10, LOC-D01→02, **RG-35** |

**Exigences** : LOC-01→LOC-16 · M-204 · G-103→104 · lot L30.

#### `/dashboard/auto-evaluation` · Auto-évaluation 267 articles — 1 écran, chapitres filtrables

| Zone | Finalité | État réel | Endpoints | Cible | Réf. |
| --- | --- | --- | --- | --- | --- |
| Campagne courante | ouverture et suivi | réel | `GET …/auto-evaluation/campagne-courante` (`l.85`), `POST …/nouvelle-complete` (`l.239`) | `referentiel_version`, articles **figés à l'ouverture** | 06 AUT-01, AUT-D05 |
| Cotation des 267 articles | 4 valeurs | réel — contrôle serveur vérifié en direct : une valeur inattendue renvoie `422 {"message":"Cotation invalide."}` | `PUT …/auto-evaluation/evaluer/{evaluationId}` (`l.93`) | liste close contraignante côté client, message serveur restitué, preuve jointe, cotation signée | 06 AUT-02, AUT-07, AUT-D02 |
| Génération de CAPA | écart → action | réel | `POST …/auto-evaluation/generer-capa/{id}` (`l.110`) | un écart majeur ou critique **non rattaché à une NC clôturée bloque la clôture** de la campagne | 06 AUT-03→04, AUT-D03 |
| Score et chapitres | `BarChart` | réel — l'un des 6 graphiques de l'application | — | radar des 10 chapitres (G-100), évolution par campagne (G-99) | 03 G-21 · 06 G-99→101 |
| Rapport | synthèse de campagne | **mort** — `GET …/auto-evaluation/rapport` existe (`AutoEvaluationController::rapport`) et n'est **jamais appelé** | route orpheline | brancher : c'est la pièce maîtresse de la revue de direction | 06 AUT-D01, AUT-03 |

**Exigences** : AUT-01→AUT-12 · M-205 · G-99→G-101 · tables sous trigger et RLS · lot L30.

#### `/dashboard/pointage` · Pointage Présence (art. 1.11) — 7 sections

> Spécifié en profondeur dans le volet 04 (DEF-01→DEF-25, PRS/BDG/DOS/PLN/RPT/PAR-nn, M-128→M-157, G-57→G-68, RG-13→RG-24, L15→L20).

| Section | `?tab=` | Finalité | État réel | Cible | Réf. |
| --- | --- | --- | --- | --- | --- |
| Présence en direct | `direct` | équipe sur place, pointage | **critique** — le scan est résolu **côté client** contre `matricule`/`id`/`code_badge` et **jamais contre `pin_code`** ; en cas d'échec, repli sur `employes[0]` puis sur `{ id: "emp-1", nom_complet: "Dr Félicien AGBO" }` (`pointage.tsx:205-211`) → **tout code inconnu pointe le premier employé** | reconnaissance serveur, rejet explicite d'un code inconnu, `422 CODE_BADGE_INCONNU` | 04 PRS-28→29, DEF-01→03 |
| Plannings & gardes | `plannings` | continuité par tranche | **faux** — entièrement statique : « Dr Félicien AGBO », « Dr Sévérin BIO », « Nuit du Samedi 07/11 » (`l.668-679`) ; le bouton « Créer créneau » n'a **aucun `onClick`** | créneaux persistés, contrôle « au moins un pharmacien par tranche d'ouverture », gardes lues depuis `/dashboard/gardes` | 04 PLN-01→06, DEF-18 |
| Absences & congés | `absences` | demandes et soldes | **mort** — l'état `modaleAbsence` et ses 4 champs existent, le bouton les déclenche, mais **aucun `<Dialog>` n'est rendu** (`l.108-112, 699`) ; l'état vide est en dur (`l.708`) | modale réelle, entité `absences`, workflow de validation, source unique partagée avec `personnel?tab=conges` | 04 PRS-14→19, DEF-16, INC-05 |
| Corrections d'oubli | `corrections` | régularisations | **mort** — la modale n'appelle **aucun endpoint** : « Signer & Valider » fait `toast.success("Correction enregistrée avec succès.")` puis ferme, la signature est jetée (`l.982-991`) ; la liste affiche une ligne statique (`l.733-741`) | écriture rectificative liée, motif obligatoire, validation par un pharmacien, pointage d'origine inaltérable | 04 PRS-20→25, DEF-14, RG-14 |
| Badges & émargement | `badges` | cartes professionnelles QR | **faux** — QR généré par un **service tiers externe** `api.qrserver.com`, charge utile non signée et rejouable, faux code-barres littéral, validité « Année 2026 » en dur, identité d'officine par défaut « PHARMACIE DE L'ÉTOILE » / « +229 21 31 10 20 », format annoncé CR80 mais rendu en 60×94 mm plié, « Imprimer planche badges » = `window.print()` | QR local signé, cycle de vie complet du badge, formats CR80 et planche A4 réels, photo via `/upload` | 04 BDG-01→14, BDG-D1→D9, DEF-25 |
| Rapports & heures | `rapports` | synthèse paie | **faux** — « Novembre 2026 », « 96.4% », « 412h », « 14h » en dur (`l.873-875`) ; l'export CSV est la liste brute du jour sans aucun calcul | appariement arrivée/départ en `Africa/Porto-Novo`, nuit, garde, HS, retards avec tolérance, feuille d'émargement avec cartouche et signature | 04 RPT-01→09, DEF-21→22, INC-03 |
| Paramètres art. 1.11 | `parametres` | règle pivot caisse | **mort** — deux cartes descriptives sans aucun `onClick`, alors que `tolerance_pointage_minutes` et `mode_presence_pharmacien` existent déjà en base | lecture et écriture réelles, **et surtout effet réel** : en mode `blocage`, caisse et dispensation refusent `409 ABSENCE_PHARMACIEN` | 04 PAR-01→06, DEF-23→24 |

**Mode borne H24** (hors sections) : plein écran, pavé numérique, bip Web Audio 880/440 Hz — mais affiche « Session Continue H24 · Sans expiration de session » alors que le middleware renvoie `423` après 15 min d'inactivité. → jeton d'équipement dédié, PRS-26→38, RG-20.
**Signature par code personnel** : `ModaleSignatureCode` ne vérifie **rien** — 4 chiffres quelconques suffisent, `hash_signature` est fabriqué avec `Date.now()` + `Math.random()`, et `horodatage_serveur` est l'horloge du client. → RG-15, M-136, lot L17.

#### `/dashboard/personnel` · Personnel & Ordre B — 9 sections

| Section | `?tab=` | Finalité | État réel | Cible | Réf. |
| --- | --- | --- | --- | --- | --- |
| Équipe & badges QR | `equipe` | collaborateurs | réel | `GET/POST …/employes`, `PUT …/employes/{id}` ; badge mutualisé avec le pointage | 04 DOS-01→03, BDG-D8 |
| Dossier individuel | `dossier` | pièces et diplômes | partiel — `photo_url` saisi en **texte libre** (`personnel.tsx:153`) alors que la colonne n'existe pas dans le schéma | téléversement via `POST /upload`, typage des pièces, contrôle des obligatoires, **journalisation des consultations** | 04 DOS-07, DOS-27, BDG-D7 |
| Ordre section B | `ordre` | inscription ordinale | **faux** — « ONPB-2014-B-089 » et « 31/12/2026 » en dur (`l.235, 238, 550, 553`) ; `inscriptions_ordre` est indexé par `user_id` alors que les fiches sont des `employes.id` → **jonction impossible** | rattachement par `employe_id`, champs alignés sur le schéma réel, échéances 90/30/7 j, NC si inscription échue | 04 DOS-08→13, INC-04, INC-08 |
| Postes & habilitations | `postes` | fiches de fonction | vitrine — les colonnes jsonb `habilitations` et `competences` existent et ne sont **jamais écrites** | matrice éditable, datée, signée, historisée | 04 DOS-04, DOS-26 |
| Organigramme | `organigramme` | lignes de responsabilité | **faux** — « Dr Félicien AGBO » en dur (`l.625`), rendu en `style={{}}` inline | généré depuis les données réelles, imprimable avec cartouche | 04 DOS-14→16, INC-08 |
| Formations | `formations` | plan de formation | vitrine — alors que `suivis_documentaires/formations` existe déjà | actions, échéances de recyclage, taux de réalisation, alimentation de la matrice de compétences | 04 DOS-17→20 |
| Entretiens | `entretiens` | bilans annuels | vitrine | fiche par exercice, objectifs, signatures des deux parties, **aucune donnée de santé** | 04 DOS-21→23 |
| Congés & remplacements | `conges` | continuité de service | **doublon** avec `pointage?tab=absences`, sans backend ni l'un ni l'autre | source unique `absences`, angle RH ici, angle exploitation au pointage | 04 PRS-14, INC-05 |
| Intégration & suivi médical | `hygiene` | aptitude médicale | partiel — `date_visite_medicale` existe ; « 100% du personnel dispose d'un certificat médical d'aptitude » est un slogan (`l.747`) | médecin, aptitude, échéance, justificatif, **taux calculé** | 04 DOS-05, DOS-24→25, INC-08 |

**Défauts serveur associés** (volet 04 §1.2) : `matricule = 'EMP-' + poste[0:3] + '-' + rand(10,99)` → 90 valeurs possibles, collisions garanties ; `pin_code` en clair avec défaut `'1234'` et **renvoyé par l'API** ; `charte_qualite_signee = true` posée d'office à la création ; `prise()` crée un employé fantôme ; trois définitions divergentes de « pharmacien ».

#### `/dashboard/documents` · GED & Procédures — 8 sections, **0 modale**

| Section | `?tab=` | État réel | Cible | Réf. |
| --- | --- | --- | --- | --- |
| Bibliothèque | `bibliotheque` | réel — `POST …/documents` vérifié `201`, mais `PUT …/documents/{id}` renvoie **`501`** en démo | machine à états serveur : `brouillon → en_verification → en_approbation → approuve → diffuse → en_revision → obsolete` | 06 DOC-01, DOC-D04 |
| Tâches | `taches` | partiel — `approbation-document.tsx` existe | file d'approbation serveur, délais, relances | 06 DOC-10 |
| Versions | `versions` | partiel | historique d'indices, comparaison, motif de révision | 06 DOC-05 |
| Diffusion | `diffusion` | **absent** | diffusion tracée par destinataire avec accusé de réception | 06 DOC-04, DOC-D07 |
| Révisions | `revisions` | vitrine | révision signée, documents impactés, rediffusion | 06 DOC-05 |
| Modifications | `modifications` | vitrine — alors que `documents` pourrait être lu depuis `audit_logs` | lu depuis le journal d'audit | 06 DOC-14 |
| Processus | `processus` | vitrine | vue filtrée du même référentiel (colonne `processus` existante) | 06 DOC-03 |
| Politique | `politique` | **faux** — le bouton « Trame officielle du Rapport Annuel » télécharge un texte au taux de conformité **94.2 %** écrit dans la chaîne (`l.873`), avec toast « Trame officielle du Rapport Annuel téléchargée ! » | revue de direction **générée** depuis l'auto-évaluation, les NC, les réclamations et les indicateurs | 06 DOC-D01, **RG-35** |

Les colonnes existent déjà (`migration 133627:57-68`) : `code_document`, `type_doc`, `processus`, `indice_revision`, `redacteur_nom`, `approbateur_nom`, `approuve_le`, `prochaine_revision`, `motif_refus`, `modele_source_id`. Elles doivent être renseignées et affichées.

#### `/dashboard/modeles` · Modèles Types BPD — 4 sections, **0 modale**

| Section | `?tab=` | État réel | Cible | Réf. |
| --- | --- | --- | --- | --- |
| Catalogue | `catalogue` | **faux — le plus gros gâchis du dépôt** : l'écran annonce « **59 modèles** » (`modeles.tsx:56, 169, 552`), `GET /api/modeles-bpd` renvoie **3 fiches** avec `contenu: null` (vérifié en direct), alors que `references/canevas/catalogue.json` contient **62 documents réels**, chacun avec son `sha256` et sa structure en `parties`, classés en 5 rubriques | seeder depuis le corpus, compteur calculé, contenu issu des `parties`, rubriques comme plan de classement | 06 MOD-01→08, MOD-D01, INC-19, **RG-41** |
| Adoptions | `adoptions` | vitrine | adoption tracée : code local, divergences déclarées et motivées, signature | 06 MOD-09 |
| Mises à jour | `mises-a-jour` | vitrine | détection de divergence par `sha256` et `indice_revision` | 06 MOD-10 |
| Documents propres | `propres` | partiel | filtre `modele_source_id IS NULL`, justification obligatoire | 06 MOD-11 |

`POST …/modeles-bpd/{modeleId}/instancier` existe et fonctionne (`ModeleBpdController::instancier`).

#### `/dashboard/non-conformites` · Non-conformités & CAPA — 6 sections, **0 modale**

| Section | `?tab=` | État réel | Cible | Réf. |
| --- | --- | --- | --- | --- |
| Kanban | `kanban` | réel mais **non gardé** — le changement de colonne est un `PUT` direct, sans motif ni signature | toute transition exige motif et signature | 06 NCC-01, NCC-D03 |
| Liste | `liste` | réel — `GET`/`PUT` vérifiés `200` | filtres, pagination, numéro `NC-<année>-<séquence>` attribué serveur | 06 NCC-14 |
| Analyse des causes | `analyse-causes` | partiel — la colonne `analyse_causes_5m` existe | analyse 5M obligatoire avant clôture pour une NC majeure ou critique | 06 NCC-02 |
| Plan CAPA | `plan-capa` | partiel — colonnes `action_immediate`, `action_preventive`, `date_echeance_capa`, `responsable_action` existent | rendre opérantes, échéances vers l'échéancier commun | 06 NCC-03 |
| Efficacité | `efficacite` | partiel — colonnes `efficacite_verifiee`, `conclusion_efficacite` existent mais **rien n'empêche de clôturer sans vérification** | clôture bloquée tant que l'efficacité n'est pas vérifiée | 06 NCC-04, NCC-D04 |
| Statistiques | `statistiques` | **faux** — délai moyen affiché « **4.2 jours** » en dur (`l.787`), aucun graphique pour une section intitulée « statistiques » | délais calculés depuis `date_creation` → `cloturee_le`, G-111→G-116 | 06 NCC-05, NCC-09, NCC-D01 |

`BoutonCreerNC` existe (`bpd-communs.tsx`, appel réel `api.post` ligne 264) mais n'est branché sur **aucune** source d'anomalie des autres écrans.

#### `/dashboard/echeances` · Échéancier réglementaire — 6 vues × 3 modes

| Vue | État réel | Cible | Réf. |
| --- | --- | --- | --- |
| À venir et en retard | réel | alertes J-30/J-7/J-1/J+1, NC au dépassement | 06 ECH-05 |
| Calendrier | réel — 3 modes `liste`, `mois`, `semaine` (`modeVue`) | état dans l'URL | 06 ECH-06 |
| Catégories | réel — constante `CATEGORIES` | catégories et priorités issues de la constante, jamais de libellés inline | 06 ECH-12 |
| Règles | vitrine — les règles de génération sont affichées mais non éditables | éditables, versionnées, signées | 06 ECH-04, ECH-D05 |
| Historique | réel | clôture avec preuve, report motivé et limité | 06 ECH-08→09 |
| Toutes | réel | vue consolidée multi-officines pour le promoteur | 06 ECH-11 |

**Défaut majeur** : les échéances **ne sont pas alimentées par les modules qui les produisent** — étalonnage fictif, inscription Ordre codée en dur, visite médicale, péremption de lot, révision de document, campagne d'auto-évaluation, validité de badge, clôture comptable, déclaration fiscale, cotisation ordinale, formation obligatoire, entretien annuel. → ECH-03, lot L32.
**Routes** : `PUT /api/echeances/{id}` non scopé, `POST /api/echeances`, `PATCH` et `DELETE` exposés et jamais appelés ; export iCal branché et fonctionnel.

---

### 4.7 Groupe 7 — Gestion & Finance

#### `/dashboard/comptabilite` · Comptabilité SYSCOHADA — 6 sections

| Section | `sectionActive` | État réel | Endpoints | Cible | Réf. |
| --- | --- | --- | --- | --- | --- |
| Tableau de bord | `tableau_bord` | **faux** — `comptabilite.tsx:337-340` contient 14 montants fictifs (`18 950 000`, `12 400 000`, `27 250 000` FCFA…), le badge `+14.2%`, le compte `701`, et `:1035` affiche « Novembre 2026 » comme période courante | `GET /comptabilite/journal-ventes`, `GET /comptabilite/clotures` | indicateurs calculés, période sélectionnée | 06 CPT-01→02, CPT-D01, CPT-D03 |
| Journaux | `journaux` | partiel — journal imprimable en `<table style="width: 100%; …">` (`l.221`) | `GET /comptabilite/journal-ventes` | grand livre, balance générale et auxiliaire, impression par composant | 06 CPT-08, CPT-D08 |
| Saisie manuelle | `saisie_manuelle` | **mort** — `POST /comptabilite/ecritures` renvoie **`501`** en démonstration (vérifié) alors que `ComptabiliteController::storeEcriture` existe (`routes/api.php:257`) | route morte en démo | handler mock + équilibre débit/crédit contrôlé serveur + signature | 06 CPT-03, CPT-05, CPT-D04 |
| Plan comptable | `plan_comptable` | vitrine | — | `GET /comptabilite/plan-comptable`, comptes SYSCOHADA 5311/5121, 7011, 4431 | 06 CPT-06 |
| Lettrage des tiers | `tiers_lettrage` | **faux** — taux de lettrage « **94.8 %** » en dur (`l.836`) ; aucune entité `tiers` | — | tables `tiers`, `lettrages`, `lignes_lettrage`, taux calculé | 06 CPT-07, CPT-D02, CPT-D09 |
| États financiers | `etats_financiers` | **faux** — bilan et compte de résultat entièrement fictifs | — | générés depuis les écritures, réconciliés avec les modules producteurs, `PieChart` existant alimenté | 06 CPT-01, CPT-08, CPT-15 |

**Règles** : une écriture est inaltérable — seule l'extourne est permise (`POST …/extourne`, **`501`** en démo) ; clôture mensuelle et annuelle avec figeage et signature ; conservation 10 ans ; TVA déclarée comparée à la TVA recalculée (écart → critique).

#### `/dashboard/journal` · Journal d'audit SHA-256 — 1 section, 115 lignes

| Zone | État réel | Cible | Réf. |
| --- | --- | --- | --- |
| Liste des entrées | réel | `GET …/audit-logs` avec filtres période, acteur, table, action, officine, IP | 06 JRN-04 |
| **Vérification d'intégrité** | **mort** — `GET …/audit-logs/verifier-integrite` renvoie **`501`** en démonstration (vérifié) alors que `AuditController::verifierIntegrite` existe (`routes/api.php:84`) et que la table est protégée par `trg_audit_logs_tamper_defense` et `trg_audit_no_truncate` | handler mock + affichage du résultat : entrées vérifiées, empreinte de tête, continuité, première rupture horodatée | 06 JRN-01→02, JRN-D01 |
| Couverture | **insuffisante** — seules 10 tables ont une RLS et 11 un trigger d'audit ; **30+ tables métier n'en ont aucun** | étendre triggers et RLS à toutes les tables métier ; mesurer `audit_couverture_tables` | 06 JRN-03, INC-22, **RG-37** |
| Mode inspecteur | absent | lecture seule, période bornée, accès journalisé | 06 JRN-05, M-227 |
| Export signé | absent | export horodaté avec empreinte | 06 JRN-06, M-226 |

`resumeJournal` et `VUE_JOURNAL_VIDE` existent dans `modules/administration.tsx` et sont sous-exploités.

#### `/dashboard/appareils` · Appareils autorisés — 7 sections

| Section | `?tab=` | État réel | Endpoints | Cible | Réf. |
| --- | --- | --- | --- | --- | --- |
| Parc | `parc` | réel | `GET /auth/devices` | types explicites : poste caisse, borne, balance, thermomètre, imprimante, lecteur, tablette | 06 APP-02 |
| Appairage | `appairage` | réel | `POST …/appareils-autorises` | code à usage unique, durée de vie limitée | 06 APP-03 |
| Bornes | `bornes` | vitrine — aucune borne n'est enregistrée comme équipement | — | **la borne de pointage est un appareil autorisé** : jeton dédié, exempté du verrou d'inactivité pour les seules routes de pointage, révocable | 06 APP-04 · 04 RG-20 |
| Périphériques | `peripheriques` | vitrine | — | balances (étalonnage à jour, lien préparation) et capteurs (lien zone de température) | 06 APP-05→06 |
| Sessions | `sessions` | partiel — la révocation globale renvoie **`501`** | `DELETE /auth/devices/{id}` (réel), `POST /auth/devices/revoke-others` (**mort**) | handler mock | 06 APP-07, SEC-03 |
| Révocations | `revocations` | **mort** — `POST /appareils-autorises/{id}/revoquer` et `/reactiver` renvoient **`501`** (vérifié) alors que les deux méthodes existent (`routes/api.php:65-66`) | routes mortes en démo | handlers mock ; révocation à effet immédiat sur les jetons | 06 APP-01, APP-D01 |
| Registre | `registre` | partiel — valeur en dur `montant_ou_detail: "14 500 FCFA"` (`l.171`), document imprimable en `<table style=…>` avec des `<div style="width: 45%">` simulant des zones de signature (`l.343-379`) | — | historique complet appairages/révocations/réactivations, impression par composant, cadre de signature normalisé | 06 APP-08, APP-D02→03 |

`DELETE /api/appareils-autorises/{id}` est exposé et jamais appelé : à supprimer, la révocation suffit.

### 4.8 Groupe 8 — Compte & Officine

#### `/dashboard/compte` · Mon profil & Rôle — 9 sections, **1 endpoint**

| Section | `sectionActive` | État réel | Cible | Réf. |
| --- | --- | --- | --- | --- |
| Profil | `profil` | **mort** — `PUT /auth/profile` renvoie **`501`** (vérifié) ; de plus `.catch(() => null)` (`l.149`) masque l'échec | handler mock + pas de repli silencieux | 06 CMP-01, CMP-05, CMP-D01 |
| Droits | `droits` | vitrine | lus depuis `utilisateurs_officines` (table sous RLS et trigger), demande de droit supplémentaire | 06 CMP-01, M-238 |
| Officines | `officines` | vitrine | `GET /officines` (réel), rattachements et rôles | 06 CMP-01 |
| Qualification | `qualification` | vitrine | `inscriptions_ordre` rattaché par `employe_id` | 06 CMP-01 · 04 DOS-08 |
| Formations | `formations` | vitrine | `suivis_documentaires/formations` (existant) | 06 CMP-01 |
| Badge | `badge` | **doublon** — `compte.tsx:179-185` fabrique une seconde carte professionnelle en chaîne HTML avec `linear-gradient(135deg, #0F3B27 0%, #18AA38 100%)` et `<img src="${photoUrl}" style="width:100%; …">` | **une seule carte** : celle du volet 04 (M-128) | 06 CMP-03, CMP-D04, INC-27 |
| Préférences | `preferences` | partiel — paliers écrits en pourcentages dans les `<option>` : « Confort tactile (+10%) », « Grande lisibilité (+20%) » (`l.1049-1050`) | paliers nommés `normal`, `confort`, `large` | 06 CMP-04, CMP-D03 |
| RH | `rh` | **faux** — soldes de congés fictifs `24 jours`, `16 jours`, `100% 40 h` (`l.1128-1136`) | soldes réels calculés | 06 CMP-02 · 04 PRS-18 |
| Données | `donnees` | vitrine — l'exercice des droits (`typeDemandeDonnees === "effacement"`) n'a aucun backend | demande enregistrée, typée, horodatée, traitée dans un délai paramétrable, réponse archivée ; export réel et journalisé | 06 CMP-06→07, M-239 |

#### `/dashboard/parametres` · Paramètres Officine — 11 sections, 3 endpoints

| Section | `sectionActive` | État réel | Cible | Réf. |
| --- | --- | --- | --- | --- |
| Identité | `identite` | réel — `GET/PUT …/parametres` (vérifié `200`) | conserver | 06 PAR-02 |
| Horaires | `horaires` | vitrine | `officine_parametres`, lu aussi par les plannings | 06 PAR-02 |
| Documents | `documents` | vitrine | durées de conservation 3/5/10/40 ans appliquées comme verrou | 06 PAR-02 · 03 RG-02 |
| Conservation | `conservation` | vitrine | idem | 06 PAR-02 |
| Notifications | `notifications` | vitrine | destinataires et canaux paramétrables | 06 PAR-02 |
| Paiements | `paiements` | vitrine — « Chèque certifié · Montant > 100 000 FCFA » en dur (`l.731`) | moyens de paiement réels, seuils paramétrés | 06 PAR-02 |
| Fiscalité | `fiscalite` | **faux** — `regimeFiscal = "Régime Réel (Normal)"` en état local (`l.107`) | issu de `parametres_fiscaux` | 06 PAR-07, PAR-D03 |
| Intégrations | `integrations` | **faux — faille** — `tokenMECeF = "dgi_live_sec_994829384729182374"` en clair dans un `useState` (`l.109`), avec `environnementMECeF` en état client (`l.108`) | secret serveur uniquement ; l'interface affiche un **état** (`configuré`, `absent`, `expiré`), jamais une valeur | 06 PAR-01, PAR-09, PAR-D01 · 03 RG-06 |
| Historique | `historique` | **faux** — deux entrées inventées : `HIST-01` (« mode_presence_pharmacien · Alerte simple → Blocage strict · Dr Marie AGOSSOU · 04/11/2026 à 14:30 ») et `HIST-02` (« remise_max_dispensateur · 10 % → 5 % ») aux lignes 122-123, alors que `officine_parametres` est **déjà sous trigger d'audit et RLS** : l'historique réel existe en base | lire `audit_logs` | 06 PAR-03, PAR-D05 |
| Règles | `regles` | partiel — `tempFrigoMin = "2.0"` et `tempFrigoMax = "8.0"` en **chaînes** et en état local (`l.105-106`) : sixième copie des seuils de température | lus depuis `zones_temperature` | 06 PAR-06, TEM-02, RG-36 |
| Utilisateurs | `utilisateurs` | **faux** — 5 utilisateurs fictifs en `useState` (`l.112-118`) : « Dr Marie AGOSSOU », « Dr Jean DOSSOU », « Koffi MENSAH », « Amina BELLO », « Paul TOSSOU », avec adresses `@bestpharma.bj` — un domaine **différent** de celui des comptes réels (`@begpharma.bj`) — et un statut MFA par personne | liste réelle depuis `utilisateurs_officines` + `users` | 06 PAR-04, PAR-D04, INC-26, **RG-42** |

Toute modification de paramètre exige motif et signature (M-240).

#### `/dashboard/securite` · Sécurité & MFA — 8 sections, 8 endpoints

| Section | `sectionActive` | État réel | Cible | Réf. |
| --- | --- | --- | --- | --- |
| MFA | `mfa` | réel — cycle complet : `GET /auth/mfa`, `POST /auth/mfa/demarrer`, `POST /auth/verify-mfa`, `DELETE /auth/mfa` | conserver, **mais aucun repli silencieux** : `l.119` et `l.131` remplacent un échec par un état par défaut, donc l'écran sécurité peut afficher un état inventé | 06 SEC-04, SEC-D04, RG-26 |
| Codes de secours | `recuperation` | **faux — faille** — 10 codes en clair dans un `useState` (`l.101-104`) : `8492-1049`, `3910-4820`, `5829-1940`, `2849-5019`, `4920-1849`, `9182-3849`, `1049-5829`, `6729-1948`, `3849-2019`, `5019-3829` | générés serveur, hachés, affichés **une seule fois**, à usage unique, compteur de consommation, régénération tracée | 06 SEC-01, SEC-D01, M-242 |
| Code de signature | `code_signature` | **faux** — `codePin = "••••••"` : une chaîne de puces en état local (`l.107`) | rattaché à `pin_hash`, vérifié serveur | 06 SEC-02, SEC-D02 · 04 RG-16 |
| Mot de passe | `motdepasse` | **mort** — `PUT /auth/password` renvoie **`501`** (vérifié) | handler mock + politique appliquée serveur | 06 SEC-03, SEC-05 |
| Sessions | `sessions` | partiel — `GET /auth/devices` et `DELETE /auth/devices/{id}` réels, `POST /auth/devices/revoke-others` **`501`** | handler mock | 06 SEC-03, APP-07 |
| Politique | `politique` | vitrine | lue depuis les paramètres, appliquée serveur (longueur, complexité, historique, expiration) | 06 SEC-05 |
| Alertes | `alertes` | vitrine | réelles : échecs de connexion répétés, nouvel appareil, révocation, échec de signature, accès hors horaires | 06 SEC-07 |
| Journal de sécurité | `journal_securite` | vitrine | **vue filtrée d'`audit_logs`**, pas un écran séparé | 06 SEC-06 · JRN-10 |

Verrou d'inactivité : 15 min, `423 SESSION_LOCKED_INACTIVITY` (`SetPostgresTenantContext.php:20-30`) — s'applique à **toutes** les routes, y compris la borne de pointage, d'où la contradiction « Session Continue H24 » (volet 04, DEF-13, RG-20).

---

## 5 — Socle transversal (valable pour les 24 écrans)

### 5.1 Composants partagés à créer une fois pour toutes

| Composant | Remplace | Utilisateurs | Réf. |
| --- | --- | --- | --- |
| `ModaleFiche` (`components/modules/modale.tsx`, existe déjà : `ModaleFiche` l.16, `ColonneFiche` l.64, `Champ` l.89) | les `<Dialog>` artisanaux et les formulaires sans modale | importé **uniquement** par `stock.tsx:48` aujourd'hui → doit servir aux 24 écrans | RG-34, M-43 |
| `TableauRegistre` | les 22 `<table>` bruts et 227 `<td>` codés à la main | **absent** du dépôt, aucun écran ne l'utilise | I-07, RG-10 |
| `SignatureAgent` (`bpd-communs.tsx`, existe) | `ModaleSignatureCode` non vérifiée | à brancher sur **toute** validation, avec vérification serveur | RG-05, RG-15 |
| `BoutonCreerNC` (`bpd-communs.tsx:264`, existe, `api.post` réel) | rien | à brancher sur les anomalies des 24 écrans | RG-06, NCC-06 |
| `imprimerFicheOfficielle` | les 6 occurrences de `window.print()` | tout document imprimé avec cartouche | RG-03, TEM-13 |
| `ModeInspecteur` | rien | vue lecture seule journalisée | RG-04, JRN-05 |
| `registre-documentaire.tsx` (113 l., existe) | rien | à réutiliser pour `formations` et `maintenance` dans `suivis_documentaires` | LOC-02, DOS-17 |
| `zone-depot.tsx` (existe) | rien | téléversement réel, mais dépend de `POST /upload` qui renvoie `501` en démo | CMP-01, L21 |

### 5.2 URL, liens profonds et pagination

- **Deux conventions d'URL coexistent** : `formatUrl` (`api-client.ts:92-101`) préfixe `/api/`, donc un appel écrit `/api/x` produit `/api/api/x`. → **RG-28** : une seule convention, routes scopées par officine sous `/api/officines/{officineId}/…`, routes transverses sous `/api/…`.
- `useSearch` / `validateSearch` sont **absents de tout le dépôt** : aucun état d'onglet, de filtre ou de page n'est dans l'URL. → **RG-08** : `?tab=`, `?section=`, `?vue=`, `?page=`, `?du=`, `?au=` adressables ; un lien copié doit reproduire exactement la vue.
- Pagination **serveur** obligatoire au-delà de 100 lignes (**RG-33**).

### 5.3 Internationalisation

`src/lib/i18n/fr.ts` impose « les libellés en français, centralisés » (ligne 1). Le dossier `routes/_authenticated/dashboard/` contient **25 fichiers** : 24 écrans plus `route.tsx` (mise en page). **6 écrans sur 24** importent le fichier — `index` (tableau de bord), `personnel`, `appareils`, `compte`, `parametres`, `securite` — et **18 ne l'importent pas**, dont `stock.tsx` (2 759 lignes) et `echeances.tsx` (1 566 lignes), qui ont tous leurs libellés en dur dans le JSX. → **RG-24 / RG-43** : les 24 écrans importent le fichier, qui reçoit une section par écran. Vérification : `grep -L "@/lib/i18n/fr" frontend/src/routes/_authenticated/dashboard/*.tsx` ne renvoie plus que `route.tsx`.

> Les volets 05 et 06 annoncent « 4 écrans » : c'est exact **dans leur périmètre** — 4 sur les 14 fichiers audités par le volet 05, 4 sur les 13 écrans du volet 06. Au périmètre du projet entier, le compte est 6 sur 24.

### 5.4 Ancres de test

`data-testid` = **0 occurrence** dans tout le dépôt ; `data-tour` = 5, uniquement dans `components/tableau-de-bord.tsx`. Les tests existants (`src/test/`) s'appuient donc sur du texte, ce qui casse au premier changement de libellé. → chaque section de chaque écran reçoit un `data-testid` stable (annexe D des volets), et les 14 écrans couverts par `ecrans-demo.test.tsx` passent à 24.

### 5.5 Journalisation, RLS et append-only

- **10 tables seulement** sont sous trigger d'audit et RLS : `audit_logs`, `alertes_peremption`, `inscriptions_ordre`, `officines`, `officine_parametres`, `utilisateurs_officines`, `appareils_autorises`, `approbations_documents`, `fichiers_documents`, `suivis_documentaires`.
- **30+ tables métier ne le sont pas**, dont `employes`, `pointages`, `produits`, `stock_lots`, `mouvements_stock`, `registre_stupefiants`, `releves_temperatures`, `non_conformites`, `documents`, `ecritures_syscohada`. → **RG-37**, mesure `audit_couverture_tables`.
- Défenses existantes à conserver et étendre : `fn_audit_trigger()`, `trg_audit_logs_tamper_defense`, `trg_audit_no_truncate` (migration `120100_create_audit_triggers.php`). → **RG-01, RG-31, RG-38**.

### 5.6 Parité de la pile de démonstration

`backend/routes/api.php` expose **148 routes verbales** (275 lignes, 35 contrôleurs `Api/`), `mock-backend.mjs` (~104 handlers) en couvre une partie, le frontend en appelle **117 URL distinctes**. Écarts mesurés :
- **9 routes renvoient `501`** alors que le contrôleur Laravel existe (§8, D-501).
- **3 handlers mock sans équivalent Laravel** : `nouvelle-complete`, `rattacher`, `PUT /api/stocks/{id}/statut`.
- **12 routes Laravel orphelines**, jamais appelées par le frontend (annexe E).
- Doublon : `GET /audit-logs` et `GET /officines/{id}/audit-logs` (`api.php:84-85`).
→ **RG-25** : parité obligatoire, vérifiée par un test qui croise `api.php`, `mock-backend.mjs` et les URL du frontend. **C'est le lot L21, à livrer en premier** parce que tous les autres lots se recettent sur cette pile.

### 5.7 Résilience et hors ligne

- `src/lib/offline/outbox.ts` (100 l.) est **décorative** : la boucle de synchronisation contient `if (!h) continue;` (ligne 63) et **aucun handler n'est jamais enregistré** (`enregistrerHandler` jamais appelé) ; `POST /api/sync/push` (`SyncController::push`, 104 l.) n'est **jamais appelé** par le client.
- `use-en-ligne.ts` existe ; `dexie ^4.0.11` est installé et non utilisé.
- **11 replis silencieux** remplacent une erreur par un état par défaut inventé.
→ **RG-27** : hors ligne réel (handlers enregistrés, outbox persistée, reprise tracée) **ou** retrait de l'affichage « hors ligne » ; **RG-26** : chargement, erreur et vide sont trois états distincts, jamais confondus.

### 5.8 Fuseau horaire

`src/lib/format.ts` formate en `Africa/Porto-Novo` ; `backend/config/app.php:68` fixe `APP_TIMEZONE=UTC` et les requêtes `whereDate` sont en UTC. → **RG-19** : la journée civile est `Africa/Porto-Novo` partout (paramètre, requêtes, calculs d'heures, échéances, pointage). Toute heure affichée porte son fuseau.

---

## 6 — Télémétrie consolidée

### 6.1 Modèle (volet 02, inchangé)

| Table | Contenu | Garde |
| --- | --- | --- |
| `evenements_usage` | ~45 événements `<domaine>.<objet>.<action>` | RLS append-only, refus `UPDATE`/`DELETE` |
| `metriques_horodatees` | 33 métriques métier | idem |
| `telemetrie_technique` | erreurs, latences, échecs réseau | idem |

Envoi par lots de **20 événements** ou toutes les **5 s**, via `sendBeacon` à la fermeture. Rétention : **13 mois** pour l'usage, **5 ans** pour le réglementaire, **90 jours** pour la télémétrie technique. **La télémétrie n'est jamais une preuve réglementaire** : elle mesure l'usage, elle ne remplace ni un registre ni une signature.

### 6.2 Couverture par groupe

| Groupe | Modales | Graphiques | Réf. |
| --- | --- | --- | --- |
| 1 Pilotage (tableau de bord, consolidation, gardes) | M-01→M-12 | G-01→G-08 | 02 |
| 2 Groupe & Réseau | M-13→M-20 | G-09→G-14 | 02 |
| 3 Comptoir & Caisse (vente, dispensation, facturation) | M-21→M-42 | G-15→G-20 | 02 |
| 4 Cartographie des 18 écrans restants | M-43→M-127 | G-21→G-56 | 03 |
| 5 Présences, Pointage, Badges, Personnel | M-128→M-157 | G-57→G-68 | 04 |
| 6 Stock, Magasin, Stupéfiants, Préparations | M-158→M-199 | G-69→G-96 | 05 |
| 7 Qualité, GED, Finance, Compte, Sécurité | M-200→M-243 | G-97→G-124 | 06 |
| **Total** | **243 modales** | **124 graphiques** | — |

Les **33 métriques métier** du modèle de télémétrie (volet 02 §5) sont un objet distinct des modales `M-nn` : elles alimentent `metriques_horodatees` et ne sont pas renumérotées ici.

### 6.3 État réel des graphiques

**Mesure vérifiée** : `grep -rln "from \"recharts\"" frontend/src` renvoie **3 fichiers** — `components/tableau-de-bord.tsx` (`LineChart`, sert `/dashboard`), `routes/_authenticated/dashboard/auto-evaluation.tsx` (`BarChart`), `routes/_authenticated/dashboard/temperatures.tsx` (`LineChart`). Soit **3 écrans sur 24** qui ont un vrai graphique, alors que `recharts ^2.15.4` est installé et que **124 graphiques** sont spécifiés.

Deux compléments mesurés :
- `components/ui/chart.tsx` (surcouche `shadcn` de `recharts`) existe et n'est **importé par personne** ;
- `comptabilite.tsx` affiche un `PieChart` **dessiné à la main en SVG**, sans `recharts` — il doit migrer vers la surcouche partagée pour être cohérent avec les 123 autres.

Trois sections portent un titre statistique **sans aucun graphique** : `non-conformites?tab=statistiques` (délai moyen en dur), `locaux` (score de conformité en dur), `journal` (intégrité non vérifiable).

---

## 7 — Exigences transverses RG-01 → RG-44

### 7.1 Volet 03 — RG-01 → RG-12

| Code | Règle |
| --- | --- |
| RG-01 | **Registre inaltérable** : tout registre (stupéfiants, préparations, mouvements, journal d'audit) refuse `UPDATE` et `DELETE` ; seule une écriture rectificative liée est permise |
| RG-02 | **Verrou de conservation** : la durée (3 / 5 / 10 / 40 ans) est affichée dans le cartouche et appliquée comme contrainte de suppression |
| RG-03 | **Cartouche réglementaire** : tout état imprimé ou exporté porte le code du document (ex. `GAC-STU-001`), l'officine, la période, l'éditeur, le viseur, la date et l'heure avec fuseau |
| RG-04 | **Mode inspecteur** : vue en lecture seule, filtrée par période, registre ou chapitre, ouverte par un rôle dédié, et son ouverture est journalisée |
| RG-05 | **Signature par code personnel** : composant partagé `SignatureAgent` pour toute validation, vérifié serveur contre `pin_hash` |
| RG-06 | **Non-conformité en un clic** : `BoutonCreerNC` disponible sur toute anomalie constatée, avec contexte pré-rempli |
| RG-07 | **Secrets hors client** : aucun jeton, mot de passe, code MFA ou code de secours n'est stocké ni affiché côté client |
| RG-08 | **Pagination et filtres dans l'URL** : tout registre long est paginé serveur (25 lignes) avec filtres et page adressables |
| RG-09 | **Exports systématiques** : PDF, Excel, CSV via `@/lib/export-utils` ; chaque export est journalisé |
| RG-10 | **Tableaux accessibles** : migration vers `@/components/ui/table` (I-07) avec en-têtes `<th scope="col">` |
| RG-11 | **Données de santé** : les registres patient (ordonnancier, délivrances) sont réservés aux rôles habilités et leur consultation est journalisée |
| RG-12 | **Paramétrable, jamais codé en dur** : seuils, périodicités, durées de conservation, régimes fiscaux et paliers d'affichage viennent des paramètres d'officine |

### 7.2 Volet 04 — RG-13 → RG-24

| Code | Règle |
| --- | --- |
| RG-13 | Le registre de présence est **append-only** : trigger d'audit et politique RLS sur `pointages`, `employes`, `absences` et `corrections` |
| RG-14 | Toute correction est une **écriture rectificative liée** : le pointage d'origine n'est jamais modifié, la correction le référence et porte motif, signatures et horodatage serveur |
| RG-15 | Toute signature est **vérifiée serveur** : le code est comparé à `pin_hash`, l'horodatage est produit par le serveur, l'empreinte est calculée côté serveur |
| RG-16 | Aucun secret ni code personnel côté client : `pin_code` devient `pin_hash`, n'est jamais renvoyé par une API, n'est jamais écrit dans un état React |
| RG-17 | Les identifiants de badge sont **uniques et non réutilisables** : matricule séquentiel par officine et par année, contrainte d'unicité en base |
| RG-18 | **Une seule définition** du poste pharmaceutique, partagée front et back, déclinée en `compte_rendu`, `mode_presence_pharmacien` et contrôle d'habilitation |
| RG-19 | La **journée civile est `Africa/Porto-Novo`** partout : `APP_TIMEZONE`, requêtes `whereDate`, calculs d'heures, échéances |
| RG-20 | La borne est un **équipement autorisé** : enregistrée dans `appareils_autorises`, jeton à durée de vie limitée et à périmètre restreint au pointage, révocable |
| RG-21 | Le paramètre `mode_presence_pharmacien` est **opérant** : en mode `blocage`, caisse et dispensation refusent `409 ABSENCE_PHARMACIEN` |
| RG-22 | Les **données de santé du personnel sont minimisées** : motif médical stocké séparément, accès restreint aux rôles habilités, consultation journalisée |
| RG-23 | **Aucun service tiers** dans la chaîne badge et impression : QR généré localement, photo stockée dans le tenant, impression sans `window.print()` |
| RG-24 | Interface conforme au dépôt : libellés issus de `src/lib/i18n/fr.ts` (sections `pointage`, `badge`, `personnel`, `ordre`) |

### 7.3 Volet 05 — RG-25 → RG-34

| Code | Règle |
| --- | --- |
| RG-25 | **Parité mock / Laravel** : toute route de `backend/routes/api.php` possède un handler dans `mock-backend.mjs` et réciproquement, vérifié par un test |
| RG-26 | **Aucun repli silencieux** sur une donnée réglementaire : chargement, erreur et vide sont trois états distincts |
| RG-27 | **Hors ligne réel ou absent** : les mutations critiques passent par l'outbox avec handler enregistré et synchronisation vérifiée, sinon l'affichage hors ligne est retiré |
| RG-28 | **Une convention d'URL** : routes scopées par officine sous `/api/officines/{officineId}/…`, routes transverses sous `/api/…`, jamais les deux |
| RG-29 | **Traçabilité du cycle de vie du produit** : trigger d'audit et RLS sur `produits`, `stock_lots`, `mouvements_stock`, `emplacements` |
| RG-30 | **Toute transition d'état est motivée et signée** : statut de lot, quarantaine, levée, destruction, validation de préparation |
| RG-31 | **Registres inaltérables** : `registre_stupefiants` et `registre_preparations` refusent `UPDATE` et `DELETE` en base |
| RG-32 | **Unicité des seuils** : seuils de péremption, de rupture et d'écart sont des paramètres d'officine, lus une seule fois |
| RG-33 | **Pagination serveur obligatoire** au-delà de 100 lignes, filtres et page dans l'URL, jamais de chargement exhaustif |
| RG-34 | **Un seul composant de modale formulaire** (`ModaleFiche`) et **un seul composant de tableau** (`TableauRegistre`) pour toute l'application |

### 7.4 Volet 06 — RG-35 → RG-44

| Code | Règle | Vérification |
| --- | --- | --- |
| RG-35 | **Aucun document imprimable ne peut déclarer un fait non vérifiable** : dossier PRA, revue de direction, certificats d'étalonnage et taux de conformité sont générés depuis des enregistrements réels ou retirés | `grep -rn "100% Réussie\|CERT-2026-042\|94.2" frontend/src` → 0 |
| RG-36 | **Une seule source par valeur réglementaire** : seuils de température, taux de TVA, durées de conservation, délais d'alerte, paliers d'affichage | `grep -rc "2.0°C\|15.0°C" frontend/src` → une seule occurrence |
| RG-37 | **Traçabilité généralisée** : triggers d'audit et RLS étendus aux 30+ tables métier, couverture mesurée par `audit_couverture_tables` | un `UPDATE` sur chaque table produit une entrée `audit_logs` |
| RG-38 | **Append-only comptable et réglementaire** : `ecritures_syscohada`, `releves_temperatures`, `registre_stupefiants`, `registre_preparations`, `non_conformites`, `documents`, `audit_logs` refusent `UPDATE` et `DELETE` hors procédure nominative | fonction PL/pgSQL de garde + test par table |
| RG-39 | **Toute transition d'état est motivée et signée** : statut de document, statut de NC, clôture d'échéance, clôture comptable, clôture de campagne, révocation d'appareil | aucune transition sans `motif` et `signature_id` |
| RG-40 | **Aucune modale manquante là où un formulaire existe** : `documents`, `modeles` et `non-conformites` passent à `ModaleFiche` | `grep -c "<Dialog" …` > 0 sur les trois fichiers |
| RG-41 | **Le corpus de référence est la source des modèles** : 62 documents importés, empreintes vérifiées, nombre affiché calculé | `GET /modeles-bpd` renvoie 62 enregistrements avec contenu |
| RG-42 | **Aucune donnée fictive d'identité ou d'accès** : utilisateurs, rôles, statuts MFA, numéros d'Ordre, certificats proviennent des tables réelles | `grep -rn "@bestpharma.bj\|Dr Marie AGOSSOU\|ONPB-2014-B-089" frontend/src` → 0 |
| RG-43 | **Libellés centralisés** : les 13 écrans du volet 6 importent `@/lib/i18n/fr`, qui reçoit une section par écran | `grep -L "@/lib/i18n/fr" frontend/src/routes/_authenticated/dashboard/*.tsx` → vide |
| RG-44 | **Les routes exposées sont utilisées ou supprimées** : les 12 routes orphelines sont branchées ou retirées | plus aucune route sans appel frontend, sauf celles documentées comme réservées |

---

## 8 — Registre consolidé des défauts (191 anomalies)

### 8.1 Répartition par famille

| Famille | Cahier | Écran ou périmètre | Nombre |
| --- | --- | --- | --- |
| `D-01→D-17` | 03 | défauts d'interface des 18 écrans cartographiés | 17 |
| `DEF-01→DEF-25` | 04 | pointage, présence, badges | 25 |
| `BDG-D1→BDG-D9` | 04 | chaîne badge (QR, impression, cycle de vie) | 9 |
| `INC-01→INC-08` | 04 | incohérences transverses du domaine présence | 8 |
| `STK-D1→STK-D12` | 05 | `stock.tsx` (2 759 l.) | 12 |
| `STU-D1→STU-D8` | 05 | `stupefiants.tsx` (874 l.) | 8 |
| `PRE-D1→PRE-D6` | 05 | `preparations.tsx` (746 l.) | 6 |
| `MAG-D1→MAG-D5` | 05 | `magasin-avance.tsx` (816 l.) | 5 |
| `INC-09→INC-18` | 05 | incohérences transverses du domaine stock | 10 |
| `TEM-D1→TEM-D8` | 06 | `temperatures.tsx` | 8 |
| `LOC-D1→LOC-D7` | 06 | `locaux.tsx` | 7 |
| `AUT-D1→AUT-D6` | 06 | `auto-evaluation.tsx` | 6 |
| `DOC-D1→DOC-D7` | 06 | `documents.tsx` | 7 |
| `MOD-D1→MOD-D4` | 06 | `modeles.tsx` | 4 |
| `NCC-D1→NCC-D7` | 06 | `non-conformites.tsx` | 7 |
| `ECH-D1→ECH-D6` | 06 | `echeances.tsx` | 6 |
| `CPT-D1→CPT-D9` | 06 | `comptabilite.tsx` | 9 |
| `JRN-D1→JRN-D4` | 06 | `journal.tsx` | 4 |
| `APP-D1→APP-D6` | 06 | `appareils.tsx` | 6 |
| `CMP-D1→CMP-D6` | 06 | `compte.tsx` | 6 |
| `PAR-D1→PAR-D6` | 06 | `parametres.tsx` | 6 |
| `SEC-D1→SEC-D5` | 06 | `securite.tsx` | 5 |
| `INC-19→INC-28` | 06 | incohérences transverses qualité, finance, compte | 10 |
| **Total** | | | **191** |

Chaque anomalie est sourcée `fichier:ligne` dans son cahier d'origine. **Aucune n'est hypothétique** : elles ont toutes été lues dans le code, et onze d'entre elles ont été **vérifiées par exécution** sur la pile de démonstration.

### 8.2 Les onze défauts vérifiés par exécution (P0)

Vérifiés le 12 novembre 2026 sur la pile de démonstration (`mock-backend.mjs` sur `0.0.0.0:8001`, Vite sur `0.0.0.0:5174`), après connexion en deux temps (`POST /api/auth/login` → `{"mfa_required":true,"temp_token":"temp-demo-u2"}` puis `POST /api/auth/verify-mfa` → `{"token":"demo-token-u2"}`).

| # | Route | `api.php` | Appelée depuis | Réponse observée | Contrôleur Laravel |
| --- | --- | --- | --- | --- | --- |
| 1 | `PUT /api/auth/profile` | l.53 | `compte.tsx:146` | **501** | `AuthController::updateProfile` (509 l.) |
| 2 | `PUT /api/auth/password` | l.54 | `securite.tsx:224` | **501** | `AuthController::updatePassword` |
| 3 | `POST /api/comptabilite/ecritures` | l.257 | `comptabilite.tsx:176` | **501** | `ComptabiliteController::storeEcriture` (169 l.) |
| 4 | `POST /api/comptabilite/ecritures/{id}/extourne` | l.258 | `comptabilite.tsx:195` | **501** | `ComptabiliteController::extourne` |
| 5 | `POST /api/upload` | l.43 | `stock.tsx:346`, `stupefiants.tsx:174`, `preparations.tsx:136`, `zone-depot.tsx:58` | **501** | `UploadController` (154 l.) |
| 6 | `POST /api/appareils-autorises/{id}/revoquer` | l.65 | `appareils.tsx` | **501** | `AppareilAutoriseController::revoquer` (177 l.) |
| 7 | `POST /api/appareils-autorises/{id}/reactiver` | l.66 | `appareils.tsx` | **501** | `AppareilAutoriseController::reactiver` |
| 8 | `POST /api/auth/devices/revoke-others` | l.58 | `securite.tsx`, `appareils.tsx` | **501** | `AuthController::revokeOthers` |
| 9 | `GET /api/officines/{id}/audit-logs/verifier-integrite` | l.84 | `journal.tsx:52` | **501** | `AuditController::verifierIntegrite` (102 l.) |
| 10 | `GET /api/modeles-bpd` | réel | `modeles.tsx` | **200 mais 3 fiches, `contenu: null`** | `ModeleBpdController` (72 l.) |
| 11 | `GET /api/stocks/valorisation` | réel | `stock.tsx:516` | **200, total 72 000 FCFA, non scopé par officine** | `StockLotController` (422 l.) |

Les cinq premières familles **bloquent la démonstration** : sans `POST /api/upload`, aucun document, aucune photo de personnel, aucun justificatif ne peut être téléversé dans toute l'application.

**Réponses légitimes observées** (à conserver telles quelles) : `PUT /api/stocks/lot1/statut` → `404` ; `POST …/auto-evaluation/evaluer/ev1` → `422 {"message":"Cotation invalide."}` ; `PUT /api/echeances/e1` → `404` ; `POST /api/caisse/session/cs1/fermer` → `404`.

### 8.3 Les onze replis silencieux (P2, RG-26)

Un `.catch(() => …)` qui remplace une erreur par un état par défaut inventé :

| Fichier | Lignes |
| --- | --- |
| `stupefiants.tsx` | 299, 303, 307 |
| `stock.tsx` | 515, 516 |
| `securite.tsx` | 119, 131 |
| `compte.tsx` | 149 |
| `parametres.tsx` | 146 |
| `dashboard/index.tsx` | 51, 210 |

Conséquence la plus grave : **l'écran sécurité peut afficher un état MFA inventé** après un échec réseau (`securite.tsx:119/131`).

### 8.4 Les documents imprimables qui déclarent des faits inexistants (P0, RG-35)

| Document | Fichier | Fait déclaré | Réalité |
| --- | --- | --- | --- |
| Dossier PRA et journal des sauvegardes | `locaux.tsx:230-270` | « Serveur autonome sur site avec réplication cloud chiffrée », « AES-256 avec hachage SHA-256 inaltérable », chaque sauvegarde « **100% Réussie (Chiffrée)** » (l.257) | aucun test de restauration, aucune sauvegarde exécutée, aucun RPO/RTO mesuré |
| Trame du rapport annuel / revue de direction | `documents.tsx:873` | taux de conformité **94.2 %** écrit dans la chaîne de caractères | aucun calcul, aucune source |
| Certificat d'étalonnage | `locaux.tsx:560` | « CERT-2026-042 · METRO-BENIN · ±0.2°C » | aucune entité capteur ni étalonnage en base |
| Score de conformité des locaux | `locaux.tsx:774` | « Score : 100% Conforme » | aucun constat réel agrégé |
| États financiers SYSCOHADA | `comptabilite.tsx:337-340` | 14 montants en FCFA, `+14.2%`, compte `701`, « Novembre 2026 » | aucune écriture comptable réelle |
| Taux de lettrage | `comptabilite.tsx:836` | « 94.8 % » | aucune entité `tiers` |
| Rapport d'heures | `pointage.tsx:873-875` | « Novembre 2026 », « 96.4% », « 412h », « 14h » | aucun appariement arrivée/départ |
| Délai moyen de traitement des NC | `non-conformites.tsx:787` | « 4.2 jours » | aucune date de clôture exploitée |
| Carte professionnelle | `personnel.tsx:235-238`, `compte.tsx:179-185` | « ONPB-2014-B-089 », validité « Année 2026 », photo et QR | `inscriptions_ordre` indexé par `user_id`, jonction impossible |

**Un inspecteur ABMed qui imprime l'un de ces documents reçoit une déclaration fausse.** C'est le risque principal du projet, devant toute lacune fonctionnelle.

### 8.5 Les secrets exposés côté client (P1, RG-07)

| Secret | Emplacement | Forme |
| --- | --- | --- |
| 10 codes de secours MFA | `securite.tsx:101-104` | en clair dans un `useState` |
| Jeton d'intégration fiscale e-MECeF | `parametres.tsx:109` | `tokenMECeF = "dgi_live_sec_994829384729182374"` en clair |
| Code PIN de signature | `securite.tsx:107` | `codePin = "••••••"` en état local |
| Codes PIN des employés | base, colonne `pin_code` | en clair, défaut `'1234'`, **renvoyé par l'API** |
| 5 utilisateurs fictifs avec statut MFA | `parametres.tsx:112-118` | en clair, domaine `@bestpharma.bj` (≠ `@begpharma.bj`) |

### 8.6 Synthèse par gravité

| Priorité | Nombre | Nature |
| --- | --- | --- |
| **P0** | 11 vérifiés par exécution + 9 documents faux | bloque la démonstration ou produit une déclaration fausse |
| **P1** | 5 familles de secrets + registres sans trigger | conformité réglementaire et sécurité |
| **P2** | 11 replis silencieux + seuils dupliqués + matricules aléatoires + paramètres inopérants | fiabilité métier |
| **P3** | le reste : 22 `<table>` bruts, 18 écrans sur 24 hors `i18n`, 0 `data-testid`, sections vitrines | dette de cohérence |

### 8.7 Recette automatisée de l'état de départ

Les 14 contrôles transverses sont livrés **exécutables** dans [`annexes/recette-grep.sh`](annexes/recette-grep.sh). Première exécution le 12 novembre 2026 sur le commit `5b8becf` :

```
   1  KO   RG-35    3 occurrence(s)   dossier PRA, certificat d'étalonnage, trame de rapport annuel
   2  KO   RG-35    5 occurrence(s)   rapport d'heures, délai de NC, comptabilité, lettrage, jauge
   3  KO   RG-42   16 occurrence(s)   utilisateurs, numéro d'Ordre, domaine inventé
   4  KO   RG-07    2 occurrence(s)   codes de secours MFA, jeton e-MECeF
   5  KO   RG-36   14 occurrence(s) dans 2 fichiers   seuils de température
   6  KO   RG-23   10 occurrence(s)   QR externe, window.print()
   7  KO   RG-23    3 écran(s)        impression navigateur
   8  KO   RG-15    1 occurrence(s)   hash_signature côté client
   9  KO   RG-16    3 occurrence(s)   pin_code côté serveur
  10  KO   DEF-01   1 occurrence(s)   repli sur employes[0]
  11  KO   RG-43   19 fichier(s)      libellés hors i18n (18 écrans + route.tsx)
  12  KO   RG-40    3 écran(s)        documents, modeles, non-conformites sans modale
  13  KO   RG-37    0 migration       aucun trigger d'audit sur pointages
  14  KO   RG-35   12 occurrence(s)   constantes de données, slogans de conformité

bilan : 0 conforme(s), 14 à corriger, sur 14 contrôles   → code de retour 1
```

**Ce script est la définition exécutable de « fini » au niveau transverse.** Il doit passer à `14 / 14` — et donc retourner `0` — avant la recette du dernier lot. Chaque lot livré le fait progresser ; il est conçu pour être exécuté dans le CI à côté de `.github/workflows/ci.yml`.

---

## 9 — Plan de livraison L1 → L33

### 9.1 Principe d'ordonnancement

Trois règles d'ordre, non négociables :

1. **L21 en premier.** Tant que la pile de démonstration n'a pas la parité avec `routes/api.php`, aucun autre lot ne peut être recetté : les 9 routes en `501` font échouer des écrans dont le code Laravel est déjà écrit.
2. **Le socle avant les écrans.** L1 (composants) et L2 (télémétrie métier) servent tous les lots suivants ; L8 (fondations registres) sert L9 à L12.
3. **Ce qui déclare un fait avant ce qui calcule un fait.** Les documents imprimables fictifs (RG-35) sont retirés ou rendus vrais dans L27, avant toute livraison de L30 à L33 qui s'appuierait sur eux.

### 9.2 Les 33 lots

| Lot | Intitulé | Cahier | Dépend de | Livrable vérifiable |
| --- | --- | --- | --- | --- |
| **L1** | Tokens et composants partagés | 02 | — | `ModaleFiche`, `TableauRegistre`, `SignatureAgent`, palette `#0F3B27`/`#18AA38`/`#92FF5F`/`#FF7036`/`#BFF2F0`/`#475C50`, grille `#E5ECE7` |
| **L2** | Télémétrie métier | 02 | L1 | `evenements_usage` alimenté, lots de 20 événements / 5 s, `sendBeacon` |
| **L3** | Caisse complète | 01, 02 | L1 | session de caisse ouverte, fermée, écart justifié et signé |
| **L4** | Dispensation | 01, 02 | L3 | ordonnance, délivrance, registre patient journalisé |
| **L5** | Facturation | 01, 02 | L3 | facture, avoir, TVA recalculée |
| **L6** | Groupe et gardes | 01, 02 | L1 | consolidation multi-officines, gardes `POST/DELETE` réelles |
| **L7** | Télémétrie technique | 02 | L2 | `telemetrie_technique` : erreurs, latences, échecs réseau |
| **L8** | Fondations registres | 03 | L1 | triggers d'audit et RLS sur les tables métier, `fn_audit_trigger()` étendue |
| **L9** | Stock réel | 03, 05 | L8 | FEFO appliqué, lots, emplacements, mouvements, valorisation scopée |
| **L10** | Stupéfiants et préparations | 03, 05 | L9 | registres append-only, balance vérifiée, préparations validées |
| **L11** | Qualité réelle | 03, 06, 07 | L8 | températures, locaux, auto-évaluation, NC, échéances branchés |
| **L12** | Finance réelle | 03, 06 | L8 | écritures SYSCOHADA, extournes, clôtures |
| **L13** | Sécurité et compte | 03, 06 | L1 | secrets hors client, MFA réel, profil et mot de passe modifiables |
| **L14** | Télémétrie de ces sections | 03 | L7, L9→L13 | M-43→M-127, G-21→G-56 |
| **L15** | Intégrité du pointage | 04 | L8 | `pointages` append-only, corrections rectificatives liées |
| **L16** | Reconnaissance serveur et borne | 04 | L15, L20 | plus aucun repli sur `employes[0]`, `422 CODE_BADGE_INCONNU` |
| **L17** | Signature vérifiée | 04 | L15 | `pin_hash`, horodatage serveur, empreinte serveur |
| **L18** | Badges | 04 | L17, L1 | QR local signé, CR80 et planche A4 réels, cycle de vie |
| **L19** | Corrections, absences, plannings | 04 | L15 | modale d'absence rendue, créneaux persistés, gardes liées |
| **L20** | Rapports, paramètres opérants et dossiers | 04 | L15, L19 | feuille d'émargement, `mode_presence_pharmacien` bloquant |
| **L21** | **Parité de la pile de démonstration** | 05 §0 | — | **les 9 routes `501` répondent**, test de parité `api.php` ↔ mock ↔ frontend |
| **L22** | Traçabilité du cycle de vie du produit | 05 | L8 | RLS et triggers sur `produits`, `stock_lots`, `mouvements_stock`, `emplacements` |
| **L23** | Réception réelle | 05 | L22 | scan de réception, lots créés, FEFO, quarantaine automatique |
| **L24** | Rappels, quarantaine, déchets | 05 | L22 | `avis_rappels`, quarantaine motivée et signée, destruction tracée |
| **L25** | Inventaires et mouvements | 05 | L22 | cycle d'inventaire complet persisté, écarts justifiés |
| **L26** | Stupéfiants et préparations approfondis | 05 | L10, L22 | balance,registre, formule non codée en dur, double validation réelle |
| **L27** | **Vérité des documents imprimables** | 06 | L21 | dossier PRA, revue de direction, certificats : générés ou retirés (RG-35) |
| **L28** | Corpus de référence | 06 | L27 | les **62 documents** de `references/canevas/catalogue.json` seedés, `sha256` vérifiés, compteur calculé |
| **L29** | Traçabilité généralisée | 06 | L22, L37 | triggers et RLS sur les 30+ tables restantes, `audit_couverture_tables` |
| **L30** | Chaîne du froid et locaux réels | 06, 07 | L29 | seuils en source unique, capteurs, étalonnage, nuisibles, score calculé |
| **L31** | GED et amélioration continue | 06, 07 | L28, L29 | machine à états documentaire, modales de `documents`/`modeles`/`non-conformites` |
| **L32** | Échéancier fédérateur et finance réelle | 06 | L29, L30, L31 | les modules producteurs alimentent `/dashboard/echeances`, lettrage, états financiers |
| **L33** | Audit, appareils, compte et sécurité | 06 | L21, L29 | vérification d'intégrité SHA-256 affichée, borne comme appareil autorisé, codes de secours hachés |

### 9.3 Séquencement recommandé

```
Phase 0  L21                                    → la démo répond partout
Phase 1  L1 · L2 · L8                           → socle composants, télémétrie, registres
Phase 2  L3 → L7                                → périmètre Comptoir & Caisse (cahiers 01-02)
Phase 3  L22 → L26 · L9 · L10                   → Stock, Magasin, Stupéfiants, Préparations (05)
Phase 4  L15 → L20                              → Présences, Pointage, Badges (04)
Phase 5  L27 · L28 · L29 → L33                  → Vérité documentaire, corpus, traçabilité, qualité (06-07)
Phase 6  L11 → L14 · L32                        → Qualité, Finance, télémétrie consolidée
```

**Jalon de conformité ABMed** : à la fin de la phase 5, plus aucun document imprimé ne déclare un fait non vérifiable (RG-35) et tous les registres réglementaires sont append-only (RG-31, RG-38). C'est le jalon à présenter à l'inspecteur.

### 9.4 Critères d'acceptation globaux

Un lot est accepté lorsque **toutes** les conditions suivantes sont remplies :

1. Les exigences numérotées du lot sont implémentées et leur critère d'acceptation individuel est vérifié.
2. **Aucun `grep` de contrôle ne renvoie de résultat** : les commandes de vérification listées dans RG-35, RG-36, RG-42, RG-43 font partie de la recette.
3. Les routes touchées existent **à la fois** dans `backend/routes/api.php` et dans `mock-backend.mjs` (RG-25), et un test de parité passe.
4. Les libellés visibles viennent de `src/lib/i18n/fr.ts` (RG-24, RG-43).
5. Chaque section a un `data-testid` stable et un test dans `src/test/` (24 écrans couverts à terme, contre 14 aujourd'hui).
6. Aucun repli silencieux introduit (RG-26) et aucun secret côté client (RG-07).
7. Toute transition d'état exige motif et signature vérifiée serveur (RG-15, RG-30, RG-39).
8. Les tableaux et graphiques du lot correspondent aux codes `M-nn`, `G-nn`, `TAB-nn`, `I-nn` attribués.
9. La télémétrie du lot émet les métriques `M-nn` associées sans jamais servir de preuve réglementaire.
10. `npm test` et `npm run build` passent dans `frontend/`, et le CI `.github/workflows/ci.yml` est vert.

---

## 10 — Traçabilité documentaire

### 10.1 Chaîne de provenance

```
Cahier des charges BEGPHARMA.docx  (annexes/F-sources, document client d'origine)
references/abmed/guide-bpdisp.pdf  (référentiel BPD ABMed, 267 articles)
references/canevas/catalogue.json  (62 documents réels, empreintes sha256)
references/canevas/anciens-doc/    (6 fichiers XML)
        │
        ├─► 01  CDC fonctionnel Comptoir & Caisse      (commit 7cda001)
        ├─► 07  Qualité & BPD ABMed — FAIT FOI
        ├─► 02  CDC réel interfaces & télémétrie        (commit f087d7e)
        ├─► 03  Cartographie des 18 écrans restants     (commit 16106de)
        ├─► 04  Présences, Pointage & Badges            (commit 7b37aa3)
        ├─► 05  Stock, Magasin, Stupéfiants, Préparations ┐
        ├─► 06  Qualité, GED, Finance, Compte, Sécurité   ┘ (commit 5b8becf)
        │
        └─► 00  Document maître (ce fichier) + annexes A→E
```

### 10.2 Correspondance commit ↔ cahier

| Commit | Contenu |
| --- | --- |
| `484cc4b` | base de la branche `arena/a2e9c195-bestpharma` sur `main` |
| `7cda001` | cahier **01** |
| `f087d7e` | cahier **02** |
| `16106de` | cahier **03** |
| `7b37aa3` | cahier **04** |
| `5b8becf` | cahiers **05** et **06**, renvois croisés mis à jour dans 03 et 04 |
| *(ce dépôt)* | dossier **`CDC-BEGPHARMA/`** : copies renommées `01`→`07`, document maître `00`, annexes `A`→`E`, `README.md`, et l'archive `CDC-BEGPHARMA.zip` |

Les sept cahiers restent **également disponibles à la racine du dépôt** sous leur nom d'origine `BEGPHARMA — …md`. Le dossier `CDC-BEGPHARMA/` en est la copie ordonnée et numérotée ; **en cas de divergence, la racine fait foi** pour les cahiers 01→07, et le dossier fait foi pour le document maître et les annexes.

### 10.3 Méthode d'audit appliquée

| Étape | Outil | Produit |
| --- | --- | --- |
| Inventaire du réel | `git log`, `wc -l`, lecture de `NAV_ENTRIES` dans `app-sidebar.tsx` | 34 entrées, 24 routes, 132 sections |
| Extraction du document client | `zipfile` + `ElementTree` sur `word/document.xml` du `.docx` | cahier 01 |
| Lecture ciblée du code | `sed -n`, `grep -n`, `grep -B2 -A2` sur les 17 fichiers de routes | 191 anomalies sourcées |
| Vérification par exécution | connexion en deux temps puis boucle `curl` sur 23 routes | 11 défauts P0 confirmés |
| Diff d'API | extraction des routes de `api.php`, des handlers de `mock-backend.mjs` (fenêtre ±2 lignes), des URL du frontend | 9 `501`, 12 orphelines, 3 mock-seules |
| Contrôle d'intégrité des cahiers | `python3` : paires de backticks, continuité des séries de codes, caractères `ord > 0x2500` | aucune fuite, aucune rupture de numérotation |

**Piège connu** : chercher `method === "X"` et `path.match(...)` sur la même ligne sous-estime les handlers du mock (36 faux manquants) ; une fenêtre de ±1 ligne en laisse 22 ; la fenêtre de **±2 lignes** avec capture de `path ===`, `path.startsWith` et `path.endsWith` donne le vrai nombre, **14**, dont 9 confirmés par `curl`.

### 10.4 Sources réglementaires

| Source | Emplacement | Usage |
| --- | --- | --- |
| Guide des bonnes pratiques de dispensation ABMed | `references/abmed/guide-bpdisp.pdf` | 267 articles cotés par `/dashboard/auto-evaluation`, art. 1.11 pour le pointage |
| Corpus de canevas | `references/canevas/catalogue.json` | **62 documents** : 39 `.docx`, 16 `.xlsx`, 5 `.doc`, 1 `.pdf`, 1 `.odt` ; 5 rubriques (maîtrise documentaire 4, ressources 31, surveillance 17, procédures 4, en cours 6) ; **0 non intégré** |
| Anciens documents | `references/canevas/anciens-doc/` | 6 fichiers `.xml` |
| Cahier client d'origine | `annexes/F-sources/Cahier des charges BEGPHARMA.docx` | source du cahier 01 |
| Note de périmètre | `annexes/F-sources/on a pas besoin de mettre.txt` | exclusions demandées par le client |
| Conventions du dépôt | `README.md`, `docs/`, `frontend/AGENTS.md`, `frontend/roadmap.md` | Laravel 11/PHP 8.3, PostgreSQL 16 + RLS, audit append-only, Sanctum, MFA TOTP, verrou 15 min |

**Trois nombres pour un même catalogue** : l'interface annonce « 59 modèles » (`modeles.tsx:56/169/552`), l'API de démonstration renvoie **3 fiches vides**, et le corpus de référence en contient **62**. → RG-41, lot L28.

---

## Annexes

| Annexe | Fichier | Contenu |
| --- | --- | --- |
| **A** | [`annexes/A-etat-reel-par-section.md`](annexes/A-etat-reel-par-section.md) | état réel des **162 zones fonctionnelles** : synthèse par état, répartition par écran, détail zone par zone, et les 33 zones « faux » à traiter en priorité |
| **B** | [`annexes/B-index-des-243-modales.md`](annexes/B-index-des-243-modales.md) | index des **243 modales** M-01 → M-243 avec écran, titre et détail ; composants de modale déjà présents ; modales bloquées par un `501` |
| **C** | [`annexes/C-index-des-codes.md`](annexes/C-index-des-codes.md) | index de **tous les codes** des 7 cahiers : 493 exigences fonctionnelles, 402 objets d'interface, 191 défauts, 44 règles, 33 lots, codes ABMed cités, contrôle de continuité |
| **D** | [`annexes/D-criteres-d-acceptation.md`](annexes/D-criteres-d-acceptation.md) | les **10 critères globaux**, les **14 commandes `grep`** de recette, la recette fonctionnelle sur la pile de démonstration, la définition de « fini » pour une section, et ce qui ne doit jamais être accepté |
| **E** | [`annexes/E-parite-api.md`](annexes/E-parite-api.md) | parité d'API : les 3 inventaires, **9 routes en `501`**, 3 handlers mock seuls, **12 routes orphelines**, les **35 contrôleurs** chiffrés, couverture RLS et triggers, seeders et corpus |
| **D bis** | [`annexes/recette-grep.sh`](annexes/recette-grep.sh) | **script exécutable** des 14 contrôles transverses ; état de départ mesuré : **0 / 14** |
| **F** | `annexes/F-sources/` | sources : `Cahier des charges BEGPHARMA.docx` (document client d'origine) et `on a pas besoin de mettre.txt` (exclusions demandées) |

---

**Fin du document maître.** Pour toute section, la chaîne de lecture est : §4 du maître (état réel et cible) → annexe A (grille de recette) → cahier détaillé (exigences, modales, graphiques, télémétrie, critères) → §7 (règles globales) → §9 (lot de livraison).
