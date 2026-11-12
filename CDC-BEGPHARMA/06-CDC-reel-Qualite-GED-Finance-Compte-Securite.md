# BEGPHARMA — CDC réel · Qualité, GED, Finance, Compte & Sécurité

**Volet 6 — Approfondissement des 13 écrans restants**
**Nature du document** : cahier des charges d'implémentation destiné à un agent de développement.
**Méthode** : audit du code livré, vérification **en direct sur la pile de démonstration**, puis spécification de la cible. Chaque anomalie est sourcée `fichier:ligne`.

| | |
| --- | --- |
| Qualité environnement | `temperatures.tsx` (1 157 l., 6 sections) · `locaux.tsx` (1 250 l., 7 sections) · `auto-evaluation.tsx` (829 l., 267 articles) |
| GED & amélioration continue | `documents.tsx` (899 l., 8 sections) · `modeles.tsx` (562 l., 4 sections) · `non-conformites.tsx` (816 l., 6 sections) · `echeances.tsx` (1 566 l., 6 vues × 3 modes) |
| Gestion & finance | `comptabilite.tsx` (1 060 l., 6 sections) · `journal.tsx` (115 l.) · `appareils.tsx` (1 108 l., 7 sections) |
| Compte & officine | `compte.tsx` (1 370 l., 9 sections) · `parametres.tsx` (1 125 l., 11 sections) · `securite.tsx` (1 038 l., 8 sections) |
| **Total** | **13 écrans · 12 895 lignes · 78 sections** |
| Backend | `ReleveTemperatureController` (187 l.) · `EquipementController` (133 l.) · `NettoyageController` (48 l.) · `AutoEvaluationController` (245 l.) · `DocumentController` (237 l.) · `FichierDocumentController` (102 l.) · `CanevasController` (54 l.) · `SuiviDocumentaireController` (141 l.) · `ModeleBpdController` (72 l.) · `NonConformiteController` (100 l.) · `EcheanceController` (177 l.) · `ComptabiliteController` (169 l.) · `AuditController` (102 l.) · `AppareilAutoriseController` (177 l.) · `AuthController` (509 l.) · `ParametreController` (163 l.) · `OfficineController` (184 l.) |
| Numérotation | défauts **TEM-D / LOC-D / AUT-D / DOC-D / MOD-D / NCC-D / ECH-D / CPT-D / JRN-D / APP-D / CMP-D / PAR-D / SEC-D**, incohérences **INC-19→INC-28**, exigences **TEM/LOC/AUT/DOC/MOD/NCC/ECH/CPT/JRN/APP/CMP/PAR/SEC-nn**, règles **RG-35→RG-44**, modales **M-200→M-243**, graphiques **G-97→G-124**, lots **L27→L33** |

> **À lire avant** : les cinq constats transverses du **volet 5 §0** s'appliquent intégralement ici et ne sont pas répétés — les 9 endpoints en `501` sur la pile de démonstration (dont `POST /api/upload`, `PUT /api/auth/profile`, `PUT /api/auth/password`, `POST /api/auth/devices/revoke-others`, `GET …/audit-logs/verifier-integrite`, `POST /api/comptabilite/ecritures` et son extourne), les 11 replis silencieux, la résilience hors ligne décorative, les deux conventions d'URL, l'absence totale d'ancres de test. Les règles RG-25→RG-34 du volet 5 et RG-01→RG-24 des volets 3 et 4 s'appliquent également.

---

## Sommaire

