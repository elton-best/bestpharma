# BEGPHARMA — CDC réel · Stock, Magasin, Stupéfiants & Préparations

**Volet 5 — Approfondissement des modules d'exploitation du produit**
**Nature du document** : cahier des charges d'implémentation destiné à un agent de développement.
**Méthode** : audit du code livré, vérification **en direct sur la pile de démonstration** (API de démo `0.0.0.0:8001` + Vite `0.0.0.0:5174`), puis spécification de la cible. Chaque anomalie est sourcée `fichier:ligne` ; chaque constat de panne est reproduit par `curl`.

| | |
| --- | --- |
| Écrans | `/dashboard/stock` — `stock.tsx` (2 759 l., **11 sections**) · `/dashboard/stupefiants` (874 l., **9 sections**) · `/dashboard/preparations` (746 l., **6 sections**) |
| Modules | `magasin-avance.tsx` (816 l. — `InventairesStock`, `RappelsStock`, `DechetsStock`) · `modale.tsx` (`ModaleFiche`, `ColonneFiche`, `Champ`) · `zone-depot.tsx` · `courriels-peremption.tsx` · `commun.tsx` |
| Backend | `StockLotController` (422 l., 8 méthodes) · `StupefiantController` (324 l., 11 méthodes) · `InventaireController` (150 l.) · `ProduitController` (120 l.) · `PreparationController` (112 l.) · `DechetController` (101 l.) · `AvisRappelController` (92 l.) · `MouvementStockController` (84 l.) · `EmplacementController` (50 l.) · `UploadController` (154 l.) |
| Socle réglementaire | Guide BPD ABMed : art. 5.2 traçabilité FEFO, STO-03/05/06/07/11/12/14/17/18/19 · stupéfiants : registre coté et paraphé, balance permanente, ordonnancier, déclaration de vol · préparations magistrales : formule, matières premières, contrôle, étiquetage |
| Numérotation | défauts **STK-D/STU-D/PRE-D/MAG-D-nn**, incohérences **INC-09→INC-18**, exigences **STK/STU/PRE/MAG-nn**, règles transverses **RG-25→RG-34**, modales **M-158→M-199**, graphiques **G-69→G-96**, lots **L21→L26** |

> **Volets précédents** : le volet 3 (*Stock, Stupéfiants, Qualité, Finance, Compte*) a cartographié ces 18 écrans et posé TAB-01→TAB-06, D-01→D-17, I-07→I-15, M-43→M-127, G-21→G-56, RG-01→RG-12, L8→L14. Le présent volet **approfondit** les trois écrans du produit et ne répète pas le volet 3 : il le complète, le corrige là où l'audit en direct contredit une hypothèse, et ajoute les constats transverses vérifiés par exécution.

---

## Sommaire

