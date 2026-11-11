# BEGPHARMA — Cahier des charges des sections « Tableau de bord, Comptoir & Caisse, Groupe »

Version 1.0 · 11 novembre 2026 · Dérivé du *Cahier des charges BEGPHARMA* (§1.2 objectifs O2/O3/O4, §2 acteurs et droits, §3 exigences transversales, §4.7 BPD-7 Accueil et dispensation, §5.3 à §5.5 vente / caisse / FeexPay, §9 tableau de bord promoteur, §10 intégrations, §11 modèle de données, §12 traçabilité, §13.1 lots) et du socle déjà livré dans ce dépôt (Sprint 0 → Jalon 4).

**Périmètre — 6 écrans, dans l'ordre exact de la barre latérale**, c'est-à-dire tout ce qui suit « Tableau de bord » et précède le groupe « Stock » dans `frontend/src/components/app-sidebar.tsx` (constante `NAV_ENTRIES`) :

| # | Entrée de menu | Route réelle | Alias legacy (redirection) | Fichier écran |
| --- | --- | --- | --- | --- |
| 1 | Tableau de bord | `/dashboard` | `/app` | `frontend/src/routes/_authenticated/dashboard/index.tsx` + `frontend/src/components/tableau-de-bord.tsx` |
| 2 | Consolidation Groupe | `/dashboard/consolidation` | — | `frontend/src/routes/_authenticated/dashboard/consolidation.tsx` |
| 3 | Pharmacies de Garde | `/dashboard/gardes` | — | `frontend/src/routes/_authenticated/dashboard/gardes.tsx` |
| 4 | Caisse POS Tactile (groupe « Comptoir & Caisse ») | `/dashboard/vente` | `/caisse` | `frontend/src/routes/_authenticated/dashboard/vente.tsx` |
| 5 | Dispensation & Ordonnances | `/dashboard/dispensation` | `/dispensation` | `frontend/src/routes/_authenticated/dashboard/dispensation.tsx` |
| 6 | Facturation DGI e-MECeF | `/dashboard/facturation` | `/facturation` | `frontend/src/routes/_authenticated/dashboard/facturation.tsx` |

**Hors périmètre explicite de ce document** : le groupe « Stock » (`/dashboard/stock` et ses 11 onglets), « Stupéfiants & Préparations », « Qualité & BPD ABMed » (déjà spécifié dans *BEGPHARMA — Cahier des charges de la section « Qualité & BPD ABMed »*), « Gestion & Finance » (comptabilité, journal, appareils), « Compte & Officine ». Ces pages **ne doivent pas être modifiées** par les travaux décrits ici, sauf pour les points d'intégration nommément listés (lecture de données, invalidation de caches).

**Convention des références** : TDB (tableau de bord), CGL (consolidation groupe), GRD (gardes), CAI/VTE/FPX (caisse, vente, FeexPay — références du cahier d'origine conservées), DSP (dispensation), FDG (facturation DGI), RG (règles de gestion), API (contrats). Les références du cahier d'origine et les articles du Guide BPD ABMed sont rappelés entre crochets, par exemple \[DSH-01\] ou \[art. 7.31\]. **Priorités : P1 indispensable à la mise en service, P2 important, P3 souhaitable.**

---

## 0. Contrat de travail de l'agent

Cette section est normative : elle décrit **comment** produire le code, avant **quoi** produire. Chaque lot doit la respecter intégralement.

### 0.1 État des lieux du dépôt (à lire avant d'écrire une ligne)

| Écran | Ce qui fonctionne déjà | Écart principal à combler |
| --- | --- | --- |
| `/dashboard` | Sélecteur d'officine, création d'officine, bloc « présence pharmacien (art. 1.11) », pointage express, compteurs documents / NC / températures / score BPD, bannière MFA | Aucun bloc de pilotage commercial : CA du jour, caisse, stock, achats, personnel, comptabilité, anti-fraude, multi-officines, alertes paramétrables, résumé quotidien, drill-down \[DSH-01 à DSH-14\] |
| `/dashboard/consolidation` | KPI groupe (CA jour/mois, valeur stock, péremptions, NC), tableau comparatif des officines, bascule de site, initiation et réception de transfert | Classement par indicateur, comparaison de périodes, opportunités de transfert non exploitées côté UI, export, alertes groupe, transferts multi-lots |
| `/dashboard/gardes` | Liste des gardes par sélection, déclaration d'une période de garde, suppression, impression vitrine, appel téléphonique | Calendrier officiel du tour de garde, recherche par commune/quartier, garde en cours mise en avant, historique, export iCal/PDF, notification |
| `/dashboard/vente` | Ouverture/fermeture de session, sélection rapide de produits, panier, modes de règlement (espèces, Mobile Money, carte), montant reçu / monnaie, impression du ticket, ticket Z, numéro de facture DGI affiché | Remises plafonnées par rôle, avoir et retour, annulation validée, mouvements de caisse hors vente, ticket X, paiement mixte, vrai flux FeexPay (pending → webhook), crédit client, prise en charge organisme, paniers en attente, cahier Mobile Money, rapprochement, anti-fraude, caisse hors-ligne \[VTE-01 à VTE-10, CAI-01 à CAI-08, FPX-01 à FPX-10\] |
| `/dashboard/dispensation` | Formulaire patient / prescripteur, recherche catalogue avec lot FEFO proposé, quantités, posologie, total, visa pharmacien, ordonnancier listé | Tout le parcours BPD-7 : photo d'ordonnance, analyse réglementaire, aide à l'analyse pharmaceutique, décision du pharmacien, intervention pharmaceutique, substitution, renouvellement, contrôle par scan, registres listes I/II et stupéfiants, mentions et étiquettes, conseil par médicament, vérification de la compréhension, erreur de délivrance, hors prescription guidé, protocoles de conseil, vigilances, dossier patient et consentement \[BPD7-F01 à BPD7-F26, BPD7-V01 à V05\] |
| `/dashboard/facturation` | Journal des factures e-MECeF, KPI compteurs et taux de certification, aperçu et impression du ticket fiscal, export CSV du registre | Factures d'avoir (EV), statuts d'échec et file de recertification, rapprochement des compteurs, vérification d'un reçu par scan du QR, paramètres IFU/NIM par officine, export de télédéclaration, liaison aux écritures SYSCOHADA, filtres riches, inaltérabilité affichée |

**Ressources du dépôt à consulter** :

- `Cahier des charges BEGPHARMA.docx` — cahier d'origine (le présent document en est une extraction exécutable).
- `BEGPHARMA — Cahier des charges de la section « Qualité & BPD ABMed ».md` — frère jumeau de ce document pour les 9 pages qualité ; **même structure, mêmes conventions**.
- `README.md` — installation, comptes de démonstration, endpoints Sprint 0.
- `frontend/roadmap.md`, `frontend/AGENTS.md` — état d'avancement et contrainte Lovable (ne jamais réécrire l'historique publié).
- `backend/routes/api.php` — **source de vérité des endpoints Laravel existants**.
- `mock-backend.mjs` — backend de démonstration Node (port 8001), mêmes contrats que Laravel.
- `frontend/src/test/reponses-demo.json` — fixtures de recette (voir §0.4, point bloquant).

### 0.2 Stack, environnement et commandes