1. [Audit du réel](#1--audit-du-réel)
2. [Interfaces cibles](#2--interfaces-cibles)
3. [Modales M-200 → M-243](#3--modales-m-200--m-243)
4. [Graphiques G-97 → G-124](#4--graphiques-g-97--g-124)
5. [Télémétrie](#5--télémétrie)
6. [Exigences transverses RG-35 → RG-44](#6--exigences-transverses-rg-35--rg-44)
7. [Contrats d'API et schéma](#7--contrats-dapi-et-schéma)
8. [Critères d'acceptation](#8--critères-dacceptation)
9. [Plan de livraison L27 → L33](#9--plan-de-livraison-l27--l33)
- [Annexe A — Section → endpoints](#annexe-a--section--endpoints)
- [Annexe B — Ancres de test](#annexe-b--ancres-de-test)
- [Annexe C — Check-list](#annexe-c--check-list)

---

## 1 — Audit du réel

### 1.1 Cartographie

| Écran | Lignes | Sections | Endpoints réels | Modales | Graphiques | i18n `fr.ts` | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `temperatures` | 1 157 | 6 | 3 (+ import CSV) | 3 | `LineChart` | non | **réel** |
| `locaux` | 1 250 | 7 | 4 (2 familles) | 4 | aucun | non | 2 sections réelles sur 7 |
| `auto-evaluation` | 829 | — (chapitres) | 4 | 2 | `BarChart` | non | **réel** |
| `documents` | 899 | 8 | 6 | **0** | aucun | non | partiel |
| `modeles` | 562 | 4 | 3 | **0** | aucun | non | **catalogue vide** |
| `non-conformites` | 816 | 6 | 3 | **0** | aucun | non | partiel |
| `echeances` | 1 566 | 6 × 3 vues | 4 | 3 | aucun | non | **réel** |
| `comptabilite` | 1 060 | 6 | 4 (**2 en `501`**) | 2 | `PieChart` | non | états financiers fictifs |
| `journal` | 115 | 1 | 2 (**1 en `501`**) | 0 | aucun | non | **fonction centrale morte** |
| `appareils` | 1 108 | 7 | 6 (**2 en `501`**) | 1 | aucun | **oui** | partiel |
| `compte` | 1 370 | 9 | **1** (**en `501`**) | 4 | aucun | **oui** | vitrine |
| `parametres` | 1 125 | 11 | 3 | 3 | aucun | **oui** | 2 sections réelles sur 11 |
| `securite` | 1 038 | 8 | 8 (**2 en `501`**) | 3 | aucun | **oui** | réel, 2 failles |

Trois écrans n'ont **aucune modale** (`documents`, `modeles`, `non-conformites`) : ils ouvrent des panneaux inline, ce qui interdit le focus-trap, la fermeture par `Échap`, le rendu mobile en `Sheet` et l'isolation du formulaire.

Quatre écrans seulement importent `@/lib/i18n/fr` alors que ce fichier énonce en ligne 1 : « Tout libellé d'interface vient d'ici ». Les neuf autres, dont `echeances.tsx` (1 566 lignes), ont tous leurs libellés dans le JSX.

### 1.2 Le plus gros gâchis du dépôt : un corpus documentaire de 62 documents hashés, jamais branché

`references/canevas/catalogue.json` contient un corpus **réel, structuré et vérifiable** :

| Propriété | Valeur |
| --- | --- |
| Documents | **62** |
| Champs par document | `id`, `titre`, `rubrique`, `fichier`, **`sha256`**, `parties`, `images` |
| Empreintes SHA-256 renseignées | **62 sur 62** |
| Structure en `parties` | **62 sur 62** |
| Rubriques | `1.MAITRISE DOCUMENTAIRE` (4) · `2.RESSOURCES ET COLLABORATION` (31) · `3.SURVEILLANCE ET AMELIORATION` (17) · `4. PROCEDURES OPERATIONNELLES` (4) · `Document en cours et autres` (6) |
| Formats | 39 `.docx` · 16 `.xlsx` · 5 `.doc` · 1 `.pdf` · 1 `.odt` |
| `non_integres` | 0 |

Or :

| Source | Nombre annoncé | Preuve |
| --- | --- | --- |
| `modeles.tsx:56` | « **59 modèles** de procédures » | libellé d'écran |
| `modeles.tsx:169` | « 59 modèles BPD exporté en … » | toast d'export |
| `modeles.tsx:552` | « 59 modèles officiels couvr… » | pied de page |
| `GET /api/modeles-bpd` (démo, vérifié `200`) | **3** enregistrements | `mod1 BPD10-F01`, `mod2 BPD10-F07`, `mod3 BPD10-F12` |
| `contenu` de ces 3 enregistrements | **`null`** pour les trois | vérifié en direct |
| `references/canevas/catalogue.json` | **62** documents hashés | corpus réel |

**Trois nombres différents pour le même catalogue, et le seul qui corresponde à quelque chose de réel n'est branché sur rien.** L'écran « Modèles Types BPD (59) » de la barre latérale affiche une bibliothèque de 3 fiches vides.

| Code | Exigence |
| --- | --- |
| **MOD-01** | Le catalogue de référence devient la **source unique** : `references/canevas/catalogue.json` est importé en base (`modeles_bpd`) par un seeder dédié, avec `id`, `titre`, `rubrique`, `fichier`, `sha256`, `parties`, `images` |
| **MOD-02** | Le nombre affiché partout est **calculé** depuis l'API, jamais écrit en dur. Les trois occurrences de « 59 » sont supprimées |
| **MOD-03** | L'empreinte `sha256` du corpus sert de contrôle d'intégrité : le modèle instancié vérifie que le fichier source n'a pas été altéré, et le résultat est affiché |
| **MOD-04** | Les 5 rubriques du corpus deviennent le plan de classement de la GED : un document produit appartient à une rubrique, ce qui rend l'auto-évaluation et l'échéancier cohérents avec le référentiel |
| **MOD-05** | `POST /officines/{id}/modeles-bpd/{modeleId}/instancier` (existant, `ModeleBpdController::instancier`) produit un document rattaché à sa rubrique, avec cartouche, code de document, indice de révision et contenu issu des `parties` |
| **MOD-06** | Un modèle instancié entre dans le circuit d'approbation (`approbation-document.tsx`, déjà utilisé par `documents.tsx`) : rédaction → vérification → approbation → diffusion → révision |

### 1.3 Chaîne du froid — `temperatures.tsx`

L'écran le plus sain du volet : 6 sections (`tournee`, `zones`, `courbes`, `excursions`, `rapports`, `capteurs`), trois endpoints réels dont deux vérifiés en direct (`GET …/temperatures/stats` → `200` avec `zones.refrigeree_2_8.matin_fait/soir_fait`), un `LineChart`, un import CSV branché sur `POST …/temperatures/csv` (`UploadController::uploadCsvTemperatures`, 154 lignes).

| Code | Fichier:ligne | Constat | Cible |
| --- | --- | --- | --- |
| **TEM-D01** | `temperatures.tsx:227, 239, 251` + `:177` + `:887-889` | Les plages de température sont écrites **cinq fois** en dur : `2.0°C à 8.0°C`, `15.0°C à 25.0°C`, `15.0°C à 26.0°C` — dans les constantes de zones, dans le texte du document imprimable, et dans les `<option>` du formulaire de relevé. `parametres.tsx:105-106` les duplique encore sous forme de chaînes `"2.0"`/`"8.0"` | Une seule source : `officine_parametres` ou une table `zones_temperature` avec `seuil_min`/`seuil_max`. Six copies d'une valeur réglementaire finiront par diverger |
| **TEM-D02** | `temperatures.tsx:564` | `style={{ width: "85%" }}` — la jauge « 85 % réalisés » de la tournée est **figée** : elle n'est pas calculée depuis les relevés du jour | Jauge calculée : relevés faits / relevés attendus |
| **TEM-D03** | `temperatures.tsx:706` | L'exemple d'excursion affiché est en dur : « Enceinte Réfrigérée · **9.8 °C** (Dépassement **+1.8 °C**) » | Liste réelle des excursions issues des relevés |
| **TEM-D04** | `temperatures.tsx:1129` | `window.print()` direct — imprime toute l'application, barre latérale comprise | `imprimerFicheOfficielle` + CSS `@media print` (RG-23 du volet 4) |
| **TEM-D05** | aucun lien relevé ↔ lot | Une excursion de température ne bloque **aucun lot** de l'enceinte concernée. Or une rupture de la chaîne du froid met en cause les produits stockés, pas seulement le relevé | Une excursion non résolue met les lots de la zone en `quarantaine` et ouvre une NC (lien volet 5, STK-28) |
| **TEM-D06** | section `capteurs` | Les capteurs ne sont pas des entités : aucun étalonnage, aucune dérive, aucun rattachement à un emplacement. `locaux.tsx:560` affiche pourtant un certificat d'étalonnage fictif « CERT-2026-042 · METRO-BENIN · ±0.2°C » | Table `capteurs` : identifiant, zone, modèle, date d'étalonnage, échéance, certificat, dérive constatée |
| **TEM-D07** | `GET …/auto-evaluation/rapport` (parallèle) | Le registre des relevés est le document le plus inspecté ; il n'a **ni trigger d'audit ni RLS** sur `releves_temperatures` (INC-12 du volet 5, INC-01 du volet 4) | Registre inaltérable |
| **TEM-D08** | aucun | Le relevé n'est pas possible hors ligne, alors que c'est le cas d'usage évident (enceinte en réserve sans réseau) | RG-27 du volet 5 |

### 1.4 Locaux & Matériel — `locaux.tsx`

Sept sections (`equipements`, `maintenance`, `etalonnage`, `nettoyage`, `nuisibles`, `conformite`, `systeme`), **quatre endpoints réels répartis sur deux familles seulement** : `GET/POST …/equipements` (`l.115, 134`) et `GET/POST …/nettoyages` (`l.124, 285`). Cinq sections sur sept n'ont aucun backend.

| Code | Fichier:ligne | Constat | Cible |
| --- | --- | --- | --- |
| **LOC-D01** | `locaux.tsx:230-270` | La section `systeme` exporte un **« Dossier Système Informatisé et Plan de Reprise d'Activité (PRA) » entièrement fictif**, en HTML avec `style` inline : « Plateforme : BestPharma Officine Edition · Version 2026.11 », « Hébergement Local : Serveur autonome sur site avec réplication cloud chiffrée », « Chiffrement : AES-256 avec hachage SHA-256 inaltérable », puis un journal des sauvegardes avec fréquences, RPO/RTO et résultats | **C'est le défaut le plus grave du volet.** Ce document est imprimable et se destine à un inspecteur. Soit il est généré depuis l'infrastructure réelle (sauvegardes effectives, tests de restauration datés, RPO/RTO mesurés), soit il est retiré de l'interface. Une déclaration de conformité inventée est un faux |
| **LOC-D02** | `locaux.tsx:257` | Dans ce même document : `<td><strong style="color: #0F3B27;">100% Réussie (Chiffrée)</strong></td>` — le résultat de chaque sauvegarde est écrit d'avance | Résultats réels, ou pas de journal |
| **LOC-D03** | `locaux.tsx:560` | Certificat d'étalonnage fictif : « Certificat n° **CERT-2026-042** · Organisme : **METRO-BENIN** · Incertitude **±0.2°C** » | Étalonnages réels par équipement et par capteur, avec certificat téléversé et échéance |
| **LOC-D04** | `locaux.tsx:774` | « Score : **100% Conforme** » en dur dans la section `conformite` | Score calculé depuis les constats réels (nettoyages faits, étalonnages à jour, nuisibles traités, maintenance effectuée) |
| **LOC-D05** | sections `maintenance`, `etalonnage`, `nuisibles` | Aucune entité, aucun endpoint : la maintenance préventive, les étalonnages et la lutte anti-nuisibles sont des vitrines. Or `suivis_documentaires` (table existante, sous RLS et trigger d'audit) supporte déjà les types `formations` et `maintenance` (`mock-backend.mjs:507`) | Brancher `maintenance` sur `suivis_documentaires/maintenance` (existant) ; créer `etalonnages` et `traitements_nuisibles` |
| **LOC-D06** | `locaux.tsx` | 3 `<table>` bruts, 32 `<td>` | `TableauRegistre` |
| **LOC-D07** | `registre-documentaire.tsx` | Le composant partagé (113 l.) est utilisé par `locaux.tsx` et `personnel.tsx` avec des URLs construites dynamiquement — c'est le bon modèle, mais il n'est pas généralisé aux 5 autres registres du volet | Généraliser (RG-08 du volet 3) |

### 1.5 Auto-évaluation 267 articles — `auto-evaluation.tsx`

Réellement outillé : `GET …/auto-evaluation/campagne-courante` (`l.85`), `PUT …/evaluer/{evaluationId}` (`l.93`), `POST …/generer-capa/{id}` (`l.110`), `POST …/nouvelle-complete` (`l.239`), un `BarChart`, un filtre par chapitre (`chapitreFiltre`, `l.72`), quatre cotations (`conforme`, `ecart_mineur`, `ecart_majeur`, `non_applicable`).

| Code | Constat | Cible |
| --- | --- | --- |
| **AUT-D01** | `GET /officines/{id}/auto-evaluation/rapport` existe (`AutoEvaluationController::rapport`) et n'est **jamais appelé** — vérifié par `grep` | Brancher le rapport ; c'est la pièce maîtresse d'une revue de direction |
| **AUT-D02** | `PUT …/evaluer/{id}` renvoie `422 {"message":"Cotation invalide."}` pour une valeur inattendue — vérifié en direct. Le contrôle existe côté serveur, mais le client n'affiche pas la liste close des cotations de façon contraignante | Liste close côté client, message d'erreur serveur restitué |
| **AUT-D03** | Le lien cotation → CAPA → NC n'est pas complet : `generer-capa` existe, mais rien ne vérifie qu'un écart majeur ou critique a produit une NC et qu'elle a été clôturée | Un écart `majeur` ou `critique` non rattaché à une NC clôturée bloque la clôture de la campagne |
| **AUT-D04** | Aucune campagne n'est horodatée ni signée dans son ensemble : la cotation est individuelle, la clôture de campagne ne l'est pas | Clôture signée par le responsable qualité, avec PV |
| **AUT-D05** | Le référentiel des 267 articles n'est pas versionné : rien n'indique quelle version du guide a servi à une campagne passée | `referentiel_version` sur la campagne, articles figés à l'ouverture |
| **AUT-D06** | Les tables `campagnes_auto_evaluation` et `evaluations_articles` n'ont ni trigger d'audit ni RLS | Registre inaltérable |

### 1.6 GED & Procédures — `documents.tsx`

Huit sections (`bibliotheque`, `taches`, `versions`, `diffusion`, `revisions`, `modifications`, `processus`, `politique`), **zéro modale**, cinq composants partagés réels (`imports-corpus`, `canevas-documentaires`, `qualification-document`, `fichiers-documentaires`, `approbation-document`).

| Code | Fichier:ligne | Constat | Cible |
| --- | --- | --- | --- |
| **DOC-D01** | `documents.tsx:873` | Le bouton « Trame officielle du Rapport Annuel » télécharge un **fichier texte au contenu fictif** : `BESTPHARMA OFFICINE - REVUE ANNUELLE DE DIRECTION QUALITÉ (TAM-RA-001) · Exercice : 2026 · 1. BILAN DE L'AUTO-ÉVALUATION BPD (267 ARTICLES) · - Taux de conformité glo…` avec un taux de **94.2 %** écrit dans la chaîne. Le fichier s'appelle `Trame_Revue_Direction_2026_<date>.txt` et un toast annonce « Trame officielle du Rapport Annuel téléchargée ! » | La revue de direction est **générée** depuis l'auto-évaluation réelle (AUT-D01), les NC, les réclamations, les audits, les indicateurs. Une « trame » est un modèle vide, pas un rapport chiffré : si c'est un modèle, le dire ; si c'est un rapport, le calculer |
| **DOC-D02** | `documents.tsx` — 0 `<Dialog>` | Huit sections sans aucune modale : la création, l'approbation, la diffusion et la révision passent par des panneaux inline | M-206→M-212 |
| **DOC-D03** | `documents.tsx:338, 350, 402, 406` | Quatre appels construisent l'URL sans préfixe `/api` (`/officines/${id}/documents/${docActif.id}`) alors que `l.153, 179` utilisent `/api/officines/…`. `formatUrl` (`api-client.ts:92-101`) rend les deux valides, mais rien ne distingue à la lecture une route scopée d'une route globale | RG-28 du volet 5 |
| **DOC-D04** | `PUT /api/officines/{id}/documents/{id}` | **`501` en démonstration** (vérifié) alors que le handler existe pour `POST …/documents` (vérifié `201`). Toute mise à jour d'un document échoue dans l'aperçu | §0.1 du volet 5 — la route est présente côté Laravel (`routes/api.php`), le mock la traite pour `POST` mais pas pour `PUT` sur la forme attendue |
| **DOC-D05** | `fichiers-documentaires.tsx:39` | Le téléchargement d'un fichier construit une URL dynamique que le mock ne reconnaît pas | Contrat de téléchargement unique et testé |
| **DOC-D06** | aucun | Le circuit rédaction → vérification → approbation → diffusion → révision existe en composants (`approbation-document.tsx`) mais n'est pas adossé à une machine à états serveur | `documents.statut` avec transitions gardées et signées |
| **DOC-D07** | aucun | La diffusion n'est pas tracée par destinataire : qui a reçu quelle version, qui a accusé réception | `diffusions_document` avec accusé de réception |

### 1.7 Modèles types BPD — `modeles.tsx`

Voir §1.2 : le défaut principal est le catalogue lui-même (3 fiches vides annoncées comme 59 modèles, alors que 62 documents hashés dorment dans `references/canevas/`).

| Code | Constat | Cible |
| --- | --- | --- |
| **MOD-D01** | `contenu: null` sur les 3 modèles renvoyés — vérifié en direct | Contenu issu des `parties` du corpus |
| **MOD-D02** | 4 sections (`catalogue`, `adoptions`, `mises_a_jour`, `propres`) mais aucune modale et aucun suivi d'adoption réel | `adoptions_modele` : quel modèle, adopté quand, sous quel code de document local, quelle divergence |
| **MOD-D03** | `POST …/modeles-bpd/{modeleId}/instancier` existe et fonctionne, mais le document instancié n'est pas rattaché à une rubrique du corpus | MOD-04, MOD-05 |
| **MOD-D04** | La section `mises-a-jour` ne compare pas les versions : rien n'indique qu'un modèle de référence a été révisé depuis son adoption locale | Détection de divergence par `sha256` et `indice_revision` |

### 1.8 Non-conformités & CAPA — `non-conformites.tsx`

Six sections (`kanban`, `liste`, `analyse-causes`, `plan-capa`, `efficacite`, `statistiques`), trois endpoints réels (`GET`, `PUT` ×2 — vérifiés `200` en direct), zéro modale.

| Code | Fichier:ligne | Constat | Cible |
| --- | --- | --- | --- |
| **NCC-D01** | `non-conformites.tsx:787` | Délai moyen de clôture affiché en dur : « **4.2 jours** », avec un taux à **0 %** | Calcul réel depuis `date_creation` → `cloturee_le` |
| **NCC-D02** | `non-conformites.tsx:218-220` | La fiche de NC imprimable est un `<table style="width: 100%; border-collapse: collapse; …">` construit en chaîne, avec des `<td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; width: 25%; …">` | Composant d'impression partagé |
| **NCC-D03** | 0 `<Dialog>` | Le kanban change de colonne par `PUT` direct, sans motif ni signature ; la clôture idem (`l.136`) | Toute transition de statut exige motif et signature |
| **NCC-D04** | section `efficacite` | La vérification d'efficacité existe en base (`efficacite_verifiee`, `conclusion_efficacite`, migration `133627:71-84`) mais aucun contrôle n'empêche de clôturer une NC sans vérification | Clôture bloquée tant que l'efficacité n'est pas vérifiée, délai paramétrable |
| **NCC-D05** | section `statistiques` | Aucun graphique pour 6 sections dont une intitulée « statistiques » | G-113→G-116 |
| **NCC-D06** | `non_conformites` | Ni trigger d'audit ni RLS | Registre inaltérable |
| **NCC-D07** | `BoutonCreerNC` | Le composant partagé existe (`bpd-communs.tsx`, appel réel `api.post` `l.264`) mais n'est pas branché sur les sources d'anomalies des autres écrans (excursion de température, écart de balance, écart d'inventaire, rappel, échéance dépassée, écart d'auto-évaluation) | Une NC pré-remplie proposée depuis chaque anomalie |

### 1.9 Échéancier réglementaire — `echeances.tsx`

L'écran le plus long du volet (1 566 l.) et l'un des mieux outillés : 6 vues (`a_venir_retard`, `calendrier`, `categories`, `regles`, `historique`, `toutes`) × 3 modes (`liste`, `mois`, `semaine`), 4 endpoints, 3 modales, une constante `CATEGORIES`, un export iCal branché.

| Code | Constat | Cible |
| --- | --- | --- |
| **ECH-D01** | `PUT /api/echeances/{id}` n'a **pas de handler dans le mock** (vérifié : `404 Échéance introuvable` avec un identifiant de démo, et la route scopée `POST /officines/{id}/echeances` répond) — deux conventions d'URL pour le même objet (INC-09 du volet 5) | Une seule route, scopée |
| **ECH-D02** | `POST /api/echeances`, `PATCH /api/echeances/{id}` et `DELETE /api/echeances/{id}` existent côté Laravel et ne sont **jamais appelés** ; `EcheanceController::indexGlobal` non plus | Supprimer ou brancher ; ne pas laisser trois chemins d'écriture exposés dont deux inutilisés |
| **ECH-D03** | Les échéances ne sont pas alimentées par les modules qui les produisent : étalonnage fictif (LOC-D03), inscription Ordre codée en dur (INC-08 du volet 4), visite médicale, péremption de document, révision de procédure, campagne d'auto-évaluation, validité de badge | Chaque objet à échéance enregistre son échéance dans le référentiel commun |
| **ECH-D04** | Aucun déclenchement automatique : une échéance dépassée n'ouvre ni NC ni alerte bloquante | Alerte à J-30/J-7/J-1/J+1, NC au dépassement |
| **ECH-D05** | La section `regles` affiche les règles de génération sans les rendre éditables | Règles éditables, versionnées, signées |
| **ECH-D06** | `alertes_peremption` est la seule table du périmètre à bénéficier d'un trigger d'audit et d'une RLS ; `echeances` n'en a pas | Généraliser |

### 1.10 Comptabilité SYSCOHADA — `comptabilite.tsx`

Six sections (`tableau_bord`, `journaux`, `saisie_manuelle`, `plan_comptable`, `tiers_lettrage`, `etats_financiers`), un `PieChart`, deux modales, quatre endpoints dont **deux en `501`**.

| Code | Fichier:ligne | Constat | Cible |
| --- | --- | --- | --- |
| **CPT-D01** | `comptabilite.tsx:337-340` | Tous les états financiers sont **fictifs** : 14 montants (`18 950 000`, `12 400 000`, `27 250 000` FCFA…), badge `+14.2%`, compte `701` | Générés depuis les écritures réelles |
| **CPT-D02** | `comptabilite.tsx:836` | Taux de lettrage « **94.8 %** » en dur | Calculé depuis le lettrage réel |
| **CPT-D03** | `comptabilite.tsx:1035` | « **Novembre 2026** » écrit en dur comme période courante | Période sélectionnée |
| **CPT-D04** | `comptabilite.tsx:176, 195` | La saisie manuelle et l'extourne renvoient **`501`** en démo (vérifié) alors que `ComptabiliteController::storeEcriture` et `::extourneEcriture` existent (`routes/api.php:257-258`) | §0.1 du volet 5 |
| **CPT-D05** | aucun | La réconciliation avec les modules producteurs n'est pas outillée : une vente validée doit produire 5311/5121, 7011 et 4431 (volet 1 §1.4) ; la valorisation du stock doit se réconcilier avec la classe 3 (INC-16 du volet 5) | Contrôles de réconciliation automatiques, écarts signalés |
| **CPT-D06** | `GET /comptabilite/factures-emecef` | Existe et est appelé par `facturation.tsx`, mais la TVA déclarée n'est jamais comparée à la TVA recalculée depuis les lignes de vente | Contrôle `tva_declaree_vs_recalculee` |
| **CPT-D07** | `ecritures_syscohada` | Ni trigger d'audit ni RLS, alors qu'une écriture comptable est par nature inaltérable | Append-only + extourne uniquement |
| **CPT-D08** | `comptabilite.tsx:221` | Journal imprimable en `<table style="width: 100%; …">` | Composant partagé |
| **CPT-D09** | sections `plan_comptable`, `tiers_lettrage` | Le plan comptable et le lettrage des tiers sont des vitrines : aucune entité `tiers`, aucune affectation, aucun lettrage | Tables `tiers`, `lettrages`, `lignes_lettrage` |

### 1.11 Journal d'audit SHA-256 — `journal.tsx`

115 lignes, deux appels, dont **celui qui donne son sens à l'écran**.

| Code | Fichier:ligne | Constat | Cible |
| --- | --- | --- | --- |
| **JRN-D01** | `journal.tsx:52` | `GET /api/officines/{id}/audit-logs/verifier-integrite` renvoie **`501`** en démo (vérifié). Le bouton « Vérifier l'intégrité » — la fonction même de cet écran — ne fait rien dans l'aperçu | Handler mock + affichage du résultat |
| **JRN-D02** | `journal.tsx` | L'écran fait 115 lignes pour un sujet qui exige : chaîne de hachage, preuve de continuité, détection de rupture, export horodaté, filtre par acteur/table/action/période, restitution en mode inspecteur | Écran complet, adossé à `AuditController::verifierIntegrite` (102 lignes, existant) |
| **JRN-D03** | `administration.tsx` | `resumeJournal` et `VUE_JOURNAL_VIDE` existent en composants partagés mais l'écran ne les exploite pas pleinement | Réutiliser |
| **JRN-D04** | `audit_logs` | La table est sous RLS et trigger — c'est la seule du périmètre avec `alertes_peremption`, `inscriptions_ordre`, `officines`, `officine_parametres`, `utilisateurs_officines`, `appareils_autorises`, `approbations_documents`, `fichiers_documents`, `suivis_documentaires`. **Les 30+ tables métier restantes n'y sont pas** | RG-29 du volet 5 |

### 1.12 Appareils autorisés — `appareils.tsx`

Sept sections (`parc`, `appairage`, `bornes`, `peripheriques`, `sessions`, `revocations`, `registre`), six endpoints, une modale, **utilise `i18n/fr`** — l'un des quatre écrans conformes à la règle du dépôt.

| Code | Fichier:ligne | Constat | Cible |
| --- | --- | --- | --- |
| **APP-D01** | `appareils.tsx:219, 229` | La révocation et la réactivation d'un appareil renvoient **`501`** en démo (vérifié) alors que `AppareilAutoriseController::revoquer` et `::reactiver` existent (`routes/api.php:65-66`) | §0.1 du volet 5 |
| **APP-D02** | `appareils.tsx:171` | Valeur en dur dans le registre : `montant_ou_detail: "14 500 FCFA"` | Donnée réelle |
| **APP-D03** | `appareils.tsx:343-379` | Le document imprimable est en `<table style=…>` avec des `<div style="border-top: 1px solid #9CA3AF; width: 45%; …">` pour simuler des zones de signature | Composant d'impression partagé, cadre de signature normalisé |
| **APP-D04** | sections `bornes`, `peripheriques` | Les sections existent mais aucun équipement n'est enregistré comme borne de pointage ou périphérique de mesure — or le volet 4 exige que la borne soit un **équipement autorisé** (RG-20) | Rattachement `bornes` ↔ `appareils_autorises` |
| **APP-D05** | 1 seule modale pour 7 sections | Appairage, révocation, réactivation, détail d'appareil, registre : cinq besoins, une modale | M-231→M-236 |
| **APP-D06** | `DELETE /api/appareils-autorises/{id}` | Existe côté Laravel, jamais appelé : l'interface utilise `revoquer`/`reactiver`. Une route de suppression physique d'un appareil autorisé est un chemin dangereux et inutilisé | Supprimer la route ; la révocation suffit |

### 1.13 Compte & Officine — `compte.tsx`, `parametres.tsx`, `securite.tsx`

Les trois écrans utilisent `i18n/fr`. `securite.tsx` est le mieux outillé du volet (8 endpoints réels). `compte.tsx` est le moins outillé (1 endpoint sur 9 sections).

| Code | Fichier:ligne | Constat | Cible |
| --- | --- | --- | --- |
| **CMP-D01** | `compte.tsx:146` | **Un seul endpoint pour 9 sections** (`profil`, `droits`, `officines`, `qualification`, `formations`, `badge`, `preferences`, `rh`, `donnees`) : `PUT /auth/profile` — qui renvoie **`501`** en démo (vérifié). Tout le reste est en état local | Droits, officines, qualification, formations et RH viennent des API existantes (`utilisateurs_officines`, `inscriptions_ordre`, `suivis_documentaires/formations`, `employes`) |
| **CMP-D02** | `compte.tsx:1128-1136` | Soldes de congés fictifs : `24 jours`, `16 jours`, `100% 40 h` | Soldes réels (volet 4, PRS-18) |
| **CMP-D03** | `compte.tsx:1049-1050` | Préférences d'affichage avec libellés chiffrés : `Confort tactile (+10%)`, `Grande lisibilité (+20%)` — ce ne sont pas des défauts en soi, mais les paliers doivent être des constantes nommées, pas des pourcentages écrits dans une `<option>` | Paliers nommés (`normal`, `confort`, `large`) |
| **CMP-D04** | `compte.tsx:179-185` | La carte professionnelle imprimable est une chaîne HTML avec `linear-gradient(135deg, #0F3B27 0%, #18AA38 100%)` et `<img src="${photoUrl}" style="width:100%; height:100%; …">` — elle **duplique** le badge du volet 4 (BDG-D1→D9) avec une mise en forme différente | Un seul badge (M-128 du volet 4) |
| **CMP-D05** | `compte.tsx:149` | `.catch(() => null)` sur le profil : un échec affiche un profil vide | RG-26 du volet 5 |
| **CMP-D06** | section `donnees` | L'exercice des droits sur les données personnelles (`typeDemandeDonnees === "effacement"`) n'a aucun backend : la demande n'est enregistrée nulle part | `demandes_donnees` avec type, date, traitement, réponse, délai |
| **PAR-D01** | `parametres.tsx:109` | `tokenMECeF = "dgi_live_sec_994829384729182374"` — **jeton de production e-MECeF en clair dans un `useState`** | Secret serveur uniquement (RG-06 du volet 3) ; l'interface affiche un état, jamais une valeur |
| **PAR-D02** | `parametres.tsx:105-106` | `tempFrigoMin = "2.0"`, `tempFrigoMax = "8.0"` en **chaînes** et en état local — sixième copie des seuils de température (TEM-D01) | Source unique |
| **PAR-D03** | `parametres.tsx:107` | `regimeFiscal = "Régime Réel (Normal)"` en dur | Issu de `parametres_fiscaux` |
| **PAR-D04** | `parametres.tsx:112-118` | **Cinq utilisateurs fictifs** en `useState` : « Dr Marie AGOSSOU », « Dr Jean DOSSOU », « Koffi MENSAH », « Amina BELLO », « Paul TOSSOU », avec adresses `@bestpharma.bj` — un domaine **différent** de celui des comptes de démonstration (`@begpharma.bj`) — et un statut MFA par personne. L'écran présente donc un contrôle d'accès inventé | Liste réelle depuis `utilisateurs_officines` + `users` |
| **PAR-D05** | `parametres.tsx:122-123` | Historique des modifications de paramètres **fictif** : `HIST-01` (« mode_presence_pharmacien · Alert simple → Blocage strict · Dr Marie AGOSSOU · 04/11/2026 à 14:30 ») et `HIST-02` (« remise_max_dispensateur · 10 % → 5 % ») alors que `officine_parametres` est **sous trigger d'audit et RLS** — l'historique réel existe déjà en base | Lire `audit_logs` pour `officine_parametres` |
| **PAR-D06** | 11 sections, 3 endpoints | Seules `identite` et une partie de `regles` sont réelles ; `horaires`, `documents`, `conservation`, `notifications`, `paiements`, `fiscalite`, `integrations`, `historique`, `utilisateurs` sont des vitrines | Chaque section lit et écrit `officine_parametres` |
| **SEC-D01** | `securite.tsx:101-104` | **Dix codes de secours MFA en clair dans un `useState`** : `"8492-1049"`, `"3910-4820"`, `"5829-1940"`, `"2849-5019"`, `"4920-1849"`, `"9182-3849"`, `"1049-5829"`, `"6729-1948"`, `"3849-2019"`, `"5019-3829"` | Générés serveur, hachés, affichés **une seule fois**, à usage unique, avec compteur de consommation |
| **SEC-D02** | `securite.tsx:107` | `codePin = "••••••"` — le code personnel de signature est une **chaîne de puces** en état local : la section « Code de signature » affiche un PIN qui n'existe pas | Rattaché à `pin_hash` (RG-16 du volet 4) |
| **SEC-D03** | `securite.tsx:224, 253` | Le changement de mot de passe et la révocation des autres sessions renvoient **`501`** en démo (vérifié) alors que `AuthController::updatePassword` et `::revokeOtherDevices` existent | §0.1 du volet 5 |
| **SEC-D04** | `securite.tsx:119, 131` | Deux replis silencieux sur l'état MFA et la liste des appareils : un échec affiche un état de sécurité **inventé** | RG-26 du volet 5 — l'écran sécurité est le dernier endroit où un repli par défaut est admissible |
| **SEC-D05** | sections `politique`, `alertes`, `journal_securite`, `recuperation` | Aucune donnée réelle : la politique de mot de passe, les alertes de sécurité, le journal de sécurité et la récupération de compte sont des vitrines | Politique lue depuis `officine_parametres`, journal lu depuis `audit_logs` filtré sur les événements de sécurité |

### 1.14 Incohérences structurelles

| Code | Constat | Impact |
| --- | --- | --- |
| **INC-19** | **Trois nombres pour un même catalogue** de modèles BPD : 59 (interface), 3 (API de démo, contenu `null`), 62 (corpus de référence hashé) | L'écran annonce une conformité documentaire qu'il ne peut pas démontrer |
| **INC-20** | Les seuils de température sont copiés **six fois** (`temperatures.tsx:177, 227, 239, 251, 887-889` + `parametres.tsx:105-106`) | Une modification réglementaire exige six edits ; la divergence est inévitable |
| **INC-21** | **Trois documents imprimables décrivent une infrastructure ou des résultats qui n'existent pas** : le dossier PRA et son journal de sauvegardes à 100 % (`locaux.tsx:230-270`), la trame de revue de direction à 94.2 % (`documents.tsx:873`), le certificat d'étalonnage CERT-2026-042 (`locaux.tsx:560`) | Ces documents sont destinés à un inspecteur. Les produire en l'état expose l'établissement |
| **INC-22** | **30+ tables métier sans trigger d'audit ni RLS** : `releves_temperatures`, `equipements_officines`, `nettoyages_registre`, `documents`, `modeles_bpd`, `non_conformites`, `echeances`, `ecritures_syscohada`, `campagnes_auto_evaluation`, `evaluations_articles`, `produits`, `stock_lots`, `mouvements_stock`, `emplacements`, `inventaires`, `lignes_inventaire`, `lot_dechets`, `avis_rappels`, `registre_stupefiants`, `registre_preparations`, `employes`, `pointages`, `ventes_caisse`, `sessions_caisse`, `lignes_vente`, `dispensations`, `lignes_dispensation`, `retours_fournisseur`, `transferts_inter_officine`, `paiements_feexpay`, `factures_emecef` | 10 tables seulement sont protégées. Le journal SHA-256 ne couvre donc pas le périmètre qu'il prétend couvrir |
| **INC-23** | `POST /api/echeances`, `PATCH /api/echeances/{id}`, `DELETE /api/echeances/{id}`, `GET /api/echeances`, `GET /api/echeances/{id}/ical` non scopé, `DELETE /api/appareils-autorises/{id}`, `GET /api/stocks/alertes-peremption`, `GET /api/stupefiants/rapport`, `GET /api/officines/{id}/auto-evaluation/rapport`, `POST /api/mouvements`, `POST /api/emplacements`, `POST /api/sync/push` : **douze routes exposées et jamais appelées** | Surface d'attaque inutile, contrats non testés, dette de documentation |
| **INC-24** | Trois écrans sans aucune modale (`documents`, `modeles`, `non-conformites`) et un écran avec une seule modale pour sept sections (`appareils`) | Pas de focus-trap, pas de `Échap`, pas de `Sheet` mobile, formulaires mêlés aux listes |
| **INC-25** | Neuf écrans sur treize ignorent `i18n/fr.ts` alors que le fichier énonce la règle en ligne 1 | Toute évolution de wording impose de parcourir le JSX ; aucune traduction future n'est possible |
| **INC-26** | `parametres.tsx:112-118` affiche des utilisateurs au domaine `@bestpharma.bj` alors que les comptes réels sont `@begpharma.bj` | Deux orthographes du nom de marque coexistent dans la même application |
| **INC-27** | Deux cartes professionnelles imprimables différentes (`compte.tsx:179-185` et `badge-double-face.tsx`) avec des mises en forme et des contenus divergents | Le collaborateur reçoit deux documents d'identité différents |
| **INC-28** | `comptabilite.tsx` affiche des états financiers alors que `POST /comptabilite/ecritures` échoue en démo : l'écran montre un résultat sans permettre de produire les écritures qui le fondent | Incohérence de démonstration majeure |

### 1.15 Ce qui est déjà correct — à conserver

| Élément | Preuve |
| --- | --- |
| Le module températures est réellement outillé, y compris l'import CSV | `GET …/temperatures/stats` vérifié `200` avec `zones.refrigeree_2_8.matin_fait` ; `POST …/temperatures/csv` branché sur `UploadController::uploadCsvTemperatures` |
| L'auto-évaluation a un vrai cycle : campagne → cotation → CAPA | 4 endpoints, contrôle serveur de la cotation (`422 Cotation invalide.` vérifié en direct), `BarChart` |
| L'échéancier est l'écran le plus abouti : 6 vues × 3 modes, export iCal branché, `CATEGORIES` explicite | `echeances.tsx`, `GET /officines/{id}/echeances` |
| Les NC ont un cycle serveur complet | `GET`, `PUT` vérifiés `200` ; colonnes `analyse_causes_5m`, `action_immediate`, `action_preventive`, `efficacite_verifiee`, `conclusion_efficacite`, `cloturee_le`, `cloturee_par` (migration `133627:71-84`) |
| `securite.tsx` a 8 endpoints réels, dont le cycle MFA complet | `GET /auth/mfa`, `POST /auth/mfa/demarrer`, `POST /auth/verify-mfa`, `DELETE /auth/mfa`, `GET /auth/devices`, `DELETE /auth/devices/{id}` |
| `audit_logs` est protégé : RLS, trigger, `trg_audit_logs_tamper_defense`, `trg_audit_no_truncate` | `2026_11_03_120100_create_audit_triggers.php` |
| Les composants documentaires partagés sont de bonne facture | `approbation-document`, `canevas-documentaires`, `qualification-document`, `fichiers-documentaires`, `imports-corpus`, `registre-documentaire` |
| Le corpus de référence est exemplaire | 62 documents, 62 empreintes `sha256`, 62 structures en `parties`, 5 rubriques, 0 non intégré |
| Quatre écrans appliquent déjà la règle `i18n/fr.ts` | `appareils`, `compte`, `parametres`, `securite` |
| `ZoneDepot` est réutilisé dans 7 écrans | `comptabilite`, `compte`, `parametres`, `preparations`, `securite`, `stock`, `stupefiants` — il ne lui manque qu'un backend de démonstration |

---

## 2 — Interfaces cibles

### 2.1 Chaîne du froid — TEM-01 → TEM-18

| Code | Exigence |
| --- | --- |
| **TEM-01** | Table `zones_temperature` : code, libellé, type (`refrigeree_2_8`, `magasin_reserve`, `hall_dispensation`, `congelateur`), `seuil_min`, `seuil_max`, emplacement rattaché, capteurs rattachés, nombre de relevés attendus par jour |
| **TEM-02** | **Une seule source** pour les seuils (INC-20) : le formulaire de relevé, la courbe, le document imprimable et les paramètres lisent `zones_temperature`. Aucune plage écrite en dur |
| **TEM-03** | Tournée du jour : relevés attendus vs réalisés **calculés** (TEM-D02), par zone et par créneau (matin/soir), avec état visuel et heure de chaque relevé |
| **TEM-04** | Saisie d'un relevé : zone, valeur, horodatage serveur, releveur, appareil utilisé, commentaire ; refus d'une valeur hors plage physique (ex. −50 °C) avec demande de confirmation |
| **TEM-05** | Courbes multi-zones avec `ReferenceArea` pour les plages autorisées et `ReferenceLine` pour les seuils (G-97) |
| **TEM-06** | Excursion : détection automatique à la saisie, décision obligatoire parmi `quarantaine`, `retour_fournisseur`, `levee`, `destruction` (les quatre valeurs existent déjà dans `decisionChoisie`), motif, signature |
| **TEM-07** | Une excursion non résolue met les **lots de la zone en quarantaine** (TEM-D05) dans la même transaction, et propose une NC pré-remplie |
| **TEM-08** | Import CSV réel (`POST …/temperatures/csv`, existant) : mappage de colonnes annoncé, prévisualisation, rejet ligne à ligne avec motif, journal d'import |
| **TEM-09** | Capteurs : entité avec modèle, zone, date d'étalonnage, échéance, certificat téléversé, dérive constatée, statut (`actif`, `en_etalonnage`, `retire`) |
| **TEM-10** | Le registre des relevés est inaltérable : trigger d'audit + RLS + refus d'`UPDATE`/`DELETE` (TEM-D07) |
| **TEM-11** | Conservation 10 ans |
| **TEM-12** | Saisie possible hors ligne avec file et resynchronisation (TEM-D08, RG-27 du volet 5) |
| **TEM-13** | Rapport mensuel par zone : conformité, excursions, décisions, temps cumulé hors plage, produits impactés |
| **TEM-14** | Impression via `imprimerFicheOfficielle` avec cartouche réglementaire (TEM-D04), jamais `window.print()` |
| **TEM-15** | Tableau de bord des températures alimenté en continu par le tableau de bord principal (volet 2) : les valeurs `4.2`/`21.4`/`98.4` en repli y sont remplacées par les relevés réels |
| **TEM-16** | Alertes : relevé manquant à l'heure attendue, excursion en cours, capteur en dérive, étalonnage échu — chaque alerte alimente le centre de notifications |
| **TEM-17** | Accès en lecture pour le mode inspecteur, borné dans le temps et journalisé |
| **TEM-18** | Export du registre sur une période, journalisé |

### 2.2 Locaux & Matériel — LOC-01 → LOC-16

| Code | Exigence |
| --- | --- |
| **LOC-01** | Équipements : `equipements_officines` existe ; ajouter type, localisation, date de mise en service, état, criticité, plan de maintenance, étalonnage requis |
| **LOC-02** | **Maintenance** branchée sur `suivis_documentaires/maintenance` — la table et les routes existent déjà (`mock-backend.mjs:507`) : interventions préventives et correctives, dates, technicien, pièces, coût, prochaine échéance |
| **LOC-03** | **Étalonnage** : table `etalonnages` avec équipement, organisme, certificat téléversé, date, échéance, incertitude, résultat (`conforme`, `ajusté`, `rebuté`). Suppression du certificat fictif CERT-2026-042 (LOC-D03) |
| **LOC-04** | Un étalonnage échu bloque l'usage de l'équipement : une balance non étalonnée ne peut pas être sélectionnée pour une pesée de préparation (volet 5, PRE-06) |
| **LOC-05** | **Nettoyage** : `nettoyages` existe (`GET`/`POST`) ; ajouter plan de nettoyage par local (`GLO-EN-001`), fréquence, produit, opérateur, visa |
| **LOC-06** | Registre de nettoyage inaltérable, avec visa quotidien du responsable |
| **LOC-07** | **Lutte anti-nuisibles** : table `traitements_nuisibles` avec prestataire, date, type de traitement, appâts posés et relevés, plan de localisation, constat d'absence |
| **LOC-08** | **Conformité des locaux** : score **calculé** depuis les constats réels (LOC-D04) — nettoyages à jour, étalonnages à jour, nuisibles traités, maintenance effectuée, température conforme — jamais `100% Conforme` en dur |
| **LOC-09** | **Dossier système et PRA** (LOC-D01) : ou bien généré depuis des faits vérifiables — sauvegardes réellement exécutées avec horodatage et résultat, tests de restauration datés et concluants, RPO/RTO mesurés, chiffrement réellement configuré — ou bien **retiré de l'interface**. Aucune déclaration d'infrastructure ne peut être produite sans source |
| **LOC-10** | Chaque sauvegarde est un enregistrement : date, périmètre, méthode, taille, résultat, empreinte, test de restauration associé |
| **LOC-11** | Les 3 `<table>` bruts passent à `TableauRegistre` (LOC-D06) |
| **LOC-12** | Le composant `registre-documentaire.tsx` (utilisé ici et dans `personnel`) est généralisé aux autres registres (LOC-D07) |
| **LOC-13** | Les locaux sont des entités reliées aux zones de température, aux équipements et aux emplacements de stock |
| **LOC-14** | Un local utilisé pour une préparation magistrale doit être qualifié : la préparation affiche l'état de qualification au moment de la saisie (volet 5, PRE-16) |
| **LOC-15** | Toutes les échéances produites (étalonnage, maintenance, traitement nuisibles) alimentent l'échéancier commun (ECH-D03) |
| **LOC-16** | Impression avec cartouche, jamais de `style` inline dans une chaîne HTML |

### 2.3 Auto-évaluation 267 articles — AUT-01 → AUT-12

| Code | Exigence |
| --- | --- |
| **AUT-01** | Campagne : période, périmètre, `referentiel_version`, articles **figés à l'ouverture** (AUT-D05), équipe, planning |
| **AUT-02** | Cotation par article : `conforme`, `ecart_mineur`, `ecart_majeur`, `non_applicable`, preuve jointe, commentaire, cotation signée |
| **AUT-03** | Le rapport est branché sur `GET …/auto-evaluation/rapport` (**existant, jamais appelé** — AUT-D01) : score global, score par chapitre, évolution par campagne, écarts par gravité, plan d'action |
| **AUT-04** | Un écart `majeur` ou `critique` doit être rattaché à une NC ; la campagne ne se clôt pas tant qu'une NC reste ouverte (AUT-D03) |
| **AUT-05** | Clôture signée par le responsable qualité avec PV (AUT-D04) |
| **AUT-06** | Le radar des 10 chapitres (G-21 du volet 3) et l'évolution du score (G-99) |
| **AUT-07** | `PUT …/evaluer/{id}` : la liste close des cotations est contraignante côté client, et le message serveur (`422 Cotation invalide.`) est restitué tel quel (AUT-D02) |
| **AUT-08** | Tables `campagnes_auto_evaluation` et `evaluations_articles` sous trigger d'audit et RLS (AUT-D06) |
| **AUT-09** | La revue annuelle de direction est **générée** depuis la campagne close (DOC-D01) : score, écarts, NC, CAPA, indicateurs, décisions |
| **AUT-10** | Historique des campagnes et comparaison dans le temps |
| **AUT-11** | Export du rapport avec cartouche, signature et mention de la version du référentiel |
| **AUT-12** | Accès en mode inspecteur : lecture seule d'une campagne close, bornée et journalisée |

### 2.4 GED & Procédures — DOC-01 → DOC-16

| Code | Exigence |
| --- | --- |
| **DOC-01** | Machine à états serveur : `brouillon → en_verification → en_approbation → approuve → diffuse → en_revision → obsolete`, avec transitions gardées, motif et signature (DOC-D06) |
| **DOC-02** | Cartouche obligatoire sur tout document : code, titre, indice de révision, date d'application, rédacteur, vérificateur, approbateur, processus, rubrique du corpus, durée de conservation |
| **DOC-03** | Les colonnes existent déjà (`migration 133627:57-68`) : `code_document`, `type_doc`, `processus`, `indice_revision`, `redacteur_nom`, `approbateur_nom`, `approuve_le`, `prochaine_revision`, `motif_refus`, `modele_source_id` — elles doivent être **renseignées et affichées** |
| **DOC-04** | Diffusion tracée par destinataire avec accusé de réception (DOC-D07) |
| **DOC-05** | Révision : comparaison d'indices, motif de révision, documents impactés, rediffusion |
| **DOC-06** | Un document obsolète reste consultable mais est marqué « Obsolète — ne pas utiliser », et toute impression porte la mention « Copie non contrôlée » |
| **DOC-07** | Les huit sections passent par des modales `ModaleFiche` (DOC-D02) : M-206→M-212 |
| **DOC-08** | `PUT …/documents/{id}` doit fonctionner en démonstration (DOC-D04) |
| **DOC-09** | Téléversement de fichiers via `fichiers-documentaires.tsx` avec contrôle de type et de taille, et **`POST /api/upload` fonctionnel** (§0.1 du volet 5) |
| **DOC-10** | `qualification-document.tsx` et `approbation-document.tsx` adossés à la machine à états |
| **DOC-11** | `imports-corpus.tsx` devient le point d'entrée du corpus de référence : import des 62 documents avec vérification `sha256` (MOD-03) |
| **DOC-12** | La revue annuelle de direction est générée, pas téléchargée comme trame chiffrée fictive (DOC-D01) |
| **DOC-13** | Recherche plein texte sur titre, code, contenu, processus, rubrique |
| **DOC-14** | Table `documents` sous trigger d'audit et RLS (INC-22) |
| **DOC-15** | Conservation paramétrable (3/5/10/40 ans) appliquée comme verrou, conformément à RG-02 du volet 3 |
| **DOC-16** | URL unique et scopée pour chaque opération (DOC-D03, RG-28 du volet 5) |

### 2.5 Modèles types BPD — MOD-07 → MOD-12

| Code | Exigence |
| --- | --- |
| **MOD-07** | Seeder `modeles_bpd` depuis `references/canevas/catalogue.json` : 62 modèles, 5 rubriques, empreintes `sha256`, contenu issu des `parties` |
| **MOD-08** | Le catalogue est filtrable par rubrique, type de document, processus ; le compteur affiché est calculé |
| **MOD-09** | Adoption d'un modèle : code de document local, divergences déclarées et motivées, date, signataire |
| **MOD-10** | Détection de divergence : si le `sha256` ou l'`indice_revision` du modèle de référence change, les documents locaux qui en dérivent sont signalés comme à réviser |
| **MOD-11** | Section `propres` : documents créés par l'officine sans modèle de référence, avec justification |
| **MOD-12** | Instanciation (`POST …/instancier`, existant) produisant un document complet rattaché à sa rubrique, entrant dans le circuit DOC-01 |

### 2.6 Non-conformités & CAPA — NCC-01 → NCC-14

| Code | Exigence |
| --- | --- |
| **NCC-01** | Toute transition de statut (`ouverte → en_cours → cloturee`) exige motif et signature (NCC-D03) |
| **NCC-02** | Analyse 5M obligatoire avant clôture pour une NC majeure ou critique (colonne `analyse_causes_5m` existante) |
| **NCC-03** | Plan CAPA : action immédiate, action corrective, action préventive, responsable, échéance, statut — colonnes existantes à rendre opérantes |
| **NCC-04** | **Vérification d'efficacité obligatoire avant clôture** (NCC-D04), après un délai paramétrable, avec conclusion |
| **NCC-05** | Délais calculés (NCC-D01) : délai moyen de clôture, NC en retard, NC par gravité et par processus |
| **NCC-06** | Kanban avec glisser-déposer soumis aux mêmes règles (motif + signature) |
| **NCC-07** | `BoutonCreerNC` branché sur toutes les sources d'anomalie (NCC-D07) : excursion de température, écart de balance de stupéfiants, écart d'inventaire, avis de rappel, échéance dépassée, écart d'auto-évaluation, réception non conforme, absence de pharmacien, dérogation de vente |
| **NCC-08** | La NC porte sa **source** (`source` existant : `interne`, `reclamation_client`, `livraison`, `temperature`, `audit`) et l'objet d'origine |
| **NCC-09** | Statistiques réelles avec graphiques (NCC-D05) : G-113→G-116 |
| **NCC-10** | Fiche imprimable par composant, sans `style` inline (NCC-D02) |
| **NCC-11** | Table `non_conformites` sous trigger d'audit et RLS (NCC-D06) |
| **NCC-12** | Modales `ModaleFiche` (INC-24) : M-213→M-218 |
| **NCC-13** | Lien vers la revue de direction : les NC de l'exercice alimentent le rapport annuel |
| **NCC-14** | Numérotation continue `NC-<année>-<séquence>` attribuée par le serveur |

### 2.7 Échéancier réglementaire — ECH-01 → ECH-12

| Code | Exigence |
| --- | --- |
| **ECH-01** | Une seule route d'écriture, scopée par officine (ECH-D01, INC-09 du volet 5) |
| **ECH-02** | Les douze routes exposées et jamais appelées sont supprimées ou branchées (ECH-D02, INC-23) |
| **ECH-03** | **Tous les objets à échéance s'enregistrent ici** (ECH-D03) : étalonnage, maintenance, traitement nuisibles, inscription Ordre section B, visite médicale, péremption de lot, révision de document, campagne d'auto-évaluation, validité de badge, clôture comptable, déclaration fiscale, cotisation ordinale, formation obligatoire, entretien annuel |
| **ECH-04** | Règles de génération éditables, versionnées et signées (ECH-D05) |
| **ECH-05** | Alertes automatiques à J-30, J-7, J-1 et J+1 ; une échéance dépassée ouvre une NC pré-remplie (ECH-D04) |
| **ECH-06** | Les trois modes de vue (liste, mois, semaine) et les six filtres conservés, avec état dans l'URL |
| **ECH-07** | Export iCal conservé (branché et fonctionnel) |
| **ECH-08** | Clôture d'une échéance : preuve jointe, date réelle, acteur, signature |
| **ECH-09** | Report d'une échéance : motif obligatoire, nombre de reports limité, signature — le report répété est une anomalie |
| **ECH-10** | Table `echeances` sous trigger d'audit et RLS (ECH-D06) |
| **ECH-11** | Vue consolidée multi-officines pour le promoteur |
| **ECH-12** | Catégorie et priorité issues de `CATEGORIES` (constante existante) et non de libellés inline |

### 2.8 Comptabilité SYSCOHADA — CPT-01 → CPT-16

| Code | Exigence |
| --- | --- |
| **CPT-01** | Les états financiers sont **générés** depuis les écritures (CPT-D01) : bilan, compte de résultat, balance générale, balance auxiliaire, grand livre, journal |
| **CPT-02** | Aucun montant, taux ou période en dur (CPT-D01→D03) |
| **CPT-03** | Saisie manuelle et extourne fonctionnelles en démonstration (CPT-D04) |
| **CPT-04** | Une écriture est **inaltérable** : seule l'extourne est permise, avec motif, signature, référence à l'écriture d'origine (CPT-D07) |
| **CPT-05** | Équilibre obligatoire : total débit = total crédit, contrôle serveur, refus sinon |
| **CPT-06** | Les comptes SYSCOHADA utilisés sont ceux du plan comptable : 5311/5121 (caisse), 7011 (ventes), 4431 (TVA) — conformément au volet 1 §1.4 |
| **CPT-07** | Tiers : table `tiers` (clients, fournisseurs, organismes), lettrage réel, taux calculé (CPT-D02, CPT-D09) |
| **CPT-08** | Réconciliation automatique avec les modules producteurs (CPT-D05) : ventes → 7011/4431/5311, stock → classe 3, paie → classe 6, TVA déclarée → TVA recalculée (CPT-D06) |
| **CPT-09** | Clôture mensuelle et annuelle : figeage, `cloture_le`, `cloture_par`, signature ; aucune écriture antérieure à une clôture n'est possible |
| **CPT-10** | Liasse fiscale et déclarations produites depuis les écritures, avec cartouche et signature |
| **CPT-11** | `GET /comptabilite/factures-emecef` (existant, appelé par `facturation.tsx`) réconcilié avec les factures émises |
| **CPT-12** | Journaux imprimables par composant, sans `style` inline (CPT-D08) |
| **CPT-13** | `ecritures_syscohada` sous trigger d'audit, RLS et fonction d'inaltérabilité (CPT-D07) |
| **CPT-14** | Conservation 10 ans |
| **CPT-15** | Le graphique de répartition (`PieChart` existant) est alimenté par les écritures réelles |
| **CPT-16** | Accès restreint par rôle ; toute consultation des états financiers est journalisée |

### 2.9 Journal d'audit SHA-256 — JRN-01 → JRN-10

| Code | Exigence |
| --- | --- |
| **JRN-01** | `GET …/audit-logs/verifier-integrite` fonctionnel en démonstration (JRN-D01) |
| **JRN-02** | L'écran affiche le résultat de la vérification : nombre d'entrées vérifiées, empreinte de tête, continuité de la chaîne, première rupture éventuelle avec son horodatage |
| **JRN-03** | La chaîne de hachage couvre **toutes** les tables auditées — ce qui exige d'abord d'étendre triggers et RLS aux 30+ tables métier (INC-22) |
| **JRN-04** | Filtres : période, acteur, table, action (`INSERT`/`UPDATE`/`DELETE`), officine, adresse IP |
| **JRN-05** | Restitution en **mode inspecteur** : lecture seule, période bornée, accès journalisé (RG-09 du volet 3) |
| **JRN-06** | Export horodaté et signé du journal sur une période, avec empreinte de l'export |
| **JRN-07** | Réutilisation de `resumeJournal` et `VUE_JOURNAL_VIDE` d'`administration.tsx` (JRN-D03) |
| **JRN-08** | Alertes : tentative de modification d'une entrée, rupture de chaîne, volume anormal |
| **JRN-09** | L'écran passe de 115 lignes à un écran complet (JRN-D02) |
| **JRN-10** | Le journal de **sécurité** de `securite.tsx` (SEC-D05) est une vue filtrée du même journal, pas une vitrine séparée |

### 2.10 Appareils autorisés — APP-01 → APP-10

| Code | Exigence |
| --- | --- |
| **APP-01** | Révocation et réactivation fonctionnelles en démonstration (APP-D01) |
| **APP-02** | Parc : type (`poste_caisse`, `borne_pointage`, `balance`, `thermometre`, `imprimante`, `lecteur_code_barres`, `tablette`, `autre`), identifiant, modèle, utilisateur rattaché, officine, statut, date d'appairage |
| **APP-03** | Appairage avec code à usage unique et durée de vie limitée |
| **APP-04** | Les **bornes de pointage** sont des appareils autorisés (APP-D04, RG-20 du volet 4) : jeton dédié, exempté du verrou d'inactivité pour les seules routes de pointage, révocable |
| **APP-05** | Les **balances** utilisées pour les pesées de préparation sont des appareils autorisés avec étalonnage à jour (LOC-04) |
| **APP-06** | Les **thermomètres et capteurs** sont des appareils autorisés rattachés à une zone de température (TEM-09) |
| **APP-07** | Sessions actives par appareil, avec révocation unitaire et globale (`POST /auth/devices/revoke-others`, existant) |
| **APP-08** | Registre des appareils : historique complet des appairages, révocations, réactivations, avec acteur et motif |
| **APP-09** | `DELETE /api/appareils-autorises/{id}` supprimé : la révocation suffit, la suppression physique d'un appareil autorisé ne doit pas être exposée (APP-D06) |
| **APP-10** | Cinq modales au lieu d'une (APP-D05) : M-231→M-236 |

### 2.11 Compte, Paramètres, Sécurité — CMP/PAR/SEC-01 → 24

| Code | Exigence |
| --- | --- |
| **CMP-01** | Les 9 sections de `compte.tsx` sont branchées (CMP-D01) : profil (`PUT /auth/profile`, à rendre fonctionnel), droits (`utilisateurs_officines`), officines (`GET /officines`), qualification (`inscriptions_ordre`), formations (`suivis_documentaires/formations`), badge (M-128 du volet 4), préférences, RH (`employes`), données |
| **CMP-02** | Soldes de congés réels (CMP-D02, volet 4 PRS-18) |
| **CMP-03** | **Une seule carte professionnelle** : `compte.tsx:179-185` est supprimé au profit du badge du volet 4 (CMP-D04, INC-27) |
| **CMP-04** | Paliers d'affichage nommés (`normal`, `confort`, `large`) plutôt que des pourcentages dans les `<option>` (CMP-D03) |
| **CMP-05** | Pas de repli silencieux sur le profil (CMP-D05) |
| **CMP-06** | Exercice des droits sur les données : demande enregistrée, typée (`acces`, `rectification`, `effacement`, `portabilite`), horodatée, traitée dans un délai paramétrable, réponse archivée (CMP-D06) |
| **CMP-07** | L'export des données personnelles (`format === "json"`) est réel, complet et journalisé |
| **PAR-01** | Le jeton e-MECeF est **retiré du client** (PAR-D01) : l'interface affiche un état (`configuré`, `absent`, `expiré`), jamais une valeur ; le secret vit côté serveur |
| **PAR-02** | Les 11 sections lisent et écrivent `officine_parametres` (PAR-D06) |
| **PAR-03** | L'historique des modifications est lu depuis `audit_logs` — la table est déjà sous trigger et RLS (PAR-D05) |
| **PAR-04** | La liste des utilisateurs vient de `utilisateurs_officines` + `users` (PAR-D04) ; aucune fiche fictive |
| **PAR-05** | Le nom de marque est orthographié de façon unique (INC-26) |
| **PAR-06** | Les seuils de température sont lus depuis `zones_temperature` (PAR-D02, TEM-02) |
| **PAR-07** | Le régime fiscal vient de `parametres_fiscaux` (PAR-D03) |
| **PAR-08** | Toute modification de paramètre exige motif et signature, conformément au volet 4 (M-144) |
| **PAR-09** | L'environnement e-MECeF (`test`/`production`) est un paramètre serveur, jamais un état client |
| **SEC-01** | Les codes de secours sont **générés serveur**, hachés, affichés une seule fois, à usage unique, avec compteur de consommation et régénération tracée (SEC-D01) |
| **SEC-02** | Le code personnel de signature est rattaché à `pin_hash` (SEC-D02, RG-16 du volet 4) |
| **SEC-03** | Changement de mot de passe et révocation des autres sessions fonctionnels en démonstration (SEC-D03) |
| **SEC-04** | **Aucun repli silencieux sur l'état de sécurité** (SEC-D04) : un échec de `GET /auth/mfa` affiche une erreur, jamais un état par défaut |
| **SEC-05** | Politique de mot de passe lue depuis les paramètres et appliquée serveur (longueur, complexité, historique, expiration) |
| **SEC-06** | Journal de sécurité = vue filtrée d'`audit_logs` sur les événements d'authentification, de MFA, d'appareils et de droits (JRN-10) |
| **SEC-07** | Alertes de sécurité réelles : échecs de connexion répétés, nouvel appareil, révocation, échec de signature, accès hors horaires |
| **SEC-08** | Récupération de compte : canal vérifié, jeton à usage unique et durée limitée, journalisation |

---

## 3 — Modales M-200 → M-243

Règles communes : `ModaleFiche` comme socle (volet 5, STK-00) ; bureau `Dialog`, mobile `Sheet` < 640 px ; un refus serveur ne ferme jamais la modale ; `data-testid` sur chaque modale ; signature vérifiée serveur pour toute écriture réglementaire.

### 3.1 Qualité environnement (M-200 → M-205)

| Code | Modale | Effet serveur |
| --- | --- | --- |
| **M-200** | Saisie d'un relevé de température | `POST …/temperatures` (existant) |
| **M-201** | Décision après excursion | quarantaine / retour fournisseur / levée / destruction + signature + effet sur les lots |
| **M-202** | Import CSV de relevés | `POST …/temperatures/csv` (existant) |
| **M-203** | Capteur : déclaration et étalonnage | `POST /capteurs`, `POST /etalonnages` |
| **M-204** | Intervention de maintenance / nettoyage / traitement nuisibles | `POST …/nettoyages` (existant), `suivis_documentaires/maintenance` (existant), `POST /traitements-nuisibles` |
| **M-205** | Campagne d'auto-évaluation : ouverture, cotation, clôture | `POST …/nouvelle-complete` (existant), `PUT …/evaluer/{id}` (existant), `POST …/cloturer` |

### 3.2 GED & amélioration continue (M-206 → M-218)

| Code | Modale | Effet serveur |
| --- | --- | --- |
| **M-206** | Nouveau document | `POST …/documents` (existant) |
| **M-207** | Approbation d'un document | `approbation-document.tsx` + signature |
| **M-208** | Diffusion et accusé de réception | `POST …/documents/{id}/diffusions` |
| **M-209** | Révision d'un document | `PUT …/documents/{id}` (existant) |
| **M-210** | Qualification d'un document | `qualification-document.tsx` |
| **M-211** | Import du corpus de référence | `imports-corpus.tsx` + vérification `sha256` |
| **M-212** | Aperçu et impression d'un document | `modale-apercu-document` (existant) |
| **M-213** | Instanciation d'un modèle BPD | `POST …/modeles-bpd/{id}/instancier` (existant) |
| **M-214** | Adoption et divergence d'un modèle | `POST …/modeles-bpd/{id}/adopter` |
| **M-215** | Nouvelle non-conformité | `POST …/non-conformites` (existant, via `BoutonCreerNC`) |
| **M-216** | Analyse 5M et plan CAPA | `PUT …/non-conformites/{id}` (existant) |
| **M-217** | Vérification d'efficacité et clôture | `PUT …/non-conformites/{id}` + signature |
| **M-218** | Échéance : création, clôture, report | `POST/PUT /officines/{id}/echeances` |

### 3.3 Finance & audit (M-219 → M-230)

| Code | Modale | Effet serveur |
| --- | --- | --- |
| **M-219** | Saisie d'une écriture comptable | `POST /comptabilite/ecritures` (**501 à corriger**) |
| **M-220** | Extourne d'une écriture | `POST /comptabilite/ecritures/{id}/extourne` (**501 à corriger**) |
| **M-221** | Clôture mensuelle ou annuelle | `POST /comptabilite/clotures` |
| **M-222** | Lettrage d'un tiers | `POST /comptabilite/lettrages` |
| **M-223** | Rapprochement bancaire | `POST /comptabilite/rapprochements` |
| **M-224** | États financiers : génération et export | `GET /comptabilite/etats?periode=` |
| **M-225** | Vérification d'intégrité du journal | `GET …/audit-logs/verifier-integrite` (**501 à corriger**) |
| **M-226** | Export signé du journal d'audit | `POST …/audit-logs/exports` |
| **M-227** | Mode inspecteur : ouverture d'une session bornée | `POST …/sessions-inspecteur` |
| **M-228** | Détail d'une entrée d'audit | `GET …/audit-logs/{id}` |
| **M-229** | Réconciliation inter-modules | `GET /comptabilite/reconciliation` |
| **M-230** | Déclaration fiscale / liasse | `POST /comptabilite/liasses` |

### 3.4 Appareils, compte, paramètres, sécurité (M-231 → M-243)

| Code | Modale | Effet serveur |
| --- | --- | --- |
| **M-231** | Appairage d'un appareil | `POST …/appareils-autorises` (existant) |
| **M-232** | Révocation d'un appareil | `POST /appareils-autorises/{id}/revoquer` (**501 à corriger**) |
| **M-233** | Réactivation d'un appareil | `POST /appareils-autorises/{id}/reactiver` (**501 à corriger**) |
| **M-234** | Détail d'un appareil et de ses sessions | `GET …/appareils-autorises/{id}` |
| **M-235** | Révocation des autres sessions | `POST /auth/devices/revoke-others` (**501 à corriger**) |
| **M-236** | Registre des appareils : export | `GET …/appareils-autorises/registre` |
| **M-237** | Modification du profil | `PUT /auth/profile` (**501 à corriger**) |
| **M-238** | Demande de droit supplémentaire | `POST …/demandes-droits` |
| **M-239** | Exercice d'un droit sur les données | `POST …/demandes-donnees` |
| **M-240** | Modification d'un paramètre d'officine | `PUT …/parametres/{cle}` (existant) + motif + signature |
| **M-241** | Activation ou désactivation du MFA | `POST /auth/mfa/demarrer`, `POST /auth/verify-mfa`, `DELETE /auth/mfa` (existants) |
| **M-242** | Génération des codes de secours | `POST /auth/mfa/codes-secours` |
| **M-243** | Changement du mot de passe | `PUT /auth/password` (**501 à corriger**) |

---

## 4 — Graphiques G-97 → G-124

Charte du volet 2 §1.4. `recharts` déjà présent. Aucun graphique ne rend de série fictive.

### 4.1 Qualité environnement

| Code | Graphique | Type |
| --- | --- | --- |
| **G-97** | Courbes multi-zones de température avec plages autorisées | `LineChart` + `ReferenceArea` (existant à enrichir) |
| **G-98** | Conformité des relevés par zone et par jour | matrice thermique |
| **G-99** | Évolution du score d'auto-évaluation par campagne | `LineChart` |
| **G-100** | Radar des chapitres de l'auto-évaluation | `RadarChart` |
| **G-101** | Répartition des cotations (conforme / mineur / majeur / N.A.) | `PieChart` |
| **G-102** | Excursions : durée cumulée hors plage par zone | `BarChart` |
| **G-103** | Taux de réalisation des nettoyages et maintenances | `RadialBarChart` |
| **G-104** | Étalonnages : échéances et dérives | `BarChart` + calendrier |
| **G-105** | Dérive des capteurs dans le temps | `LineChart` |

### 4.2 GED & amélioration continue

| Code | Graphique | Type |
| --- | --- | --- |
| **G-106** | Parc documentaire par statut et par processus | `BarChart` empilé |
| **G-107** | Documents à réviser dans les 90 jours | `BarChart` |
| **G-108** | Délai moyen du circuit d'approbation | `LineChart` |
| **G-109** | Adoption des 62 modèles de référence | `RadialBarChart` |
| **G-110** | Divergences déclarées par rubrique | `BarChart` |
| **G-111** | NC ouvertes par gravité et par processus | `BarChart` empilé |
| **G-112** | Pareto des causes 5M | `ComposedChart` |
| **G-113** | Délai de clôture des NC (réel, calculé) | `LineChart` |
| **G-114** | Efficacité des CAPA vérifiées | `RadialBarChart` |
| **G-115** | NC par source (interne, réclamation, livraison, température, audit) | `PieChart` |
| **G-116** | NC récurrentes (même cause sur 12 mois) | `BarChart` |
| **G-117** | Échéancier : charges à venir par mois et par catégorie | `BarChart` empilé |
| **G-118** | Échéances dépassées dans le temps | `LineChart` |

### 4.3 Finance, audit, administration

| Code | Graphique | Type |
| --- | --- | --- |
| **G-119** | Résultat mensuel (produits / charges / résultat) | `ComposedChart` |
| **G-120** | Répartition des charges par compte | `PieChart` (existant à alimenter) |
| **G-121** | Balance âgée des tiers | `BarChart` |
| **G-122** | TVA collectée vs déductible vs due | `BarChart` groupé |
| **G-123** | Volume du journal d'audit par table et par action | `BarChart` |
| **G-124** | Parc d'appareils par type et statut | `BarChart` |

---

## 5 — Télémétrie

Principes identiques aux volets 2 à 5. Spécificité de ce volet : il mesure la **conformité**, donc chaque métrique doit avoir un seuil réglementaire explicite et une criticité.

### 5.1 Métriques

| Clé | Libellé | Formule | Seuil / criticité |
| --- | --- | --- | --- |
| `temperature_conformite_taux` | Conformité des relevés | relevés dans la plage / relevés totaux | < 100 % → majeure |
| `temperature_releves_manquants` | Relevés attendus non saisis | attendus − réalisés | > 0 → critique |
| `temperature_excursions_nombre` | Excursions sur la période | comptage | > 0 → critique |
| `temperature_duree_hors_plage` | Temps cumulé hors plage | somme des intervalles | h · > 1 h → critique |
| `temperature_decision_delai_h` | Délai de décision après excursion | décision − détection | > 4 h → critique |
| `temperature_lots_impactes` | Lots mis en quarantaine pour excursion | comptage | informatif |
| `capteurs_etalonnage_echus` | Capteurs en étalonnage échu | comptage | **> 0 → critique** |
| `capteurs_derive_max` | Plus grande dérive constatée | max | > incertitude annoncée → majeure |
| `nettoyages_taux_realisation` | Nettoyages réalisés | réalisés / planifiés | < 100 % → majeure |
| `maintenance_taux_realisation` | Maintenances réalisées | réalisées / planifiées | < 95 % → majeure |
| `nuisibles_traitement_delai_j` | Délai depuis le dernier traitement | jours | > 30 → majeure |
| `locaux_score_conformite` | Score de conformité des locaux | moyenne pondérée des constats | < 90 % → majeure |
| `sauvegardes_taux_reussite` | Sauvegardes réussies | réussies / tentées | < 100 % → **critique** |
| `sauvegardes_test_restauration_j` | Délai depuis le dernier test de restauration | jours | > 90 → critique |
| `autoevaluation_score_global` | Score de la campagne courante | articles conformes / articles applicables | < 80 % → majeure |
| `autoevaluation_ecarts_majeurs` | Écarts majeurs et critiques | comptage | > 0 → majeure |
| `autoevaluation_erreurs_vers_nc` | Écarts majeurs rattachés à une NC | ratio | < 100 % → **critique** |
| `documents_obsoletes_diffuses` | Documents obsolètes encore en usage | comptage | **> 0 → critique** |
| `documents_en_retard_revision` | Documents past `prochaine_revision` | comptage | > 0 → majeure |
| `documents_approbation_delai_j` | Délai moyen d'approbation | moyenne | > 30 → mineure |
| `modeles_adoptes_taux` | Modèles de référence adoptés | adoptés / 62 | < 80 % → mineure |
| `modeles_divergences_nombre` | Divergences déclarées | comptage | informatif |
| `modeles_divergence_non_motivee` | Divergences sans justification | comptage | **> 0 → majeure** |
| `nc_ouvertes_nombre` | NC ouvertes | comptage | informatif |
| `nc_delai_cloture_moyen_j` | Délai moyen de clôture | moyenne (calculé, pas `4.2`) | > 30 → majeure |
| `nc_en_retard_nombre` | NC past échéance CAPA | comptage | > 0 → majeure |
| `nc_efficacite_verifiee_taux` | NC clôturées avec efficacité vérifiée | ratio | < 100 % → majeure |
| `nc_recurrentes_nombre` | NC de même cause sur 12 mois | comptage | > 0 → majeure |
| `echeances_a_venir_30j` | Échéances à 30 jours | comptage | informatif |
| `echeances_depassees` | Échéances dépassées | comptage | **> 0 → critique** |
| `echeances_reportees_nombre` | Reports d'échéance | comptage | > 2 par objet → majeure |
| `comptabilite_ecritures_nombre` | Écritures sur la période | comptage | informatif |
| `comptabilite_deséquilibre` | Écritures non équilibrées refusées | comptage | > 0 → mineure (contrôle actif) |
| `comptabilite_taux_lettrage` | Taux de lettrage | lettrées / total tiers | < 95 % → mineure |
| `comptabilite_cloture_retard_j` | Retard de clôture mensuelle | jours | > 10 → majeure |
| `tva_declaree_vs_recalculee` | Écart de TVA | déclarée − recalculée | **≠ 0 → critique** |
| `reconciliation_inter_modules_ecart` | Écart de réconciliation | ventes − écritures 7011 | **≠ 0 → critique** |
| `journal_audit_integre` | Chaîne d'audit vérifiée | booléen | `false` → **critique** |
| `journal_audit_entrees_verifiees` | Entrées vérifiées | comptage | informatif |
| `journal_audit_rupture` | Rupture de chaîne détectée | comptage | **> 0 → critique** |
| `audit_couverture_tables` | Tables métier auditées | auditées / totales | < 100 % → majeure (INC-22) |
| `appareils_autorises_actifs` | Appareils actifs | comptage | informatif |
| `appareils_revoques_non_remplaces` | Appareils révoqués encore en usage | comptage | **> 0 → critique** |
| `sessions_actives_nombre` | Sessions actives | comptage | informatif |
| `mfa_active_taux` | Utilisateurs avec MFA | ratio | < 100 % pour les rôles sensibles → critique |
| `codes_secours_consommes` | Codes de secours utilisés | comptage | > 0 → à vérifier |
| `codes_secours_par_defaut` | Codes de secours non régénérés | comptage | **> 0 → critique** (SEC-D01) |
| `secrets_exposes_client` | Secrets détectés côté client | comptage | **> 0 → critique** |
| `echecs_connexion_par_ip` | Échecs de connexion | comptage | > 5 / 15 min → majeure |
| `replis_silencieux_declenches` | Requêtes tombées sur un repli | comptage instrumenté | **> 0 → critique** (RG-26) |
| `routes_demo_en_501` | Routes de démo non implémentées | comptage | **> 0 → critique** (RG-25) |

### 5.2 Événements d'usage

| Événement | Propriétés |
| --- | --- |
| `tem.releve.saisie` | `zone`, `conforme`, `methode` (`manuel`, `csv`, `capteur`) |
| `tem.excursion.detection` | `zone`, `amplitude`, `lots_concernes` |
| `tem.excursion.decision` | `decision`, `delai_h`, `role` |
| `tem.import.csv` | `nb_lignes`, `nb_rejets`, `succes` |
| `tem.capteur.etalonnage` | `resultat`, `echeance_j` |
| `loc.maintenance.saisie` | `equipement_type`, `preventive` |
| `loc.nettoyage.visa` | `local`, `role` |
| `loc.nuisibles.traitement` | `prestataire`, `type` |
| `loc.conformite.consultation` | `score` |
| `loc.pra.export` | `source_reelle` (booléen) |
| `aut.campagne.ouverture` | `nb_articles`, `referentiel_version` |
| `aut.article.cotation` | `chapitre`, `cotation`, `preuve_jointe` |
| `aut.campagne.cloture` | `score`, `nb_ecarts`, `nb_nc_rattachees` |
| `aut.rapport.export` | `campagne`, `format` |
| `doc.document.creation` | `type_doc`, `processus`, `rubrique` |
| `doc.document.approbation` | `decision`, `delai_j`, `role` |
| `doc.document.diffusion` | `nb_destinataires`, `accuses` |
| `doc.document.revision` | `ancien_indice`, `nouvel_indice`, `motif_categorie` |
| `doc.document.impression` | `code_document`, `controle` |
| `doc.corpus.import` | `nb_documents`, `nb_sha256_valides` |
| `mod.modele.consultation` | `rubrique` |
| `mod.modele.instantiation` | `modele_id`, `rubrique` |
| `mod.modele.adoption` | `modele_id`, `divergence` |
| `mod.modele.divergence_detection` | `modele_id`, `nature` |
| `ncc.nc.creation` | `source`, `gravite`, `processus` |
| `ncc.nc.transition` | `ancien_statut`, `nouveau_statut`, `role` |
| `ncc.nc.analyse_5m` | `cause_principale` |
| `ncc.nc.efficacite` | `verifiee`, `delai_j` |
| `ncc.nc.cloture` | `duree_j`, `gravite` |
| `ech.echeance.creation` | `categorie`, `echeance_j` |
| `ech.echeance.cloture` | `retard_j`, `preuve_jointe` |
| `ech.echeance.report` | `motif_categorie`, `nb_reports` |
| `ech.echeance.export_ical` | `perimetre` |
| `cpt.ecriture.saisie` | `journal`, `nb_lignes`, `equilibree` |
| `cpt.ecriture.extourne` | `motif_categorie`, `role` |
| `cpt.cloture.execution` | `periode`, `role` |
| `cpt.etat.generation` | `etat`, `periode`, `format` |
| `cpt.lettrage.execution` | `tiers`, `nb_lignes` |
| `cpt.reconciliation.ecart` | `module`, `ecart` |
| `aud.journal.consultation` | `filtres`, `nb_entrees` |
| `aud.integrite.verification` | `resultat`, `nb_entrees`, `duree_ms` |
| `aud.journal.export` | `periode`, `empreinte` |
| `aud.mode_inspecteur.ouverture` | `perimetre`, `duree_bornee` |
| `app.appareil.appairage` | `type`, `succes` |
| `app.appareil.revocation` | `type`, `motif_categorie` |
| `app.session.revocation_globale` | `nb_sessions` |
| `cpte.profil.modification` | `champs`, `role` |
| `cpte.donnees.demande` | `type_droit`, `format` |
| `par.parametre.modification` | `cle`, `ancienne`, `nouvelle`, `role` |
| `sec.mfa.activation` | `methode`, `succes` |
| `sec.mfa.desactivation` | `motif_categorie`, `role` |
| `sec.codes_secours.generation` | `nb_codes` |
| `sec.motdepasse.modification` | `succes`, `politique_respectee` |
| `sec.connexion.echec` | `motif_categorie` |
| `com.erreur.donnee_reglementaire` | `requete`, `code_http`, `repli_silencieux` |

### 5.3 Télémétrie technique

Latence et taux d'erreur par endpoint (priorité aux 9 routes en `501`), volume du journal d'audit par jour, durée de la vérification d'intégrité, taille des exports PDF des états financiers et des registres, temps de génération de la revue de direction, nombre de replis silencieux déclenchés, profondeur de la file hors ligne, dérive d'horloge cliente.

### 5.4 Garde-fous

- Aucune donnée de santé du personnel en télémétrie (RG-22 du volet 4).
- Aucun secret, jeton, code de secours ni empreinte de mot de passe.
- Les identifiants de personnes sont des UUID.
- **La télémétrie ne prouve jamais la conformité** : la preuve est le registre, le document approuvé, l'écriture comptable et `audit_logs`. Un indicateur de télémétrie au vert ne remplace pas une pièce manquante.

---

## 6 — Exigences transverses RG-35 → RG-44

Complètent RG-01→RG-12 (volet 3), RG-13→RG-24 (volet 4) et RG-25→RG-34 (volet 5).

| Code | Règle | Vérification |
| --- | --- | --- |
| **RG-35** | **Aucun document imprimable ne peut déclarer un fait non vérifiable.** Le dossier PRA, la revue de direction, les certificats d'étalonnage et les taux de conformité sont générés depuis des enregistrements réels ou retirés de l'interface (INC-21) | `grep -rn "100% Réussie\|CERT-2026-042\|94.2" frontend/src` → 0 |
| **RG-36** | **Une seule source par valeur réglementaire** : seuils de température, taux de TVA, durées de conservation, délais d'alerte, paliers d'affichage (INC-20) | `grep -rc "2.0°C\|15.0°C" frontend/src` → une seule occurrence, dans la constante ou le paramètre |
| **RG-37** | **Traçabilité généralisée** : triggers d'audit et RLS étendus aux 30+ tables métier (INC-22). La couverture est mesurée par `audit_couverture_tables` | test d'intégration : un `UPDATE` sur chacune des tables produit une entrée `audit_logs` |
| **RG-38** | **Append-only comptable et réglementaire** : `ecritures_syscohada`, `releves_temperatures`, `registre_stupefiants`, `registre_preparations`, `non_conformites`, `documents`, `audit_logs` refusent `UPDATE` et `DELETE` hors procédure nominative (extourne, écriture rectificative, révision) | fonction PL/pgSQL de garde + test par table |
| **RG-39** | **Toute transition d'état est motivée et signée** : statut de document, statut de NC, clôture d'échéance, clôture comptable, clôture de campagne d'auto-évaluation, révocation d'appareil | aucune transition sans `motif` et `signature_id` |
| **RG-40** | **Aucune modale manquante là où un formulaire existe** : `documents`, `modeles` et `non-conformites` passent à `ModaleFiche` (INC-24) | `grep -c "<Dialog" documents.tsx modeles.tsx non-conformites.tsx` > 0 |
| **RG-41** | **Le corpus de référence est la source des modèles** : 62 documents importés, empreintes vérifiées, nombre affiché calculé (INC-19) | `GET /modeles-bpd` renvoie 62 enregistrements avec contenu |
| **RG-42** | **Aucune donnée fictive d'identité ou d'accès** : utilisateurs, rôles, statuts MFA, numéros d'Ordre, certificats proviennent des tables réelles (PAR-D04, INC-08 du volet 4) | `grep -rn "@bestpharma.bj\|Dr Marie AGOSSOU\|ONPB-2014-B-089" frontend/src` → 0 |
| **RG-43** | **Libellés centralisés** : les 13 écrans importent `@/lib/i18n/fr`, qui reçoit les sections `temperatures`, `locaux`, `autoevaluation`, `documents`, `modeles`, `nonconformites`, `echeances`, `comptabilite`, `journal`, `appareils`, `compte`, `parametres`, `securite` (INC-25) | `grep -L "@/lib/i18n/fr" frontend/src/routes/_authenticated/dashboard/*.tsx` → aucune ligne |
| **RG-44** | **Les routes exposées sont utilisées ou supprimées** : les 12 routes orphelines sont branchées ou retirées (INC-23) | plus aucune route de `routes/api.php` sans appel frontend, sauf celles explicitement documentées comme réservées |

---

## 7 — Contrats d'API et schéma

### 7.1 Endpoints

| Méthode | Chemin | Statut | Rôle |
| --- | --- | --- | --- |
| `GET/POST` | `/officines/{id}/temperatures` · `GET …/stats` · `POST …/csv` | existants, vérifiés | socle chaîne du froid |
| `POST` | `/officines/{id}/temperatures/{id}/decision` | nouveau | TEM-06 |
| `GET/POST` | `/officines/{id}/capteurs` · `/etalonnages` | nouveaux | TEM-09, LOC-03 |
| `GET/POST` | `/officines/{id}/zones-temperature` | nouveau | TEM-01, RG-36 |
| `GET/POST` | `/officines/{id}/equipements` · `/nettoyages` | existants | LOC-01, LOC-05 |
| `GET/POST` | `/officines/{id}/traitements-nuisibles` · `/sauvegardes` | nouveaux | LOC-07, LOC-10 |
| `GET` | `/officines/{id}/locaux/score-conformite` | nouveau | LOC-08 |
| `GET` | `/officines/{id}/auto-evaluation/rapport` | **existant, jamais appelé** | AUT-D01 |
| `POST` | `/officines/{id}/auto-evaluation/{id}/cloturer` | nouveau | AUT-05 |
| `GET/POST` | `/officines/{id}/documents` · `PUT …/{id}` | existants (**`PUT` en `501` en démo**) | DOC-D04 |
| `POST` | `/officines/{id}/documents/{id}/diffusions` · `/approuver` · `/reviser` | nouveaux | DOC-01, DOC-04 |
| `POST` | `/officines/{id}/corpus/importer` | nouveau | MOD-11, DOC-11 |
| `GET` | `/modeles-bpd` | existant — **3 fiches vides** | MOD-07 |
| `POST` | `/officines/{id}/modeles-bpd/{id}/instancier` | existant | MOD-05 |
| `POST` | `/officines/{id}/modeles-bpd/{id}/adopter` | nouveau | MOD-09 |
| `GET/POST/PUT` | `/officines/{id}/non-conformites` | existants, vérifiés `200` | NCC-01→04 |
| `PUT` | `/officines/{id}/non-conformites/{id}/efficacite` | nouveau | NCC-04 |
| `GET/POST/PUT` | `/officines/{id}/echeances` | existants — **une seule route d'écriture** | ECH-01 |
| `GET` | `/officines/{id}/echeances/ical` | existant, branché | ECH-07 |
| `GET` | `/comptabilite/journal-ventes` · `/clotures` · `/factures-emecef` | existants | CPT-11 |
| `POST` | `/comptabilite/ecritures` · `/ecritures/{id}/extourne` | existants — **`501` en démo** | CPT-03 |
| `POST` | `/comptabilite/clotures` · `/lettrages` · `/rapprochements` · `/liasses` | nouveaux | CPT-07→10 |
| `GET` | `/comptabilite/etats` · `/reconciliation` | nouveaux | CPT-01, CPT-08 |
| `GET` | `/officines/{id}/audit-logs` · `/audit-logs/verifier-integrite` | existants — **`501` en démo** | JRN-01 |
| `POST` | `/officines/{id}/audit-logs/exports` · `/sessions-inspecteur` | nouveaux | JRN-06, JRN-05 |
| `GET/POST` | `/officines/{id}/appareils-autorises` | existants | APP-02, APP-03 |
| `POST` | `/appareils-autorises/{id}/revoquer` · `/reactiver` | existants — **`501` en démo** | APP-01 |
| `DELETE` | `/appareils-autorises/{id}` | **à supprimer** | APP-09 |
| `PUT` | `/auth/profile` · `/auth/password` | existants — **`501` en démo** | CMP-01, SEC-03 |
| `POST` | `/auth/devices/revoke-others` | existant — **`501` en démo** | SEC-03 |
| `POST` | `/auth/mfa/codes-secours` | nouveau | SEC-01 |
| `GET/POST` | `/officines/{id}/demandes-droits` · `/demandes-donnees` | nouveaux | CMP-06, M-238, M-239 |
| `POST` | `/api/upload` | existant — **`501` en démo**, bloque 7 écrans | §0.1 du volet 5 |

### 7.2 Évolutions de schéma

| Table | Évolution |
| --- | --- |
| `zones_temperature` | nouvelle : `seuil_min`, `seuil_max`, `nb_releves_attendus`, `emplacement_id` |
| `capteurs` | nouvelle : modèle, zone, étalonnage, dérive, statut |
| `releves_temperatures` | **+** `capteur_id`, `source` (`manuel`, `csv`, `capteur`), `created_by`, `signature_id` ; trigger + RLS |
| `excursions_temperature` | nouvelle : détection, amplitude, décision, délai, lots impactés, NC |
| `etalonnages` | nouvelle : équipement, organisme, certificat, échéance, incertitude, résultat |
| `traitements_nuisibles` | nouvelle : prestataire, type, appâts, constat |
| `sauvegardes` | nouvelle : date, périmètre, méthode, taille, résultat, empreinte, test de restauration |
| `documents` | **+** `rubrique_corpus`, `statut` (machine à états), `diffusions` ; trigger + RLS |
| `diffusions_document` | nouvelle : destinataire, date d'envoi, accusé de réception |
| `modeles_bpd` | **réalimentée** depuis le corpus : 62 lignes, `sha256`, `parties`, `rubrique` |
| `adoptions_modele` | nouvelle : modèle, code local, divergences, justification, signature |
| `non_conformites` | **+** `objet_source_type`, `objet_source_id`, `signature_id` ; trigger + RLS |
| `echeances` | **+** `objet_source_type`, `objet_source_id`, `nb_reports`, `preuve_fichier_id`, `signature_id` ; trigger + RLS |
| `ecritures_syscohada` | **+** `signature_id`, `cloture_id`, `extournee_par` ; append-only + trigger + RLS |
| `tiers` · `lettrages` · `lignes_lettrage` | nouvelles |
| `clotures_comptables` | nouvelle : période, `cloture_le`, `cloture_par`, signature |
| `appareils_autorises` | **+** `type`, `borne_id`, `etalonnage_requis` |
| `demandes_donnees` · `demandes_droits` | nouvelles |
| `codes_secours_mfa` | nouvelle : empreinte, consommé, date de consommation |
| `campagnes_auto_evaluation` | **+** `referentiel_version`, `cloture_le`, `cloture_par`, `signature_id` ; trigger + RLS |

---

## 8 — Critères d'acceptation

**Vérifiés en direct sur la pile de démonstration**

1. Les 7 routes de ce volet en `501` répondent correctement : `PUT /auth/profile`, `PUT /auth/password`, `POST /auth/devices/revoke-others`, `POST /appareils-autorises/{id}/revoquer`, `POST /appareils-autorises/{id}/reactiver`, `GET …/audit-logs/verifier-integrite`, `POST /comptabilite/ecritures` (+ extourne), `POST /api/upload`, `PUT …/documents/{id}`.
2. `GET /api/modeles-bpd` renvoie **62 modèles avec contenu**, et l'écran affiche un compteur calculé (RG-41).
3. `grep -rn "100% Réussie\|CERT-2026-042\|94.2\|96.4%\|4.2 jours\|18 950 000\|94.8" frontend/src` → **0** (RG-35).
4. `grep -rn "8492-1049\|dgi_live_sec_\|@bestpharma.bj\|Dr Marie AGOSSOU" frontend/src` → **0** (RG-42, PAR-D01, SEC-D01).
5. `grep -rn "window.print()" frontend/src/routes/_authenticated/dashboard/` → **0** (TEM-D04).

**Fonctionnel**

6. Modifier un seuil de température dans les paramètres met à jour le formulaire de relevé, la courbe et le document imprimable **sans aucune modification de code** (RG-36).
7. Saisir un relevé hors plage crée une excursion, propose la décision, et met les lots de la zone en quarantaine (TEM-07).
8. Un capteur en étalonnage échu ne peut plus être sélectionné pour un relevé (LOC-04, TEM-09).
9. Une balance non étalonnée ne peut pas être sélectionnée pour une pesée de préparation (LOC-04).
10. Le score de conformité des locaux est calculé et varie quand un nettoyage manque (LOC-08).
11. Le dossier PRA n'est imprimable que si des sauvegardes et des tests de restauration réels existent ; sinon l'écran l'indique explicitement (LOC-09).
12. Coter un article `ecart_majeur` sans NC rattachée empêche la clôture de la campagne (AUT-03).
13. Le rapport d'auto-évaluation est branché et affiche le score réel (AUT-D01).
14. La revue de direction est générée depuis la campagne close, les NC et les indicateurs ; son taux de conformité est calculé (DOC-D01).
15. Un document approuvé ne peut plus être modifié sans passer par une révision signée (DOC-01).
16. Imprimer un document obsolète appose « Obsolète — ne pas utiliser » et « Copie non contrôlée » (DOC-06).
17. Une NC ne se clôt pas sans vérification d'efficacité (NCC-04).
18. Le délai moyen de clôture des NC est calculé depuis les dates réelles (NCC-D01).
19. Une échéance dépassée ouvre une NC pré-remplie et une alerte (ECH-04).
20. Chaque objet à échéance des autres modules (étalonnage, Ordre, visite médicale, badge, révision de document, clôture comptable) apparaît dans l'échéancier (ECH-03).
21. Une écriture comptable non équilibrée est refusée par le serveur (CPT-05).
22. Une écriture validée ne peut être modifiée : seule l'extourne est possible, avec motif et signature (CPT-04).
23. La TVA déclarée est comparée à la TVA recalculée ; tout écart déclenche une alerte critique (CPT-D06).
24. Le bouton « Vérifier l'intégrité » affiche le nombre d'entrées vérifiées et l'état de la chaîne (JRN-01, JRN-02).
25. La couverture d'audit (`audit_couverture_tables`) atteint 100 % des tables métier (RG-37).
26. Révoquer un appareil prend effet immédiatement : les jetons associés sont refusés (APP-01).
27. Une borne de pointage est un appareil autorisé, avec jeton dédié et révocable (APP-04, RG-20 du volet 4).
28. Les codes de secours MFA sont générés serveur, affichés une fois, à usage unique ; après consommation le compteur décroît (SEC-01).
29. Couper l'API de démo affiche une **erreur explicite** sur l'écran Sécurité, jamais un état MFA par défaut (SEC-D04).
30. Le jeton e-MECeF n'apparaît nulle part dans le code client ni dans une réponse d'API (PAR-01).
31. Les 11 sections des Paramètres lisent et écrivent réellement `officine_parametres`, et l'historique affiché vient d'`audit_logs` (PAR-D05, PAR-D06).
32. Les 9 sections du Compte sont branchées ; une seule carte professionnelle existe dans toute l'application (CMP-01, CMP-03).

**Qualité du code**

33. Les 13 écrans importent `@/lib/i18n/fr` (RG-43).
34. Aucun `<table>` brut ni `style={{}}` inline dans les 13 écrans (RG-34 du volet 5).
35. Chaque écran porte au moins 10 `data-testid` et les écrans principaux au moins 3 `data-tour`.
36. `documents`, `modeles` et `non-conformites` ont des modales (RG-40).
37. `npm test --prefix frontend` et `npm run typecheck --prefix frontend` passent ; les 13 écrans sont dans le `it.each` d'`ecrans-demo.test.tsx` avec leurs fixtures.
38. Les 12 routes orphelines sont branchées ou supprimées (RG-44).

---

## 9 — Plan de livraison L27 → L33

Dépend de **L8** (tableaux, registres, pagination URL), **L17** (signature vérifiée serveur) et **L21** (parité de la pile de démonstration).

| Lot | Contenu | Dépend de | Critère de sortie |
| --- | --- | --- | --- |
| **L27 — Vérité des documents imprimables** | Suppression des trois documents fictifs (PRA, revue de direction, certificat d'étalonnage) et de tous les taux en dur ; règle RG-35 outillée par un test | L21 | Critères 3, 11, 14 |
| **L28 — Corpus de référence** | Seeder des 62 modèles depuis `references/canevas/catalogue.json` avec vérification `sha256`, contenu issu des `parties`, rubriques comme plan de classement, compteur calculé | L21 | Critère 2 · RG-41 |
| **L29 — Traçabilité généralisée** | Triggers d'audit et RLS sur les 30+ tables métier, fonctions d'inaltérabilité (écritures comptables, relevés, registres, NC, documents), métrique `audit_couverture_tables` | L8, L17 | Critères 22, 25 · RG-37, RG-38 |
| **L30 — Chaîne du froid et locaux réels** | `zones_temperature` comme source unique des seuils, capteurs et étalonnages, excursion → quarantaine des lots, maintenance et nuisibles, score de conformité calculé, sauvegardes réelles | L29 | Critères 6→10 |
| **L31 — GED et amélioration continue** | Machine à états documentaire, diffusion avec accusé, révision signée, NC avec efficacité obligatoire avant clôture, `BoutonCreerNC` branché sur toutes les sources, modales pour les 3 écrans qui n'en ont pas | L29 | Critères 15→18 · RG-40 |
| **L32 — Échéancier fédérateur et finance réelle** | Tous les objets à échéance enregistrés dans le référentiel commun, alertes et NC automatiques ; états financiers générés, extourne seule modification possible, lettrage et tiers, réconciliation inter-modules et contrôle TVA | L29 | Critères 19→23 |
| **L33 — Audit, appareils, compte et sécurité** | Vérification d'intégrité fonctionnelle et écran complet, mode inspecteur, appareils autorisés avec bornes et balances, révocation effective ; codes de secours serveur, secrets hors client, 11 sections de paramètres et 9 sections de compte branchées, aucun repli silencieux sur la sécurité | L27→L32 | Critères 1, 24, 26→32 |

**Ordre conseillé** : **L27 puis L28**. L27 parce que l'application produit aujourd'hui trois documents destinés à un inspecteur et décrivant des faits qui n'existent pas — c'est le risque le plus immédiat, et le corriger est rapide. L28 parce qu'il transforme un écran vide en bibliothèque réglementaire réelle à partir d'un corpus déjà présent, hashé et structuré dans le dépôt : c'est le meilleur rapport entre effort et valeur de tout le projet.

---

## Annexe A — Section → endpoints

| Section | Endpoints existants | À créer / à brancher |
| --- | --- | --- |
| `temperatures?tab=tournee` | `GET …/temperatures/stats` | jauge calculée |
| `temperatures?tab=zones` | — | `GET/POST …/zones-temperature` |
| `temperatures?tab=courbes` | `GET …/temperatures` | — |
| `temperatures?tab=excursions` | `POST …/temperatures` (détection à la saisie) | `POST …/excursions/{id}/decision`, effet sur les lots |
| `temperatures?tab=rapports` | `imprimerFicheOfficielle` | `GET …/temperatures/rapport` |
| `temperatures?tab=capteurs` | — | `GET/POST …/capteurs`, `…/etalonnages` |
| `locaux?tab=equipements` | `GET/POST …/equipements` | fiche, criticité, plan de maintenance |
| `locaux?tab=maintenance` | `suivis_documentaires/maintenance` (**existant**) | brancher |
| `locaux?tab=etalonnage` | — | `GET/POST …/etalonnages` |
| `locaux?tab=nettoyage` | `GET/POST …/nettoyages` | plan de nettoyage, visa |
| `locaux?tab=nuisibles` | — | `GET/POST …/traitements-nuisibles` |
| `locaux?tab=conformite` | — | `GET …/locaux/score-conformite` |
| `locaux?tab=systeme` | — | `GET/POST …/sauvegardes`, PRA conditionné aux faits |
| `auto-evaluation` | `campagne-courante`, `evaluer/{id}`, `generer-capa/{id}`, `nouvelle-complete` | `GET …/rapport` (**existant**), `POST …/cloturer` |
| `documents?tab=bibliotheque` | `GET/POST …/documents`, `PUT …/{id}` (**501**) | machine à états |
| `documents?tab=taches` | `approbation-document.tsx` | file d'approbation serveur |
| `documents?tab=versions` | `GET …/documents/{id}` | historique d'indices |
| `documents?tab=diffusion` | — | `POST …/diffusions`, accusés |
| `documents?tab=revisions` | — | `POST …/reviser` |
| `documents?tab=modifications` | — | lu depuis `audit_logs` |
| `documents?tab=processus` · `?tab=politique` | — | vues filtrées du même référentiel |
| `modeles?tab=catalogue` | `GET /modeles-bpd` (**3 fiches vides**) | seeder des 62 |
| `modeles?tab=adoptions` | — | `POST …/adopter`, divergences |
| `modeles?tab=mises-a-jour` | — | détection par `sha256` |
| `modeles?tab=propres` | `GET …/documents` | filtre `modele_source_id IS NULL` |
| `non-conformites?tab=kanban` · `?tab=liste` | `GET`, `PUT …/non-conformites` | motif + signature par transition |
| `non-conformites?tab=analyse-causes` | colonne `analyse_causes_5m` | rendre opérante |
| `non-conformites?tab=plan-capa` | colonnes `action_*`, `date_echeance_capa` | rendre opérantes |
| `non-conformites?tab=efficacite` | colonnes `efficacite_verifiee`, `conclusion_efficacite` | bloquer la clôture sans vérification |
| `non-conformites?tab=statistiques` | — | G-111→G-116 |
| `echeances` (6 vues × 3 modes) | `GET/POST …/echeances`, `PUT /echeances/{id}`, `GET …/ical` | route d'écriture unique, sources fédérées |
| `comptabilite?tab=tableau_bord` | `GET /comptabilite/journal-ventes`, `/clotures` | indicateurs calculés |
| `comptabilite?tab=journaux` | `GET /comptabilite/journal-ventes` | grand livre, balance |
| `comptabilite?tab=saisie_manuelle` | `POST /comptabilite/ecritures` (**501**) | équilibre contrôlé |
| `comptabilite?tab=plan_comptable` | — | `GET /comptabilite/plan-comptable` |
| `comptabilite?tab=tiers_lettrage` | — | `GET/POST /comptabilite/lettrages` |
| `comptabilite?tab=etats_financiers` | — | `GET /comptabilite/etats?periode=` |
| `journal` | `GET …/audit-logs`, `GET …/verifier-integrite` (**501**) | filtres, export signé, mode inspecteur |
| `appareils` (7 sections) | `GET /auth/devices`, `POST …/appareils-autorises`, `revoquer`/`reactiver` (**501**), `DELETE /auth/devices/{id}` | bornes, balances, capteurs rattachés |
| `compte` (9 sections) | `PUT /auth/profile` (**501**) | droits, officines, qualification, formations, RH, données |
| `parametres` (11 sections) | `GET …/parametres`, `PUT …/parametres/{cle}`, `GET /auth/me` | 9 sections à brancher, historique depuis `audit_logs` |
| `securite` (8 sections) | `GET/POST/DELETE /auth/mfa`, `GET /auth/devices`, `DELETE /auth/devices/{id}`, `PUT /auth/password` (**501**), `POST /auth/devices/revoke-others` (**501**) | codes de secours serveur, politique, journal, récupération |

## Annexe B — Ancres de test

| Ancres | Écran |
| --- | --- |
| `data-tour="tem-courbe"` · `data-tour="tem-excursion"` · `data-testid="tem-releve-saisie"` · `tem-zone-<code>` · `tem-capteur-<id>` | Chaîne du froid |
| `data-testid="loc-equipement-<id>"` · `loc-etalonnage-<id>` · `loc-nettoyage-visa"` · `loc-score-conformite"` · `loc-sauvegarde-<id>` · `loc-pra-etat"` | Locaux & Matériel |
| `data-tour="aut-score"` · `data-tour="aut-chapitres"` · `data-testid="aut-article-<ref>"` · `aut-campagne-<id>"` · `aut-cloture"` | Auto-évaluation |
| `data-testid="doc-ligne-<id>"` · `doc-statut-<statut>"` · `doc-cartouche"` · `doc-approbation"` · `doc-diffusion"` · `doc-corpus-import"` | GED |
| `data-testid="mod-catalogue-compteur"` · `mod-modele-<id>"` · `mod-instantiation"` · `mod-divergence"` | Modèles BPD |
| `data-testid="nc-carte-<id>"` · `nc-fiche"` · `nc-capa"` · `nc-efficacite"` · `nc-indicateurs"` | Non-conformités |
| `data-testid="ech-ligne-<id>"` · `ech-calendrier"` · `ech-regle-<id>"` · `ech-cloture"` · `ech-report"` | Échéancier |
| `data-testid="cpt-bilan"` · `cpt-balance"` · `cpt-ecriture-<id>"` · `cpt-extourne"` · `cpt-liasse"` · `cpt-reconciliation"` | Comptabilité |
| `data-tour="aud-integrite"` · `data-testid="aud-entree-<id>"` · `aud-verification-resultat"` · `aud-export"` · `aud-mode-inspecteur"` | Journal d'audit |
| `data-testid="app-appareil-<id>"` · `app-appairage"` · `app-revocation"` · `app-registre"` | Appareils |
| `data-testid="cpte-profil"` · `cpte-droits"` · `cpte-donnees-demande"` · `cpte-badge"` | Compte |
| `data-testid="par-parametre-<cle>"` · `par-historique"` · `par-utilisateur-<id>"` · `par-secret-etat"` | Paramètres |
| `data-testid="sec-mfa"` · `sec-codes-secours"` · `sec-sessions"` · `sec-politique"` · `sec-journal"` · `sec-erreur-donnee"` | Sécurité |

## Annexe C — Check-list

**Avant de commencer**

- [ ] L21 livré : les 9 routes en `501` répondent en démonstration
- [ ] L17 livré : la signature est vérifiée serveur
- [ ] Le corpus `references/canevas/catalogue.json` est vérifié (62 documents, 62 empreintes)
- [ ] Les fixtures `reponses-demo.json` sont ajoutées **avant** d'étendre le `it.each`

**Pendant**

- [ ] Aucun document imprimable ne déclare un fait sans source
- [ ] Aucune valeur réglementaire dupliquée
- [ ] Toute transition d'état porte motif et signature
- [ ] Aucune donnée fictive d'identité, d'accès ou de résultat
- [ ] Aucun repli silencieux sur une donnée de conformité ou de sécurité
- [ ] Aucun `<table>` brut, aucun `style={{}}` inline, aucune `window.print()`
- [ ] Chaque libellé vient de `i18n/fr.ts`

**Avant de livrer**

- [ ] Les 5 commandes `grep` du §8 retournent zéro
- [ ] Les 38 critères d'acceptation sont démontrés sur la pile de démonstration
- [ ] `GET /api/modeles-bpd` renvoie 62 modèles avec contenu
- [ ] Le bouton « Vérifier l'intégrité » du journal d'audit affiche un résultat réel
- [ ] La couverture d'audit atteint 100 % des tables métier
- [ ] Couper l'API de démo produit des erreurs explicites partout, jamais des données conformes par défaut

*Fin du volet 6. Les six volets couvrent l'ensemble des 24 écrans de l'application.*