0. [Constats transverses vérifiés en direct](#0--constats-transverses-vérifiés-en-direct)
1. [Audit du réel](#1--audit-du-réel)
2. [Interfaces cibles](#2--interfaces-cibles)
3. [Modales M-158 → M-199](#3--modales-m-158--m-199)
4. [Graphiques G-69 → G-96](#4--graphiques-g-69--g-96)
5. [Télémétrie](#5--télémétrie)
6. [Exigences transverses RG-25 → RG-34](#6--exigences-transverses-rg-25--rg-34)
7. [Contrats d'API et schéma](#7--contrats-dapi-et-schéma)
8. [Critères d'acceptation](#8--critères-dacceptation)
9. [Plan de livraison L21 → L26](#9--plan-de-livraison-l21--l26)
- [Annexe A — Section → endpoints](#annexe-a--section--endpoints)
- [Annexe B — Ancres de test](#annexe-b--ancres-de-test)
- [Annexe C — Check-list](#annexe-c--check-list)

---

## 0 — Constats transverses vérifiés en direct

Ces cinq constats valent pour **toute l'application**, pas seulement pour ce module. Ils ont été établis en exécutant la pile de démonstration, pas en lisant le code. Le volet 6 y renvoie sans les répéter.

### 0.1 Neuf endpoints retournent `501` sur la pile de démonstration

L'API de démo répond `{"status":"error","message":"Route de démonstration absente du mock : …"}` avec le code **501**. Ces routes **existent toutes dans `backend/routes/api.php`** : c'est donc un trou du `mock-backend.mjs`, pas une absence de conception. Conséquence immédiate : dans l'aperçu en direct, ces boutons échouent.

| # | Méthode et chemin | Route Laravel | Appel frontend | Effet visible |
| --- | --- | --- | --- | --- |
| 1 | `POST /api/upload` | `routes/api.php:43` | `stock.tsx:346` · `stupefiants.tsx:174` · `preparations.tsx:136` · `zone-depot.tsx:58` | **Aucun téléversement de fichier ne fonctionne** dans toute l'application : bons de livraison, certificats, photos, justificatifs, étiquettes |
| 2 | `PUT /api/auth/profile` | `routes/api.php:53` | `compte.tsx:146` | « Enregistrer mon profil » échoue |
| 3 | `PUT /api/auth/password` | `routes/api.php:54` | `securite.tsx:224` | « Changer mon mot de passe » échoue |
| 4 | `POST /api/auth/devices/revoke-others` | `routes/api.php:58` | `securite.tsx:253` | « Révoquer les autres sessions » échoue |
| 5 | `POST /api/appareils-autorises/{id}/revoquer` | `routes/api.php:65` | `appareils.tsx:219` | La révocation d'un appareil autorisé échoue |
| 6 | `POST /api/appareils-autorises/{id}/reactiver` | `routes/api.php:66` | `appareils.tsx:229` | La réactivation échoue |
| 7 | `GET /api/officines/{id}/audit-logs/verifier-integrite` | `routes/api.php:84` | `journal.tsx:52` | **« Vérifier l'intégrité SHA-256 » échoue** — c'est la raison d'être de cet écran |
| 8 | `POST /api/comptabilite/ecritures` | `routes/api.php:257` | `comptabilite.tsx:176` | La saisie manuelle d'écriture échoue |
| 9 | `POST /api/comptabilite/ecritures/{id}/extourne` | `routes/api.php:258` | `comptabilite.tsx:195` | L'extourne échoue |

**Reproduction** (la pile tourne déjà) :

```bash
TOK=$(curl -s -X POST http://127.0.0.1:8001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"pharmacien@begpharma.bj","password":"Begpharma2026!"}' \
  | python3 -c 'import json,sys;print(json.load(sys.stdin)["temp_token"])')
TOK=$(curl -s -X POST http://127.0.0.1:8001/api/auth/verify-mfa \
  -H 'Content-Type: application/json' -d "{\"temp_token\":\"$TOK\",\"code\":\"123456\"}" \
  | python3 -c 'import json,sys;print(json.load(sys.stdin)["token"])')
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:8001/api/upload \
  -H "Authorization: Bearer $TOK"          # → 501
```

> **Correction d'une hypothèse du volet 3** : `GET /api/stocks/valorisation` fonctionne bien (`200`, `total: 72000`). Le chemin n'est **pas** préfixé par `/officines/{id}` (`stock.tsx:516`). Les routes du stock sont globales (`/stocks`, `/emplacements`, `/mouvements`, `/produits`) alors que presque tout le reste est préfixé par officine — voir INC-09.

**Exigence RG-25** : les 9 handlers manquants sont ajoutés à `mock-backend.mjs` avec le même contrat que le contrôleur Laravel correspondant, et un test d'équivalence parcourt la liste des routes Laravel et asserte que le mock ne renvoie jamais `501`.

### 0.2 Onze replis silencieux transforment une panne en déclaration de conformité

`grep -rn "\.catch(() =>" frontend/src` retourne 11 occurrences dans 6 écrans. Le schéma est le même partout : l'échec d'un `GET` est avalé et remplacé par une structure vide.

| Fichier:ligne | Requête | Repli | Ce que l'utilisateur voit |
| --- | --- | --- | --- |
| `stupefiants.tsx:299` | `GET /stupefiants/balance` | `null` | Une **balance permanente vide** — pour un registre de stupéfiants, c'est le pire mode de défaillance : l'écran affiche « aucun écart » alors que l'API a échoué |
| `stupefiants.tsx:303` | `GET /stupefiants/armoire` | `null` | Une armoire vide présentée comme conforme |
| `stupefiants.tsx:307` | `GET /stupefiants/ordonnancier` | `{ data: { data: [] } }` | Un ordonnancier vide |
| `stock.tsx:515` | `GET /stocks/peremptions` | 4 tableaux vides | « 0 lot à 1 mois, 0 périmé » |
| `stock.tsx:516` | `GET /stocks/valorisation` | `{ total: 0, par_produit: [] }` | « Valeur du stock : 0 FCFA » |
| `securite.tsx:119` | `GET /auth/mfa` | objet par défaut | Un état MFA inventé |
| `securite.tsx:131` | `GET /auth/devices` | liste vide | « Aucune session active » |
| `compte.tsx:149` · `parametres.tsx:146` | profil / paramètres | `null` | Formulaire vide |
| `index.tsx:51` · `index.tsx:210` | état MFA / officines | valeurs par défaut | Tableau de bord partiel |

**Exigence RG-26** : aucun `GET` réglementaire ne peut échouer silencieusement. Trois états distincts et visibles : **chargement**, **erreur** (avec le code et un bouton « Réessayer »), **vide réel** (serveur a répondu, la liste est genuinely vide). Un repli par défaut n'est toléré que sur les données purement décoratives, et il est alors explicitement marqué « donnée non disponible ».

### 0.3 La résilience hors ligne est décorative

`frontend/src/lib/offline/outbox.ts` (100 l.) est correct et bien conçu : file Dexie `begpharma-outbox`, `client_op_id` UUID pour l'idempotence, `saisie_locale_at` distinct de l'heure serveur, statut `conflit` jamais réécrit silencieusement, rejeu ordonné qui s'arrête à la première erreur réseau.

Mais :

| Constat | Preuve |
| --- | --- |
| `ajouter()` et `enregistrerHandler()` ne sont appelés **nulle part** dans le code applicatif | `grep -rn "enregistrerHandler\|\.ajouter(" frontend/src/` → uniquement `lib/offline/outbox.test.ts:11,18,19,31,37,40` |
| Le seul consommateur est `hooks/use-en-ligne.ts`, monté par `_authenticated/route.tsx`, qui appelle `synchroniser()` sur une file toujours vide et affiche `attente = 0` | `use-en-ligne.ts:10-11` |
| `POST /api/sync/push` existe (`SyncController::push`, 104 l.) et n'est **jamais appelé** | `grep -rn "sync/push" frontend/src/` → aucun résultat |
| `synchroniser()` saute les opérations sans handler **sans les supprimer** (`if (!h) continue;`) : si un écran mettait un jour une opération en file sans enregistrer de handler, la file grossirait indéfiniment | `outbox.ts:63` |

**Exigence RG-27** : ou bien le hors ligne est réellement implémenté — chaque mutation critique (pointage, relevé de température, comptage d'inventaire, écriture au registre de stupéfiants) passe par `outbox().ajouter()`, un handler est enregistré, et la synchronisation utilise `POST /api/sync/push` — ou bien l'indicateur « hors ligne » et le compteur d'attente sont retirés de l'interface. L'état actuel est le pire des deux : il annonce une capacité qui n'existe pas.

### 0.4 Deux préfixes d'URL coexistent — sans conséquence, mais à uniformiser

`api-client.ts:92-101` : `formatUrl` préfixe `/api` uniquement si l'URL ne commence pas déjà par `/api/`. Les deux écritures fonctionnent donc :

```
/api/officines/${id}/temperatures   → temperatures.tsx:206, locaux.tsx:115, documents.tsx:153
/officines/${id}/echeances          → echeances.tsx:105
/stupefiants                        → stupefiants.tsx:295
/produits, /stocks, /emplacements   → stock.tsx:501-516
```

Ce n'est pas un bogue. C'est une dette de lecture : rien ne distingue, à la lecture d'un écran, une route globale d'une route scopée par officine. **Exigence RG-28** : une convention écrite — toute route scopée par officine commence par `/api/officines/{officineId}/…`, toute route transverse par `/api/…` sans préfixe — appliquée uniformément, et les routes du stock alignées (INC-09).

### 0.5 Aucune ancre de test, aucun libellé centralisé

| Mesure | Résultat sur les 14 écrans audités (volets 5 et 6) |
| --- | --- |
| `data-testid` | **0** dans les 14 fichiers |
| `data-tour` | **0** dans les 14 fichiers (5 existent dans les écrans du volet 2) |
| Import de `@/lib/i18n/fr` | **4 écrans sur 14** (`appareils`, `compte`, `parametres`, `securite`) — les 10 autres, dont `stock.tsx` et ses 2 759 lignes, ont tous leurs libellés en dur dans le JSX |
| `<table>` HTML brut | 22 occurrences, 227 `<td>` sur les 14 écrans |
| `style={{…}}` inline | présent dans 8 des 14 écrans, dont des tableaux imprimables entiers (`locaux.tsx`, `stupefiants.tsx:385`, `non-conformites.tsx:218-220`, `comptabilite.tsx:221`, `appareils.tsx:343-379`, `compte.tsx:179-185`) |

**Exigence RG-24 du volet 4** reprise et étendue : ancres obligatoires, libellés dans `fr.ts`, tableaux via `TableauRegistre`, styles d'impression dans des feuilles dédiées.

---

## 1 — Audit du réel

### 1.1 Cartographie

| Zone | Fichier | Lignes | Sections | Endpoints réels | Modales | Graphiques |
| --- | --- | --- | --- | --- | --- | --- |
| Stock | `stock.tsx` | 2 759 | 11 | 13 (5 `GET`, 3 `POST`, 1 `PUT`, 4 `POST` d'action) | 4 `ModaleFiche` | **aucun** |
| Magasin avancé | `magasin-avance.tsx` | 816 | 3 blocs | 12 (inventaires 5, rappels 3, déchets 4) | 5 | aucun |
| Stupéfiants | `stupefiants.tsx` | 874 | 9 | 11 | 5 | **aucun** |
| Préparations | `preparations.tsx` | 746 | 6 | **3** | **1** | **aucun** |
| **Total** | | **5 195** | **29** | **39** | **15** | **0** |

Les 11 sections du stock : `vue-ensemble`, `produits`, `lots`, `emplacements`, `mouvements`, `reception`, `inventaires`, `peremptions`, `quarantaine`, `dechets`, `valorisation` (`stock.tsx`, `SECTIONS` + rendus `tab === "…"` aux lignes 634, 849, 1217, 1724, 1883, 2035, 2163, 2184, 2264, 2284, 2305).

Les 9 sections des stupéfiants : `registre`, `balance`, `ordonnancier`, `copies`, `inventaire`, `armoire`, `ecarts`, `destruction`, `rapports`.
Les 6 sections des préparations : `registre`, `formules`, `matieres`, `controles`, `etiquettes`, `rapports`.

### 1.2 Le bon modèle existe déjà — et n'est utilisé qu'une fois

`components/modules/modale.tsx` exporte un système déclaratif propre :

```
ModaleFiche({ ouvert, onFermer, titre, badge?, children, pied? })
ColonneFiche({ titre?, aide?, children })
Champ({ label, aide?, obligatoire?, children })
```

`stock.tsx:48` est **le seul écran** à l'importer, et il s'en sert pour ses 4 modales (réception `l.2390`, nouveau produit `l.2509`, changement de statut `l.2664`, quarantaine `l.2726`). Résultat : ces 4 modales sont les seules de l'application dont la structure est cohérente, avec champs obligatoires marqués et pied d'actions normalisé.

Ailleurs, chaque écran bricole : `documents.tsx`, `modeles.tsx` et `non-conformites.tsx` n'ont **aucun `<Dialog>`** (0 occurrence) et ouvrent des panneaux inline ; `comptabilite.tsx`, `journal.tsx` et `echeances.tsx` écrivent des `<table>` à la main avec `style={{}}`.

**Exigence STK-00** : `ModaleFiche` devient le composant unique de modale formulaire, promu dans `components/modules/`, enrichi de : état de soumission, erreur serveur affichée sans fermeture, `data-testid` automatique, bascule `Sheet` sous 640 px, et slot de signature. Les 15 modales des 4 fichiers de ce volet et les 30 du volet 4 s'y conforment.

### 1.3 Stock — défauts relevés

| Code | Fichier:ligne | Constat | Cible |
| --- | --- | --- | --- |
| **STK-D01** | `stock.tsx:515-516` | Les deux requêtes les plus sensibles de l'écran (péremptions, valorisation) avalent leur erreur et rendent des structures vides. Un `500` affiche « 0 lot périmé » et « 0 FCFA » | RG-26 |
| **STK-D02** | `stock.tsx:509` + `routes/api.php:179-187` | Les routes du stock ne sont **pas scopées par officine** (`/stocks`, `/emplacements`, `/mouvements`, `/produits`, `/stocks/alertes`, `/stocks/peremptions`, `/stocks/valorisation`) alors que les contrôleurs filtrent par l'officine du contexte. Le multi-officine du promoteur repose entièrement sur l'en-tête `X-Officine-Id` | Incertitude supprimée : routes scopées comme le reste, en-tête conservé en redondance |
| **STK-D03** | `routes/api.php:184` + aucun appel | `GET /stocks/alertes-peremption` (`StockLotController::alertesPeremption`) existe et n'est **jamais appelé** ; le frontend utilise `/stocks/alertes` et `/stocks/peremptions`. Deux méthodes font un travail voisin | Une seule route d'alertes ; la seconde est supprimée ou fusionnée |
| **STK-D04** | `routes/api.php` · `EmplacementController::store`, `MouvementStockController::store` | `POST /emplacements` et `POST /mouvements` existent côté serveur et ne sont **jamais appelés** : la section Emplacements (`stock.tsx:1724`) ne peut créer aucun emplacement, la section Mouvements (`l.1883`) ne peut saisir aucun mouvement manuel (ajustement, transfert interne, casse) | Deux modales de création branchées sur les routes existantes |
| **STK-D05** | `stock.tsx:2035-2162` | La réception (STO-05/06/07) **ne crée pas d'objet réception** : elle poste `POST /stocks` (création d'un lot) et la check-list de contrôle (`alerte_sanitaire_verifiee`, `emballage_intact`, `conformite_livraison`, `dates_conformes`, `chaine_froid_respectee` — `l.518`) n'est persistée nulle part. Aucun rapprochement commande → bon de livraison → facture | Entités `receptions` et `lignes_reception` ; la check-list est un enregistrement signé, pas un état local |
| **STK-D06** | `stock.tsx:346` | Le téléversement de bon de livraison passe par `POST /api/upload` → **`501` en démo** (§0.1). L'utilisateur perd la pièce jointe et le message d'erreur n'explique rien | §0.1 + RG-26 |
| **STK-D07** | `stock.tsx` — 4 `<table>`, 25 `<td>`, **0 graphique** sur 2 759 lignes | La valorisation, les péremptions et la rotation sont des notions quantitatives rendues uniquement en tableaux et en jauges CSS | G-69→G-78 |
| **STK-D08** | `stock.tsx:1393` | La bascule « Fiches / Tableau » pour les lots est un état local : le choix n'est ni partagé ni persisté, et les deux rendus dupliquent la même donnée avec des mises en forme divergentes | Préférence persistée par utilisateur ; une seule source de colonnes |
| **STK-D09** | `stock.tsx` (aucune pagination serveur) | `/stocks`, `/produits`, `/mouvements` sont chargés en une fois. Le commentaire `l.508` précise qu'on ne filtre pas sur `vendable` pour garder les lots bloqués visibles — juste sur le fond, mais sans pagination une officine à 20 000 références charge tout | Pagination serveur, filtres et page dans l'URL (RG-06 du volet 3) |
| **STK-D10** | `stock.tsx` — résidus `emerald`, `blue-700`, `amber-700`, `red-700` (ex. `l.2196-2230`) | Palette Tailwind générique mélangée à la charte `#0F3B27`/`#CFF1D2`/`#92FF5F` | I-01 du volet 2 : une seule palette, tokens nommés |
| **STK-D11** | `stock.tsx:1046` | Seule valeur littérale légitime relevée : `Groupe B Taxable (18%)` — **ce n'est pas un défaut**, c'est le taux de TVA béninois. À déplacer dans `parametres_fiscaux` pour ne pas le dupliquer, mais ne pas le « corriger » | Paramétré, pas codé en dur |
| **STK-D12** | `stock.tsx` · 0 `data-testid`, 0 `data-tour` | Aucun point d'accroche pour les tests ou le guide | Annexe B |

### 1.4 Stupéfiants — défauts relevés

| Code | Fichier:ligne | Constat | Cible |
| --- | --- | --- | --- |
| **STU-D01** | `stupefiants.tsx:299, 303, 307` | **Trois des quatre requêtes de l'écran avalent leur erreur** : balance, armoire, ordonnancier. Un registre de stupéfiants qui affiche « aucun écart » pendant une panne est un faux document | RG-26 — l'écran affiche une erreur bloquante, jamais une balance vide par défaut |
| **STU-D02** | `routes/api.php` · `StupefiantController::rapport` | `GET /stupefiants/rapport` existe (le contrôleur a 11 méthodes) et n'est **jamais appelé** : la section `rapports` de l'écran est donc statique alors que l'endpoint est écrit | Brancher la section sur l'endpoint existant |
| **STU-D03** | `stupefiants.tsx:385` | Le registre imprimable est un `<table style="width: 100%; border-collapse: collapse; font-size: 11px;">` construit en chaîne de caractères : 4 `<table>` bruts et 30 `<td>` sur l'écran | Tableau imprimable rendu par un composant, styles dans une feuille dédiée |
| **STU-D04** | `stupefiants.tsx:315, 320, 325, 330, 335, 340` | Six mutations existent (`viser`, création d'écriture, `rectificative`, `inventaire`, `declaration-vol`, `demande-destruction`) — c'est le bon socle. Mais **aucune ne passe par une signature vérifiée serveur** : `viser` accepte le visa sans contrôle du code personnel | RG-15 du volet 4 : `POST /signatures` avant tout visa |
| **STU-D05** | aucun contrôle d'append-only | Le registre des stupéfiants est un registre **coté et paraphé** : une écriture ne se modifie ni ne se supprime, elle se rectifie. `rectificative` existe, mais rien n'empêche un `UPDATE` direct en base — la table `registre_stupefiants` n'a ni trigger d'audit ni RLS (INC-01 du volet 4 généralisé) | Trigger + RLS + fonction d'inaltérabilité |
| **STU-D06** | section `copies` | La délivrance de copies d'un registre réglementaire n'est ni journalisée ni bornée : rien ne trace qui a imprimé quelle page, pour qui | Copie journalisée, horodatée, marquée « Copie non contrôlée » sauf validation |
| **STU-D07** | sections `ecarts`, `destruction` | L'écart et la destruction sont rendus mais leur chaîne de validation (double signature, témoin, procès-verbal) n'est pas outillée | PV de destruction signé par deux personnes, dont le pharmacien responsable |
| **STU-D08** | `stupefiants.tsx:174` | Téléversement de justificatif → `POST /api/upload` → **`501`** | §0.1 |

### 1.5 Préparations magistrales — défauts relevés

| Code | Fichier:ligne | Constat | Cible |
| --- | --- | --- | --- |
| **PRE-D01** | `preparations.tsx:255, 259, 269` | **3 endpoints pour 6 sections.** Seul le registre est réel (`GET /preparations`, `POST /preparations`, `POST /preparations/{id}/viser`). Les sections `formules`, `matieres`, `controles`, `etiquettes`, `rapports` sont des vitrines | 5 sections à outiller : `formules`, `matieres_premieres`, `controles`, `etiquettes`, `rapports` |
| **PRE-D02** | `preparations.tsx:526` | Le catalogue de formules est une constante locale : `{ nom: "Sirop de Tolu", compo: "Baume de Tolu 2 %, saccharose, eau purifiée", dlu: "14 jours" }`. Une formule magistrale et sa DLU sont des données réglementaires, pas un exemple d'interface | Table `formules_preparation` versionnée et approuvée |
| **PRE-D03** | `preparations.tsx` — **1 seul `<Dialog>`** | Pour un module qui exige : choix de formule, pesée par matière première, contrôle avant/libération, génération d'étiquette, rapport. Une modale pour cinq besoins | M-186→M-193 |
| **PRE-D04** | section `etiquettes` | L'étiquette d'une préparation magistrale porte des mentions obligatoires (nom, composition, DLU, numéro de préparation, nom du patient, posologie, mentions de conservation, identifiant du préparateur). Aucune génération réelle n'est outillée, alors que `jspdf` et `html2canvas` sont déjà en dépendances | Génération locale, format défini, impression journalisée |
| **PRE-D05** | section `matieres` | Aucune traçabilité des matières premières utilisées : une préparation doit consommer des **lots** de matières premières, avec décrément FEFO et lien vers le registre. Aujourd'hui rien ne relie une préparation au stock | `lignes_preparation` référencant `stock_lots`, décrément dans la même transaction |
| **PRE-D06** | `preparations.tsx:136` | Téléversement → `POST /api/upload` → **`501`** | §0.1 |

### 1.6 Magasin avancé — inventaires, rappels, déchets

`magasin-avance.tsx` est le module le plus sain du volet : 12 endpoints réels, 5 modales, un cycle complet par objet.

| Objet | Endpoints | Cycle | Constat |
| --- | --- | --- | --- |
| Inventaires | `GET /inventaires` (`l.133`), `GET /inventaires/{id}` (`l.140`), `POST /inventaires` (`l.151`), `POST /inventaires/{id}/lignes/{ligneId}/compter` (`l.165`), `POST /inventaires/{id}/valider` (`l.177`) | campagne → comptage ligne à ligne → validation | **Conforme.** Manque : la double validation du titulaire annoncée dans l'en-tête de `stock.tsx:2172` (« double validation obligatoire du titulaire ») n'est pas implémentée — `valider` est un appel simple |
| Rappels | `GET /rappels` (`l.445`), `POST /rappels` (`l.451`), `POST /rappels/{id}/cloturer` (`l.464`) | avis → clôture | Manque l'effet automatique attendu : un avis de rappel doit mettre les lots concernés en quarantaine et **bloquer leur vente** (STO-14, consigne explicite du fichier `on a pas besoin de mettre.txt`). Rien ne le fait |
| Déchets | `GET /dechets` (`l.642`), `GET /stocks?vendable=false` (`l.648`), `POST /dechets` (`l.654`), `POST /dechets/{id}/detruire` (`l.669`) | lot non vendable → lot de déchet → destruction | Manque le bordereau de destruction (CERFA équivalent béninois, filière, témoin, PV signé) |

| Code | Constat | Cible |
| --- | --- | --- |
| **MAG-D01** | La double validation d'inventaire est annoncée dans l'interface (`stock.tsx:2172`) mais absente du code | Deux signatures distinctes, dont au moins un pharmacien |
| **MAG-D02** | Un avis de rappel ne déclenche ni quarantaine automatique ni blocage de vente | Effet transactionnel : `POST /rappels` → lots appariés en quarantaine + `vendable = false` + NC pré-remplie |
| **MAG-D03** | L'écart d'inventaire est constaté mais n'ouvre aucune analyse : pas de justification contradictoire, pas de rattachement à une NC | Écart ≥ seuil → justification obligatoire + NC pré-remplie |
| **MAG-D04** | La destruction de déchets n'a ni bordereau ni filière ni témoin | `POST /dechets/{id}/detruire` exige bordereau, filière, témoin, signature |
| **MAG-D05** | `magasin-avance.tsx` : 1 `<table>` brut, 0 `data-testid` | `TableauRegistre` + ancres |

### 1.7 Incohérences structurelles

| Code | Constat | Impact |
| --- | --- | --- |
| **INC-09** | Deux conventions d'URL cohabitent : routes globales pour le stock et les stupéfiants (`/stocks`, `/produits`, `/stupefiants`, `/preparations`, `/emplacements`, `/mouvements`, `/inventaires`, `/rappels`, `/dechets`, `/comptabilite`, `/audit-logs`) et routes scopées pour tout le reste (`/officines/{id}/…`). Certaines existent **dans les deux formes** : `GET /audit-logs` et `GET /officines/{id}/audit-logs` (`routes/api.php:84-85`), `POST /echeances` et `POST /officines/{id}/echeances` | L'isolation multi-officine dépend d'un en-tête plutôt que du chemin ; deux routes pour un même traitement divergent nécessairement un jour |
| **INC-10** | `GET /stocks/alertes-peremption` et `GET /stocks/alertes` coexistent ; le second est utilisé, le premier jamais | Méthode morte dans un contrôleur de 422 lignes |
| **INC-11** | Deux routes d'écriture pour les échéances (`POST /echeances`, `POST /officines/{id}/echeances`) ; le frontend utilise la scopée (`echeances.tsx:1422`) | La route non scopée est un chemin d'écriture non utilisé mais exposé |
| **INC-12** | `registre_stupefiants`, `stock_lots`, `mouvements_stock`, `inventaires`, `lignes_inventaire`, `lot_dechets`, `avis_rappels`, `registre_preparations`, `produits`, `emplacements` : **aucune de ces tables n'a de trigger d'audit ni de politique RLS** (les 11 triggers et 10 politiques couvrent `officines`, `utilisateurs_officines`, `officine_parametres`, `audit_logs`, `appareils_autorises`, `approbations_documents`, `fichiers_documents`, `suivis_documentaires`, `alertes_peremption`, `inscriptions_ordre`) | Tout le cycle de vie du produit — du lot à la destruction — est modifiable sans trace. C'est le périmètre le plus inspecté du guide BPD |
| **INC-13** | Les seuils de péremption sont exprimés en **trois granularités différentes** selon l'endroit : `a_6_mois / a_3_mois / a_1_mois / perimes` dans l'API et les KPI (`stock.tsx:515`, `2196-2260`), et `90j / 45j / 10j / veille / bloqué` dans la consigne métier (`on a pas besoin de mettre.txt`) | Deux jeux de seuils pour la même notion ; un lot à 60 jours est « à 3 mois » pour l'un et entre 45 et 90 jours pour l'autre |
| **INC-14** | `zone-depot.tsx:30` accepte `.jpg,.jpeg,.png,.webp,.heic,.pdf,.csv,.xlsx` par défaut, sans contrôle de taille ni de type côté mock (`POST /api/upload` → `501`), alors que `UploadController` (154 l.) valide côté Laravel | Le comportement en démo et en production divergent sur la contrainte la plus visible pour l'utilisateur |
| **INC-15** | `courriels-peremption.tsx` fait 10 lignes et est monté dans la section Péremptions (`stock.tsx:2192`) : la fonction d'envoi de courriels d'alerte de péremption est une coquille | Soit la fonction est implémentée (destinataires, modèle, journal d'envoi), soit elle est retirée de l'interface |
| **INC-16** | La valorisation (`StockLotController::valorisation`) renvoie `{ total, par_produit }` sans méthode de valorisation déclarée. Le stock d'une pharmacie se valorise au coût d'acquisition, au dernier coût, ou au prix de vente — le choix change le bilan | Méthode explicite, paramétrable, et cohérente avec la comptabilité SYSCOHADA (volet 6) |
| **INC-17** | `stock.tsx` n'a **aucun `useSearch`/`validateSearch`** : les 11 sections et les 9 sous-sections de produits/lots sont en état local. Un inspecteur qui demande « montrez-moi les lots en quarantaine » ne peut pas recevoir un lien | TAB-02/TAB-03 du volet 3 appliqués |
| **INC-18** | Les 3 écrans de ce volet totalisent **0 graphique** pour 4 379 lignes et 26 sections, alors que `recharts` est en dépendances et déjà utilisé par 3 autres écrans | G-69→G-96 |

### 1.8 Ce qui est déjà correct — à conserver

| Élément | Preuve | Pourquoi |
| --- | --- | --- |
| Le stock contrôlé par le serveur, avec statuts explicites | `STATUTS` : `commercialisable`, `en_attente_controle`, `a_evaluer`, `quarantaine`, `attente_retour`, `rejete`, `dechet`, `epuise` (`stock.tsx`) | Modèle d'états juste et complet ; il manque seulement la traçabilité des transitions |
| Les lots bloqués restent visibles | commentaire `stock.tsx:508` : « Les lots bloqués (quarantaine, rejetés, déchets) doivent rester visibles : on ne filtre pas sur `vendable` » | Décision métier exacte — un lot bloqué qu'on ne voit plus est un lot oublié |
| Check-list de réception à 5 contrôles | `stock.tsx:518` : `alerte_sanitaire_verifiee`, `emballage_intact`, `conformite_livraison`, `dates_conformes`, `chaine_froid_respectee` | Le bon contenu ; il manque seulement la persistance et la signature (STK-D05) |
| Le cycle complet des inventaires | `magasin-avance.tsx:133-177` | Campagne → comptage → validation : la structure est juste |
| Les 11 méthodes du contrôleur de stupéfiants | `StupefiantController` : `index`, `store`, `rectificative`, `viser`, `balance`, `inventaire`, `ordonnancier`, `armoire`, `declarationVol`, `demandeDestruction`, `rapport` | Le socle réglementaire le plus complet du dépôt ; il manque la signature vérifiée et le branchement de `rapport` |
| `ModaleFiche` / `Champ` / `ColonneFiche` | `modules/modale.tsx:16, 64, 89` | Le bon modèle de formulaire, à généraliser (STK-00) |
| `ZoneDepot` avec types acceptés et `uploadFile` | `ui/zone-depot.tsx:27-58` | Bon composant ; il lui faut un backend de démo |
| Seuils de péremption en 4 niveaux avec code couleur | `stock.tsx:2196-2260` (6 mois, 3 mois, 1 mois, périmé) | Bonne lisibilité ; à aligner sur les seuils métier (INC-13) |

---

## 2 — Interfaces cibles

### 2.1 Stock — STK-01 → STK-40

#### Vue d'ensemble (`?tab=vue-ensemble`)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Stock & Magasin                            Officine · 12 nov. 2026 · 14:32 │
│ [Alerte 3] [Quarantaine 2] [Périmés 0] [Ruptures 1]   Valeur : 4 812 500 F │
├────────────────────────────────────────────────────────────────────────────┤
│ Module Stock                       [ Choisir une section…            ▾ ]   │
├────────────────────────────────────────────────────────────────────────────┤
│  ▸ Valeur du stock (G-69)        │  ▸ Rotation & ABC (G-70)                │
│    4 812 500 FCFA · coût d'acq.  │    A 12% réf. / 78% valeur               │
│    [courbe 30 jours]             │    [Pareto]                              │
│  ▸ Péremptions (G-71)            │  ▸ Alertes du jour                       │
│    >90j 41 · 45-90j 12 · 10-45j 5│    · Paracetamol 500 mg — lot L2, 38 j   │
│    ≤10j 2 · périmés 0            │    · Rupture : Amoxicilline 250 mg       │
│    [pyramide]                    │    · Quarantaine : lot L7 (rappel …)     │
├────────────────────────────────────────────────────────────────────────────┤
│ Derniers mouvements (10) · [Tout voir]        État des réceptions (3 en att.)│
└────────────────────────────────────────────────────────────────────────────┘
```

| Code | Exigence |
| --- | --- |
| **STK-01** | Les 6 indicateurs de tête proviennent de `GET /stocks/alertes` et `GET /stocks/valorisation` ; aucun n'est recalculé côté client à partir de listes partielles |
| **STK-02** | L'état d'erreur est distinct de l'état vide (RG-26) : une valorisation indisponible affiche « Valeur non disponible — réessayer », jamais « 0 FCFA » |
| **STK-03** | Quatre blocs graphiques : G-69 valeur du stock sur 30 jours, G-70 Pareto ABC, G-71 pyramide des péremptions, G-72 derniers mouvements |
| **STK-04** | Chaque indicateur est un lien profond vers la section filtrée correspondante (`?tab=peremptions&seuil=10j`, `?tab=quarantaine`, `?tab=produits&alerte=rupture`) |

#### Produits (`?tab=produits`)

| Code | Exigence |
| --- | --- |
| **STK-05** | Pagination serveur (25/50/100), recherche debounce 200 ms sur nom, DCI, code CIP, laboratoire ; filtres par groupe fiscal, forme, statut de vente ; le tout dans l'URL |
| **STK-06** | Les 9 sous-sections produits (`SECTIONS` + états locaux) deviennent des valeurs d'URL : `?tab=produits&vue=tous|rupture|taxable|…` |
| **STK-07** | Tableau via `TableauRegistre` : colonnes Code · Dénomination/DCI · Forme · Laboratoire · Groupe fiscal · Stock · Seuil d'alerte · Prix · Statut · Actions |
| **STK-08** | Création et modification par `ModaleFiche` (M-158) ; le groupe fiscal est une liste close issue de `parametres_fiscaux`, pas un libellé contenant « 18% » (STK-D11) |
| **STK-09** | Fiche produit : historique des lots, des mouvements, des prix, des ruptures ; lien vers les dispensations (traçabilité produit → patient dans le respect des rôles) |
| **STK-10** | Seuil d'alerte de rupture par produit, avec proposition de commande |

#### Lots & FEFO (`?tab=lots`)

| Code | Exigence |
| --- | --- |
| **STK-11** | Tri **FEFO par défaut et non désactivable** : `date_peremption ASC`, puis `date_reception ASC`. Le tri FEFO est la règle d'art. 5.2 ; toute autre vue est un filtre explicite, jamais un tri manuel |
| **STK-12** | Les 9 statuts (`STATUTS`) sont rendus avec un badge de couleur unique par statut, et chaque transition est **motivée et signée** : `commercialisable → quarantaine` (motif obligatoire), `quarantaine → commercialisable` (levée signée), `→ rejete`, `→ attente_retour`, `→ dechet`, `→ epuise` (automatique) |
| **STK-13** | L'historique des transitions d'un lot est affiché dans sa fiche : date, ancien statut, nouveau statut, motif, acteur, signature |
| **STK-14** | Jauge de quantité restante, compte à rebours de péremption avec les seuils **unifiés** (INC-13) : `> 90 j`, `45–90 j`, `10–45 j`, `≤ 10 j`, `veille`, `périmé/bloqué` |
| **STK-15** | Un lot périmé ou bloqué ne peut être ni vendu ni dispensé : le contrôle est **serveur**, dans la transaction de vente, pas seulement dans l'affichage |
| **STK-16** | La bascule fiches/tableau (STK-D08) est une préférence persistée ; les deux vues partagent la même définition de colonnes |

#### Emplacements (`?tab=emplacements`)

| Code | Exigence |
| --- | --- |
| **STK-17** | Création d'un emplacement branchée sur `POST /emplacements` (**existant, jamais appelé** — STK-D04) : code, libellé, type (`comptoir`, `reserve`, `enceinte_refrigeree`, `armoire_stupefiants`, `quarantaine`, `dechets`), capacité, zone de température |
| **STK-18** | Un emplacement de type `enceinte_refrigeree` est lié à la zone de température correspondante (volet 6) : ses relevés apparaissent dans sa fiche |
| **STK-19** | Un emplacement de type `armoire_stupefiants` est lié au registre des stupéfiants : son contenu est rapproché de la balance permanente |
| **STK-20** | Vue du contenu par emplacement, avec valorisation et alertes |

#### Mouvements (`?tab=mouvements`)

| Code | Exigence |
| --- | --- |
| **STK-21** | Saisie manuelle branchée sur `POST /mouvements` (**existant, jamais appelé**) : type (`ajustement`, `transfert_interne`, `casse`, `sortie_determinée`, `retour_fournisseur`), lot, quantité, motif obligatoire, signature |
| **STK-22** | Tout mouvement manuel est une **écriture motivée et signée** ; il ne modifie jamais un mouvement existant |
| **STK-23** | Filtres : période, type, lot, produit, emplacement, acteur ; pagination serveur |
| **STK-24** | Chaque mouvement indique sa **source** : vente, dispensation, réception, inventaire, transfert inter-officine, saisie manuelle, correction |

#### Réception (`?tab=reception`)

| Code | Exigence |
| --- | --- |
| **STK-25** | Entités `receptions` et `lignes_reception` créées (STK-D05). Une réception porte : fournisseur, numéro de bon de livraison, date, transporteur, conditions de transport, chaîne du froid, check-list des 5 contrôles, pièces jointes, statut (`en_attente`, `controlee`, `acceptee`, `refusee`, `partiellement_acceptee`) |
| **STK-26** | La check-list existante (`alerte_sanitaire_verifiee`, `emballage_intact`, `conformite_livraison`, `dates_conformes`, `chaine_froid_respectee`) est **persistée, datée et signée** |
| **STK-27** | Chaque ligne crée un lot avec `date_peremption`, `quantite`, `prix_unitaire`, `numero_lot`, `emplacement` ; le lot naît en `en_attente_controle` et passe à `commercialisable` à la validation de la réception |
| **STK-28** | Un contrôle en échec (`chaine_froid_respectee = false` ou `emballage_intact = false`) met la ligne en quarantaine et ouvre une NC pré-remplie (`BoutonCreerNC`) |
| **STK-29** | Rapprochement commande → bon de livraison → facture : écarts de quantité et de prix signalés, facture transmise à la comptabilité (volet 6) |
| **STK-30** | Le téléversement du BL passe par `POST /api/upload` — **à rendre fonctionnel en démo** (§0.1) |

#### Inventaires (`?tab=inventaires`)

| Code | Exigence |
| --- | --- |
| **STK-31** | Cycle existant conservé (`magasin-avance.tsx:133-177`), **double validation ajoutée** (MAG-D01) : compteur puis validateur, deux personnes distinctes, dont au moins un pharmacien, deux signatures |
| **STK-32** | Écart par ligne : quantité théorique, quantité comptée, écart, valeur de l'écart, **justification contradictoire obligatoire** au-delà d'un seuil paramétrable |
| **STK-33** | Un écart non justifié ouvre une NC pré-remplie avec analyse 5M |
| **STK-34** | Le comptage est possible **hors ligne** (RG-27) : c'est le cas d'usage le plus crédible du mode dégradé, une réserve sans réseau |
| **STK-35** | PV d'inventaire imprimable : campagne, périmètre, dates, compteurs, validateurs, écarts, justifications, signatures |

#### Péremptions (`?tab=peremptions`)

| Code | Exigence |
| --- | --- |
| **STK-36** | Seuils unifiés (INC-13) et paramétrables : `90 j`, `45 j`, `10 j`, veille, bloqué. L'API actuelle (`a_6_mois`, `a_3_mois`, `a_1_mois`, `perimes`) est alignée ou mappée explicitement |
| **STK-37** | Alertes de péremption : `alertes_peremption` (table existante, déjà sous RLS et trigger d'audit) alimentée par une tâche planifiée, avec destinataires et journal d'envoi |
| **STK-38** | `courriels-peremption.tsx` (10 lignes, INC-15) : soit implémenté (modèle, destinataires, journal), soit retiré de l'interface |
| **STK-39** | Un lot périmé bascule automatiquement en `dechet` et alimente la section Déchets ; le retrait intervient **dès la date de péremption**, conformément à la consigne métier |

#### Quarantaine & rappels (`?tab=quarantaine`)

| Code | Exigence |
| --- | --- |
| **STK-40** | Un avis de rappel (`POST /rappels`, existant) déclenche **dans la même transaction** : appariement des lots concernés, passage en quarantaine, `vendable = false`, retrait du comptoir, NC pré-remplie, notification au responsable (MAG-D02, STO-14) |
| **STK-41** | La levée de quarantaine (`POST /stocks/{id}/lever-quarantaine`, existant) exige motif, décision (`retour_fournisseur`, `liberation`, `destruction`) et signature |
| **STK-42** | Registre des quarantaines : date de mise, motif, décision, date de levée, acteur, signature — inaltérable |

#### Déchets (`?tab=dechets`) et Valorisation (`?tab=valorisation`)

| Code | Exigence |
| --- | --- |
| **STK-43** | Destruction : bordereau, filière (`incinération`, `retour_fournisseur`, `collecteur_agrée`), date, témoin, **deux signatures** dont le pharmacien responsable (MAG-D04) |
| **STK-44** | Registre des déchets inaltérable, exportable, avec valorisation du détruit |
| **STK-45** | Valorisation : méthode déclarée et paramétrable (INC-16) — coût d'acquisition, dernier coût, prix de vente — cohérente avec le bilan SYSCOHADA du volet 6 |
| **STK-46** | Valorisation par produit, par emplacement, par statut, par tranche de péremption ; historique sur 12 mois (G-69) |

### 2.2 Stupéfiants — STU-01 → STU-22

| Code | Exigence |
| --- | --- |
| **STU-01** | Le registre est **coté et paraphé** : numérotation continue des écritures, aucune suppression, aucune modification. Une erreur se rectifie par une écriture rectificative (`POST /stupefiants/{id}/rectificative`, existant) qui référence l'écriture d'origine et porte motif + signature |
| **STU-02** | Trigger d'audit et RLS sur `registre_stupefiants` + fonction d'inaltérabilité refusant `UPDATE`/`DELETE` (INC-12, STU-D05) |
| **STU-03** | Toute écriture exige : date, nom du patient (ou ordonnance référencée), prescripteur, dénomination, forme, quantité en **toutes lettres et en chiffres**, solde après écriture, nom et signature du pharmacien |
| **STU-04** | **Balance permanente** (`GET /stupefiants/balance`, existant et fonctionnel — vérifié `200`) : entrée, sortie, solde théorique, solde compté, écart. **Tout écart non nul est critique** : alerte immédiate, NC obligatoire, déclaration à l'autorité au-delà d'un seuil |
| **STU-05** | La balance ne peut jamais s'afficher vide par défaut (STU-D01) : si l'appel échoue, l'écran affiche une erreur bloquante |
| **STU-06** | **Ordonnancier** (`GET /stupefiants/ordonnancier`, existant) : registre chronologique des ordonnances, numéro d'ordre, date, prescripteur, patient, produits, quantité, renouvellements, date limite |
| **STU-07** | **Armoire** (`GET /stupefiants/armoire`, existant) : contenu physique attendu, fermé à clé, accès restreint nominativement ; rapprochement armoire ↔ balance |
| **STU-08** | **Inventaire des stupéfiants** (`POST /stupefiants/inventaire`, existant) : comptage contradictoire à deux personnes, PV signé, écart justifié |
| **STU-09** | **Déclaration de vol ou de perte** (`POST /stupefiants/declaration-vol`, existant) : date de constat, produits et quantités, circonstances, dépôt de plainte, notification à l'autorité sanitaire, PV |
| **STU-10** | **Demande de destruction** (`POST /stupefiants/demande-destruction`, existant) : autorisation préalable, témoin, PV, filière |
| **STU-11** | **Visa** (`POST /stupefiants/{id}/viser`, existant) soumis à signature vérifiée serveur (STU-D04, RG-15 du volet 4) |
| **STU-12** | Section **Rapports** branchée sur `GET /stupefiants/rapport` — **existant, jamais appelé** (STU-D02) : état mensuel, mouvements par produit, écarts, inventaires |
| **STU-13** | Section **Copies** : toute copie d'un registre réglementaire est journalisée (qui, quand, quelle portée, pour quel destinataire) et porte la mention « Copie non contrôlée » sauf validation nominative (STU-D06) |
| **STU-14** | Section **Écarts** : liste des écarts constatés, gravité, analyse, NC rattachée, statut de résolution |
| **STU-15** | Conservation : le registre des stupéfiants est conservé **10 ans** ; le verrou de conservation du volet 3 (RG-02) s'applique |
| **STU-16** | Accès restreint par rôle : seuls les pharmaciens et le personnel habilité voient les données nominatives ; tout accès est journalisé |
| **STU-17** | Le registre imprimable est rendu par un composant, pas par une chaîne HTML avec `style` inline (STU-D03) |
| **STU-18** | Lien vers le stock : un mouvement de stupéfiant décrémenté le lot correspondant (FEFO) dans la même transaction |
| **STU-19** | Lien vers la dispensation : une délivrance de stupéfiant génère automatiquement l'écriture au registre |
| **STU-20** | Le téléversement de justificatif fonctionne (§0.1) |
| **STU-21** | Numérotation continue par année civile, remise à zéro au 1er janvier avec report du solde |
| **STU-22** | Export du registre sur une période, journalisé, avec cartouche et mention de conformité |

### 2.3 Préparations magistrales — PRE-01 → PRE-18

| Code | Exigence |
| --- | --- |
| **PRE-01** | Registre des préparations (`GET`/`POST /preparations`, existants) : numéro chronologique, date, formule, forme, quantité, préparateur, contrôleur, patient ou destination, DLU, numéro de lot de la préparation |
| **PRE-02** | Table `formules_preparation` versionnée et approuvée (PRE-D02) : dénomination, composition qualitative et quantitative, mode opératoire, forme galénique, DLU, conditions de conservation, références, statut d'approbation, indice de révision |
| **PRE-03** | Le catalogue de formules ne contient **aucune valeur en dur** dans le composant ; il est lu depuis l'API |
| **PRE-04** | Table `matieres_premieres` : dénomination, grade pharmaceutique, fournisseur, lots rattachés au stock, date de péremption, certificat d'analyse, statut |
| **PRE-05** | Une préparation **consomme des lots** de matières premières (`lignes_preparation` → `stock_lots`), avec décrément FEFO dans la même transaction (PRE-D05) |
| **PRE-06** | Pesée enregistrée par matière première : quantité théorique, quantité pesée, écart, balance utilisée, étalonnage de la balance à jour (lien volet 6, Locaux & Matériel) |
| **PRE-07** | Contrôles : avant libération (aspect, pH, masse, volume, identité), libération par le pharmacien avec signature vérifiée |
| **PRE-08** | Une préparation non libérée ne peut être dispensée |
| **PRE-09** | **Étiquette** générée localement (PRE-D04) avec les mentions obligatoires : nom de l'officine, nom de la préparation, composition qualitative et quantitative, forme, numéro de préparation, numéro de lot, date de préparation, DLU, conditions de conservation, nom du patient le cas échéant, posologie, mentions de précaution, identifiant du préparateur |
| **PRE-10** | L'étiquette est imprimable aux formats réels (flacon, pot, sachet, tube) et son impression est journalisée |
| **PRE-11** | Section **Rapports** : nombre de préparations par période et par forme, taux de conformité des contrôles, écarts de pesée, matières premières consommées |
| **PRE-12** | Visa (`POST /preparations/{id}/viser`, existant) soumis à signature vérifiée serveur |
| **PRE-13** | Registre inaltérable : trigger d'audit + RLS sur `registre_preparations` (INC-12) |
| **PRE-14** | Conservation 10 ans |
| **PRE-15** | Lien vers les non-conformités : un contrôle non conforme ouvre une NC pré-remplie |
| **PRE-16** | Lien vers les locaux : la préparation exige un local et un matériel qualifiés ; l'écran affiche l'état de qualification du local au moment de la préparation |
| **PRE-17** | Le téléversement (certificat d'analyse, photo d'étiquette) fonctionne (§0.1) |
| **PRE-18** | Cinq modales au lieu d'une (PRE-D03) : M-186→M-193 |

---

## 3 — Modales M-158 → M-199

Règles communes : `ModaleFiche` comme socle (STK-00) ; bureau `Dialog`, mobile `Sheet` < 640 px ; un refus serveur ne ferme jamais la modale ; `data-testid` sur chaque modale ; toute écriture réglementaire exige une signature vérifiée serveur.

### 3.1 Stock (M-158 → M-177)

| Code | Modale | Déclencheur | Champs clés | Effet serveur |
| --- | --- | --- | --- | --- |
| **M-158** | Nouveau produit / modification | Section Produits | Dénomination, DCI, forme, laboratoire, groupe fiscal (liste close), seuil d'alerte, prix | `POST /produits` (existant) |
| **M-159** | Fiche produit | Ligne du tableau | 5 onglets : identité, lots, mouvements, prix, historique | `GET /produits/{id}` |
| **M-160** | Réception de livraison | Section Réception | Fournisseur, n° BL, date, transporteur, conditions de transport, chaîne du froid, 5 contrôles, pièces jointes, lignes | `POST /receptions` (nouveau) + `POST /stocks` |
| **M-161** | Ligne de réception | M-160 | Produit, numéro de lot, quantité, péremption, prix unitaire, emplacement, décision par ligne | inclus dans M-160 |
| **M-162** | Validation ou refus de réception | Liste des réceptions | Décision, motifs par ligne, signature | `PUT /receptions/{id}/valider` |
| **M-163** | Rapprochement commande / BL / facture | M-160, liste | Écarts de quantité et de prix, décision, transmission en comptabilité | `POST /receptions/{id}/rapprocher` |
| **M-164** | Fiche de lot | Ligne de lot | Identité, quantités, emplacement, historique des statuts, mouvements, documents | `GET /stocks/{id}` |
| **M-165** | Changement de statut de lot | Fiche de lot, tableau | Nouveau statut, motif obligatoire, signature | `PUT /stocks/{id}/statut` (existant) |
| **M-166** | Mise en quarantaine | Fiche de lot, alerte | Motif, lien vers un avis de rappel ou une NC, durée attendue, signature | `POST /stocks/{id}/quarantaine` (existant) |
| **M-167** | Levée de quarantaine | Liste des quarantaines | Décision (`retour_fournisseur`, `liberation`, `destruction`), motif, signature | `POST /stocks/{id}/lever-quarantaine` (existant) |
| **M-168** | Nouvel emplacement | Section Emplacements | Code, libellé, type, capacité, zone de température | `POST /emplacements` (**existant, jamais appelé**) |
| **M-169** | Fiche emplacement | Ligne | Contenu, valorisation, relevés de température si enceinte, mouvements | `GET /emplacements/{id}` (existant) |
| **M-170** | Mouvement manuel | Section Mouvements | Type, lot, quantité, motif obligatoire, signature | `POST /mouvements` (**existant, jamais appelé**) |
| **M-171** | Fiche mouvement | Ligne | Origine, destination, source, acteur, pièce justificative | `GET /mouvements/{id}` |
| **M-172** | Nouvelle campagne d'inventaire | Section Inventaires | Type (annuel, tournant, inopiné), périmètre, date, équipe, double validateur | `POST /inventaires` (existant) |
| **M-173** | Comptage d'une ligne | Campagne | Quantité théorique masquée ou affichée selon le mode, quantité comptée, commentaire | `POST /inventaires/{id}/lignes/{ligneId}/compter` (existant) |
| **M-174** | Justification d'écart | Campagne, ligne en écart | Écart, justification contradictoire, analyse 5M, NC rattachée, signature | `POST /inventaires/{id}/lignes/{ligneId}/justifier` (nouveau) |
| **M-175** | Validation d'inventaire (double) | Campagne | Deux signatures distinctes, PV généré | `POST /inventaires/{id}/valider` (existant) + `POST /signatures` |
| **M-176** | Avis de rappel | Section Quarantaine | Autorité émettrice, référence, produits et lots concernés, motif, décision, effet automatique sur les lots | `POST /rappels` (existant) |
| **M-177** | Destruction de déchet | Section Déchets | Bordereau, filière, date, témoin, deux signatures | `POST /dechets/{id}/detruire` (existant) |

### 3.2 Stupéfiants (M-178 → M-185)

| Code | Modale | Champs clés | Effet serveur |
| --- | --- | --- | --- |
| **M-178** | Écriture au registre | Date, patient ou ordonnance, prescripteur, produit, quantité en lettres et en chiffres, solde, signature | `POST /stupefiants` (existant) |
| **M-179** | Écriture rectificative | Écriture d'origine, motif, nouvelle valeur, signature | `POST /stupefiants/{id}/rectificative` (existant) |
| **M-180** | Visa d'une écriture | Code personnel vérifié serveur | `POST /stupefiants/{id}/viser` + `POST /signatures` |
| **M-181** | Inventaire des stupéfiants | Deux compteurs, contenu attendu, contenu compté, écarts, PV, deux signatures | `POST /stupefiants/inventaire` (existant) |
| **M-182** | Déclaration de vol ou de perte | Date de constat, produits, quantités, circonstances, plainte, notification autorité, PV | `POST /stupefiants/declaration-vol` (existant) |
| **M-183** | Demande de destruction | Produits, quantités, motif, autorisation, témoin, filière | `POST /stupefiants/demande-destruction` (existant) |
| **M-184** | Consultation de la balance permanente | Période, produit, rapprochement armoire, écart, NC | `GET /stupefiants/balance` (existant) |
| **M-185** | Copie du registre | Période, portée, destinataire, motif, mention « Copie non contrôlée », journalisation | `POST /stupefiants/copies` (nouveau) |

### 3.3 Préparations (M-186 → M-193)

| Code | Modale | Champs clés | Effet serveur |
| --- | --- | --- | --- |
| **M-186** | Nouvelle préparation | Formule (catalogue), forme, quantité, destination, DLU calculée, numéro de lot | `POST /preparations` (existant) |
| **M-187** | Choix et consultation d'une formule | Composition, mode opératoire, DLU, conservation, indice de révision, statut d'approbation | `GET /formules-preparation` (nouveau) |
| **M-188** | Pesée des matières premières | Par matière : lot (FEFO), quantité théorique, quantité pesée, écart, balance, étalonnage | `POST /preparations/{id}/pesee` (nouveau) |
| **M-189** | Contrôle avant libération | Aspect, pH, masse, volume, identité, conformité, signature | `POST /preparations/{id}/controles` (nouveau) |
| **M-190** | Libération par le pharmacien | Décision, réserve, code personnel vérifié | `POST /preparations/{id}/viser` (existant) |
| **M-191** | Génération d'étiquette | Format (flacon, pot, sachet, tube), mentions obligatoires, aperçu, impression | `POST /preparations/{id}/etiquette` (nouveau) |
| **M-192** | Matière première | Dénomination, grade, fournisseur, certificat d'analyse, lots | `POST /matieres-premieres` (nouveau) |
| **M-193** | Rapport de préparation | Période, forme, préparateur, export | `GET /preparations/rapport` (nouveau) |

### 3.4 Transverses (M-194 → M-199)

| Code | Modale | Rôle |
| --- | --- | --- |
| **M-194** | Signature par code personnel | Composant partagé refondu (M-136 du volet 4) : vérification serveur, HMAC, horodatage serveur |
| **M-195** | Téléversement de pièce | `ZoneDepot` normalisé : types acceptés, taille maximale, aperçu, rattachement à l'objet, journalisation — **nécessite `POST /api/upload` fonctionnel** |
| **M-196** | Création de non-conformité | `BoutonCreerNC` pré-rempli depuis un écart, une excursion, un contrôle en échec, un rappel |
| **M-197** | Aperçu de document imprimable | `modale-apercu-document` existant : cartouche réglementaire, pagination, export PDF |
| **M-198** | Confirmation motivée | Toute action irréversible (destruction, révocation, blocage de lot) exige motif + signature |
| **M-199** | État d'erreur de données réglementaires | Remplace les replis silencieux (RG-26) : message, code, heure, bouton « Réessayer », lien vers le support |

---

## 4 — Graphiques G-69 → G-96

Charte du volet 2 §1.4 (fond `#0F3B27`, série `#18AA38`, accent `#92FF5F`, alerte `#FF7036`, neutre `#475C50`, grille `#E5ECE7` `strokeDasharray="3 3"`). Aucun graphique ne rend de série fictive : état vide explicite, erreur distincte.

### 4.1 Stock

| Code | Graphique | Type | Données |
| --- | --- | --- | --- |
| **G-69** | Valeur du stock sur 30 jours | `AreaChart` | `GET /stocks/valorisation` historique, méthode déclarée |
| **G-70** | Pareto ABC (références × valeur) | `BarChart` + `LineChart` cumulé (`ComposedChart`) | produits triés par valeur, seuils 80/95 % |
| **G-71** | Pyramide des péremptions | `BarChart` horizontal empilé | seuils `>90 j`, `45–90 j`, `10–45 j`, `≤10 j`, périmés |
| **G-72** | Derniers mouvements | flux temporel | 20 derniers mouvements par type |
| **G-73** | Rotation des lots | nuage de points | délai d'écoulement × valeur |
| **G-74** | Ruptures et seuils d'alerte | `BarChart` | produits sous seuil, jours de couverture |
| **G-75** | Répartition du stock par emplacement | `PieChart` ou barres | valorisation par emplacement |
| **G-76** | Écarts d'inventaire (divergents) | `BarChart` | écarts positifs et négatifs par campagne |
| **G-77** | Quarantaines et rappels dans le temps | `LineChart` + marqueurs | mises en quarantaine, levées, rappels |
| **G-78** | Déchets et destructions par mois | `BarChart` empilé | valeur détruite par filière |

### 4.2 Stupéfiants

| Code | Graphique | Type | Données |
| --- | --- | --- | --- |
| **G-79** | Balance permanente par produit | `LineChart` double série | solde théorique vs solde compté |
| **G-80** | Écarts de balance dans le temps | `BarChart` + `ReferenceLine` à zéro | tout écart ≠ 0 en alerte critique |
| **G-81** | Entrées / sorties mensuelles | `BarChart` groupé | mouvements par mois |
| **G-82** | Consommation par prescripteur | `BarChart` horizontal | top prescripteurs, accès restreint par rôle |
| **G-83** | Contenu de l'armoire vs balance | barres comparatives | rapprochement armoire ↔ registre |
| **G-84** | Inventaires et écarts | `LineChart` | campagnes successives, taux de conformité |

### 4.3 Préparations

| Code | Graphique | Type | Données |
| --- | --- | --- | --- |
| **G-85** | Préparations par mois et par forme | `BarChart` empilé | registre |
| **G-86** | Taux de conformité des contrôles | `RadialBarChart` | contrôles conformes / total |
| **G-87** | Écarts de pesée | histogramme | écart théorique/pesé par matière |
| **G-88** | Matières premières consommées | `BarChart` | top matières, valorisation |
| **G-89** | DLU restante des préparations en stock | `BarChart` | préparations non dispensées |

### 4.4 Transverses

| Code | Graphique | Type | Données |
| --- | --- | --- | --- |
| **G-90** | Couverture du stock par jour (jours de couverture) | `AreaChart` | stock / consommation moyenne |
| **G-91** | Réception : délais commande → livraison | `BarChart` | par fournisseur |
| **G-92** | Taux de conformité des réceptions | `RadialBarChart` | 5 contrôles réussis / total |
| **G-93** | Valorisation du stock immobilisé (quarantaine + périmés) | `BarChart` | perte potentielle |
| **G-94** | Mouvements par source | `PieChart` | vente, dispensation, réception, inventaire, manuel |
| **G-95** | Fiabilité des stocks (écarts d'inventaire / stock théorique) | `LineChart` 12 mois | indicateur de maîtrise |
| **G-96** | Traçabilité complète d'un lot | frise | réception → mouvements → dispensations → statut |

---

## 5 — Télémétrie

Mêmes principes que les volets 2 à 4 : lots de 20 événements ou 5 s via `navigator.sendBeacon`, file IndexedDB idempotente, jamais bloquant, aucun repli silencieux, la télémétrie ne constitue jamais la preuve réglementaire (le registre et `audit_logs` la constituent).

### 5.1 Métriques

| Clé | Libellé | Formule | Seuil / criticité |
| --- | --- | --- | --- |
| `stock_valorisation_total` | Valeur du stock | somme des lots × méthode déclarée | informative |
| `stock_valorisation_methode` | Méthode de valorisation | coût d'acquisition / dernier coût / prix de vente | doit être déclarée |
| `lots_commercialisables` | Lots vendables | comptage par statut | informatif |
| `lots_en_quarantaine` | Lots bloqués | comptage | > 5 % du stock → mineure |
| `lots_perimes` | Lots périmés non retirés | comptage | **> 0 → critique** |
| `lots_seuil_90j` / `_45j` / `_10j` | Lots par tranche de péremption | comptage | seuils unifiés (INC-13) |
| `ruptures_produits` | Produits en rupture | stock ≤ seuil | > 0 → majeure |
| `jours_couverture_moyen` | Jours de couverture | stock / consommation moyenne | < 7 → majeure |
| `taux_rotation_stock` | Rotation annuelle | coût des sorties / stock moyen | < 2 → mineure |
| `part_classe_a_valeur` | Concentration ABC | valeur des 20 % de références | informative |
| `receptions_nombre` | Réceptions du mois | comptage | informatif |
| `taux_conformite_receptions` | Réceptions conformes | 5 contrôles réussis / total | < 95 % → majeure |
| `receptions_chaine_froid_en_defaut` | Réceptions avec chaîne du froid en défaut | comptage | **> 0 → critique** |
| `delai_commande_livraison_j` | Délai moyen fournisseur | moyenne | informative |
| `ecarts_inventaire_valeur` | Valeur des écarts | somme absolue des écarts | > 1 % du stock → majeure |
| `fiabilite_stock` | Fiabilité des stocks | 1 − écarts / stock théorique | < 98 % → majeure |
| `inventaires_double_validation` | Inventaires avec double signature | comptage | < 100 % → critique |
| `quarantaines_en_cours` | Quarantaines ouvertes | comptage | > 30 j → majeure |
| `rappels_traites_delai_h` | Délai de traitement d'un rappel | réception → quarantaine effective | > 4 h → **critique** |
| `lots_rappel_non_bloques` | Lots concernés par un rappel encore vendables | comptage | **> 0 → critique** |
| `dechets_destruction_conforme` | Destructions avec bordereau et 2 signatures | ratio | < 100 % → critique |
| `balance_stupefiants_ecart` | Écart de balance | solde théorique − solde compté | **≠ 0 → critique** |
| `stupefiants_inventaire_delai_j` | Délai depuis le dernier inventaire | jours | > 30 → majeure |
| `stupefiants_ecritures_non_visees` | Écritures sans visa | comptage | > 0 → majeure |
| `stupefiants_copies_delivrees` | Copies du registre délivrées | comptage | informatif (audit) |
| `preparations_nombre` | Préparations du mois | comptage | informatif |
| `preparations_taux_conformite` | Contrôles conformes | ratio | < 100 % → majeure |
| `preparations_ecart_pesee_max` | Plus grand écart de pesée | max | > 5 % → majeure |
| `preparations_non_liberees` | Préparations en attente de libération | comptage | > 48 h → mineure |
| `matieres_premieres_perimees` | Matières premières périmées | comptage | **> 0 → critique** |
| `etiquettes_imprimees` | Étiquettes générées | comptage | informatif |
| `uploads_echoues` | Téléversements en échec | ratio | > 0 → **critique** (§0.1) |
| `requetes_repli_silencieux` | Requêtes tombées sur un repli par défaut | comptage instrumenté | > 0 → critique (RG-26) |
| `outbox_operations_en_attente` | Opérations hors ligne non synchronisées | comptage | > 0 depuis 1 h → majeure |

### 5.2 Événements d'usage

| Événement | Propriétés |
| --- | --- |
| `stk.section.ouverture` | `section`, `sous_section`, `duree_ms` |
| `stk.produit.creation` / `stk.produit.modification` | `groupe_fiscal`, `role` |
| `stk.lot.statut_changement` | `ancien`, `nouveau`, `motif_categorie`, `role` |
| `stk.lot.quarantaine` / `stk.lot.levee` | `motif_categorie`, `delai_h` |
| `stk.reception.creation` | `fournisseur`, `nb_lignes`, `controles_echoues` |
| `stk.reception.validation` | `decision`, `nb_lots_quarantaine` |
| `stk.mouvement.saisie_manuelle` | `type`, `motif_categorie`, `role` |
| `stk.emplacement.creation` | `type` |
| `stk.inventaire.campagne` | `type`, `perimetre`, `nb_lignes` |
| `stk.inventaire.comptage` | `nb_lignes`, `mode_hors_ligne` |
| `stk.inventaire.ecart` | `valeur_ecart`, `justifie` |
| `stk.inventaire.validation` | `double_signature`, `nb_ecarts` |
| `stk.rappel.reception` | `autorite`, `nb_lots`, `delai_traitement_h` |
| `stk.dechet.destruction` | `filiere`, `valeur`, `nb_signatures` |
| `stk.valorisation.consultation` | `methode`, `periode` |
| `stk.export.document` | `type`, `format`, `nb_lignes` |
| `stup.registre.ecriture` | `produit_id`, `type`, `role` |
| `stup.registre.rectificative` | `motif_categorie`, `role` |
| `stup.registre.visa` | `succes`, `article` |
| `stup.balance.consultation` | `periode`, `ecart_non_nul` |
| `stup.inventaire.saisie` | `nb_lignes`, `ecart` |
| `stup.vol.declaration` | `gravite` |
| `stup.copie.delivrance` | `portee`, `destinataire_categorie` |
| `stup.rapport.export` | `periode`, `format` |
| `prep.preparation.creation` | `formule_id`, `forme`, `quantite` |
| `prep.pesee.enregistrement` | `nb_matieres`, `ecart_max_pct` |
| `prep.controle.saisie` | `conforme`, `nb_controles` |
| `prep.liberation.visa` | `decision`, `succes` |
| `prep.etiquette.impression` | `format`, `nb_exemplaires` |
| `prep.rapport.export` | `periode`, `format` |
| `com.upload.televersement` | `objet`, `type_fichier`, `taille_ko`, `succes`, `code_erreur` |
| `com.erreur.donnee_reglementaire` | `requete`, `code_http`, `repli_silencieux` |
| `com.horsligne.operation_ajoutee` | `type`, `file_profondeur` |
| `com.horsligne.synchronisation` | `ok`, `conflits`, `duree_ms` |

### 5.3 Télémétrie technique

Latence et taux d'erreur par endpoint (en particulier `POST /api/upload` et les 9 routes en `501`), profondeur et âge de la file hors ligne, nombre de replis silencieux déclenchés, durée des requêtes de valorisation et d'inventaire, taille des réponses non paginées (`/stocks`, `/produits`), taux d'échec de génération d'étiquette PDF.

---

## 6 — Exigences transverses RG-25 → RG-34

Complètent RG-01→RG-12 (volet 3) et RG-13→RG-24 (volet 4).

| Code | Règle | Vérification |
| --- | --- | --- |
| **RG-25** | **Parité mock / Laravel** : toute route de `backend/routes/api.php` possède un handler dans `mock-backend.mjs` avec le même contrat. Un test parcourt la liste des routes et asserte l'absence de `501` | script de parité en CI ; les 9 routes du §0.1 répondent |
| **RG-26** | **Aucun repli silencieux** sur une donnée réglementaire : chargement, erreur et vide sont trois états distincts et visibles | `grep -rn "\.catch(() =>" frontend/src/routes frontend/src/components` → 0 occurrence sur les requêtes réglementaires |
| **RG-27** | **Hors ligne réel ou absent** : les mutations critiques passent par l'outbox avec handler enregistré et synchronisation par `POST /api/sync/push`, ou bien l'indicateur hors ligne est retiré | `grep -rn "enregistrerHandler\|\.ajouter(" frontend/src` → présent dans le code applicatif, plus seulement dans les tests |
| **RG-28** | **Une convention d'URL** : routes scopées par officine sous `/api/officines/{officineId}/…`, routes transverses sous `/api/…`. Plus de doublon pour un même traitement | plus aucune route dupliquée dans `routes/api.php` |
| **RG-29** | **Traçabilité du cycle de vie du produit** : trigger d'audit et RLS sur `produits`, `stock_lots`, `mouvements_stock`, `emplacements`, `inventaires`, `lignes_inventaire`, `lot_dechets`, `avis_rappels`, `registre_stupefiants`, `registre_preparations`, `receptions` (INC-12) | 11 tables supplémentaires sous trigger et politique |
| **RG-30** | **Toute transition d'état est motivée et signée** : statut de lot, quarantaine, levée, destruction, validation d'inventaire, visa de registre | aucune mutation d'état sans `motif` et `signature_id` |
| **RG-31** | **Registres inaltérables** : `registre_stupefiants` et `registre_preparations` refusent `UPDATE` et `DELETE` hors écriture rectificative, comme `pointages` (RG-13/14 du volet 4) | fonction PL/pgSQL de garde + test |
| **RG-32** | **Unicité des seuils** : les seuils de péremption, de rupture et d'écart sont des paramètres d'officine, pas des constantes réparties dans le code (INC-13) | `grep -rn "a_6_mois\|a_3_mois\|a_1_mois"` → une seule source |
| **RG-33** | **Pagination serveur obligatoire** au-delà de 100 lignes, filtres et page dans l'URL, jamais de chargement exhaustif d'un référentiel | `GET /stocks?page=2` renvoie 25 lignes et un total |
| **RG-34** | **Un seul composant de modale formulaire** (`ModaleFiche`) et **un seul composant de tableau** (`TableauRegistre`) ; plus de `<table>` brut ni de `style={{}}` inline dans les écrans | `grep -rc "<table" frontend/src/routes/_authenticated/dashboard/*.tsx` → 0 |

---

## 7 — Contrats d'API et schéma

### 7.1 Endpoints

| Méthode | Chemin | Statut | Rôle |
| --- | --- | --- | --- |
| `GET` | `/api/stocks` | à corriger | pagination serveur, filtres, scopage par officine, tri FEFO par défaut |
| `POST` | `/api/stocks` | à corriger | création de lot rattachée à une réception |
| `PUT` | `/api/stocks/{id}/statut` | à corriger | motif obligatoire, signature, historique de transition, **handler mock manquant** |
| `POST` | `/api/stocks/{id}/quarantaine` · `/lever-quarantaine` | à corriger | motif, décision, signature, NC |
| `GET` | `/api/stocks/alertes` | existant | à documenter comme la seule route d'alertes |
| `GET` | `/api/stocks/alertes-peremption` | **à supprimer ou fusionner** | méthode morte (STK-D03) |
| `GET` | `/api/stocks/peremptions` · `/valorisation` | à corriger | seuils paramétrables, méthode de valorisation déclarée, suppression du repli silencieux |
| `GET/POST` | `/api/emplacements` · `POST /api/mouvements` | **existants, à brancher** | STK-D04 |
| `GET/POST` | `/api/receptions` · `PUT /api/receptions/{id}/valider` · `POST /api/receptions/{id}/rapprocher` | nouveaux | STK-25→STK-30 |
| `GET/POST` | `/api/inventaires` · `POST …/compter` · `POST …/valider` | existants | + `POST …/lignes/{ligneId}/justifier`, double signature |
| `GET/POST` | `/api/rappels` · `POST /api/rappels/{id}/cloturer` | existants | + effet automatique sur les lots (STK-40) |
| `GET/POST` | `/api/dechets` · `POST /api/dechets/{id}/detruire` | existants | + bordereau, filière, témoin, 2 signatures |
| `GET/POST` | `/api/stupefiants` · `/viser` · `/rectificative` · `/inventaire` · `/declaration-vol` · `/demande-destruction` · `/balance` · `/armoire` · `/ordonnancier` | existants | + signature vérifiée, suppression des replis silencieux |
| `GET` | `/api/stupefiants/rapport` | **existant, à brancher** | STU-D02 |
| `POST` | `/api/stupefiants/copies` | nouveau | STU-13 |
| `GET/POST` | `/api/preparations` · `POST …/viser` | existants | socle |
| `GET/POST` | `/api/formules-preparation` · `/matieres-premieres` | nouveaux | PRE-02, PRE-04 |
| `POST` | `/api/preparations/{id}/pesee` · `/controles` · `/etiquette` | nouveaux | PRE-06, PRE-07, PRE-09 |
| `GET` | `/api/preparations/rapport` | nouveau | PRE-11 |
| `POST` | `/api/upload` | **existant, handler mock manquant** | §0.1 |
| `POST` | `/api/sync/push` | **existant, jamais appelé** | RG-27 |

### 7.2 Évolutions de schéma

| Table | Évolution |
| --- | --- |
| `stock_lots` | **+** `reception_id`, `historique_statuts` (jsonb) ou table `lot_statuts`, `vendable` (booléen calculé), `methode_valorisation` |
| `mouvements_stock` | **+** `source` (`vente`, `dispensation`, `reception`, `inventaire`, `transfert`, `manuel`, `correction`), `motif`, `signature_id`, `created_by`, `poste_de_travail` |
| `receptions` | nouvelle : fournisseur, n° BL, date, transporteur, conditions de transport, 5 contrôles, statut, `signature_id`, pièces jointes |
| `lignes_reception` | nouvelle : produit, lot, quantité, péremption, prix, emplacement, décision par ligne |
| `inventaires` | **+** `compte_par`, `valide_par`, `seconde_signature_id`, `pv_fichier_id` |
| `lignes_inventaire` | **+** `justification`, `analyse_5m`, `non_conformite_id`, `signature_id` |
| `lot_dechets` | **+** `bordereau`, `filiere`, `temoin`, `seconde_signature_id` |
| `avis_rappels` | **+** `autorite_emettrice`, `reference`, `lots_apparies` (jsonb), `delai_traitement`, `non_conformite_id` |
| `registre_stupefiants` | **+** `numero_ordre_annuel`, `solde_apres`, `signature_id`, `rectifiee_par_id`; trigger d'inaltérabilité |
| `registre_preparations` | **+** `formule_id`, `numero_lot`, `dlu`, `preparateur_id`, `controleur_id`, `liberee_par`, `signature_id` |
| `lignes_preparation` | nouvelle : matière première, lot consommé, quantité théorique, quantité pesée, écart, balance |
| `formules_preparation` | nouvelle : versionnée, approuvée, indice de révision |
| `matieres_premieres` | nouvelle : grade, fournisseur, certificat d'analyse |
| `controles_preparation` | nouvelle : type, résultat, conformité, contrôleur, signature |
| `emplacements` | **+** `type`, `capacite`, `zone_temperature_id`, `acces_restreint` |
| `officine_parametres` | nouvelles clés : `seuils_peremption_jours`, `methode_valorisation_stock`, `seuil_ecart_inventaire_pct`, `delai_max_traitement_rappel_h`, `duree_conservation_stupefiants_ans` |

---

## 8 — Critères d'acceptation

**Vérifiés en direct sur la pile de démonstration**

1. Les 9 routes du §0.1 ne renvoient plus `501` ; chacune renvoie le même contrat que son contrôleur Laravel.
2. Un test de parité parcourt `backend/routes/api.php` et asserte que `mock-backend.mjs` répond à chaque route (RG-25).
3. `grep -rn "\.catch(() =>" frontend/src/routes frontend/src/components` ne retourne plus aucune occurrence sur une requête réglementaire (RG-26). Couper l'API de démo affiche un **état d'erreur** sur la balance des stupéfiants, jamais une balance vide.
4. Une opération mise en file hors ligne est rejouée via `POST /api/sync/push` et disparaît de la file ; le compteur d'attente reflète la réalité (RG-27).

**Fonctionnel**

5. `POST /emplacements` et `POST /mouvements` sont atteignables depuis l'interface (STK-D04) : créer un emplacement puis un mouvement d'ajustement motivé et signé.
6. Une réception crée un objet `reception` persisté avec ses 5 contrôles signés, et les lots naissent en `en_attente_controle` (STK-D05, STK-27).
7. Un contrôle `chaine_froid_respectee = false` met la ligne en quarantaine et ouvre une NC pré-remplie (STK-28).
8. Un avis de rappel met les lots appariés en quarantaine, les rend non vendables, et une tentative de vente renvoie une erreur serveur dans la même minute (STK-40).
9. Un lot périmé ne peut être ni vendu ni dispensé : le refus est **serveur** (STK-15).
10. Le tri FEFO est appliqué par défaut sur les lots et ne peut pas être désactivé (STK-11).
11. Un inventaire exige deux signatures distinctes, dont au moins un pharmacien ; un écart non justifié bloque la validation (MAG-D01, STK-32).
12. Une destruction exige bordereau, filière, témoin et deux signatures (STK-43).
13. Le registre des stupéfiants refuse un `UPDATE` direct en base ; une rectification passe par `rectificative` et laisse l'écriture d'origine intacte (RG-31).
14. Un écart de balance non nul déclenche une alerte critique et une NC obligatoire (STU-04).
15. La section Rapports des stupéfiants est branchée sur `GET /stupefiants/rapport` et affiche des données réelles (STU-D02).
16. Une préparation consomme des lots de matières premières avec décrément FEFO dans la même transaction (PRE-05).
17. Une préparation non libérée ne peut pas être dispensée (PRE-08).
18. Une étiquette générée porte les 12 mentions obligatoires et s'imprime au format choisi (PRE-09).
19. Toute copie du registre des stupéfiants est journalisée et porte la mention « Copie non contrôlée » (STU-13).
20. La valorisation déclare sa méthode et se réconcilie avec le bilan SYSCOHADA du volet 6 (INC-16).

**Qualité du code — commandes qui doivent retourner zéro**

```bash
cd frontend
grep -rc "<table" src/routes/_authenticated/dashboard/stock.tsx src/routes/_authenticated/dashboard/stupefiants.tsx src/routes/_authenticated/dashboard/preparations.tsx src/components/modules/magasin-avance.tsx
grep -rn "style={{ width: \"100%\"; border-collapse" src/
grep -rn "\.catch(() =>" src/routes/_authenticated/dashboard/stock.tsx src/routes/_authenticated/dashboard/stupefiants.tsx
grep -rn 'const FORMULES\|Sirop de Tolu' src/routes/_authenticated/dashboard/preparations.tsx
grep -rc "data-testid=\"stk-" src/routes/_authenticated/dashboard/stock.tsx   # doit être > 0
```

21. Les 4 fichiers de ce volet rendent leurs tableaux par `TableauRegistre` et leurs formulaires par `ModaleFiche`.
22. Les ancres de l'annexe B sont posées ; les libellés nouveaux sont dans `i18n/fr.ts`.
23. `npm test --prefix frontend` et `npm run typecheck --prefix frontend` passent ; `pointage`, `stock`, `stupefiants` et `preparations` sont dans le `it.each` d'`ecrans-demo.test.tsx` avec leurs fixtures.

---

## 9 — Plan de livraison L21 → L26

Dépend de **L8** (`TableauRegistre`, registres inaltérables, pagination URL) et de **L17** (signature vérifiée serveur) du volet 4.

| Lot | Contenu | Dépend de | Critère de sortie |
| --- | --- | --- | --- |
| **L21 — Parité de la pile de démonstration** | Les 9 handlers manquants dans `mock-backend.mjs` (§0.1), test de parité en CI, suppression des 11 replis silencieux, état d'erreur normalisé (M-199) | — | Critères 1, 2, 3 |
| **L22 — Traçabilité du cycle de vie du produit** | Trigger d'audit + RLS sur 11 tables (RG-29), colonnes `source`/`motif`/`signature_id`/`created_by` sur les mouvements, historique des transitions de statut, fonction d'inaltérabilité des deux registres | L17 | Critères 13, 20 · RG-29, RG-30, RG-31 |
| **L23 — Réception réelle** | `receptions` + `lignes_reception`, check-list persistée et signée, lots naissant en `en_attente_controle`, rapprochement commande/BL/facture, téléversement fonctionnel | L21, L22 | Critères 6, 7 |
| **L24 — Rappels, quarantaine, déchets** | Effet transactionnel d'un rappel (quarantaine + blocage de vente + NC), levée motivée et signée, bordereau de destruction à deux signatures | L22 | Critères 8, 9, 12 |
| **L25 — Inventaires et mouvements** | Double validation d'inventaire, justification contradictoire des écarts, NC pré-remplie, `POST /emplacements` et `POST /mouvements` branchés, comptage hors ligne | L22, RG-27 | Critères 5, 11 |
| **L26 — Stupéfiants et préparations** | Balance sans repli silencieux + alerte critique sur écart, section Rapports branchée, copies journalisées, registres inaltérables ; formules et matières premières persistées, pesée et contrôles, étiquette générée localement, libération signée | L22 | Critères 14→19 |

**Ordre conseillé** : **L21 en premier** — c'est le lot le plus rapide et celui qui rend l'aperçu en direct honnête. Aujourd'hui, un utilisateur qui teste l'application rencontre neuf boutons morts et onze endroits où une panne ressemble à une conformité parfaite. Ensuite **L22**, parce que sans traçabilité du cycle de vie du produit, aucun des autres lots ne produit de preuve exploitable en inspection.

---

## Annexe A — Section → endpoints

| Section | Endpoints existants | À créer / à brancher |
| --- | --- | --- |
| `stock?tab=vue-ensemble` | `/stocks/alertes`, `/stocks/valorisation`, `/stocks/peremptions` | historique de valorisation |
| `stock?tab=produits` | `/produits` (GET, POST) | `GET /produits/{id}`, pagination |
| `stock?tab=lots` | `/stocks` (GET, POST), `/stocks/{id}/statut`, `/stocks/{id}/quarantaine`, `/stocks/{id}/lever-quarantaine` | `GET /stocks/{id}`, historique des statuts |
| `stock?tab=emplacements` | `/emplacements` (GET), `POST /emplacements` **non branché**, `GET /emplacements/{id}` | — |
| `stock?tab=mouvements` | `/mouvements` (GET), `POST /mouvements` **non branché** | `GET /mouvements/{id}` |
| `stock?tab=reception` | `POST /stocks`, `POST /upload` (**501**) | `/receptions` complet |
| `stock?tab=inventaires` | `/inventaires`, `…/lignes/…/compter`, `…/valider` | `…/lignes/…/justifier`, double signature |
| `stock?tab=peremptions` | `/stocks/peremptions`, `alertes_peremption` (table) | tâche planifiée, courriels |
| `stock?tab=quarantaine` | `/rappels`, `/rappels/{id}/cloturer` | effet transactionnel sur les lots |
| `stock?tab=dechets` | `/dechets`, `/dechets/{id}/detruire`, `/stocks?vendable=false` | bordereau, filière, témoin |
| `stock?tab=valorisation` | `/stocks/valorisation` | méthode déclarée, historique |
| `stupefiants?tab=registre` | `/stupefiants` (GET, POST), `/viser`, `/rectificative` | signature vérifiée |
| `stupefiants?tab=balance` | `/stupefiants/balance` | suppression du repli `null` |
| `stupefiants?tab=ordonnancier` | `/stupefiants/ordonnancier` | suppression du repli vide |
| `stupefiants?tab=copies` | — | `POST /stupefiants/copies` |
| `stupefiants?tab=inventaire` | `/stupefiants/inventaire` | PV, deux signatures |
| `stupefiants?tab=armoire` | `/stupefiants/armoire` | rapprochement balance |
| `stupefiants?tab=ecarts` | — | liste réelle des écarts |
| `stupefiants?tab=destruction` | `/stupefiants/demande-destruction` | autorisation, témoin, PV |
| `stupefiants?tab=rapports` | `GET /stupefiants/rapport` **non branché** | — |
| `preparations?tab=registre` | `/preparations` (GET, POST), `/viser` | — |
| `preparations?tab=formules` | — | `/formules-preparation` |
| `preparations?tab=matieres` | — | `/matieres-premieres` |
| `preparations?tab=controles` | — | `/preparations/{id}/controles` |
| `preparations?tab=etiquettes` | — | `/preparations/{id}/etiquette` |
| `preparations?tab=rapports` | — | `/preparations/rapport` |

## Annexe B — Ancres de test

| Ancres | Zone |
| --- | --- |
| `data-tour="stk-alertes"` · `data-tour="stk-valorisation"` · `data-tour="stk-peremptions"` | Stock — vue d'ensemble |
| `data-testid="stk-section-<tab>"` · `stk-produit-<id>` · `stk-lot-<id>` · `stk-statut-<statut>` | Stock — navigation et listes |
| `data-testid="stk-reception-assistant"` · `stk-reception-controle-<cle>` · `stk-reception-ligne-<n>` | Réception |
| `data-testid="stk-inventaire-campagne-<id>"` · `stk-inventaire-ligne-<id>` · `stk-inventaire-ecart"` | Inventaires |
| `data-testid="stk-rappel-<id>"` · `stk-quarantaine-lot-<id>"` · `stk-dechet-bordereau-<id>"` | Quarantaine, rappels, déchets |
| `data-testid="stup-registre-ligne-<n>"` · `stup-balance-<produit>"` · `stup-balance-ecart"` · `stup-ordonnancier"` | Stupéfiants |
| `data-testid="stup-armoire"` · `stup-inventaire-pv"` · `stup-copie-journal"` · `stup-rapport"` | Stupéfiants |
| `data-testid="prep-registre-<id>"` · `prep-formule-<id>"` · `prep-pesee-ligne-<n>"` · `prep-controle"` · `prep-etiquette-apercu"` | Préparations |
| `data-testid="com-upload-zone"` · `com-upload-erreur"` · `com-erreur-donnee"` · `com-horsligne-compteur"` | Transverse |

## Annexe C — Check-list

**Avant de commencer**

- [ ] L8 et L17 disponibles (tableaux, registres, signature vérifiée)
- [ ] La pile de démonstration tourne (`node mock-backend.mjs` + `npm run dev --prefix frontend`)
- [ ] Le test de parité mock/Laravel est écrit **avant** d'ajouter les handlers

**Pendant**

- [ ] Aucun repli silencieux sur une donnée réglementaire
- [ ] Toute transition d'état porte un motif et une signature
- [ ] Toute écriture porte sa source et son auteur
- [ ] Aucune liste non paginée au-delà de 100 lignes
- [ ] Aucun `<table>` brut, aucun `style={{}}` inline
- [ ] Un seul composant de modale, un seul composant de tableau

**Avant de livrer**

- [ ] Les 9 routes du §0.1 répondent en démo
- [ ] Les 23 critères d'acceptation sont démontrés
- [ ] Un rappel reçu bloque la vente des lots concernés en moins d'une minute
- [ ] Un écart de balance de stupéfiants non nul produit une alerte critique et une NC
- [ ] Couper l'API de démo affiche des erreurs explicites, jamais des données vides présentées comme conformes

*Fin du volet 5.*