| Couche | Technologie |
| --- | --- |
| Frontend | TanStack Start (routage par fichiers) · React 19 · TanStack Query v5 · Tailwind CSS v4 · composants `frontend/src/components/ui/*` (Radix / Base UI) · `recharts` · `sonner` · `dexie` · `jspdf` + `html2canvas` · icônes `reicon-react` et `lucide-react` |
| Backend | Laravel 11 · PHP 8.3 · PostgreSQL 16 (RLS + triggers d'audit append-only) · Sanctum · MFA TOTP RFC 6238 |
| Démonstration | `node mock-backend.mjs` (port `PORT || 8001`), persistance dans `mock-data/persistance-demo.mjs` |
| Proxy | `frontend/vite.config.ts` : `/api` → `process.env.BACKEND_URL || http://127.0.0.1:8001` ; le proxy convertit `X-Session-Begpharma` en `Authorization: Bearer` |

```bash
# Frontend seul (mock ou Laravel déjà lancé sur 8001)
node mock-backend.mjs &              # backend de démonstration
npm run dev                          # vite sur 0.0.0.0:5174

# Pile complète Laravel + frontend
npm run dev:all

# Qualité
npm test --prefix frontend           # vitest
npm run typecheck --prefix frontend  # tsc --noEmit
cd backend && php artisan test       # PHPUnit (RLS, audit, MFA, sync)
```

Comptes de démonstration (mot de passe `Begpharma2026!`, TOTP `JBSWY3DPEHPK3PXP`, code démo `123456`) : `promoteur@begpharma.bj`, `pharmacien@begpharma.bj`, `dispensateur@begpharma.bj`, `agent.b@begpharma.bj`.

### 0.3 Conventions de code obligatoires

1. **Langue** : identifiants, libellés, commentaires, messages d'erreur et noms de fichiers en français (le dépôt est intégralement en français). Textes d'interface en français, dates JJ/MM/AAAA, fuseau `Africa/Porto-Novo`, montants FCFA (XOF) **sans décimale** \[NF-09\].
2. **Routage** : uniquement le routage par fichiers TanStack dans `frontend/src/routes/`. Ne jamais créer `src/pages/`, `app/layout.tsx`, ni modifier `src/routeTree.gen.ts` (généré). Un écran du périmètre vit dans `routes/_authenticated/dashboard/<nom>.tsx` ; l'alias legacy correspondant (`routes/_authenticated/<nom>.tsx`) ne fait que `throw redirect(...)` — conserver ce mécanisme.
3. **Appels API** : passer exclusivement par `api` de `@/lib/api-client` (`api.get/post/put/delete/uploadFile/telechargerFichier`). `formatUrl()` ajoute `/api` si l'URL ne commence pas par `/api/` : les deux écritures fonctionnent, **conserver celle déjà employée dans le fichier modifié** (les fixtures de recette normalisent en retirant `/api`). L'en-tête `X-Officine-Id` est posé automatiquement : ne jamais coder l'officine en dur.
4. **Officine courante et rôle** : `useOfficine()` de `@/lib/officine-context` (`courante`, `rattachements`, `role`, `choisir`, `aRole`). Toute requête métier est bornée à l'officine courante \[AC-01\].
5. **Cache** : `useQuery` avec `queryKey: [<ressource>, officineId, ...filtres]` ; `refetchInterval` uniquement là où c'est justifié (30 s présence pharmacien, 60 s températures, 15 s statut de paiement). Après une mutation : `queryClient.invalidateQueries({ queryKey: [...] })` sur **toutes** les clés touchées par le chaînage automatique (voir §1.4).
6. **Formats** : `nombre()`, `formatFCFA()`, `formatDate()`, `formatDateHeure()` de `@/lib/format`. Aucun `toFixed()` ni `toLocaleString()` direct dans un écran.
7. **Exports et impressions** : `telechargerCsv()`, `telechargerTexte()`, `imprimerFicheOfficielle()`, `telechargerHtmlEnPdf()` de `@/lib/export-utils`. Toute impression d'un document diffusé porte la mention « Copie non contrôlée » et la date ; tout export réglementaire porte son code, sa version et la date d'édition \[BPD-C01\].
8. **Composants** : réutiliser `@/components/ui/*` (Card, Badge, Button, Dialog, Table, Tabs, Input, Select, Skeleton, Progress, Separator, `selecteur-filtrable`, `zone-depot`) et `@/components/modules/modale` (`ModaleFiche`, `ColonneFiche`, `Champ`). Ne pas réinventer une modale ni un tableau. Les morceaux réutilisables (grille de KPI, stepper de dispensation, sélecteur de produit avec lot FEFO, bloc de paiement) vont dans `frontend/src/components/modules/`.
9. **Charte graphique** (à respecter au pixel près, valeurs relevées dans l'existant) : vert institutionnel `#023010` / `#0F3B27`, vert d'action `#18AA38`, accent `#92FF5F`, bordures `#CFF1D2` / `#CFE3D5`, fond de fiche `#F7F9F7`, texte `#1F2420`, texte secondaire `#5C6660` / `#475C50`, alerte `#FF7036`, ambre pour les avertissements non bloquants. Cartes `rounded-2xl`/`rounded-3xl`, titres en `font-display font-black tracking-tight`, boutons d'action `h-11`/`h-12 rounded-xl font-bold`.
10. **Mobile et tablette d'abord** : zones tactiles ≥ 48 px (`h-11`, `h-12`), grilles `grid gap-* sm:grid-cols-2 md:grid-cols-3`, panneaux empilés sur mobile, pas plus de 3 écrans pour une vente simple \[NF-10\]. Le poste de comptoir reste utilisable au clavier et à la douchette (champs `autoFocus`, `onKeyDown` Entrée, `inputMode="numeric"`).
11. **Quatre états obligatoires par bloc de données** : chargement (`Skeleton`), vide (message français explicite + action proposée), erreur (`@/components/erreur-rubrique` ou message inline ; une panne ne doit jamais être présentée comme une liste vide), succès. **Aucune valeur inventée** : pas de donnée de démonstration codée en dur dans un écran (les valeurs de repli type `4.2` / `98.4` présentes dans `tableau-de-bord.tsx` sont un écart connu à supprimer à l'occasion de TDB-01).
12. **Retours utilisateur** : `toast` de `sonner` pour chaque mutation (succès avec le numéro de pièce, échec avec le motif serveur).
13. **Types** : déclarer les `interface` de contrat en tête de fichier d'écran comme l'existant (`ProduitItem`, `LignePanier`, `SessionActive`, `FactureItem`). Éviter `any` sauf pour la donnée serveur non stabilisée, et jamais sur les montants.
14. **Hors-ligne** : toute opération sensible du comptoir passe par l'outbox `@/lib/offline/outbox` (`ajouter(type, payload)` avec `client_op_id` idempotent et `saisie_locale_at`) et l'état réseau par `@/hooks/use-en-ligne`.
15. **Verrouillage de session** : ne pas contourner `@/hooks/use-inactivite` (15 min) ni `@/lib/session`.

### 0.4 Piège de recette bloquant (tests `ecrans-demo`)

`frontend/src/test/ecrans-demo.test.tsx` monte chaque écran de `routes/_authenticated/dashboard/*.tsx` en **mockant `api.get`** avec `frontend/src/test/reponses-demo.json`. La clé du fixture est l'URL **privée du préfixe `/api` et de sa query string** :

```ts
const chemin = url.replace(/^\/api/, "").split("?")[0];
if (!(chemin in reponses)) throw new Error("Réponse de recette absente");
```

Conséquences à traiter dans chaque lot :

1. Toute **nouvelle requête GET** d'un écran déjà couvert (`caisse`→`vente.tsx`, `dispensation`, `facturation`, `comptabilite`, …) exige sa clé dans `reponses-demo.json`, sinon la suite échoue.
2. Les écrans `consolidation`, `gardes` et `index` (tableau de bord) ne sont **pas encore** dans la liste `it.each`. Les y ajouter fait partie du travail : compléter la liste **et** fournir les fixtures correspondants.
3. Le fixture doit contenir des données **réalistes et cohérentes** entre elles (même officine `off1`, montants en FCFA entiers, dates au format serveur ISO), car ces réponses servent aussi de documentation de contrat.

Fixtures existants à connaître : `/caisse/session-active`, `/comptabilite/clotures`, `/comptabilite/journal-ventes`, `/dispensations`, `/facturation/emecef`, `/produits`, `/stocks`, `/stocks/alertes`, `/stocks/alertes-peremption`, `/stocks/peremptions`, `/stocks/valorisation`, `/mouvements`, `/emplacements`, `/preparations`, `/stupefiants` (+`/armoire`, `/balance`, `/ordonnancier`), `/auth/devices`, `/officines/off1/{appareils-autorises, auto-evaluation/campagne-courante, canevas, documents, employes, temperatures, temperatures/stats}`.

Fixtures à ajouter (liste minimale) : `/dashboard/synthese`, `/dashboard/alertes`, `/promoteur/consolidation`, `/promoteur/transferts`, `/gardes`, `/officines/off1/pointages/actif`, `/officines/off1/non-conformites`, `/officines/off1/echeances`, `/caisse/ventes`, `/caisse/mouvements`, `/caisse/avoirs`, `/caisse/cahier-mobile-money`, `/caisse/rapprochement-feexpay`, `/dispensations/patients`, `/dispensations/interventions`, `/dispensations/vigilances`, `/dispensations/protocoles`, `/dispensations/erreurs`, `/dispensations/indicateurs`, `/facturation/emecef/parametres`, `/facturation/emecef/rapprochement`, `/facturation/verifier`, `/gardes/en-cours`, `/promoteur/alertes`.

### 0.5 Définition du fini (DoD) — par écran, sans exception

Un écran n'est « fini » que lorsque les huit points suivants sont vrais :

1. Toutes les fonctionnalités **P1** de sa fiche sont implémentées et visibles ; les P2 non livrées sont signalées dans l'UI par un état explicite (« Module à venir », composant `@/components/module-a-venir`) et jamais par un bouton mort.
2. Les quatre états (chargement, vide, erreur, succès) sont traités, en français, sans donnée inventée.
3. Les droits par rôle sont appliqués côté UI **et** côté API (masquer un bouton ne suffit pas) \[§1.2\].
4. Chaque mutation horodate côté serveur, journalise dans `audit_logs` et invalide les caches concernés.
5. Les endpoints appelés existent dans **les deux** backends : `backend/routes/api.php` (+ contrôleur, validation `Request::validate`, RLS) et `mock-backend.mjs` (mêmes chemins, mêmes formes de réponse, mêmes codes d'erreur).
6. Les fixtures `reponses-demo.json` sont à jour et `npm test --prefix frontend` passe intégralement, `npm run typecheck` aussi.
7. Au moins un test fonctionnel par règle de gestion critique (voir §8.5) ; côté Laravel, un test PHPUnit couvre la règle d'isolation et la règle métier nouvelle.
8. L'écran est utilisable sur une largeur de 360 px (téléphone) et 820 px (tablette) sans débordement horizontal, et au clavier sur poste fixe.

### 0.6 Interdits

- Afficher une donnée nominative de patient sur le tableau de bord ou la consolidation : le promoteur ne voit que des indicateurs agrégés \[DP-06, DP-03\].
- Comptabiliser une vente sans reçu normalisé \[CAI-03, INT-04\] ; émettre un reçu normalisé sans vente payée.
- Modifier ou supprimer un enregistrement validé (ticket, dispensation, facture, ligne de registre) : correction par écriture rectificative ou avoir uniquement \[NF-07, INT-02\].
- Vendre un lot périmé, rappelé, en quarantaine, rejeté ou « à évaluer », même par le pharmacien \[RG-D02\].
- Dispenser sans pharmacien pointé présent \[RG-D06, BPD-C09\].
- Laisser un non-pharmacien valider une analyse d'ordonnance, une intervention pharmaceutique, un visa de stupéfiant, une annulation de ticket au-delà de son seuil \[art. 2.9, 2.10, 7.14 à 7.16\].
- Coder en dur un taux (TVA, remise, seuil, délai, durée de conservation) : tout est paramètre d'officine (`officine_parametres`, écran `/dashboard/parametres`) \[§1.5 principe directeur\].
- Toucher à la section Stock, à `routeTree.gen.ts`, ou réécrire l'historique Git publié (contrainte Lovable, `frontend/AGENTS.md`).

---

## 1. Cadre commun aux six écrans

### 1.1 Rôle de ces sections

Ces six écrans forment le **cœur opérationnel et le pilotage** de BEGPHARMA : ils transforment l'acte pharmaceutique (dispensation) en acte commercial (vente), fiscal (reçu normalisé e-MECeF) et comptable (écriture SYSCOHADA), puis restituent l'ensemble au promoteur en un écran mobile, et à l'échelle du groupe pour plusieurs officines. Ils matérialisent trois objectifs du cahier d'origine :

- **O2 Pilotage à distance** : le promoteur voit CA, stock, trésorerie, présences et alertes du jour en temps réel, de n'importe où.
- **O3 Une seule saisie** : une vente produit automatiquement mouvement de stock, écriture comptable, mouvement de caisse et trace BPD.
- **O4 Sécurité pharmaceutique** : blocage automatique des produits périmés, des lots rappelés, de la quarantaine et de l'absence de pharmacien.

| Page | Rôle |
| --- | --- |
| `/dashboard` | Vue consolidée de l'officine courante : activité, caisse, stock, qualité, personnel, anti-fraude, alertes |
| `/dashboard/consolidation` | Vue groupe du promoteur : comparaison des officines, transferts inter-officines \[DSH-09\] |
| `/dashboard/gardes` | Tours de garde déclarés, garde en cours, affiche vitrine |
| `/dashboard/vente` | Poste de vente tactile, encaissement, reçu normalisé, clôture de caisse, paiement FeexPay |
| `/dashboard/dispensation` | Acte pharmaceutique complet : ordonnance, analyses, décision, délivrance contrôlée, conseil, registres, vigilances |
| `/dashboard/facturation` | Registre officiel des factures normalisées DGI e-MECeF, compteurs, preuves, avoirs |

### 1.2 Accès par rôle

A = administre et valide · E = saisit · V = valide seulement · L = lecture · – = aucun accès. Matrice reprise de §2.2 du cahier d'origine, déclinée par page.

| Page / domaine | Promoteur | Pharmacien | RMQ | Dispensateur | Caissier | Magasinier | Comptable | Inspecteur |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tableau de bord (indicateurs agrégés) | A | L | L | L | L (périmètre caisse) | L (périmètre stock) | L (périmètre finance) | L |
| Détail nominatif d'un ticket / d'une dispensation | L | A | L | E | E (ses tickets) | – | L (sans données cliniques) | L |
| Consolidation groupe et transferts | A | V | – | – | – | E | L | L |
| Pharmacies de garde | A | E | E | L | L | – | – | L |
| Caisse : ouverture, ventes, clôtures | L | V | – | – | E | – | L | – |
| Annulation de ticket, remise au-delà du seuil | V | V | – | – | – | – | – | – |
| Dispensation : analyse et décision | L | A | L | E (sans validation) | – | – | – | L |
| Registres stupéfiants, listes I et II, visa | L | A | L | – | – | – | – | L |
| Facturation DGI : registre, avoirs, paramètres | A | V | – | – | L | – | E | L |

Règles d'accès transverses à faire respecter : AC-01 (périmètre officine), AC-02 (journalisation de toute lecture de donnée patient), AC-04 (MFA obligatoire promoteur / pharmaciens / RMQ / comptable), DP-03 (données cliniques jamais visibles du caissier, du magasinier, du comptable).

**Implémentation attendue** : une fonction utilitaire unique `aRole(...)` (déjà exposée par `useOfficine`) pour l'UI, et un middleware/`Gate` Laravel par action pour l'API. Les deux doivent citer la même règle (ex. `RG-C04` pour l'annulation).

### 1.3 Conventions d'interface

- Barre d'état permanente (déjà dans `_authenticated/route.tsx`) : officine, utilisateur, état réseau, alertes (`NotificationsSheet`), guide (`BoutonGuide`).
- Signature d'un acte sensible : code personnel + horodatage serveur + nom de l'auteur conservés dans l'enregistrement \[BPD-C10, art. 4.33\].
- Codification des pièces : `PROCESSUS-TYPE-NUMÉRO`. Conventions déjà en place à prolonger : session `CAISSE-2026-0001`, ticket `TCK-2026-00001` (le mock émet `TICKET-2026-0143` : **uniformiser sur `TCK-`**, point à valider n° 4), dispensation `DISP-2026-0001`, transfert `TRF-2026-0001`, facture DGI `IFU-ANNÉE-FV-000001`.
- Chaque enregistrement est relié à un ou plusieurs articles du Guide, ce qui alimente l'auto-évaluation \[BPD-C04\] ; tout écart ouvre une fiche NC/CAPA préremplie en un clic \[BPD-C05\] via `POST /officines/{id}/non-conformites`.
- Toute échéance déclenche une notification à J-30, J-7 et J \[BPD-C06\] via `/officines/{id}/echeances`.
- Une entrée validée est immuable ; la correction passe par une écriture rectificative liée, avec motif.

### 1.4 Chaînage automatique : les 7 effets d'une vente validée \[O3\]

Ordre imposé, dans **une seule transaction base de données** (`DB::transaction`), déjà partiellement réalisé dans `VenteCaisseController@store` :

| Ordre | Effet | Module | État dans le dépôt |
| --- | --- | --- | --- |
| 1 | Décrément du lot selon FEFO strict (`date_peremption ASC`, lots `vendables()` uniquement) | Stock | Fait |
| 2 | Inscription au registre des stupéfiants / listes I et II / médicaments dérivés du sang si applicable | BPD-3 | Fait pour les stupéfiants via dispensation ; à câbler sur la vente directe |
| 3 | Mise à jour de l'historique thérapeutique et du dossier pharmaceutique (si consentement) | BPD-7 | **À faire** (DSP-14, DSP-15) |
| 4 | Émission du reçu normalisé e-MECeF (numéro DGI, code de sécurité, QR, signature) | Caisse / fiscalité | Fait (`EmecefService`) |
| 5 | Enregistrement du règlement dans la session de caisse (espèces / Mobile Money / carte) | Caisse / trésorerie | Fait |
| 6 | Écritures comptables SYSCOHADA (trésorerie, 7011 ventes, 4431 TVA) | Comptabilité | Fait (`SyscohadaService`) |
| 7 | Mise à jour des indicateurs du promoteur (invalidation des caches tableau de bord) | Tableau de bord | **À faire** (TDB-01) |

Tout échec sur un maillon **annule l'ensemble** : on ne laisse jamais une vente sans reçu, ni un reçu sans écriture \[INT-04\].

### 1.5 Hors-ligne (rappel du socle E0-S7)

| Fonction | Hors-ligne | Mécanisme |
| --- | --- | --- |
| Vente au comptoir et encaissement espèces | Oui | Outbox Dexie + `POST /api/sync/push` au retour du réseau, `client_op_id` idempotent, `saisie_locale_at` conservé distinct de `server_timestamp` |
| Paiement FeexPay / Mobile Money | Non | Nécessite le réseau : le mode dégradé propose un autre règlement et met la vente en « à synchroniser » |
| Reçu normalisé | Différé | File de certification : la vente est émise avec un reçu provisoire numéroté localement, la certification DGI est rejouée à la reconnexion \[CAI-07\] — **modalités réelles à valider auprès de la DGI** (§9, point 2) |
| Dispensation et conseil | Oui pour la saisie, non pour l'analyse BDD médicaments | Saisie en file ; validation pharmacien horodatée à la synchronisation |
| Consultation des registres (ordonnancier, factures, gardes) | Oui pour les données déjà chargées | Cache TanStack Query + `placeholderData` |
| Tableau de bord | Lecture seule | Dernière synthèse connue avec mention explicite de son horodatage (« Données de 08:12, hors ligne ») |

Un conflit est toujours tranché par le serveur ; l'opération rejetée est marquée `conflit` et **signalée à l'utilisateur**, jamais réécrite silencieusement.

### 1.6 Audit, sécurité, conservation

- Journal d'audit append-only sur chaque création, validation, signature, annulation, export et consultation de donnée patient (`audit_logs`, trigger PostgreSQL inconditionnel rejetant `UPDATE`/`DELETE`).
- Verrou de suppression selon la durée de conservation : 3 ans (copies d'ordonnances de stupéfiants), 5 ans (procédures, conseils, fiches d'intervention), 10 ans (registres stupéfiants et listes I et II, pièces comptables, notifications de vigilance), 40 ans (médicaments dérivés du sang) \[NF-08\].
- Chiffrement en transit et au repos ; clés FeexPay et DGI propres à chaque officine, jamais dans le code ni dans le dépôt \[FPX-09\].
- Verrouillage de session après 15 minutes d'inactivité ; MFA pour les rôles réglementaires \[NF-05, AC-04\].

### 1.7 Fichiers : téléversement, glisser-déposer, téléchargement

Règles communes du dépôt (détaillées dans le cahier « Qualité & BPD », §0.3) appliquées aux pièces de ces sections :

| Contexte | Fichier attendu |
| --- | --- |
| Ordonnance | Photo ou scan (JPG, PNG, WebP, HEIC, PDF), ≤ 10 Mo, empreinte SHA-256, compression côté client |
| Bon de prise en charge | PDF ou photo de l'organisme |
| Erreur de délivrance / réclamation | Photos, note vocale |
| Clôture de caisse | Photo du comptage, pièce de versement en banque |
| Facturation | Export CSV / PDF du registre, fichier de télédéclaration DGI |
| Garde | Affiche vitrine PDF |

Téléversement via `api.uploadFile()` puis `POST /officines/{id}/upload` ; composant `@/components/ui/zone-depot` pour le glisser-déposer ; aperçu avant envoi ; barre de progression ; reprise après coupure ; une pièce rattachée à un enregistrement validé ne se remplace ni ne se supprime (on ajoute une version).

---

## 2. Page « Tableau de bord » (`/dashboard`)

### 2.1 Objectif

Le promoteur ouvre l'application sur son téléphone, où qu'il soit, et voit en un écran l'état de son officine : activité du jour, caisse et trésorerie, stock, qualité BPD, personnel, comptabilité, anti-fraude — chaque indicateur cliquable jusqu'à la pièce d'origine, sans aucune donnée clinique nominative \[§9 du cahier d'origine, DP-06\].

### 2.2 Structure de la page (ordre imposé, de haut en bas)

| Zone | Contenu | Réf. |
| --- | --- | --- |
| En-tête | Bonjour + nom, officine active, rôle, horodatage de la synthèse, bouton « Actualiser », sélecteur d'officine si plusieurs rattachements, « + Nouvelle officine » | TDB-01 |
| Bandeau réglementaire | Présence pharmaceutique (art. 1.11) + pointage express + bannière MFA si requise et non activée | existant |
| Alertes du jour | File d'alertes classées critique / important / information, avec canal et action rapide | TDB-02 |
| Activité du jour | CA, tickets, panier moyen, marge brute, répartition par mode de paiement, comparaison veille / semaine / année | TDB-03 |
| Caisse et trésorerie | Session ouverte, soldes par caisse et Mobile Money, écart de caisse, paiements en attente, échéances à 7 jours | TDB-04 |
| Stock | Valeur du stock, ruptures, sous le minimum, péremptions à 6/3/1 mois et valeur exposée, produits dormants | TDB-05 |
| Qualité et conformité BPD | Score d'auto-évaluation par chapitre, NC ouvertes et en retard, relevés de température du jour, rappels de lots, vigilances, documents à réviser | TDB-06 (partiellement existant) |
| Personnel | Présents, retards, absents, pharmacien présent, heures supplémentaires du mois | TDB-07 |
| Achats et fournisseurs | Commandes en cours et en retard, litiges, dettes à échéance | TDB-08 |
| Comptabilité et fiscalité | Résultat provisoire du mois, TVA estimée, échéances fiscales et sociales | TDB-09 |
| Contrôle anti-fraude | Annulations, remises, retours, écarts de caisse, ventes hors horaires par caissier | TDB-10 |
| Actions rapides du promoteur | Valider une commande, approuver une annulation de ticket, valider une destruction, consulter un rapport | TDB-11 |
| Groupe | Bascule vers `/dashboard/consolidation` avec les 3 KPI groupe | TDB-12 |

### 2.3 Fonctionnalités

| Réf. | Fonctionnalité | Détail | API | Prio. |
| --- | --- | --- | --- | --- |
| TDB-01 | Synthèse unique et horodatée | Un seul appel agrégé par officine, mis en cache 60 s, horodatage affiché (« Synthèse de 08:12 ») ; bouton « Actualiser » ; repli sur la dernière synthèse connue en hors-ligne avec mention explicite | `GET /dashboard/synthese` (nouveau) | P1 \[DSH-01 à DSH-09\] |
| TDB-02 | Centre d'alertes | Trois niveaux (critique, important, information) ; chaque alerte porte : niveau, libellé, source (page), identifiant de la pièce, action proposée ; tri par niveau puis par date ; compteur dans la barre d'état | `GET /dashboard/alertes` (nouveau) + `NotificationsSheet` existant | P1 \[§9.2\] |
| TDB-03 | Activité du jour | CA TTC, nombre de tickets, panier moyen, marge brute, répartition par mode de paiement (anneau `recharts`) ; comparaison avec la veille, la semaine précédente et l'an dernier (variation en % avec flèche et couleur) ; courbe CA par heure de la journée | synthèse | P1 \[DSH-01\] |
| TDB-04 | Caisse et trésorerie | Session de caisse ouverte (numéro, caissier, fond, encaissé) ou alerte « aucune session ouverte » ; soldes espèces / Mobile Money / carte ; écart de caisse de la dernière clôture ; paiements FeexPay en attente ; échéances à 7 jours | synthèse + `/caisse/session-active` | P1 \[DSH-02\] |
| TDB-05 | Stock | Valeur du stock au prix d'achat, nombre de références, ruptures, produits sous le seuil minimum, péremptions à 6 / 3 / 1 mois avec valeur exposée, produits dormants (aucun mouvement depuis N jours, N paramétrable) | synthèse + `/stocks/valorisation`, `/stocks/alertes`, `/stocks/peremptions` | P1 \[DSH-03\] |
| TDB-06 | Qualité et conformité BPD | Score global et par chapitre, NC ouvertes et en retard, relevés de température réalisés / prévus du jour, excursions ouvertes, rappels de lots en cours, vigilances non clôturées, documents à réviser | synthèse + endpoints existants | P1 \[DSH-05\] |
| TDB-07 | Personnel | Présents / retards / absents du jour, pharmacien présent (oui/non), heures supplémentaires cumulées du mois, congés en cours | synthèse + `/officines/{id}/pointages/actif`, `/officines/{id}/employes` | P1 \[DSH-06\] |
| TDB-08 | Achats et fournisseurs | Commandes en cours et en retard de livraison, litiges ouverts, dettes fournisseurs à échéance | synthèse | P2 \[DSH-04\] |
| TDB-09 | Comptabilité et fiscalité | Résultat provisoire du mois, TVA collectée estimée, échéances fiscales et sociales à venir | synthèse + `/comptabilite/journal-ventes` | P2 \[DSH-07\] |
| TDB-10 | Contrôle anti-fraude | Par caissier et sur la période : annulations, remises accordées, retours, écarts de caisse, ventes hors horaires d'ouverture ; seuils paramétrables ; toute dépassement de seuil alimente TDB-02 en niveau « critique » | synthèse | P2 \[DSH-08\] |
| TDB-11 | Actions à distance du promoteur | Depuis le mobile : approuver une annulation de ticket, valider une commande, valider une destruction, consulter un rapport — chaque action ouvre la modale de validation de la page concernée sans quitter le tableau de bord | endpoints des pages cibles | P2 \[DSH-14\] |
| TDB-12 | Forage jusqu'au détail | Chaque indicateur est cliquable et mène à la pièce (ticket, mouvement, relevé, NC) dans la limite des droits de l'utilisateur ; fil d'Ariane visible ; retour au tableau de bord en un geste | routes existantes + `search` params | P2 \[DSH-12\] |
| TDB-13 | Paramétrage des notifications | Par niveau et par type d'alerte : choix du canal (push, SMS, e-mail, WhatsApp) et des plages horaires ; réservé au promoteur | `PUT /officines/{id}/parametres` (clés `alertes.*`) | P1 \[DSH-10\] |
| TDB-14 | Résumé quotidien | Envoi à l'heure choisie par le promoteur : activité de la veille, points d'attention, échéances du jour ; aperçu dans l'application et archive des envois | job Laravel + `GET /dashboard/resumes` (nouveau) | P1 \[DSH-11\] |
| TDB-15 | Personnalisation de l'affichage | Choix des blocs visibles et de leur ordre, par utilisateur, persisté ; jeu par défaut selon le rôle (caissier : caisse et activité ; pharmacien : qualité et dispensation ; promoteur : tout) | `PUT /auth/preferences` ou paramètres utilisateur | P3 |
| TDB-16 | Vue multi-officines | Bascule d'officine sans rechargement, et carte d'appel vers la consolidation groupe avec CA groupe, valeur stock groupe, nombre d'alertes | `/promoteur/consolidation` | P2 \[DSH-09\] |
| TDB-17 | Suppression des valeurs de repli | Retirer les constantes codées en dur (`4.2 °C`, `21.4 °C`, `98.4`) de `tableau-de-bord.tsx` : afficher « Mesure manquante » et lever une alerte | — | P1 \[§0.3 règle 11\] |

### 2.4 Contrat API — `GET /api/dashboard/synthese`

Un seul appel, borné à l'officine de l'en-tête `X-Officine-Id`, réponse mise en cache 60 s côté serveur. Paramètres : `periode` (`jour` | `semaine` | `mois`, défaut `jour`), `comparaison` (`1`/`0`).

```jsonc
{
  "status": "success",
  "data": {
    "genere_le": "2026-11-11T08:12:44+01:00",
    "officine_id": "off1",
    "periode": "jour",
    "activite": {
      "ca_ttc": 145000, "ca_ht": 122881, "tva": 22119,
      "nb_tickets": 24, "panier_moyen": 6042, "marge_brute": 31200,
      "comparaisons": { "veille": 8.4, "semaine_precedente": -2.1, "annee_precedente": 14.7 },
      "par_mode_reglement": { "especes": 62000, "mobile_money": 71000, "carte": 12000 },
      "courbe_horaire": [{ "heure": 8, "ca": 9000 }, { "heure": 9, "ca": 17500 }]
    },
    "caisse": {
      "session": { "id": "sess1", "numero_session": "CAISSE-2026-0021", "caissier": "Gervais KPADONOU",
                    "fond_caisse_ouverture": 50000, "encaisse_especes": 62000, "opened_at": "..." },
      "derniere_cloture": { "ecart_caisse": -1500, "closed_at": "..." },
      "paiements_en_attente": 2, "echeances_7_jours": 125000
    },
    "stock": {
      "valeur_achat": 4850000, "nb_references": 142, "ruptures": 6, "sous_minimum": 11,
      "peremptions": { "a_6_mois": 9, "a_3_mois": 4, "a_1_mois": 2, "valeur_exposee": 187000 },
      "dormants": 8
    },
    "qualite": {
      "score_bpd": 96.5, "score_par_chapitre": [{ "chapitre": 7, "libelle": "Accueil et dispensation", "score": 94.2 }],
      "nc_ouvertes": 2, "nc_en_retard": 1, "temperature_realises": 2, "temperature_prevus": 2,
      "excursions_ouvertes": 0, "rappels_en_cours": 0, "vigilances_ouvertes": 1, "documents_a_reviser": 3
    },
    "personnel": { "presents": 5, "retards": 1, "absents": 2, "pharmacien_present": true,
                    "pharmacien_nom": "Dr. Marcelle HOUNNOU", "heures_supplementaires_mois": 12.5 },
    "achats": { "commandes_en_cours": 3, "commandes_en_retard": 1, "litiges": 0, "dettes_a_echeance": 450000 },
    "comptabilite": { "resultat_mois_provisoire": 1240000, "tva_estimee": 386000,
                       "echeances": [{ "libelle": "TVA mensuelle", "date": "2026-11-20", "montant": 386000 }] },
    "anti_fraude": [ { "caissier": "Gervais KPADONOU", "annulations": 2, "remises": 3500,
                        "retours": 1, "ecarts_caisse": -1500, "ventes_hors_horaires": 0, "niveau": "important" } ],
    "groupe": { "nombre_officines": 2, "ca_jour_total": 290000, "valeur_stock_totale": 9700000, "alertes": 3 }
  }
}
```

**Règles de contrat** : tous les montants sont des entiers FCFA (ou `number` sans décimale superflue) ; toute absence de mesure est `null`, jamais une valeur par défaut ; chaque bloc est calculé même si une source tombe (le bloc défaillant porte `"indisponible": true` et alimente une alerte de niveau information).

### 2.5 Règles de gestion

- **RG-T01 (P1)** : le tableau de bord n'affiche **aucune** donnée nominative de patient ; un forage vers un détail nominatif n'est possible que pour un rôle autorisé, et cette lecture est journalisée \[DP-03, DP-06, AC-02\].
- **RG-T02 (P1)** : une synthèse ne mélange jamais deux officines ; en cas de rattachements multiples, l'officine active est celle de `useOfficine()` et le bloc groupe est le seul à consolider.
- **RG-T03 (P1)** : un indicateur dont la source est en panne affiche « Indisponible » et lève une alerte, il ne prend pas la valeur 0 (le zéro est une information métier).
- **RG-T04 (P1)** : l'absence de pharmacien pointé pendant les heures d'ouverture est une alerte **critique** permanente, non masquable, tant que l'état persiste \[art. 1.11, RG-D06\].
- **RG-T05 (P2)** : les seuils anti-fraude (montant de remise, nombre d'annulations, écart de caisse) sont des paramètres d'officine versionnés ; leur modification est journalisée.
- **RG-T06 (P1)** : la synthèse est recalculée à chaque mutation du chaînage automatique (invalidation `["dashboard","synthese", officineId]`).
- **RG-T07 (P2)** : en hors-ligne, le tableau de bord reste lisible avec l'horodatage de la dernière synthèse ; aucune action de validation n'est proposée.

### 2.6 Modales

Détail d'un indicateur (drill-down) · Paramétrage des alertes (niveau, canal, plage horaire) · Approbation d'une annulation de ticket · Aperçu et historique des résumés quotidiens · Personnalisation des blocs.

### 2.7 Critères d'acceptation

- Ouvrir `/dashboard` avec le compte promoteur affiche en un seul appel les blocs activité, caisse, stock, qualité, personnel ; l'horodatage de la synthèse est visible.
- Aucune valeur de démonstration codée en dur ne subsiste : couper une source (fixture absent) affiche « Indisponible » et non un nombre inventé.
- Un caissier connecté ne voit ni les données cliniques ni la comptabilité ; un dispensateur ne voit pas le détail nominatif des ventes d'un autre agent.
- L'absence de pharmacien pointé déclenche le bandeau critique et une alerte dans `NotificationsSheet`.
- Cliquer sur « 2 péremptions à 1 mois » ouvre `/dashboard/stock?tab=peremptions` filtré à 1 mois.
- Sur une largeur de 360 px, tous les blocs s'empilent sans débordement horizontal et les zones tactiles mesurent au moins 48 px.
- `ecrans-demo.test.tsx` couvre `index` avec ses fixtures ; le test « n'invente aucune alerte sans données » reste vert.

---

## 3. Page « Caisse POS Tactile » (`/dashboard/vente`, alias `/caisse`)

### 3.1 Objectif

Encaisser au comptoir, sur téléphone, tablette ou poste fixe, en moins de trois écrans pour une vente simple \[NF-10\], avec déstockage FEFO automatique, reçu normalisé DGI, écriture comptable, et paiement Mobile Money via FeexPay — sans jamais vendre un produit interdit \[O4, RG-D02\].

### 3.2 Zones de la page

| Zone | Contenu |
| --- | --- |
| Bandeau de session | Session ouverte (numéro, caissier, fond, encaissé) ou bloc d'ouverture ; bouton « Ticket X » ; bouton « Clôturer (Z) » ; état réseau et file hors-ligne |
| Catalogue et recherche | Recherche par nom, DCI ou code-barres ; scan caméra / douchette ; grille de sélection rapide ; filtres classe (libre, liste I, liste II, stupéfiant, thermolabile) ; stock et lot FEFO affichés |
| Panier (ticket comptoir) | Lignes avec produit, lot FEFO retenu, quantité, PU TTC, TVA, total ; modification de quantité ; suppression de ligne ; remise par ligne et remise globale ; sous-totaux HT / TVA / TTC ; net à payer |
| Règlement | Mode (espèces, Mobile Money, carte, chèque, crédit client, prise en charge, mixte) ; montant reçu ; monnaie rendue ; panneau FeexPay (opérateur, numéro, QR, statut temps réel) ; client et IFU ; validation |
| Après-vente | Aperçu du reçu normalisé avec QR et code e-MECeF, impression thermique, envoi SMS / WhatsApp / e-mail ; avoir ; annulation |
| Journaux | Tickets de la session, ordonnancier de ventes, cahier Mobile Money, mouvements de caisse hors ventes, rapprochement FeexPay, écarts et anti-fraude |

### 3.3 Fonctionnalités

| Réf. | Fonctionnalité | Détail | API | Prio. |
| --- | --- | --- | --- | --- |
| CAI-01 | Ouverture de caisse | Session ouverte avec fond de caisse compté et validé ; **une seule session ouverte par caissier et par caisse** ; numéro `CAISSE-AAAA-NNNN` ; ouverture journalisée avec agent et heure exacte ; blocage de la vente tant qu'aucune session n'est ouverte (l'auto-création silencieuse actuelle de `VenteCaisseController@store` doit devenir une **exception tracée**, paramétrable) | `GET /caisse/session-active`, `POST /caisse/ouvrir` | P1 |
| CAI-02 | Modes de paiement | Espèces, Mobile Money direct, FeexPay, carte, chèque, crédit client, prise en charge organisme, **paiement mixte** (plusieurs modes sur un même ticket, avec ventilation par ligne de règlement) | `POST /caisse/ventes` + table `reglements` à créer | P1 |
| CAI-03 | Reçu normalisé | Chaque vente encaissée émet un reçu conforme au dispositif de facturation normalisée DGI : numéro de facture, IFU, NIM machine, code e-MECeF, signature, QR ; **aucune vente n'est comptabilisée sans reçu** ; le reçu porte la mention du régime de TVA par ligne (groupe A exonéré / groupe B taxable) | `EmecefService` (fait) · voir page Facturation §5 | P1 \[INT-04\] |
| CAI-04 | Impression et envoi | Impression thermique 80 mm ; envoi du reçu par SMS, WhatsApp ou e-mail à la demande ; duplicata horodaté portant « Duplicata » ; chaque envoi est journalisé | `POST /caisse/ventes/{id}/envoyer` (nouveau) | P1 |
| CAI-05 | Clôture de caisse | Comptage par mode de paiement, comparaison au théorique, écart justifié (motif obligatoire au-delà du seuil), validation par le pharmacien, rapports X et Z, archivage de la clôture | `GET /caisse/session/{id}/ticket-x`, `POST /caisse/session/{id}/fermer` | P1 |
| CAI-06 | Mouvements de caisse | Entrées et sorties hors ventes (dépense, remise de fonds, versement en banque, retrait) avec pièce jointe, motif, catégorie et validation ; registre chronologique inaltérable ; impact sur le théorique de clôture | `GET/POST /caisse/mouvements` (nouveau) | P1 |
| CAI-07 | Mode hors-ligne | Les ventes espèces se poursuivent sans connexion ; mise en file avec `client_op_id` ; à la reconnexion, synchronisation dans l'ordre et certification des reçus dus ; compteur local visible (« 3 tickets en attente de synchronisation ») | outbox + `POST /sync/push` | P1 |
| CAI-08 | Contrôle des écarts | Alerte au promoteur sur annulations, remises, retours et écarts inhabituels par caissier ; seuils paramétrables ; alimentation de TDB-10 | synthèse | P2 |
| VTE-01 | Poste de vente | Recherche par nom, DCI ou code-barres en < 500 ms sur 20 000 références \[NF-01\] ; scan caméra ou douchette ; panier ; quantités ; **intégration du parcours BPD-7 pour tout produit sur ordonnance** : un produit de liste I/II ou stupéfiant ne peut entrer au panier que rattaché à une dispensation validée | `GET /produits?vendables=1`, `/stocks` | P1 \[RG-D01\] |
| VTE-02 | Vente libre et conseil | Pour les produits de conseil, le parcours hors prescription (DSP-20) doit être tracé avant encaissement ; case « conseil réalisé » obligatoire selon la liste paramétrable des produits concernés | voir §4 | P1 |
| VTE-03 | Prix et remises | Prix public issu de la fiche produit ; remise par ligne et remise globale ; **plafond par rôle** ; au-delà du seuil, validation obligatoire d'un pharmacien ou du promoteur avec motif ; toute remise est journalisée avec son auteur | `POST /caisse/ventes` + paramètres `caisse.remise_max_*` | P1 |
| VTE-04 | Taxes | Taux de TVA par produit selon son régime fiscal (groupe A exonéré 0 %, groupe B taxable 18 %), paramétrable ; calcul HT / TVA / TTC par ligne puis global ; cohérence obligatoire avec les totaux A et B du QR DGI | fait (`lignes_vente.taux_tva`, `groupe_taxation`) | P1 |
| VTE-05 | Prise en charge par un organisme | Part du patient et part de l'organisme (assurance, mutuelle, employeur) ; bon de prise en charge téléversé et vérifié ; suivi des règlements et des rejets ; facture organisme | tables `organismes`, `prises_en_charge` à créer | P2 |
| VTE-06 | Vente à crédit | Compte client, plafond, échéance, relances automatiques ; réservée aux clients autorisés par le promoteur ; le ticket indique « non réglé » et n'alimente pas la trésorerie | tables `clients`, `comptes_clients` à créer | P2 |
| VTE-07 | Avoir et retour client | Avoir **lié à la vente d'origine**, numéroté `AV-…` et certifié en facture d'avoir `EV` ; retour en stock **interdit pour un médicament** \[BPD8-F01\], possible pour un produit non pharmaceutique selon la règle paramétrée de l'officine ; motif obligatoire ; validation pharmacien | `POST /caisse/ventes/{id}/avoir` (nouveau) | P1 |
| VTE-08 | Annulation | Annulation d'un ticket avec motif, validation selon le seuil, **le ticket annulé reste visible dans le journal** avec la mention « annulé », son auteur et l'heure ; jamais de suppression physique ; contre-passation du mouvement de stock et de l'écriture comptable | `POST /caisse/ventes/{id}/annuler` (nouveau) | P1 |
| VTE-09 | Ventes en attente | Plusieurs paniers simultanés sur un même poste (mise en attente / reprise), avec nom du panier et ancienneté visible ; conservation locale | état local + `POST /caisse/paniers` (P3 côté serveur) | P2 |
| VTE-10 | Ordonnancier de ventes | Journal chronologique de toutes les ventes soumises à dispensation sur prescription, avec lien vers la dispensation d'origine | `GET /caisse/ventes?sur_ordonnance=1` | P1 |
| FPX-01 | Paiement au comptoir | Le caissier choisit « FeexPay », saisit le numéro et l'opérateur (MTN, Moov, Celtiis) ou affiche un QR ; la demande part vers le téléphone du client | `POST /caisse/ventes/{id}/feexpay` (nouveau) | P1 |
| FPX-02 | Suivi en temps réel | Statuts : en attente, réussi, refusé, expiré, annulé ; réception par webhook avec **vérification de signature** ; délai d'attente paramétrable ; l'UI interroge le statut toutes les 15 s et affiche un compte à rebours | `POST /webhooks/feexpay` (nouveau), `GET /caisse/paiements/{ref}` | P1 |
| FPX-03 | Validation de la vente | La vente n'est clôturée et le reçu n'est émis **qu'après confirmation** du paiement ; en cas d'échec, retour au panier ou autre mode de paiement ; la vente reste « en attente de règlement » et n'entre pas dans le CA | `VenteCaisseController` | P1 |
| FPX-04 | Paiement à distance | Lien de paiement envoyé par SMS ou WhatsApp pour une commande ou une facture client ; suivi du statut ; expiration paramétrable | `POST /caisse/liens-paiement` (nouveau) | P2 |
| FPX-05 | Idempotence | Référence unique par transaction ; un doublon de notification ne crée pas second règlement (contrainte UNIQUE sur `reference_feexpay`, déjà en place) | fait | P1 |
| FPX-06 | Remboursement | Remboursement total ou partiel d'une transaction depuis l'avoir client, avec validation du pharmacien ; statut et référence du remboursement conservés | `POST /caisse/paiements/{ref}/rembourser` | P2 |
| FPX-07 | Rapprochement | Rapprochement quotidien entre transactions FeexPay, encaissements de caisse et relevé de reversement ; écarts listés et exportables ; alerte si un écart subsiste à la clôture | `GET /caisse/rapprochement-feexpay` (nouveau) | P1 |
| FPX-08 | Frais et comptabilité | Frais de transaction enregistrés et ventilés ; écriture automatique de produit, de frais et de créance sur l'agrégateur jusqu'au reversement | `SyscohadaService` à étendre | P1 |
| FPX-09 | Sécurité | Clés d'API chiffrées, propres à chaque officine, hors dépôt ; aucune donnée de carte conservée ; numéro de téléphone **masqué** à l'affichage (`+229 •• •• 45 67`) ; journalisation de chaque appel | paramètres + `.env` | P1 |
| FPX-10 | Cahier Mobile Money | Registre de tous les paiements mobiles (date, opérateur, numéro masqué, montant, statut, référence) remplaçant le cahier papier GAD-EN-002 ; export CSV/PDF ; conservation 10 ans | `GET /caisse/cahier-mobile-money` (nouveau) | P1 |
| POS-11 | Ticket X intermédiaire | Rapport de session non destructif à tout moment : nombre de ventes, CA, espèces théoriques, Mobile Money, carte ; imprimable | `GET /caisse/session/{id}/ticket-x` (fait) | P1 |
| POS-12 | Clavier et douchette | Champ de recherche toujours actif ; Entrée ajoute la ligne ; `+`/`-` ajuste la quantité ; `F2` ouvre le règlement ; `F4` met le panier en attente ; le lecteur code-barres agit comme un clavier suivi d'Entrée | — | P1 |
| POS-13 | Blocages pharmaceutiques au panier | Refus explicite et motivé pour un lot périmé, rappelé, en quarantaine, rejeté ou « à évaluer » ; refus d'un stupéfiant / liste I / II sans dispensation validée ; refus de vente si aucun pharmacien n'est pointé (mode blocage ou alerte avec justification, paramétrable) | `/stocks`, `/pointages/actif` | P1 \[RG-D01, RG-D02, RG-D06\] |
| POS-14 | Reçu provisoire hors-ligne | En l'absence de réseau, émission d'un reçu provisoire numéroté localement avec mention « Certification DGI en attente de synchronisation » ; le ticket passe en file et la facture e-MECeF est émise au rejeu | outbox + `EmecefService` | P1 \[CAI-07\] |

### 3.4 Règles de gestion

- **RG-C01 (P1)** : aucune vente sans session de caisse ouverte ; aucune session ouverte sans fond de caisse saisi.
- **RG-C02 (P1)** : une vente validée est immuable. Correction par avoir (VTE-07) ou annulation validée (VTE-08) uniquement, les deux liés au ticket d'origine \[NF-07\].
- **RG-C03 (P1)** : la remise au-delà du plafond du rôle exige une validation nominative (pharmacien ou promoteur) avec motif ; le validateur et le motif sont conservés sur la ligne.
- **RG-C04 (P1)** : l'annulation d'un ticket est refusée au caissier au-delà du seuil paramétré ; le ticket annulé reste lisible dans le journal, avec contre-passation du stock et de la comptabilité.
- **RG-C05 (P1)** : un règlement FeexPay non confirmé ne produit ni reçu normalisé, ni CA, ni écriture comptable ; la vente reste « en attente de règlement » et expire après le délai paramétré.
- **RG-C06 (P1)** : la clôture de caisse exige un comptage par mode de paiement ; un écart au-delà du seuil exige un motif et la validation du pharmacien ; la clôture est archivée et alimente `/comptabilite/clotures`.
- **RG-C07 (P1)** : un médicament retourné ne revient jamais en stock ; il part en circuit retours/destruction (page Stock, hors périmètre) avec trace \[BPD8-F01\].
- **RG-C08 (P2)** : le crédit client est refusé au-delà du plafond ou pour un client non autorisé ; chaque échéance non réglée alimente les alertes et l'échéancier.
- **RG-C09 (P1)** : le montant reçu et la monnaie rendue sont recalculés serveur (jamais confiance au client) ; un `montant_recu` inférieur au net TTC en espèces refuse la validation.
- **RG-C10 (P2)** : toute ouverture de tiroir, tout envoi de reçu et toute impression de duplicata sont journalisés.

### 3.5 Modales

Ouverture de session (fond de caisse) · Ticket X · Clôture Z (comptage par mode, écart, motif, validation) · Règlement FeexPay (opérateur, numéro, QR, statut temps réel) · Remise au-delà du seuil (validation + motif) · Annulation de ticket (motif + validation) · Avoir / retour client · Mouvement de caisse hors vente · Envoi du reçu (SMS / WhatsApp / e-mail) · Détail d'un ticket · Panier en attente.

### 3.6 Critères d'acceptation

- Une vente de 2 lignes en espèces est encaissée en moins de 2 s hors paiement externe \[NF-02\] et produit : ticket `TCK-…`, facture e-MECeF, écritures SYSCOHADA, décrément FEFO du lot le plus proche de la péremption, session mise à jour.
- Ajouter au panier un produit dont le seul lot disponible est périmé affiche un refus explicite avec le motif et ne permet pas de continuer.
- Ajouter un stupéfiant sans dispensation validée est refusé avec renvoi vers `/dashboard/dispensation`.
- Une remise de 25 % saisie par un caissier dont le plafond est 5 % déclenche la modale de validation pharmacien ; sans validation, la vente ne passe pas.
- Un paiement FeexPay laissé en attente expire après le délai paramétré ; le ticket n'apparaît pas dans le CA et aucun reçu n'est émis ; un second webhook identique ne crée pas de second règlement.
- La clôture Z affiche le théorique par mode, l'écart, exige un motif au-delà du seuil et archive la session ; le rapport Z est imprimable.
- Un mouvement de caisse « versement en banque 200 000 FCFA » réduit d'autant les espèces théoriques à la clôture.
- En coupant le réseau : la vente espèces passe en file avec un reçu provisoire, le compteur « en attente de synchronisation » s'incrémente, et au retour du réseau les tickets sont certifiés dans l'ordre sans doublon.
- Un avoir sur un ticket de médicament ne remet pas le produit en stock et émet une facture `EV`.

---

## 4. Page « Dispensation & Ordonnances » (`/dashboard/dispensation`)

### 4.1 Objectif

Numériser l'acte pharmaceutique complet du chapitre 7 du Guide (art. 7.1 à 7.75) : accueil et identification, ordonnance, analyse réglementaire puis pharmaceutique, décision du pharmacien, intervention le cas échéant, collecte contrôlée par scan, enregistrements réglementaires, délivrance avec conseil et vérification de la compréhension, notification des vigilances. C'est le cœur métier ; la page est aussi le point d'entrée obligatoire de toute vente de produit sur ordonnance \[RG-D01\].

### 4.2 Onglets

| Onglet | Contenu |
| --- | --- |
| Nouveau parcours | Assistant de dispensation en 7 étapes (voir 4.3) |
| Ordonnancier | Registre chronologique des dispensations sur prescription, filtres, visa pharmacien |
| Conseils et ventes libres | Parcours hors prescription, protocoles de conseil, cahier des conseils (GAD-EN-001) |
| Interventions pharmaceutiques | Fiches IP, prescripteurs contactés, issues, statistiques par type |
| Dossiers patients | Patients, historique thérapeutique, dossier pharmaceutique et consentements, allergies et terrain |
| Vigilances | Notifications d'événements indésirables, registre, statuts, transmission ABMed |
| Erreurs et écarts | Registre des erreurs de délivrance (GAD-EN-003), NC/CAPA liées |

### 4.3 Parcours de dispensation sur prescription (assistant en 7 étapes)

Étapes imposées par les art. 7.14 à 7.42 ; l'ordre n'est pas modifiable, une étape non conforme bloque la suivante :

1. **Accueil et identification** (art. 7.9 à 7.13) — patient ou mandataire, identité obligatoire pour les produits à délivrance contrôlée, marquage « entretien confidentiel » qui masque le motif sur les écrans partagés.
2. **Ordonnance** (art. 7.14, 7.19) — photo ou scan, prescripteur du référentiel (ou création), date, durée de validité, produits prescrits.
3. **Analyse réglementaire** (art. 7.19) — check-list : authenticité (support, cohérence médicale, existence du prescripteur, lisibilité), qualité du prescripteur, conformité rédactionnelle et réglementaire (durée de prescription, règles des listes et stupéfiants) ; **résultat obligatoire avant délivrance**.
4. **Analyse pharmaceutique** (art. 7.22 à 7.24) — contenu puis contexte ; alertes de la banque de données médicaments sur trois niveaux ; acceptation ou rejet motivé.
5. **Décision du pharmacien** (art. 7.18, 7.25 à 7.28) — délivrer, surseoir, modifier, refuser ; intervention pharmaceutique le cas échéant ; seul un pharmacien valide.
6. **Collecte et contrôle par scan** (art. 7.31) — chaque boîte scannée : concordance, forme et dosage, péremption, intégrité, conditions de conservation ; lot FEFO proposé, refus systématique d'un produit interdit.
7. **Délivrance, conseil et enregistrements** (art. 7.32 à 7.42) — registres, mentions et étiquettes, conseil par médicament, vérification de la compréhension, remise des documents, puis envoi vers l'encaissement.

### 4.4 Fonctionnalités

| Réf. | Fonctionnalité | Détail | Prio. |
| --- | --- | --- | --- |
| DSP-01 | Accueil et identification | Fiche d'accueil rapide (patient ou mandataire) ; identité obligatoire pour les produits à délivrance contrôlée ; marqueur « entretien confidentiel » \[BPD7-F01\] | P1 |
| DSP-02 | Dossier patient et historique médicamenteux | Âge, sexe, poids, taille, traitements en cours, allergies, contre-indications, grossesse / allaitement ; historique de toutes les délivrances de l'officine ; **tenu même sans consentement au DP** \[BPD7-F02, DP-02\] | P1 |
| DSP-03 | Dossier pharmaceutique et consentement | Ouverture uniquement avec consentement enregistré (date, forme, auteur) ; résultats d'analyses et antécédents si fournis ; deux niveaux distincts en base \[BPD7-F03, DP-01\] | P1 |
| DSP-04 | Saisie de l'ordonnance | Photo / scan téléversé, prescripteur du référentiel ou créé, date, validité, quantités prescrites ; contrôle de la durée de validité ; conservation de l'image selon la règle (3 ans pour les stupéfiants) \[BPD7-F04, NF-08\] | P1 |
| DSP-05 | Analyse réglementaire guidée | Check-list paramétrable par type de prescription (ordinaire, liste I, liste II, stupéfiant, MDS) ; chaque item : conforme / non conforme / non applicable avec commentaire ; résultat global obligatoire avant l'étape suivante \[BPD7-F05\] | P1 |
| DSP-06 | Aide à l'analyse pharmaceutique | Interrogation de la banque de données médicaments : objectif thérapeutique, contre-indications, interactions, redondances, posologie, mode d'administration, durée, effets indésirables, précautions ; alertes à trois niveaux (information, attention, bloquante) ; acceptation ou ignorance **avec motif obligatoire et journalisé** \[BPD7-F06, RG-D05, RG-D07\] | P1 |
| DSP-07 | Analyse du contexte | Observance, causes de mauvaise observance, traitements antérieurs, état physiopathologique, alternatives thérapeutiques en cas d'interaction \[BPD7-F07\] | P2 |
| DSP-08 | Décision et validation pharmacien | Délivrer / surseoir / modifier / refuser ; signature par code personnel, horodatage serveur ; un refus bloque la délivrance et propose la notification au prescripteur ; un non-pharmacien ne peut pas valider \[BPD7-F08, RG-D03\] | P1 |
| DSP-09 | Intervention pharmaceutique (IP) | Fiche : type (substitution, posologie, refus, interaction, redondance, contre-indication), description, prescripteur contacté (mode, date, réponse), résultat ; PDF expédié au prescripteur ; archivée 5 ans (GAD-FI-001) ; statistiques par type \[BPD7-F09\] | P1 |
| DSP-10 | Substitution et modification | Le système demande si l'accord du prescripteur est obtenu ou s'il s'agit d'une urgence dans l'intérêt du patient, avec justification ; la modification ou le refus est imprimable pour report sur l'ordonnance ; case « compréhension vérifiée » obligatoire en cas de substitution \[BPD7-F10, RG-D04, BPD7-F18\] | P1 |
| DSP-11 | Renouvellement de traitement | Questions sur observance, ressenti, effets indésirables ; si un effet indésirable est signalé, ouverture automatique de la notification de vigilance ; évaluation des décisions de la délivrance précédente \[BPD7-F11\] | P1 |
| DSP-12 | Collecte et contrôle par scan | Scan de chaque boîte : concordance avec la prescription, forme et dosage, date de péremption, intégrité de l'emballage (case à cocher), conditions de conservation ; lot FEFO proposé par défaut, autre lot possible avec justification ; refus systématique d'un produit périmé, rappelé, en quarantaine ou rejeté \[BPD7-F12, RG-D02\] | P1 |
| DSP-13 | Enregistrement des délivrances | Historique thérapeutique renseigné dans tous les cas ; DP renseigné si consentement \[BPD7-F13\] | P1 |
| DSP-14 | Registres à régime particulier | Transcription immédiate des listes I et II, stupéfiants et médicaments dérivés du sang avec toutes les mentions requises (numéro d'ordre, date, patient, prescripteur, produit, quantité, lot) ; registre inaltérable, verrouillé à la validation \[BPD7-F14, INT-02, art. 3.8\] | P1 |
| DSP-15 | Mentions sur l'ordonnance et les boîtes | Impression du timbre de l'officine, des numéros d'enregistrement, de la date d'exécution et des quantités (original et duplicata) ; posologie pour les listes I et II ; étiquette de boîte pour les stupéfiants (posologie, numéro d'ordre, nom et adresse du pharmacien) \[BPD7-F15\] | P1 |
| DSP-16 | Conseil par médicament | Fiche générée par produit : indication, modalités d'administration, modalités d'utilisation (spray, collyre, dispositif), précautions et effets secondaires, conservation, observance ; plan de posologie imprimable ; trace dans le cahier des conseils GAD-EN-001 (5 ans) \[BPD7-F16\] | P1 |
| DSP-17 | Conseils d'hygiène, diététique et contrôles biologiques | Rappels associés au traitement \[BPD7-F17\] | P2 |
| DSP-18 | Vérification de la compréhension | Case de confirmation par le pharmacien, obligatoire en cas de substitution ; documents écrits remis et tracés \[BPD7-F18\] | P1 |
| DSP-19 | Erreur de délivrance | Déclaration par un membre de l'équipe ou un patient ; analyse des causes ; mesures préventives et correctives ; **ouverture automatique d'une fiche NC/CAPA liée** ; trace archivée 5 ans (GAD-EN-003) \[BPD7-F19, BPD-C05\] | P1 |
| DSP-20 | Dispensation hors prescription | Questionnement guidé : pour qui (adulte, enfant, nourrisson, personne âgée), symptômes, durée, traitements en cours, état physiopathologique ; issue : conseil, délivrance, refus ou orientation vers un praticien ; évaluation du risque d'usage détourné ou abusif \[BPD7-F20\] | P1 |
| DSP-21 | Protocoles de conseil comptoir | Arbres de décision par motif courant (douleur, fièvre, toux, diarrhée, paludisme suspect, contraception d'urgence…), validés par le titulaire, avec signaux d'alerte et orientation ; bibliothèque modifiable (GAD-LI-001) \[BPD7-F21\] | P2 |
| DSP-22 | Entretien confidentiel et contraception d'urgence | Parcours discret : entretien confidentiel obligatoire, trace limitée au pharmacien, rien d'affiché sur les écrans partagés \[BPD7-F22\] | P2 |
| DSP-23 | Surveillance des ventes anormales | Liste paramétrable de produits sous surveillance ; alerte au pharmacien sur quantité, fréquence ou client inhabituels \[BPD7-F23\] | P2 |
| DSP-24 | Médicaments en accès direct | Liste de la médication officinale présentée au public ; questionnement à la remise ; affichage des informations des autorités \[BPD7-F24\] | P2 |
| DSP-25 | Fourniture aux pharmacies à usage intérieur | Commande écrite ou convention, limitation aux listes autorisées \[BPD7-F25\] | P3 |
| DSP-26 | Vigilances | Formulaire de pharmacovigilance, matériovigilance, réactovigilance, hémovigilance : patient (initiales, âge, sexe), produit, lot, dates, description, gravité, caractère inattendu, évolution, notificateur ; préremplissage depuis la délivrance ; export PDF du formulaire officiel ; accusé de réception archivé 10 ans (GAD-FI-002) ; statut (brouillon, envoyée, accusée, clôturée) et alerte de délai ; registre filtrable ; **quarantaine automatique du lot si plusieurs signalements le concernent** \[BPD7-V01 à V05\] | P1 |
| DSP-27 | Effet grave ou inattendu | Rappel de contacter le médecin ; contact tracé (date, interlocuteur, décision) \[BPD7-V03\] | P1 |
| DSP-28 | Éducation et prévention | Médiathèque de documents validés (art. 3.29) avec date de mise à jour, envoi SMS ou impression ; contrôle de véracité : un support obsolète est retiré automatiquement ; campagnes de santé publique \[BPD7-E01 à E04\] | P2 |
| DSP-29 | Rapprochement stupéfiants temps réel | La quantité délivrée est rapprochée en temps réel du stock théorique du registre ; un écart déclenche une alerte au titulaire \[RG-D08\] — intégration avec `/dashboard/stupefiants` (lecture seule ici) | P2 |
| DSP-30 | Indicateurs de dispensation | Ordonnances traitées, part avec IP, IP acceptées par le prescripteur, refus de délivrance, alertes ignorées, erreurs déclarées, notifications de vigilance, ordonnances de stupéfiants, conseils tracés / délivrances, délai moyen de dispensation ; alimentent TDB-06 | P1 \[§4.7.5\] |
| DSP-31 | Dispensation à domicile / électronique | Paquet scellé opaque, conditions de transport, droit de rétractation exclu — **reporté en Phase 4**, afficher un état « à venir » \[BPD7-F26\] | P3 |

### 4.5 API

**Existants** : `GET /dispensations`, `POST /dispensations` (allocation FEFO, décrémentation, écriture au registre des stupéfiants), `POST /dispensations/{id}/viser`, `GET /produits`, `GET /stocks`, `GET /officines/{id}/pointages/actif`, `POST /officines/{id}/non-conformites`, `POST /officines/{id}/upload`.

**À créer** (mêmes chemins dans Laravel et dans `mock-backend.mjs`) :

| Endpoint | Usage |
| --- | --- |
| `GET/POST /dispensations/patients` · `GET/PUT /dispensations/patients/{id}` | Référentiel patients, historique thérapeutique |
| `POST /dispensations/patients/{id}/consentement` | Consentement DP (date, forme, auteur) |
| `GET/POST /dispensations/prescripteurs` | Référentiel prescripteurs et structures |
| `POST /dispensations/{id}/analyse-reglementaire` | Check-list et résultat |
| `POST /dispensations/{id}/analyse-pharmaceutique` | Alertes, décisions motivées par alerte |
| `POST /dispensations/{id}/decision` | Délivrer / surseoir / modifier / refuser + signature |
| `GET/POST /dispensations/interventions` · `PUT /dispensations/interventions/{id}` | Fiches IP et issue |
| `POST /dispensations/{id}/scan` | Contrôle d'une boîte (lot, péremption, intégrité) |
| `POST /dispensations/{id}/conseils` | Conseils tracés par ligne + documents remis |
| `POST /dispensations/{id}/comprehension` | Vérification de la compréhension |
| `GET/POST /dispensations/hors-prescription` | Parcours de conseil sans ordonnance |
| `GET/POST /dispensations/protocoles` · `PUT /dispensations/protocoles/{id}` | Arbres de décision validés par le titulaire |
| `GET/POST /dispensations/vigilances` · `POST /dispensations/vigilances/{id}/transmettre` | Notifications et transmission ABMed |
| `GET/POST /dispensations/erreurs` | Registre des erreurs de délivrance |
| `GET /dispensations/indicateurs` | Indicateurs DSP-30 |
| `GET /dispensations/{id}/etiquettes` · `GET /dispensations/{id}/pdf` | Mentions, étiquettes, fiche d'IP, fiche de conseil |

### 4.6 Règles de gestion (rappel des RG-D du cahier d'origine, applicables ici)

RG-D01 stupéfiant / psychotrope / liste I ou II jamais délivré sans ordonnance enregistrée, analysée et validée par un pharmacien · RG-D02 produit périmé, rappelé, en quarantaine, rejeté ou à évaluer jamais vendu, même par le pharmacien · RG-D03 un non-pharmacien prépare mais ne finalise pas sans validation lorsque la règle de l'officine l'exige · RG-D04 toute modification ou tout refus est enregistré et imprimable · RG-D05 allergie ou contre-indication connue = alerte bloquante franchissable uniquement avec motif du pharmacien · RG-D06 dispensation impossible sans pharmacien pointé présent · RG-D07 le journal conserve toute alerte ignorée avec auteur et motif · RG-D08 écart stupéfiants alerté en temps réel.

Compléments propres à l'implémentation :

- **RG-D09 (P1)** : le consentement au DP est un préalable strict à l'écriture dans le DP ; l'historique thérapeutique, lui, est écrit dans tous les cas \[DP-01, DP-02\].
- **RG-D10 (P1)** : les données cliniques ne sont jamais exposées au caissier : l'écran de caisse ne reçoit de la dispensation que les lignes validées, les lots et les montants.
- **RG-D11 (P2)** : un parcours en mode « entretien confidentiel » masque le motif sur tout écran partagé et n'imprime rien sans demande explicite.
- **RG-D12 (P1)** : une dispensation validée ne se modifie pas ; une erreur passe par DSP-19 (erreur de délivrance) avec NC/CAPA.

### 4.7 Téléversements et exports

Ordonnance (photo / scan, ≤ 10 Mo, empreinte SHA-256) · bon de prise en charge · preuves d'erreur de délivrance (photos, note vocale) · formulaire officiel de vigilance (PDF) · fiche d'intervention pharmaceutique (PDF) · plan de posologie et fiches de conseil (PDF, impression 80 mm) · exports : ordonnancier PDF/Excel/CSV, registre des listes I et II, registre des vigilances, cahier des conseils, indicateurs de dispensation.

### 4.8 Modales

Recherche / création d'un patient · Téléversement de l'ordonnance · Check-list d'analyse réglementaire · Détail d'une alerte pharmaceutique avec motif d'acceptation · Décision du pharmacien (signature par code personnel) · Fiche d'intervention pharmaceutique · Scan d'une boîte · Substitution avec accord du prescripteur · Conseil par médicament et plan de posologie · Vérification de la compréhension · Déclaration d'une erreur de délivrance · Notification de vigilance · Parcours hors prescription · Détail d'une dispensation (lecture, avec visa).

### 4.9 Critères d'acceptation

- Un dispensateur peut dérouler les étapes 1, 2, 6 (collecte) mais le bouton « Valider la décision » n'existe pas pour son rôle et l'API renvoie 403 s'il est appelé directement.
- Une ordonnance de stupéfiant sans analyse réglementaire complète ne peut pas atteindre l'étape de délivrance.
- Une allergie déclarée au dossier produit une alerte bloquante ; elle ne se franchit qu'avec le motif du pharmacien, et l'alerte ignorée reste lisible dans le journal avec auteur, motif et heure.
- Aucun pharmacien pointé présent : le parcours est bloqué (ou en alerte avec justification selon le paramètre de l'officine) et le tableau de bord affiche l'alerte critique.
- Le scan d'une boîte dont le lot est en quarantaine refuse la ligne avec le motif et propose le lot FEFO suivant.
- La validation écrit au registre des stupéfiants (numéro d'ordre, mentions) et la quantité délivrée est rapprochée du stock théorique.
- Un effet indésirable signalé au renouvellement ouvre une notification de vigilance préremplie avec le produit, le lot et le patient (initiales uniquement).
- Deux signalements sur un même lot déclenchent la mise en quarantaine automatique du lot.
- Une erreur de délivrance déclarée crée une NC/CAPA liée, visible dans `/dashboard/non-conformites`.
- L'ordonnancier exporté en PDF porte l'en-tête de l'officine, la période, la codification et la date d'édition ; aucune donnée de patient n'apparaît dans un export destiné au comptable.

---

## 5. Page « Facturation DGI e-MECeF » (`/dashboard/facturation`)

### 5.1 Objectif

Tenir le registre officiel des factures normalisées émises au titre du dispositif de facturation de la DGI Bénin : numérotation séquentielle par type, IFU et NIM machine, code de sécurité e-MECeF, signature, QR fiscal, statuts de certification, avoirs, rapprochement des compteurs et exports destinés à l'administration. Cette page est la **preuve fiscale** de chaque vente encaissée à la caisse.

### 5.2 Onglets

| Onglet | Contenu |
| --- | --- |
| Registre des factures | Journal chronologique, filtres (période, type FV/EV, statut, client, IFU client, montant, caissier), recherche par numéro |
| Compteurs et certification | Compteurs séquentiels par type et global, taux de certification, échecs et file de recertification, intégrité de la séquence |
| Vérification d'un reçu | Contrôle d'un reçu présenté par un client ou un agent : scan du QR ou saisie du code e-MECeF, restitution de la facture et de son statut |
| Paramètres fiscaux | IFU de l'officine, NIM machine, régime d'imposition, groupes de taxation, mentions légales du reçu — réservés au promoteur et au comptable |
| Rapprochement et exports | Rapprochement avec la caisse et la comptabilité, export CSV / PDF / fichier de télédéclaration, journal d'audit des exports |

### 5.3 Fonctionnalités

| Réf. | Fonctionnalité | Détail | Prio. |
| --- | --- | --- | --- |
| FDG-01 | Registre inaltérable | Liste paginée des factures avec numéro DGI, date et heure, client et IFU, montant TTC, NIM, code e-MECeF, statut ; aucune suppression ni modification possible ; seule la lecture est proposée | P1 \[INT-02, NF-07\] |
| FDG-02 | Numérotation séquentielle | Format `IFU-ANNÉE-TYPE-COMPTEUR` (type `FV` vente, `EV` avoir) ; compteur par type et compteur global ; **aucun trou** toléré : un échec de certification réserve le numéro et alimente la file de recertification | P1 |
| FDG-03 | Code de sécurité et signature | Code e-MECeF et signature calculés serveur ; affichage tronqué avec copie intégrale sur demande ; toute divergence entre la valeur stockée et la valeur recalculée est une alerte critique d'intégrité | P1 |
| FDG-04 | QR fiscal | Chaîne officielle encodée `F;NIM;IFU;NUMÉRO;CODE;DATE;TTC;TOTAL_A;TOTAL_B;TVA` ; rendu visuel du QR sur le reçu et dans la fiche ; cohérence contrôlée avec les groupes de taxation des lignes | P1 |
| FDG-05 | Aperçu et impression du reçu | Reçu normalisé 80 mm : en-tête officine, « RÉPUBLIQUE DU BÉNIN · DGI e-MECeF », lignes, totaux A/B, TVA, net payé, mode de règlement, code e-MECeF, QR, mentions légales ; duplicata marqué comme tel ; impression journalisée | P1 |
| FDG-06 | Factures d'avoir (EV) | Émission d'un avoir lié à la facture d'origine, avec motif, validation, compteur `EV` distinct ; effet sur les compteurs, la TVA et la comptabilité | P1 |
| FDG-07 | Statuts et file de recertification | Statuts : `certifiee`, `en_attente`, `echouee`, `annulee` ; file des factures à recertifier après une coupure ou un échec ; relance manuelle et automatique ; aucune vente ne reste indéfiniment non certifiée sans alerte | P1 \[CAI-07\] |
| FDG-08 | Vérification d'un reçu | Scan du QR ou saisie du code e-MECeF : restitution de la facture, de son statut, du ticket et de l'officine émettrice ; journalisation de chaque vérification (qui, quand, quoi) | P1 |
| FDG-09 | Paramètres fiscaux | IFU de l'officine, NIM machine, régime d'imposition, taux et groupes de taxation, mentions légales ; versionnés, modifiables uniquement par promoteur / comptable, avec effet daté et journalisé | P1 |
| FDG-10 | IFU client et déductibilité | Saisie de l'IFU client au comptoir ; le reçu porte l'IFU du client ; recherche des factures d'un client par IFU ; contrôle de format | P1 |
| FDG-11 | Rapprochement | Rapprochement journalier entre factures émises, tickets de caisse et écritures de vente SYSCOHADA ; écarts listés (facture sans ticket, ticket sans facture, montant divergent, TVA divergente) ; **un ticket sans reçu normalisé ne génère pas d'écriture comptable de vente** | P1 \[INT-04\] |
| FDG-12 | Liaison comptable | Depuis une facture : accès aux écritures SYSCOHADA générées, à la session de caisse et au ticket ; piste d'audit complète facture → écriture → pièce source | P1 \[CS-05\] |
| FDG-13 | Exports | CSV et PDF du registre sur une période, avec en-tête officine, code, version et date d'édition ; fichier de télédéclaration si le format DGI est imposé (à valider) ; chaque export est journalisé | P1 \[NF-12\] |
| FDG-14 | Indicateurs | Nombre de factures par type et par période, taux de certification, montant certifié, TVA collectée par taux, échecs, délai moyen de certification | P2 |
| FDG-15 | Alerte d'écart de TVA | Alerte si la TVA déclarée diffère de la TVA recalculée à partir des reçus normalisés | P2 \[FIS-06\] |
| FDG-16 | Intégration réelle du dispositif | Remplacement de la certification simulée (`EmecefService` : hachage SHA-256 local pour le code e-MECeF, signature DGI reconstituée) par l'intégration du dispositif officiel — **modalités à obtenir de la DGI** (§9, point 2) ; l'interface doit isoler ce branchement derrière un contrat de service pour permettre le basculement sans réécrire les écrans | P1 |

### 5.4 Règles de gestion

- **RG-F01 (P1)** : une facture e-MECeF n'existe que pour une vente payée ; un avoir n'existe que lié à une facture d'origine.
- **RG-F02 (P1)** : les compteurs sont strictement croissants et sans trou ; un numéro réservé par une certification échouée reste visible avec son statut.
- **RG-F03 (P1)** : aucune facture ne peut être modifiée ni supprimée, y compris par un administrateur ; la base rejette l'opération.
- **RG-F04 (P1)** : les totaux A (exonéré) et B (taxable) du QR doivent égaler la somme des lignes correspondantes ; toute divergence bloque l'émission.
- **RG-F05 (P2)** : les paramètres fiscaux sont datés : une facture conserve l'IFU, le NIM et les taux en vigueur à son émission.
- **RG-F06 (P1)** : la vérification d'un reçu et tout export sont journalisés dans `audit_logs`.

### 5.5 Modales

Détail d'une facture (lignes, totaux A/B, TVA, QR, signature, écritures liées, ticket) · Impression / envoi du reçu · Émission d'un avoir (motif, validation) · Relance de certification · Vérification d'un reçu (scan ou saisie du code) · Paramètres fiscaux (promoteur) · Export du registre (période, format).

### 5.6 Critères d'acceptation

- Une vente encaissée à la caisse apparaît immédiatement dans le registre avec son numéro DGI, son code e-MECeF, son QR et le statut `certifiee`.
- Le total A + le total B du QR égalent le total des lignes ; une ligne exonérée ne contribue pas au total B.
- Un avoir sur une facture émet une facture `EV` liée, incrémente le compteur `EV` sans toucher le compteur `FV`, et génère les écritures d'extourne.
- Une certification échouée laisse la vente en `en_attente` avec son numéro réservé, alimente la file de recertification et lève une alerte ; la relance aboutit sans créer de doublon.
- Le scan d'un QR inconnu ou altéré renvoie « Reçu introuvable ou non conforme » sans révéler d'information sur d'autres officines.
- Le rapprochement du jour liste explicitement tout ticket sans facture et toute facture sans ticket.
- Un dispensateur n'accède ni aux paramètres fiscaux ni au rapprochement comptable.
- L'export CSV du registre sur une période porte l'en-tête officine, le code du document, la version et la date d'édition, et son émission est visible dans le journal d'audit.

---

## 6. Page « Consolidation Groupe » (`/dashboard/consolidation`)

### 6.1 Objectif

Donner au promoteur la vue groupe : comparaison de ses officines sur les indicateurs clés, classement, détection des opportunités de transfert de stock, pilotage des transferts inter-officines jusqu'à réception \[DSH-09\]. Accès strictement réservé aux utilisateurs rattachés à plusieurs officines.

### 6.2 Fonctionnalités

| Réf. | Fonctionnalité | Détail | Prio. |
| --- | --- | --- | --- |
| CGL-01 | KPI groupe | CA du jour et du mois, valeur du stock (prix d'achat moyen), péremptions critiques < 30 jours, écarts et NC ouvertes, nombre d'officines ; horodatage | P1 |
| CGL-02 | Tableau comparatif | Par officine : ville et licence, présence pharmacien (art. 1.11), CA jour, valeur stock, score BPD, péremptions < 30 j, action ; tri par colonne | P1 |
| CGL-03 | Classement par indicateur | Classement dynamique (CA, marge, score BPD, ruptures, péremptions) avec écart au meilleur et au moyen | P2 |
| CGL-04 | Comparaison de périodes | Jour / semaine / mois / année, et comparaison avec la période précédente ; courbes par officine | P2 |
| CGL-05 | Opportunités de transfert | Suggestions issues de la consolidation (produit, lot, source, destination, quantité suggérée, motif : rupture, péremption proche, dormance) ; transformation en transfert en un geste | P1 |
| CGL-06 | Initiation d'un transfert | Origine, destination, produit, lot, quantité, motif ; contrôle du stock disponible et du statut vendable du lot ; numéro `TRF-AAAA-NNNN` ; sortie de stock à l'origine avec mouvement tracé | P1 |
| CGL-07 | Réception d'un transfert | Validation par le destinataire avec contrôle quantitatif et qualitatif ; écart déclaré avec motif ; entrée de stock à destination ; le transfert est clos et immuable | P1 |
| CGL-08 | Suivi des transferts | Liste avec origine → destination, produits et lots, statut (validé, en transit, réceptionné, écart), dates, auteurs | P1 |
| CGL-09 | Bascule d'officine | Passer d'un site à l'autre sans recharger, avec confirmation de l'officine active dans la barre d'état | P1 |
| CGL-10 | Alertes groupe | Toute alerte critique d'une officine remonte au promoteur : absence de pharmacien, excursion de température, écart de caisse, rappel de lot, péremption critique | P1 |
| CGL-11 | Export et partage | Export PDF / Excel du tableau comparatif et des transferts ; envoi du résumé groupe par e-mail ou WhatsApp | P2 |
| CGL-12 | Cloisonnement | Un utilisateur mono-officine ne voit pas la page ; l'API refuse toute consolidation incluant une officine non rattachée \[AC-01\] | P1 |

### 6.3 API

Existants : `GET /promoteur/consolidation`, `GET /promoteur/transferts`, `POST /promoteur/transferts`, `POST /promoteur/transferts/{id}/receptionner`.
À créer : `GET /promoteur/consolidation?periode=…&comparaison=1` (extension), `GET /promoteur/classement?indicateur=…`, `GET /promoteur/alertes`, `PUT /promoteur/transferts/{id}/ecart` (déclaration d'écart à la réception), `GET /promoteur/consolidation/export`.

### 6.4 Critères d'acceptation

- Un promoteur de 2 officines voit les deux sites, les KPI groupe et peut classer par CA.
- Un utilisateur rattaché à une seule officine reçoit un 403 sur `/promoteur/consolidation` et ne voit pas l'entrée de menu.
- Un transfert de 15 boîtes d'un lot proche de la péremption sort du stock de l'origine dès la validation et n'entre à destination qu'à la réception ; un écart de 2 boîtes est déclaré avec motif et visible dans le suivi.
- Aucune donnée nominative de patient n'apparaît dans la consolidation.
- L'export PDF porte la période, la liste des officines et la date d'édition.

---

## 7. Page « Pharmacies de Garde » (`/dashboard/gardes`)

### 7.1 Objectif

Publier et tenir à jour les tours de garde de l'officine et des officines voisines : garde en cours mise en avant, déclaration d'une période, recherche par commune et quartier, affiche vitrine imprimable, information du public et de l'équipe. S'appuie sur la procédure « Ouverture et Fermeture de l'officine et Gestion des Gardes » du corpus BEG (`0000. DIGIT ABMEB/2.RESSOURCES ET COLLABORATION/`).

### 7.2 Fonctionnalités

| Réf. | Fonctionnalité | Détail | Prio. |
| --- | --- | --- | --- |
| GRD-01 | Garde en cours | Bloc permanent en tête de page : officine en garde maintenant, commune, quartier / repère, téléphone d'urgence, période, statut « En cours » ; repli explicite « Aucune garde en cours pour cette sélection » | P1 |
| GRD-02 | Déclaration d'une période | Nom de l'officine, commune, quartier / repère, téléphone d'urgence, date et heure de début et de fin, observations ; contrôle de cohérence (fin > début, pas de chevauchement pour la même officine) | P1 |
| GRD-03 | Recherche et filtres | Par commune, quartier, date, statut (à venir, en cours, passée) ; résultat trié par proximité de date | P1 |
| GRD-04 | Calendrier des gardes | Vue mensuelle des gardes déclarées pour l'officine et le voisinage ; ajout et report par glisser-déposer avec motif | P2 |
| GRD-05 | Affiche vitrine | Impression / export PDF d'une affiche lisible en vitrine : officines de garde de la période, commune, téléphone ; mention de la date d'édition | P1 |
| GRD-06 | Contact direct | Appel téléphonique (`tel:`) et, en P2, envoi d'un SMS ou d'un WhatsApp à l'officine de garde | P1 |
| GRD-07 | Notification à l'équipe | Rappel à l'équipe de l'officine à J-1 de sa propre garde ; alerte si aucune garde n'est déclarée pour une période où l'officine devrait l'être | P2 |
| GRD-08 | Historique et export | Historique des gardes de l'officine sur une période, export CSV / PDF ; conservation paramétrable | P2 |
| GRD-09 | Suppression et correction | Suppression réservée au promoteur, au pharmacien et au RMQ, avec motif journalisé ; une garde passée ne se supprime pas (archivage) | P1 |
| GRD-10 | Lien avec l'ouverture de l'officine | Une période de garde alimente les heures d'ouverture attendues pour le contrôle de présence pharmaceutique (art. 1.11) et donc TDB-04/RG-T04 | P2 |

### 7.3 API

Existants : `GET /gardes` (filtres), `POST /gardes`, `DELETE /gardes/{id}`.
À créer : `GET /gardes/en-cours`, `GET /gardes/calendrier?mois=AAAA-MM`, `GET /gardes/export?format=pdf|csv`, `GET /gardes/affiche?debut=…&fin=…`, `PUT /gardes/{id}` (report avec motif).

### 7.4 Critères d'acceptation

- La garde en cours est affichée en tête avec son statut et son téléphone cliquable sur mobile.
- Une déclaration dont la fin précède le début est refusée avec un message français explicite.
- Deux périodes chevauchantes pour la même officine sont refusées.
- L'affiche vitrine exportée en PDF contient les officines de garde de la période, la commune et la date d'édition.
- La suppression d'une garde par un dispensateur est refusée (UI et API) ; par le promoteur elle demande un motif et laisse une trace dans le journal d'audit.

---

## 8. Exigences transversales de la livraison

### 8.1 Récapitulatif des endpoints

| Statut | Endpoints |
| --- | --- |
| Existants à réutiliser | `/auth/*`, `/officines*`, `/officines/{id}/parametres`, `/officines/{id}/audit-logs`, `/sync/push`, `/produits`, `/stocks*`, `/mouvements`, `/emplacements`, `/dispensations` (+`/{id}/viser`), `/stupefiants*`, `/caisse/session-active`, `/caisse/ouvrir`, `/caisse/session/{id}/ticket-x`, `/caisse/session/{id}/fermer`, `/caisse/ventes`, `/facturation/emecef`, `/comptabilite/journal-ventes`, `/comptabilite/clotures`, `/comptabilite/ecritures` (+`/{id}/extourne`), `/promoteur/consolidation`, `/promoteur/transferts` (+`/{id}/receptionner`), `/gardes`, `/officines/{id}/pointages*`, `/officines/{id}/employes`, `/officines/{id}/non-conformites`, `/officines/{id}/echeances`, `/officines/{id}/documents`, `/officines/{id}/temperatures*`, `/officines/{id}/auto-evaluation/*`, `/officines/{id}/upload` |
| À créer (P1) | `/dashboard/synthese`, `/dashboard/alertes`, `/caisse/ventes/{id}/annuler`, `/caisse/ventes/{id}/avoir`, `/caisse/ventes/{id}/envoyer`, `/caisse/mouvements`, `/caisse/ventes/{id}/feexpay`, `/caisse/paiements/{ref}`, `/webhooks/feexpay`, `/caisse/rapprochement-feexpay`, `/caisse/cahier-mobile-money`, `/dispensations/patients*`, `/dispensations/{id}/analyse-reglementaire`, `/dispensations/{id}/analyse-pharmaceutique`, `/dispensations/{id}/decision`, `/dispensations/{id}/scan`, `/dispensations/{id}/conseils`, `/dispensations/{id}/comprehension`, `/dispensations/interventions`, `/dispensations/vigilances*`, `/dispensations/erreurs`, `/dispensations/indicateurs`, `/facturation/emecef/{id}`, `/facturation/emecef/{id}/avoir`, `/facturation/emecef/{id}/recertifier`, `/facturation/verifier`, `/facturation/parametres`, `/facturation/rapprochement`, `/facturation/export`, `/gardes/en-cours`, `/promoteur/alertes` |
| À créer (P2/P3) | `/dashboard/resumes`, `/auth/preferences`, `/caisse/liens-paiement`, `/caisse/paiements/{ref}/rembourser`, `/caisse/paniers`, `/dispensations/hors-prescription`, `/dispensations/protocoles*`, `/dispensations/prescripteurs`, `/promoteur/classement`, `/promoteur/consolidation/export`, `/promoteur/transferts/{id}/ecart`, `/gardes/calendrier`, `/gardes/affiche`, `/gardes/export` |

**Règle de double implémentation** : chaque endpoint créé existe dans `backend/routes/api.php` (avec contrôleur, `Request::validate`, autorisation par rôle, RLS par officine, journalisation) **et** dans `mock-backend.mjs` (même chemin, mêmes noms de champs, mêmes codes d'erreur, mêmes messages français). Un endpoint absent du mock casse la démonstration et les fixtures.

### 8.2 Backend Laravel

- **Migrations** : prolonger le schéma existant plutôt que le réécrire. Tables à ajouter : `patients`, `dossiers_pharmaceutiques`, `consentements_dp`, `prescripteurs`, `ordonnances` + `lignes_ordonnance`, `analyses_reglementaires`, `analyses_pharmaceutiques`, `interventions_pharmaceutiques`, `conseils_delivres`, `notifications_vigilance`, `erreurs_delivrance`, `protocoles_conseil`, `reglements` (ventilation multi-modes), `mouvements_caisse`, `avoirs`, `clients` + `comptes_clients`, `organismes` + `prises_en_charge`, `parametres_fiscaux`. Colonnes à ajouter : `ventes_caisse.statut_reglement`, `ventes_caisse.remise_*`, `ventes_caisse.client_id`, `factures_emecef.statut` (déjà), `sessions_caisse.validation_pharmacien_id`.
- **RLS et audit** : toute nouvelle table métier est activée en RLS avec la fonction `user_officines()` et couverte par les triggers d'audit (modèle `2026_11_03_120100_create_audit_triggers.php`). Les registres (factures, dispensations validées, cahier Mobile Money, mouvements de caisse) sont en **append-only** comme `audit_logs`.
- **Services** : étendre `EmecefService` (avoirs `EV`, file de recertification, paramètres fiscaux versionnés), `FeexPayService` (vrai cycle `pending` → webhook → `successful`/`failed`, idempotence, frais), `SyscohadaService` (avoirs, frais FeexPay, mouvements de caisse, crédit client). Isoler le branchement DGI et FeexPay derrière une interface pour permettre le passage de la simulation à l'intégration réelle sans toucher aux écrans.
- **Validation** : les montants sont recalculés serveur à partir des lignes et des paramètres ; le client n'est jamais cru sur un prix, une TVA, une remise ou une monnaie rendue.
- **Tests PHPUnit** : isolation multi-officines sur chaque nouvelle ressource, inaltérabilité des registres, chaînage des 7 effets d'une vente, blocage FEFO / quarantaine, plafond de remise par rôle, idempotence FeexPay, clôture de caisse et écart.

### 8.3 Frontend : découpage en composants réutilisables

| Composant | Emplacement | Utilisé par |
| --- | --- | --- |
| `GrilleKpi` (carte indicateur + variation + forage) | `components/modules/kpi.tsx` | tableau de bord, consolidation, facturation |
| `CentreAlertes` (niveaux, canaux, actions) | `components/modules/centre-alertes.tsx` | tableau de bord, notifications, consolidation |
| `RechercheProduit` (nom / DCI / code-barres + lot FEFO) | `components/modules/recherche-produit.tsx` | caisse, dispensation |
| `PanneauReglement` (modes, mixte, FeexPay, reçu/monnaie) | `components/modules/panneau-reglement.tsx` | caisse |
| `RecuNormalise` (aperçu 80 mm, QR, mentions) | `components/modules/recu-normalise.tsx` | caisse, facturation |
| `AssistantDispensation` (stepper 7 étapes) | `components/modules/assistant-dispensation.tsx` | dispensation |
| `SignatureAgent` (code personnel + horodatage) | `components/modules/signature-agent.tsx` | dispensation, caisse (validations), facturation (avoirs) |
| `BlocHorsLigne` (file, compteur, conflits) | `components/modules/bloc-hors-ligne.tsx` | caisse, dispensation, tableau de bord |

### 8.4 Tests attendus

| Fichier | Couverture |
| --- | --- |
| `src/test/ecrans-demo.test.tsx` | ajouter `index`, `consolidation`, `gardes` à la liste `it.each` et leurs fixtures |
| `src/test/tableau-de-bord.test.tsx` (nouveau) | synthèse affichée, horodatage, absence de valeur inventée, alerte critique en l'absence de pharmacien, forage, droits par rôle |
| `src/test/caisse-pos.test.tsx` (nouveau) | ouverture de session obligatoire, refus d'un lot non vendable, plafond de remise, annulation avec motif, clôture et écart, paiement en attente non comptabilisé, file hors-ligne |
| `src/test/dispensation.test.tsx` (nouveau) | étapes bloquantes, alerte bloquante sur allergie avec motif, décision réservée au pharmacien, écriture au registre, vigilance préremplie, erreur → NC |
| `src/test/facturation-dgi.test.tsx` (nouveau) | cohérence A/B du QR, avoir `EV`, file de recertification, vérification d'un reçu inconnu, droits sur les paramètres |
| `src/test/consolidation-gardes.test.tsx` (nouveau) | 403 mono-officine, transfert sortie/entrée, écart à réception, chevauchement de garde refusé |
| Backend | tests PHPUnit correspondants (§8.2) |

Règle de style des tests du dépôt : nommer les cas en français, vérifier ce que l'utilisateur voit (« n'invente aucune alerte sans données », « ne présente pas une panne comme un historique vide »), mocker `api.get`/`api.post` plutôt que `fetch`.

### 8.5 Performance, accessibilité, ergonomie

- Recherche produit < 500 ms sur 20 000 références \[NF-01\] : requête paginée, index sur `code_cip`, `nom_commercial`, `dci`, debounce 200 ms, cache du catalogue.
- Validation d'une vente < 2 s hors paiement externe \[NF-02\] : un seul appel, pas de requête en cascade après validation, invalidations ciblées.
- Contraste suffisant sur la charte verte ; libellés explicites en français ; pas d'icône seule sans `aria-label` ; navigation clavier complète sur le poste de caisse ; focus visible ; `autocomplete="one-time-code"` pour les codes, `inputmode="numeric"` pour les montants et téléphones.
- Aucune dépendance nouvelle sans justification ; ne pas alourdir le premier chargement (pas de librairie de QR lourde : préférer un rendu SVG léger ou le composant déjà disponible).

### 8.6 Sécurité et données de santé

- Journalisation de toute lecture de donnée patient \[AC-02\] ; minimisation et chiffrement \[DP-04\] ; exclusion des données patient des exports comptables ; anonymisation dans les vues non réglementaires \[INT-05\].
- Clés FeexPay et DGI par officine, stockées chiffrées, jamais dans le dépôt ni dans les logs \[FPX-09\].
- MFA obligatoire pour les rôles réglementaires \[AC-04\] ; verrouillage après 15 min d'inactivité ; liste des appareils et révocation à distance \[DSH-13\].

---

## 9. Points à valider avant ou pendant le développement

| # | Point | Interlocuteur | Impact si non résolu |
| --- | --- | --- | --- |
| 1 | Banque de données médicaments : fournisseur, licence, format d'interrogation (art. 4.28, 4.29) | BEG, ABMed | DSP-06 en mode dégradé : alertes limitées au catalogue local (allergies du dossier, classes réglementaires, doublons de DCI) |
| 2 | Dispositif de facturation normalisée DGI : certification du logiciel, mode d'intégration (API ou boîtier), fonctionnement hors-ligne, format de télédéclaration | DGI, BEG | FDG-16, CAI-07, POS-14 : conserver la certification simulée derrière une interface, reçu provisoire hors-ligne |
| 3 | Contrat FeexPay : documentation d'API, environnement de test, grille de frais, délais de reversement, opérateurs couverts, procédure de remboursement | FeexPay, BEG | FPX-01 à FPX-09 : conserver la simulation actuelle avec statuts réalistes |
| 4 | Codification uniforme du ticket (`TCK-` côté Laravel, `TICKET-` côté mock) et du reçu | BEG | Divergence de numéros entre environnements |
| 5 | Plafonds de remise par rôle, seuils d'annulation, seuils d'alerte anti-fraude, délai d'expiration d'un paiement | Promoteur, pharmacien | RG-C03, RG-C04, FPX-02, TDB-10 : valeurs par défaut à paramétrer, jamais codées en dur |
| 6 | Mode de la règle du pharmacien présent : blocage strict ou alerte avec justification, et heures d'ouverture (y compris garde) | Promoteur, pharmacien | RG-D06, POS-13, GRD-10 |
| 7 | Retour en stock d'un produit non pharmaceutique : autorisé ou non, et selon quelles conditions | Titulaire | VTE-07, RG-C07 |
| 8 | Crédit client et prise en charge organisme : plafonds, liste des organismes autorisés, pièces exigées | Promoteur, comptable | VTE-05, VTE-06 |
| 9 | Protocoles de conseil comptoir : contenu validé par le titulaire et liste des motifs | Pharmacien référent | DSP-21, VTE-02 |
| 10 | Canal officiel de transmission des notifications de vigilance à l'ABMed | ABMed | BPD7-V02 : export PDF et accusé manuel |
| 11 | Source du calendrier officiel des gardes (ordre des pharmaciens, autorités locales) | BEG, officine pilote | GRD-04 : gardes déclarées manuellement uniquement |
| 12 | Paramètres fiscaux réels de l'officine pilote : IFU, NIM, régime d'imposition, taux | Comptable, promoteur | FDG-09 : valeurs de démonstration actuelles |
| 13 | Indicateurs du tableau de bord à conserver par rôle et seuils d'alerte | Promoteur | TDB-15, RG-T05 |

Tant qu'un point n'est pas tranché, l'agent implémente la **valeur par défaut paramétrable** la plus prudente (blocage plutôt qu'alerte, refus plutôt que tolérance) et laisse une trace dans le code (`// À valider — §9 point N`).

---

## 10. Ordre de réalisation conseillé

| Lot | Contenu | Dépendances | Réf. cahier d'origine |
| --- | --- | --- | --- |
| **A. Socle comptoir** | Composants partagés (`RechercheProduit`, `PanneauReglement`, `RecuNormalise`, `SignatureAgent`, `BlocHorsLigne`), paramétrage caisse (remises, seuils, modes), mouvements de caisse, ticket X, clôture Z complète avec validation | Socle livré | §13.1 lot 1.3, Phase 2 |
| **B. Caisse POS complète** | CAI-01 à CAI-08, VTE-01 à VTE-04, VTE-07 à VTE-10, POS-11 à POS-14, anti-fraude | Lot A | §5.3, §5.4 |
| **C. Dispensation cœur** | DSP-01 à DSP-06, DSP-08, DSP-12 à DSP-16, DSP-18, registres et étiquettes, RG-D01 à RG-D08 | Lot A, catalogue produits et lots | §4.7, lot 1.3 |
| **D. Dispensation étendue** | DSP-07, DSP-09 à DSP-11, DSP-17, DSP-19 à DSP-24, DSP-26 à DSP-30 (IP, hors prescription, protocoles, vigilances, erreurs, indicateurs) | Lot C | §4.7.1 à §4.7.5 |
| **E. Facturation DGI** | FDG-01 à FDG-15 (registre, avoirs, file de recertification, vérification, paramètres, rapprochement, exports) | Lot B | §5.4 CAI-03, §10.1 |
| **F. FeexPay réel** | FPX-01 à FPX-10 avec webhook, frais, rapprochement, cahier Mobile Money | Lot B + contrat FeexPay (§9 point 3) | §5.5 |
| **G. Tableau de bord** | TDB-01 à TDB-17 (synthèse agrégée, alertes, drill-down, paramétrage, résumé quotidien) | Lots B, C, E (les indicateurs doivent avoir des sources réelles) | §9 |
| **H. Groupe et gardes** | CGL-01 à CGL-12, GRD-01 à GRD-10 | Lot G pour les alertes groupe | §9 DSH-09 |

Justification de l'ordre : le tableau de bord ne doit pas être codé en premier alors que ses sources n'existent pas encore — il agrégerait des zéros ou des valeurs inventées. On livre d'abord ce qui produit la donnée (caisse, dispensation, facturation), puis l'écran qui la restitue. En revanche, **les composants partagés et le contrat `GET /dashboard/synthese` sont écrits dès le lot A** pour que chaque lot alimente la synthèse au fur et à mesure.

Si l'ordre doit être inversé pour une démonstration commerciale : livrer TDB-01 à TDB-06 en lecture seule sur les endpoints déjà disponibles (caisse, stock, qualité, pointage) en assumant explicitement les blocs « Indisponible » pour les sources manquantes, sans jamais les remplacer par des valeurs fictives.

---

## Annexe A — Contrats JSON des endpoints nouveaux (extraits)

**`POST /api/caisse/ventes`** (prolongement du contrat existant)

```jsonc
{
  "client_nom": "Client comptoir",
  "client_ifu": "0202611223344",
  "client_id": null,
  "dispensation_id": "d1",              // obligatoire si une ligne est sur ordonnance
  "mode_reglement": "mixte",
  "reglements": [                        // nouveau : ventilation multi-modes
    { "mode": "especes", "montant": 5000 },
    { "mode": "mobile_money", "montant": 9500, "operateur": "mtn", "telephone": "+22997000000" }
  ],
  "montant_recu": 14500,
  "remise_globale": 0,
  "remise_motif": null,
  "remise_validee_par": null,
  "lignes": [
    { "produit_id": "p1", "quantite": 2, "remise_ligne": 0, "lot_impose": null, "lot_justification": null }
  ],
  "client_op_id": "3f0c…",              // idempotence hors-ligne
  "saisie_locale_at": "2026-11-11T08:12:44+01:00"
}
```

Réponse `201` : `data` = ticket complet (`numero_ticket`, `montant_brut_ht`, `montant_remise`, `montant_tva`, `montant_net_ttc`, `montant_recu`, `monnaie_rendue`, `statut`, `lignes[]` avec lot retenu et `taux_tva`, `facture_emecef` avec `numero_facture_dgi`, `ifu_officine`, `nim_machine`, `code_mecef`, `signature_dgi`, `qr_code_data`, `statut`, `date_certification`, `paiement_feexpay` le cas échéant).

**`POST /api/caisse/ventes/{id}/annuler`** → `{ "motif": "Erreur de saisie", "validee_par": "u2", "code_personnel": "••••" }` ; réponse : ticket `statut: "annulee"` + contre-passations (mouvement de stock, écritures, facture le cas échéant).

**`POST /api/caisse/ventes/{id}/feexpay`** → `{ "operateur": "mtn", "telephone": "+22997000000", "montant": 9500 }` ; réponse : `{ "reference_feexpay": "FP-…", "statut": "pending", "expire_le": "…" }`.

**`POST /api/webhooks/feexpay`** → corps signé par l'agrégateur ; vérification de signature obligatoire ; effet : passage du règlement à `successful`/`failed`, clôture ou remise en attente de la vente, émission ou non du reçu normalisé.

**`POST /api/dispensations/{id}/decision`** → `{ "decision": "modifier", "motif": "…", "ip_id": null, "code_personnel": "••••" }` ; réponse : dispensation avec `pharmacien_id`, `date_visa`, décisions par ligne.

**`POST /api/dispensations/{id}/scan`** → `{ "code_barres": "6170123456789", "lot": "LOT-2026-001", "integrite_ok": true, "conservation_ok": true }` ; réponse : `{ "accepte": false, "motif": "Lot en quarantaine — rappel ABMed du 05/11/2026", "lot_alternatif": { … } }`.

**`GET /api/facturation/emecef/{id}`** → facture complète + `lignes[]` + `vente` + `ecritures[]` + `journal_verifications[]`.

**`GET /api/gardes/en-cours`** → `{ "data": [{ "id": "…", "officine_nom": "…", "commune": "Porto-Novo", "quartier": "…", "telephone": "…", "debut": "…", "fin": "…", "statut": "en_cours" }] }`.

**`GET /api/promoteur/alertes`** → `{ "data": [{ "id": "…", "officine_id": "off2", "officine_nom": "…", "niveau": "critique", "type": "absence_pharmacien", "libelle": "…", "source": "/dashboard/pointage", "cree_le": "…" }] }`.

---

## Annexe B — Matrice de traçabilité (Guide BPD ABMed → ces écrans)

| Articles du Guide | Objet | Fonctionnalités de ce document |
| --- | --- | --- |
| 1.11 | Présence continue du pharmacien pendant les heures d'ouverture | TDB bandeau existant, RG-T04, POS-13, RG-D06, GRD-10 |
| 2.9, 2.10, 7.14 à 7.16 | Actes réservés au pharmacien | §1.2 matrice, DSP-08, RG-C03, RG-C04 |
| 3.8 | Registre des stupéfiants inaltérable | DSP-14, RG-D08, intégration `/dashboard/stupefiants` |
| 4.26 à 4.36 | Système informatisé, validation, sauvegardes, mode dégradé | §0.5, §1.5, §1.6, POS-14, CAI-07, NF-11 |
| 7.7 à 7.13 | Accueil, identification, confidentialité | DSP-01, DSP-22, RG-D11 |
| 7.14, 7.19 | Ordonnance et analyse réglementaire | DSP-04, DSP-05 |
| 7.20 à 7.24 | Dossier, historique, analyse pharmaceutique | DSP-02, DSP-03, DSP-06, DSP-07 |
| 7.25 à 7.30 | Décision, intervention, substitution, renouvellement | DSP-08 à DSP-11 |
| 7.31 | Collecte et contrôle par scan | DSP-12, POS-13 |
| 7.32 à 7.36 | Enregistrements, registres, mentions | DSP-13 à DSP-15 |
| 7.37 à 7.41 | Délivrance, conseil, compréhension | DSP-16 à DSP-18 |
| 7.42 | Erreur de délivrance | DSP-19 |
| 7.43 à 7.51 | Hors prescription, protocoles, accès direct | DSP-20, DSP-21, DSP-23, DSP-24, VTE-02 |
| 7.66 à 7.68 | Vigilances | DSP-26, DSP-27 |
| 7.69 à 7.75 | Éducation et prévention | DSP-28 |
| 8.1 | Retour d'un médicament : remise en stock interdite | VTE-07, RG-C07 |
| Chapitre 10 | Auto-inspection et pilotage | TDB-06, DSP-30, RG-D07, FDG-11 |

---

## Annexe C — Check-list de livraison (à recopier dans la PR de chaque lot)

```
[ ] §0.3 conventions respectées (nommage FR, formats, charte, mobile d'abord, 4 états)
[ ] §0.4 fixtures reponses-demo.json à jour + écrans ajoutés à it.each
[ ] §0.5 DoD 1 à 8 vérifiés pour chaque écran du lot
[ ] §0.6 aucun interdit violé (données patient, vente sans reçu, modification d'un validé, valeur en dur)
[ ] §1.4 chaînage automatique complet et transactionnel
[ ] Endpoints présents dans backend/routes/api.php ET mock-backend.mjs, mêmes contrats
[ ] RLS + triggers d'audit sur les nouvelles tables ; registres en append-only
[ ] Paramètres (taux, seuils, plafonds, délais) stockés en officine_parametres, jamais codés en dur
[ ] npm test --prefix frontend : vert · npm run typecheck : vert · php artisan test : vert
[ ] Tests fonctionnels des règles de gestion critiques du lot (§8.4)
[ ] Manuel : 360 px et 820 px sans débordement, clavier sur poste de caisse
[ ] Journal d'audit : création, validation, annulation, export visibles dans /dashboard/journal
[ ] Points « à valider » (§9) laissés en commentaire avec leur numéro
```
