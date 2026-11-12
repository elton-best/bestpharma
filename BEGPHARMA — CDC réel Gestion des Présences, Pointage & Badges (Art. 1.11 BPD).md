# BEGPHARMA — CDC réel · Gestion des présences, pointage, badges et dossiers du personnel

**Volet 4 — Module « Pointage Présence (Art 1.11) » et « Personnel & Ordre B »**
**Nature du document** : cahier des charges d'implémentation destiné à un agent de développement.
**Méthode** : audit du code réellement livré, puis spécification de la cible. Chaque anomalie est sourcée (`fichier:ligne`) ; chaque exigence est vérifiable.

| | |
| --- | --- |
| Écrans couverts | `/dashboard/pointage` (1 126 l., 7 sections) · `/dashboard/personnel` (959 l., 9 sections) |
| Modules partagés | `badge-double-face.tsx` (632 l.) · `modale-profil-collaborateur.tsx` (303 l.) · `modale-historique-presences.tsx` (255 l.) · `bpd-communs.tsx` (`ModaleSignatureCode`, `BoutonCreerNC`) |
| Consommateurs transverses | `tableau-de-bord.tsx:53` · `notifications-sheet.tsx:50` · `consolidation.tsx:304` · `parametres.tsx:234` |
| Backend | `PointageController.php` (196 l.) · `EmployeController.php` (85 l.) · tables `employes`, `pointages`, `inscriptions_ordre` |
| Socle réglementaire | Guide BPD ABMed **art. 1.11** (présence physique continue du pharmacien) · BPD-2 Personnel · codes UI existants POI-01/03/07/09/10/13 et PER-01…05 |
| Numérotation | défauts **DEF-01→DEF-25**, incohérences **INC-01→INC-08**, défauts propres au badge **BDG-D1→BDG-D9**, exigences **PRS/BDG/DOS/PLN/RPT/PAR-nn**, règles d'onglets **TAB-07→TAB-10**, règles transverses **RG-13→RG-24**, modales **M-128→M-157**, graphiques **G-57→G-68**, lots **L15→L20** |
| Convention | `BDG-Dn` désigne un **défaut** constaté sur le badge (§1.3) ; `BDG-nn` désigne une **exigence** cible (§2.4). Les deux séries ne se recouvrent pas |

> **Documents complémentaires** : ce volet prolonge et ne répète pas les trois précédents. Les modales et graphiques continuent la numérotation du *CDC réel (Stock, Stupéfiants, Qualité, Finance, Compte)* — M-43→M-127 et G-21→G-56 — et les règles transverses continuent ses RG-01→RG-12, de même que les lots continuent ses L8→L14. Le *quoi* fonctionnel des 9 pages qualité fait foi dans le cahier « Qualité & BPD ABMed » déjà présent au dépôt.

---

## Sommaire

1. [Audit du réel](#1--audit-du-réel)
2. [Interfaces cibles](#2--interfaces-cibles)
3. [Modales M-128 → M-157](#3--modales-m-128--m-157)
4. [Graphiques G-57 → G-68](#4--graphiques-g-57--g-68)
5. [Télémétrie du module présence](#5--télémétrie-du-module-présence)
6. [Exigences transverses RG-13 → RG-24](#6--exigences-transverses-rg-13--rg-24)
7. [Contrats d'API et schéma de données](#7--contrats-dapi-et-schéma-de-données)
8. [Critères d'acceptation](#8--critères-dacceptation)
9. [Plan de livraison L15 → L20](#9--plan-de-livraison-l15--l20)
- [Annexe A — Section → endpoints](#annexe-a--section--endpoints)
- [Annexe B — Ancres de test](#annexe-b--ancres-de-test)
- [Annexe C — Check-list rapide](#annexe-c--check-list-rapide)
- [Annexe D — Migrations SQL proposées](#annexe-d--migrations-sql-proposées)

---

## 1 — Audit du réel

### 1.1 Cartographie

| Zone | Fichier | Lignes | Sections | Endpoints appelés | État |
| --- | --- | --- | --- | --- | --- |
| Pointage & Présence | `dashboard/pointage.tsx` | 1 126 | 7 | `GET /officines/{id}/employes`, `GET /officines/{id}/pointages`, `POST /officines/{id}/pointages` | 2 sections réelles sur 7 |
| Personnel & Ordre B | `dashboard/personnel.tsx` | 959 | 9 | `GET/POST /officines/{id}/employes`, `PUT /officines/{id}/employes/{id}` | 2 sections réelles sur 9 |
| Badge double face | `modules/badge-double-face.tsx` | 632 | — | aucun | rendu réel, données en dur |
| Profil collaborateur | `modules/modale-profil-collaborateur.tsx` | 303 | 3 onglets | aucun | vitrine |
| Historique présences | `modules/modale-historique-presences.tsx` | 255 | — | aucun | réel (filtres + CSV) |
| Signature par code | `modules/bpd-communs.tsx` | 486 | — | aucun pour la signature | **non vérifiée** |
| Alerte pharmacien | `tableau-de-bord.tsx:53`, `notifications-sheet.tsx:50` | — | — | `GET /officines/{id}/pointages/actif` | réel, alerte seule |
| Pointage serveur | `Api/PointageController.php` | 196 | — | `index`, `store`, `actif`, `prise` | réel, sans traçabilité |
| Fiches RH serveur | `Api/EmployeController.php` | 85 | — | `index`, `store`, `update` | réel, identifiants fragiles |

**Mécanisme d'onglets — particularité propre à cet écran.** `pointage.tsx` est le seul à cumuler **deux mécanismes pilotés par la même variable** : un `SelecteurFiltrable` (`l.459-472`, 7 options) *et* des `Tabs` Radix (`l.476`) synchronisés sur `activeTab` (`l.95`). Le `SelecteurFiltrable` change la valeur, les `Tabs` rendent le contenu. Conséquence : l'URL ne porte jamais la section, le retour arrière du navigateur ne fonctionne pas, et aucun lien profond n'est possible vers « Corrections » ou « Badges ». C'est le point d'entrée de la règle **TAB-07** ci-dessous.

| Code | Constat | Exigence |
| --- | --- | --- |
| **TAB-07** | Deux mécanismes d'onglets superposés (`SelecteurFiltrable` + `Tabs`) sur un même état local | Conserver le couple — il est ergonomique — mais le piloter par l'URL |
| **TAB-08** | `activeTab` initial codé en dur `"direct"` (`l.95`), aucun `useSearch` ni `validateSearch` | Ajouter `validateSearch` sur la route : `{ tab?: 'direct'\|'plannings'\|'absences'\|'corrections'\|'badges'\|'rapports'\|'parametres' }` |
| **TAB-09** | Les `TabsTrigger` ne sont pas rendus : seul le `SelecteurFiltrable` est visible, les onglets Radix n'apportent que le `TabsContent` | Remplacer `Tabs` par un rendu conditionnel simple ou afficher la barre d'onglets ; ne pas maintenir un composant invisible |
| **TAB-10** | Le label de la première option est recalculé à chaque rendu (`Présence en Direct & Équipe (${totalPresents}/${employes.length})`) et sert aussi de `badge` | Conserver le compteur, mais le sortir du label : label stable + badge numérique séparé |

### 1.2 Défauts relevés

Chaque ligne indique le fichier, la ligne exacte, le comportement observé et la source de vérité attendue.

#### A. Chaîne de pointage — le cœur du module

| Code | Fichier:ligne | Comportement réel | Cible |
| --- | --- | --- | --- |
| **DEF-01** | `pointage.tsx:205-211` | Le scan est résolu **côté client** contre `matricule`, `id`, `code_badge` — **jamais contre `pin_code`**, alors que la colonne existe (`migration 133627:48`) et que le jeu de démonstration en fournit un pour chaque employé (`mock-backend.mjs:251-254`) | La borne envoie le code brut au serveur ; c'est le serveur qui identifie l'employé |
| **DEF-02** | `pointage.tsx:211` | En cas d'échec de reconnaissance, repli sur `employes[0]` puis sur un objet codé en dur `{ id: "emp-1", nom_complet: "Dr Félicien AGBO", poste: "pharmacien_titulaire" }` → **tout code inconnu pointe le premier employé de la liste** | Un code non reconnu est **rejeté** : `422 CODE_BADGE_INCONNU`, message explicite à la borne, aucun pointage écrit |
| **DEF-03** | `pointage.tsx:214-217` | `POST /pointages` reçoit `{ employe_id, type }` : le client déclare *qui* a pointé. `PointageController::store:46-70` ne valide aucune habilitation et aucun secret | Le pointage nominatif passe par un identifiant de badge vérifié serveur ; `employe_id` fourni par le client n'est accepté que pour un rôle responsable, et l'écriture porte alors `source = 'saisie_responsable'` + `saisi_par` |
| **DEF-04** | `EmployeController.php:57` · `migration 133627:48` | `pin_code` **en clair** en base, valeur par défaut `'1234'` à la création, et renvoyé tel quel par `GET /employes` (`EmployeController.php:26-29`, `SELECT *`) | `pin_hash` (argon2id), jamais renvoyé par l'API ; défaut `'1234'` supprimé ; le PIN est défini à l'émission du badge et affiché **une seule fois** |
| **DEF-05** | `EmployeController.php:46` | `matricule = 'EMP-' . strtoupper(substr($poste,0,3)) . '-' . rand(10,99)` → **90 valeurs possibles par poste**, sans contrôle d'unicité. Ce matricule est la charge utile du QR (`badge-double-face.tsx:38`) et l'une des clés de reconnaissance du scan | Matricule séquentiel par officine (`EMP-2026-0001`), contrainte d'unicité en base, collision impossible par construction |
| **DEF-06** | `EmployeController.php:45` | `code_badge = 'BDG-' . strtoupper(Str::random(6))`, sans vérification d'unicité (la colonne est `unique` → erreur SQL brute 23505 renvoyée au client en cas de collision) | Génération avec boucle de retry et contrôle d'unicité ; erreur 409 explicite |
| **DEF-07** | `EmployeController.php:59-60` | `'charte_qualite_signee' => true` et `'charte_signee_le' => now()` sont **posés automatiquement à la création** de la fiche : la charte qualité est déclarée signée sans aucune signature | Les deux champs passent à `false`/`null` par défaut et ne sont alimentés que par une signature vérifiée (RG-15), tracée dans `signatures_electroniques` |
| **DEF-08** | `PointageController.php:118-142` | `prise()` identifie l'employé par `nom_complet LIKE '%<premier mot du nom de l'utilisateur>%'`, puis, à défaut, **crée un employé** (`l.138`) nommé « Dr Pharmacien Titulaire » | Interdiction de créer une fiche depuis un pointage ; `404 EMPLOYE_NON_RATTACHE` et renvoi vers la fiche du personnel. Le rattachement `users.id ↔ employes.id` devient une colonne explicite |
| **DEF-09** | `PointageController.php:180` · `badge-double-face.tsx:37,353` · `pointage.tsx:516-521` | **Trois définitions divergentes de « pharmacien »** : le serveur compte `pharmacien_titulaire, pharmacien_adjoint, pharmacien_remplacant, promoteur` ; le badge affiche « INSCRIT À L'ORDRE · SECTION B » pour `promoteur, pharmacien_titulaire, pharmacien_adjoint, rmq`. Un remplaçant compte pour la conformité art. 1.11 mais n'a pas la mention ordinale ; `rmq` a la mention mais ne compte pas | Une **constante unique** partagée (`POSTES_PHARMACIEN`), déclinée en deux attributs distincts : `compte_pour_presence_pharmaceutique` et `inscription_ordre_section_b_requise`. Voir RG-18 |
| **DEF-10** | `PointageController.php:180` | Le `promoteur` est compté comme pharmacien présent : un promoteur non pharmacien, ou un pharmacien promoteur qui n'est pas physiquement dans l'officine, fait passer l'établissement en « Conforme art. 1.11 » | La présence pharmaceutique ne se déduit que d'un pointage physique ; le promoteur n'est retenu que s'il possède une inscription Ordre section B active **et** un pointage d'arrivée non clôturé |
| **DEF-11** | `PointageController.php:46-70` | Aucune idempotence ni contrôle de cohérence : `arrivee` après `arrivee` accepté, `depart` sans `arrivee` accepté, aucun contrôle de `actif`/`archived` → **un employé désactivé peut continuer à pointer** | Contrôle d'état : `actif = true AND archived = false` ; refus d'un mouvement identique au dernier (`409 MOUVEMENT_REDONDANT`) sauf dérogation motivée ; refus d'un `depart` sans `arrivee` ouverte |
| **DEF-12** | `pointage.tsx:248` vs `bpd-communs.tsx:66` | Longueurs minimales incohérentes : 3 caractères pour le PIN de la borne, 4 pour la signature | Une seule règle : 4 chiffres minimum, configurable par `officine_parametres.pin_longueur_min` |
| **DEF-13** | `pointage.tsx:355` vs `SetPostgresTenantContext.php:20-30` | La borne affiche « Session Continue H24 · Sans expiration de session », mais **toutes** les routes API passent par le middleware qui renvoie `423 SESSION_LOCKED_INACTIVITY` après 15 minutes d'inactivité. La borne meurt donc silencieusement la nuit | Jeton de borne dédié (équipement autorisé, RG-20), exempté du verrou d'inactivité mais borné dans le temps, révocable, et rattaché à `appareils_autorises` |

#### B. Signature, corrections et absences

| Code | Fichier:ligne | Comportement réel | Cible |
| --- | --- | --- | --- |
| **DEF-14** | `pointage.tsx:982-991` | La modale « Déclaration d'un Oubli de Pointage (POI-09) » **n'appelle aucun endpoint** : `Signer & Valider` ouvre la signature, dont le rappel se contente de `toast.success("Correction enregistrée avec succès.")` et de fermer. Rien n'est écrit, la signature est jetée (`onSigner` ignore `sig`) | `POST /officines/{id}/pointages/corrections` → écriture rectificative liée au pointage d'origine, motif obligatoire ≥ 10 caractères, signature vérifiée serveur |
| **DEF-15** | `bpd-communs.tsx:66,86-91` | `ModaleSignatureCode` **ne vérifie rien** : n'importe quelle suite de 4 chiffres est acceptée ; `hash_signature` est fabriqué côté client (`BPD-SIG-${Date.now().toString(36)}-${Math.random()…}`) et `horodatage_serveur: now.toISOString()` est **l'horloge du client** étiquetée « serveur ». Le composant importe `api` mais ne l'appelle que pour `getUser()` (`l.60`) | `POST /signatures` : le serveur vérifie le code contre `pin_hash`, horodate lui-même, calcule un HMAC-SHA256 sur `{objet, acteur, officine, horodatage}` et renvoie l'empreinte. Le client n'affiche que le résultat |
| **DEF-16** | `pointage.tsx:108-112, 699` | La modale « Nouvelle demande » d'absence est **morte** : l'état `modaleAbsence` et ses 4 champs sont déclarés, le bouton les déclenche, mais **aucun `<Dialog open={modaleAbsence}>` n'existe dans le JSX**. Le clic ne produit rien | Modale M-137 réelle + `POST /officines/{id}/absences` + workflow de validation |
| **DEF-17** | `pointage.tsx:120, 1032-1110` | La modale « Historique de Présence : {nom} » (79 lignes, tableau + export CSV) est **inatteignable** : `setEmployeHistorique(e)` n'est appelé nulle part. Code mort | La brancher sur l'action « Historique » de la ligne du tableau et sur le profil collaborateur |
| **DEF-18** | `pointage.tsx:660-681` | Section Plannings (POI-07) **entièrement statique** : « Dr Félicien AGBO », « Dr Sévérin BIO », « Prochaine garde : Nuit du Samedi 07/11 », effectifs « 2 dispensateurs, 1 caissier ». Le bouton « Créer créneau » n'a **aucun `onClick`** | Créneaux persistés (`plannings_creneaux`), contrôle « au moins un pharmacien par tranche d'ouverture », lien avec `/dashboard/gardes` |
| **DEF-19** | `pointage.tsx:733-741` | Section Corrections : une seule ligne **statique** (« Dr Félicien AGBO · Arrivée rectifiée · Motif : Problème borne wifi entrée · Validé par Titulaire · Rectifié avec trace ») | Liste réelle des écritures rectificatives, filtrable, avec compteur mensuel |
| **DEF-20** | `pointage.tsx:708` | Section Absences : état vide **codé en dur** (« Aucune absence en cours. Toutes les demandes passées sont régularisées. ») indépendamment des données | État vide réel, déduit du nombre d'absences ouvertes |

#### C. Rapports, paramètres et exports

| Code | Fichier:ligne | Comportement réel | Cible |
| --- | --- | --- | --- |
| **DEF-21** | `pointage.tsx:873-875` | Bloc de synthèse paie **codé en dur** : « Mois en cours : Novembre 2026 », « Taux de ponctualité global : **96.4%** », « Total heures travaillées : **412h** », « Heures supplémentaires BPD validées : **14h** » | Calcul serveur `GET /officines/{id}/presence/rapport?periode=` — aucun cumul côté client |
| **DEF-22** | `pointage.tsx:806-818` | L'export « Excel Paie » produit un CSV de la **liste brute des pointages du jour** (4 colonnes, horodatage ISO non formaté) : aucune durée, aucun appariement arrivée/départ, aucune période choisie | Export d'un relevé calculé : paires arrivée/départ, durée, nuit, garde, HS, retards ; période paramétrable ; horodatage formaté `Africa/Porto-Novo` |
| **DEF-23** | `pointage.tsx:887-908` | Section « Paramètres de Contrôle de l'Article 1.11 » : deux cartes descriptives **non interactives** (aucun `onClick`, aucun état). Or les paramètres existent déjà en base et sont éditables ailleurs (`officine_parametres` : `tolerance_pointage_minutes`, `mode_presence_pharmacien` — `mock-backend.mjs:334-335`, `parametres.tsx:234,510-521`) | La section lit et écrit réellement ces paramètres, et affiche leur effet ; l'édition passe par la modale M-144 avec motif obligatoire |
| **DEF-24** | `parametres.tsx:234,510-521` + absence totale de consommateur | `mode_presence_pharmacien` peut valoir `alerte` ou `blocage`, mais **rien n'applique `blocage`** : `vente.tsx` et `dispensation.tsx` ne consultent ni `/pointages/actif` ni ce paramètre. Seuls `tableau-de-bord.tsx:138` et `notifications-sheet.tsx:88` affichent une alerte | Le paramètre devient **opérant** : en mode `blocage`, la caisse et la dispensation refusent, avec dérogation motivée (M-143) journalisée et notifiée au promoteur |
| **DEF-25** | `pointage.tsx:760-763` | « Imprimer planche badges » = `window.print()` de **la page entière** (barre latérale, en-tête, tableaux compris) suivi d'un toast de succès | Planche de badges rendue hors écran puis imprimée (M-129) ; `@media print` masque le reste de l'application |

### 1.3 Badge professionnel

| Code | Fichier:ligne | Comportement réel | Cible |
| --- | --- | --- | --- |
| **BDG-D1** | `badge-double-face.tsx:38,438` | Le QR est généré par un **service tiers externe** : `https://api.qrserver.com/v1/create-qr-code/?…&data=BESTPHARMA_BADGE:<matricule>`. Le matricule part sur Internet, l'impression échoue hors ligne, et l'aperçu affiche une image cassée si le réseau manque | QR généré **localement** (SVG ou data-URI). Aucun appel tiers. Ajouter une dépendance de génération QR plutôt qu'un service distant |
| **BDG-D2** | `badge-double-face.tsx:38` | Charge utile du QR : `BESTPHARMA_BADGE:<matricule>` — non signée, sans expiration, rejouable. Une photographie du badge suffit à pointer à la place de son titulaire | Charge utile signée : `v2|<badge_id>|<nonce>|<expiration>|<hmac>` ; le serveur vérifie l'empreinte, l'expiration et le statut du badge avant d'écrire |
| **BDG-D3** | `badge-double-face.tsx:328` | Le verso porte un **faux code-barres** : la chaîne littérale `\|\|\| \| \|\|\|\| \| \|\|\| \|\|\|\| \|` dans une `div.barcode-fake`. Elle ressemble à un code scannable et ne l'est pas | Soit un vrai code-barres Code-129 encodant le matricule, soit suppression de l'élément. Aucune représentation trompeuse d'une fonctionnalité |
| **BDG-D4** | `badge-double-face.tsx:290, 375` | Validité **codée en dur** : « Valide Année 2026 » / « Carte Officine 2026 ». Le badge devient faux le 1er janvier 2027 sans qu'aucune alerte ne se déclenche | Validité calculée : `date_expiration = date_emission + duree_validite_mois` (paramètre), affichage de l'échéance, alerte à 30 jours, badge expiré refusé à la borne |
| **BDG-D5** | `badge-double-face.tsx:32-33, 346, 430-431` | Nom et téléphone de l'officine **par défaut** : `"PHARMACIE DE L'ÉTOILE"` et `"+229 21 31 10 20"`. `modale-profil-collaborateur.tsx:54` appelle `imprimerBadgeDoubleFace(employe)` sans les passer → tout badge imprimé depuis le profil porte l'identité d'une autre officine | Aucune valeur par défaut : l'identité de l'officine courante (`useOfficine()`) est obligatoire ; le composant refuse de rendre sans elle |
| **BDG-D6** | `badge-double-face.tsx:28, 77-78, 251` | Le commentaire et la notice annoncent un « **Format standard CR80 (54mm x 86mm)** », mais la carte est rendue en `width: 60mm; height: 94mm` avec une ligne de pliage et l'instruction « Découpez le contour puis pliez sur l'axe central pour insérer dans votre porte-badge ». Une carte 60×94 pliée n'entre dans aucun porte-badge CR80 (85,6 × 54 mm) | Deux formats explicites et distincts : **CR80 réel** (85,6 × 54 mm, recto et verso sur deux pages, pour plastifieuse) et **A4 planche** (N badges par feuille). Dimensions annoncées = dimensions rendues |
| **BDG-D7** | `badge-double-face.tsx:13, 270-271, 381-383` · `personnel.tsx:87,153` | `photo_url` est lu dans 6 composants mais **n'existe pas dans le schéma `employes`** (colonnes : `nom_complet, poste, telephone, date_embauche, actif, archived, created_by, matricule, code_badge, pin_code, habilitations, competences, date_visite_medicale, charte_qualite_signee, charte_signee_le`). Il est saisi en **texte libre** (`personnel.tsx:153` : `photo_url: photoEmploye.trim() || null`) et injecté dans `<img src>` et dans une chaîne HTML d'impression | Colonne `photo_url` créée, alimentée par `POST /officines/{id}/upload` (route existante, `routes/api.php:44`), stockée dans le tenant. Jamais d'URL libre : c'est à la fois une fuite de données du personnel vers un serveur tiers et un vecteur d'injection dans le HTML d'impression |
| **BDG-D8** | `pointage.tsx:1004` · `personnel.tsx:946` · `modale-profil-collaborateur.tsx:226` | La modale badge est montée à **trois endroits** avec des props différentes (les deux premières ne passent ni `officineNom` ni `officineTelephone`) | Un seul point d'entrée : le compos reçoit l'officine par contexte, les trois appels sont homogénéisés |
| **BDG-D9** | absence totale | **Aucun cycle de vie du badge** : rien ne trace l'émission, la remise au titulaire, la perte, la révocation, la réimpression. `EmployeController::update` ne touche ni `code_badge` ni `pin_code` de façon contrôlée (il accepte `pin_code` en clair dans `$request->only([...])`, `l.73`) | Table `badges` avec états `emis → remis → actif → perdu/volé → revoque → expire`, une seule ligne active par employé, révocation immédiate à la désactivation de la fiche |

### 1.4 Incohérences structurelles

| Code | Constat | Impact |
| --- | --- | --- |
| **INC-01** | `pointages` et `employes` n'ont **ni politique RLS ni trigger d'audit** : les 10 politiques couvrent `officines`, `utilisateurs_officines`, `officine_parametres`, `audit_logs`, `appareils_autorises`, `approbations_documents`, `fichiers_documents`, `suivis_documentaires`, `alertes_peremption`, `inscriptions_ordre` ; les 11 triggers suivent la même liste. Le registre de présence, pièce maîtresse de l'art. 1.11, n'est ni isolé en profondeur ni journalisé | Une ligne de `pointages` peut être modifiée ou supprimée sans trace ; l'inspecteur ABMed ne peut pas s'appuyer dessus |
| **INC-02** | `pointages` ne porte ni `source`, ni `created_by`, ni `poste_de_travail`, ni `ip`, ni `annule`, ni `corrige_par` (migration `132522:60-67` : 6 colonnes seulement) | Impossible de distinguer un pointage borne d'une saisie responsable ou d'une régularisation ; impossible de prouver qui a écrit |
| **INC-03** | `APP_TIMEZONE` vaut `UTC` (`config/app.php:68`) alors que toute l'interface affiche `Africa/Porto-Novo` (`pointage.tsx:132-152`). `PointageController` filtre `whereDate('horodatage', now()->toDateString())` (`l.23, 92, 189`) sur une date **UTC** | Entre 23 h et 24 h heure du Bénin, les pointages sont attribués à la journée suivante. Le cumul d'heures et la continuité pharmaceutique sont faux une heure par jour |
| **INC-04** | `inscriptions_ordre` est construit sur `user_id` (`migration 133627:33`) et `EmployeController::index` le renvoie `keyBy('user_id')` (`l.26-29`), mais les fiches sont des `employes.id`. Le mock, lui, renvoie un objet indexé par `emp1`/`emp2` avec `numero_inscription`/`statut` (`mock-backend.mjs:257-260`), alors que la migration définit `numero_ordre`, `section_ordre`, `date_inscription`, `date_echeance`, `en_regle`, `justificatif_url` | Les données Ordre section B ne peuvent être rattachées à aucun collaborateur ; trois contrats différents pour la même notion |
| **INC-05** | Les congés sont présents **dans deux écrans** : `pointage?tab=absences` (« Absences Justifiées & Congés », POI-10) et `personnel?tab=conges` (« Congés & Planning Remplacements »). Ni l'un ni l'autre n'a de backend | Double saisie garantie, aucune source de vérité |
| **INC-06** | `src/lib/i18n/fr.ts:1` énonce « Tout libellé d'interface vient d'ici », mais le fichier ne contient aucune section `pointage`, `badge`, `personnel` ni `presence` (12 sections seulement : `app, commun, auth, mfa, nav, officine, tableau, parametres, journal, appareils, roles, actions`), et les 2 085 lignes des deux écrans sont en libellés inline | La règle du dépôt n'est pas appliquée sur le module ; toute évolution de wording impose de parcourir le JSX |
| **INC-07** | `reponses-demo.json` fournit `/officines/off1/employes` mais **aucune clé `/officines/off1/pointages`**, et `ecrans-demo.test.tsx:10` liste 14 écrans parmi lesquels **`pointage` est absent** (`personnel` y est) | L'écran de pointage n'est couvert par aucun test ; l'ajouter sans fixture fait échouer la suite (`ecrans-demo.test.tsx` lève sur clé manquante) |
| **INC-08** | `personnel.tsx` code en dur l'identité ordinale de l'officine : « **ONPB-2014-B-089** », « Validité pour l'exercice : Année 2026 (Jusqu'au 31/12/2026) » (`l.235, 238, 550, 553`), l'organigramme nominatif « Dr Félicien AGBO » (`l.625`) et « 100% du personnel dispose d'un certificat médical d'aptitude en cours de validité » (`l.747`), le tout en `style={{…}}` inline | Une attestation imprimable affiche un numéro d'Ordre fictif pour toutes les officines ; le taux d'aptitude médicale est un slogan, pas une mesure |

### 1.5 Ce qui est déjà correct — à conserver

Ces comportements sont conformes et doivent être préservés à l'identique lors de la réécriture :

| Élément | Fichier:ligne | Pourquoi le garder |
| --- | --- | --- |
| Horloge `Africa/Porto-Novo` rafraîchie chaque seconde | `pointage.tsx:131-152` | Seul affichage horaire explicite sur le fuseau légal ; à généraliser (RG-19) |
| Rafraîchissement des présences toutes les 10 s | `pointage.tsx:174` | Temps réel suffisant sans surcharge ; à compléter par une invalidation après mutation (déjà présente, `l.186`) |
| Bip de confirmation Web Audio (880 Hz arrivée / 440 Hz départ, 150 ms) | `pointage.tsx:228-239` | Retour sensoriel indispensable sur une borne sans clavier ; enveloppé dans `try/catch`, ne bloque jamais |
| Accusé de réception visuel 4,5 s après scan | `pointage.tsx:224, 241-243` | Bon rythme ; à conserver en passant le contenu sur des données serveur |
| Pavé numérique tactile 12 touches, champ `autoFocus`, `inputMode="numeric"` | `pointage.tsx:319-346` | Ergonomie borne correcte |
| Modale historique globale avec recherche, filtre par type et export CSV réel | `modale-historique-presences.tsx:34-70` | Le seul composant du module entièrement fonctionnel |
| Appel à `/pointages/actif` depuis le tableau de bord et le centre de notifications | `tableau-de-bord.tsx:53`, `notifications-sheet.tsx:50,88` | La détection d'absence pharmaceutique existe déjà ; il manque l'effet bloquant |
| Recours à `imprimerFicheOfficielle` (événement `bestpharma:apercu-document`) plutôt qu'à un `window.print` direct | `export-utils.ts:48-55`, `modale-apercu-document.tsx:29` | Bon mécanisme ; `pointage.tsx:762` doit s'y conformer (DEF-25) |
| `SelecteurFiltrable` à 7 sections avec mots-clés et compteur | `pointage.tsx:459-472` | Mécanisme validé par TAB-01→TAB-06 du volet 3 ; à conserver |
| Bouton « Créer une NC » mutualisé | `bpd-communs.tsx` (`BoutonCreerNC`, appel réel `api.post` `l.264`) | À brancher sur chaque anomalie de présence (RG-24) |

---

## 2 — Interfaces cibles

### 2.1 Arborescence

```
/dashboard/pointage?tab=<section>
├── direct        Présence en direct & équipe          (réel : 2 endpoints)
├── plannings     Plannings d'équipe & gardes          (à créer : PLN-01→06)
├── absences      Absences justifiées & congés         (à créer : PRS-14→19)
├── corrections   Corrections d'oubli & régularisations(à créer : PRS-20→25)
├── badges        Badges individuels & émargement      (à refondre : BDG-01→14)
├── rapports      Rapports de présence & heures        (à créer : RPT-01→09)
└── parametres    Paramètres & règle pivot caisse      (à rendre opérant : PAR-01→06)

/dashboard/personnel?tab=<section>
├── equipe        Équipe & badges QR                   (réel)
├── dossier       Dossier individuel & pièces          (partiel)
├── ordre         Ordre des Pharmaciens (Section B)    (à créer : DOS-08→13)
├── postes        Postes & habilitations               (à créer)
├── organigramme  Organigramme hiérarchique            (statique → DOS-14→16)
├── formations    Plan de formation continue           (à créer : DOS-17→20)
├── entretiens    Entretiens individuels annuels       (à créer : DOS-21→23)
├── conges        Congés & planning remplacements      (fusionné avec absences → INC-05)
└── hygiene       Intégration & suivi médical          (à créer : DOS-24→26)

Mode borne : /dashboard/pointage?borne=1  (plein écran, jeton équipement)
```

### 2.2 Section « Présence en direct » — PRS-01 → PRS-13

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Pointage & Présence de l'Équipe   [Conforme art. 1.11]  [6 / 12 sur place]│
│ Horodatage certifié · Africa/Porto-Novo              14:32:07 · Bénin     │
│ [Historique des présences] [Lancer la borne] [Rapport du jour]            │
├──────────────────────────────────────────────────────────────────────────┤
│ Module Pointage & Présence          [ Choisir une section…        ▾ ]     │
├──────────────────────────────────────────────────────────────────────────┤
│ Continuité pharmaceutique ─────────────────────────────────────────────  │
│  06:00   08:00   10:00   12:00   14:00   16:00   18:00   20:00   22:00   │
│  ██████████████████████████░░░░░████████████████████████████████████      │
│  ── pharmacien sur place    ── interruption 12:04→12:31 (27 min)          │
│  Alerte : interruption de 27 min → NC-2026-0031 ouverte [Voir la fiche]   │
├──────────────────────────────────────────────────────────────────────────┤
│ Collaborateur │ Poste / Rôle      │ Statut      │ Dernier mouv. │ Actions │
│ ◉ M. HOUNNOU  │ Pharmacien tit.   │ ● Sur place │ Arrivée 07:28 │ [Départ]│
│   EMP-2026-0001 · Ordre B 31/12/2026 · badge actif          [Voir] [QR]  │
│ ◉ G. KPADONOU │ Dispensateur      │ ● Sur place │ Arrivée 07:45 │ [Départ]│
│ ○ S. AGBODJAN │ Caissier          │ ○ Absente   │ —             │[Arrivée]│
│ ○ I. DOSSOU   │ Agent d'entretien │ ⚠ Fiche inactive · badge révoqué      │
├──────────────────────────────────────────────────────────────────────────┤
│ 6 présents · 5 absents · 1 inactif │ Retards du jour : 2 (> 10 min)       │
└──────────────────────────────────────────────────────────────────────────┘
```

| Code | Exigence |
| --- | --- |
| **PRS-01** | Le tableau est rendu par le composant partagé `TableauRegistre` (volet 3, I-07) : tri par colonne, en-têtes `<th scope="col">`, navigation clavier, lignes `data-testid="prs-ligne-<employe_id>"`. Remplace le `<table>` brut actuel (`pointage.tsx:499-641`) |
| **PRS-02** | Colonnes : Collaborateur (photo, nom, matricule) · Poste & rôle · Mention ordinale si applicable · Statut (sur place / absent / fiche inactive) · Dernier mouvement (type + heure locale + source) · Actions |
| **PRS-03** | Le statut « sur place » est déduit du **dernier mouvement non clôturé** renvoyé par le serveur (`GET /pointages` renvoie `etat_courant` par employé), jamais d'un `.find()` sur un tableau trié implicitement (`pointage.tsx:196`) |
| **PRS-04** | Tri par défaut : pharmaciens d'abord, puis présents, puis ordre alphabétique. Filtres persistés dans l'URL (`?statut=present&poste=pharmacien`) |
| **PRS-05** | Une fiche `actif = false` ou `archived = true` est rendue en grisé, sans bouton de pointage, avec la mention « Badge révoqué le JJ/MM/AAAA » |
| **PRS-06** | Bandeau **continuité pharmaceutique** (G-58) en tête de section : bande verte continue tant qu'au moins un pharmacien est sur place, interruption rouge horodatée sinon |
| **PRS-07** | Toute interruption de continuité ≥ 1 minute déclenche : une alerte au centre de notifications, un événement de télémétrie `prs.continuite.interruption`, et une proposition de création de NC pré-remplie (`BoutonCreerNC`, gravité `majeure`, processus `GAC`, article `1.11`) |
| **PRS-08** | Le compteur d'en-tête affiche `présents / effectif actif` ; l'effectif inactif est exclu du dénominateur (aujourd'hui `employes.length` inclut les fiches inactives, `pointage.tsx:194`) |
| **PRS-09** | Action « Pointer » : une confirmation n'est demandée que pour le pointage **d'un autre collaborateur que soi-même** (saisie responsable), avec motif obligatoire |
| **PRS-10** | Action « Historique » par ligne : ouvre M-134 (aujourd'hui inatteignable, DEF-17) |
| **PRS-11** | Action « Badge » par ligne : ouvre M-128 |
| **PRS-12** | Rafraîchissement : 10 s en veille (conservé), invalidation immédiate après mutation (conservé), et bascule en 3 s lorsque la section est visible et que la fenêtre est active |
| **PRS-13** | État hors ligne : les pointages saisis sont mis en file dans `begpharma-outbox` (Dexie, mécanisme existant) avec `statut = 'en_attente'`, un compteur visible dans l'en-tête, et une resynchronisation automatique. Un pointage en attente est affiché « En attente de synchronisation » et **jamais** compté comme présent |

### 2.3 Borne de pointage H24 — PRS-26 → PRS-38

```
┌───────────────────────────────────────────────────────────────────┐
│ [+] BESTPHARMA · Borne de pointage          14:32:07  Bénin       │
│     Pharmacie de l'Étoile · Équipement BOR-01 · jeton valable 22 h│
│                                                          [Quitter]│
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│              ┌───────────────────────────────┐                    │
│              │  Scannez votre badge          │                    │
│              │  ou saisissez votre code      │                    │
│              │  ┌─────────────────────────┐  │                    │
│              │  │ ••••                    │  │                    │
│              │  └─────────────────────────┘  │                    │
│              │   [1] [2] [3]                 │                    │
│              │   [4] [5] [6]                 │                    │
│              │   [7] [8] [9]                 │                    │
│              │   [C] [0] [OK]                │                    │
│              └───────────────────────────────┘                    │
│   Dernier mouvement : G. KPADONOU · Arrivée · 14:31:52 ✓          │
├───────────────────────────────────────────────────────────────────┤
│ Pharmacien sur place : Dr M. HOUNNOU depuis 07:28 · 3 sur place   │
│ Art. 1.11 Guide BPD · ABMed          File hors ligne : 0          │
└───────────────────────────────────────────────────────────────────┘
```

| Code | Exigence |
| --- | --- |
| **PRS-26** | La borne est un **équipement autorisé** : activation par `POST /officines/{id}/bornes` qui enregistre l'équipement dans `appareils_autorises` (table existante) et délivre un jeton de borne à durée de vie limitée (24 h, renouvelé silencieusement), révocable depuis `parametres?tab=appareils` |
| **PRS-27** | Le jeton de borne est exempté du verrou d'inactivité de 15 min (`SetPostgresTenantContext.php:20-30`) mais **uniquement** pour les routes de pointage. Toute autre route renvoie `423`. La mention « Sans expiration de session » est remplacée par « Jeton équipement valable <durée> » |
| **PRS-28** | La reconnaissance est **serveur** : `POST /officines/{id}/pointages/scan` reçoit `{ code_brut, source: 'qr'|'pin'|'saisie', borne_id }` et renvoie soit le pointage créé, soit `422` avec un code d'erreur lisible (`CODE_BADGE_INCONNU`, `BADGE_REVOQUE`, `BADGE_EXPIRE`, `FICHE_INACTIVE`, `MOUVEMENT_REDONDANT`) |
| **PRS-29** | Le repli sur `employes[0]` et sur l'objet « Dr Félicien AGBO » est **supprimé** (DEF-02). Un code inconnu affiche en grand « Code non reconnu — rapprochez-vous du pharmacien » avec un bip grave (220 Hz, 400 ms), distinct des bips de succès |
| **PRS-30** | Le PIN est vérifié contre `pin_hash` côté serveur. Aucune comparaison côté client. Trois échecs consécutifs sur un même code → verrouillage 60 s affiché à la borne + événement `prs.borne.verrouillage` |
| **PRS-31** | Anti-rejeu du QR : la charge utile porte un `nonce` et une `expiration` ; le serveur refuse un `nonce` déjà consommé dans la fenêtre. Un badge photographié ne permet pas de pointer indéfiniment |
| **PRS-32** | L'écran de confirmation post-scan affiche des données **renvoyées par le serveur** (nom, poste, type, horodatage serveur), jamais l'état local (`pointage.tsx:218-223` construit aujourd'hui l'affichage depuis l'objet client) |
| **PRS-33** | Hors ligne : la borne met les scans en file (Dexie) avec l'horodatage de **saisie** et l'horodatage de **serveur** distincts ; à la reconnexion, les pointages sont poussés via `POST /api/sync/push` avec `source = 'borne_hors_ligne'` et l'écart d'horloge est journalisé |
| **PRS-34** | La borne n'expose aucune donnée nominative au repos : après 30 s d'inactivité, l'écran revient au pavé de saisie et l'historique des 5 derniers mouvements est masqué |
| **PRS-35** | Pied de page : rappel art. 1.11, officine courante, identifiant d'équipement, état de la file hors ligne. Aucune mention de conformité non vérifiée |
| **PRS-36** | Bouton « Quitter la borne » soumis à confirmation (M-156) avec saisie du code responsable, pour éviter qu'un visiteur ne sorte du mode plein écran |
| **PRS-37** | Accessibilité : contraste ≥ 4,5:1 sur fond `#0F3B27`, cibles tactiles ≥ 48 px, annonce vocale du résultat (`aria-live="assertive"`), utilisation possible sans couleur |
| **PRS-38** | La borne est testée sur tablette 10" en mode kiosk navigateur ; le plein écran est demandé explicitement (`requestFullscreen`) et l'échec est toléré |

### 2.4 Badges professionnels — BDG-01 → BDG-14

| Code | Exigence |
| --- | --- |
| **BDG-01** | Le badge est une **entité** (`badges`) et non un rendu : `id`, `employe_id`, `matricule`, `code_badge`, `photo_fichier_id`, `statut` (`emis`, `remis`, `actif`, `perdu`, `vole`, `revoque`, `expire`), `date_emission`, `date_remise`, `date_expiration`, `date_revocation`, `motif_revocation`, `impressions_nombre`, `derniere_impression_le`, `derniere_impression_par` |
| **BDG-02** | Un seul badge `actif` par employé à tout moment (contrainte d'unicité partielle). L'émission d'un nouveau badge révoque le précédent |
| **BDG-03** | Le QR est généré **localement** (BDG-D1). Charge utile : `BP2|<badge_id>|<nonce>|<exp>|<hmac_sha256>`. Le HMAC est calculé serveur avec une clé propre à l'officine, jamais exposée au client ; le client reçoit le QR déjà rendu (SVG ou data-URI) |
| **BDG-04** | Le recto porte : marque BEGPHARMA, nom de l'officine courante, photo (issue de `/upload`, jamais une URL libre), nom du titulaire, poste lisible, matricule, mention ordinale **si** `inscription_ordre_section_b_requise` et inscription active, date d'expiration |
| **BDG-05** | Le verso porte : titre « Pointage & Émargement », QR, mention de caractère personnel et incessible, nom et téléphone de l'officine courante, date d'expiration, référence art. 1.11. Le faux code-barres est supprimé ou remplacé par un Code-129 réel (BDG-D3) |
| **BDG-06** | Deux formats d'impression distincts et nommés comme tels (BDG-D6) : **CR80** (85,6 × 54 mm, recto page 1 / verso page 2, marges 0, pour plastifieuse) et **planche A4** (N badges par feuille avec repères de découpe). Les dimensions annoncées dans la notice sont celles du rendu |
| **BDG-07** | L'impression passe par `imprimerFicheOfficielle` (événement `bestpharma:apercu-document`) avec un CSS `@media print` dédié : `@page { size: 85.6mm 54mm; margin: 0 }` pour CR80, `@page { size: A4 portrait; margin: 10mm }` pour la planche. `window.print()` direct interdit (DEF-25) |
| **BDG-08** | L'impression de planche (M-129) permet la sélection multiple, affiche un aperçu paginé, et incrémente `impressions_nombre` de chaque badge imprimé |
| **BDG-09** | Toute impression est journalisée : qui, quand, quel badge, quel format. Un badge est un titre nominatif : son tirage doit être traçable |
| **BDG-10** | Validité calculée (BDG-D4) : `date_expiration = date_emission + duree_validite_mois` (paramètre officine, défaut 12 mois). Alerte à 30 jours dans l'échéancier réglementaire et au centre de notifications. Un badge expiré est refusé à la borne avec `422 BADGE_EXPIRE` |
| **BDG-11** | Cycle de vie complet : émission (M-128) → remise au titulaire (horodatée, contresignée) → perte ou vol (M-131, révocation immédiate, le code cesse de fonctionner à la borne dans la minute) → réimpression. La désactivation d'une fiche employé révoque automatiquement ses badges |
| **BDG-12** | Photo : téléversement via `POST /officines/{id}/upload` (M-130), formats JPEG/PNG, ≤ 2 Mo, recadrage carré 400 × 400 px avant stockage, stockage dans le tenant. Le champ texte libre de `personnel.tsx:153` est supprimé |
| **BDG-13** | Réinitialisation du code personnel (M-149) : réservée aux rôles responsable, génère un nouveau `pin_hash`, révoque l'ancien, affiche le code **une seule fois**, journalise l'opération. Le PIN par défaut `'1234'` est supprimé (DEF-04) et une détection `pin_par_defaut_detectes` remonte toute fiche encore équipée d'un code faible |
| **BDG-14** | Le matricule est séquentiel par officine et par année (`EMP-2026-0001`), unique en base (DEF-05). Aucun matricule n'est recomputé à l'affichage : le repli `BP-${id.slice(0,6)}` de `badge-double-face.tsx:36` et `pointage.tsx:546` est supprimé |

### 2.5 Corrections d'oubli — PRS-20 → PRS-25

| Code | Exigence |
| --- | --- |
| **PRS-20** | Le pointage d'origine est **inaltérable** (RG-13). Une correction crée une ligne `corrections_pointage` liée : `pointage_origine_id` (nullable si oubli total), `employe_id`, `type`, `heure_declaree`, `motif`, `justificatif_fichier_id`, `demande_par`, `signature_id`, `statut` (`en_attente`, `validee`, `refusee`), `validee_par`, `validee_le` |
| **PRS-21** | Motif obligatoire, ≥ 10 caractères, liste de motifs prédéfinis complétable (`panne_borne`, `reseau_indisponible`, `oubli_badge`, `affluence_comptoir`, `intervention_exterieure`, `autre`). Le motif libre « autre » exige un texte |
| **PRS-22** | Validation en deux temps : déclaration par le collaborateur ou le responsable, puis **validation par un pharmacien responsable** avec signature vérifiée serveur (RG-15). Tant qu'elle n'est pas validée, la correction n'entre dans aucun calcul d'heures |
| **PRS-23** | La liste (DEF-19) affiche : date, collaborateur, type, heure déclarée, motif, demandeur, validateur, statut, avec filtres par période et statut, et un compteur mensuel par collaborateur |
| **PRS-24** | Un taux de correction anormal est signalé : au-delà de 2 corrections par collaborateur et par mois, alerte au responsable et proposition de NC. La correction répétée est un symptôme de borne défaillante |
| **PRS-25** | Toute correction est exportable dans la feuille d'émargement, dans une colonne distincte « Régularisé » avec le nom du validateur. Une feuille d'émargement ne mélange jamais pointage physique et régularisation sans le signaler |

### 2.6 Absences et congés — PRS-14 → PRS-19

| Code | Exigence |
| --- | --- |
| **PRS-14** | Une seule source de vérité pour les absences : table `absences` consommée par `pointage?tab=absences` **et** `personnel?tab=conges` (INC-05). La section de `personnel` affiche la même liste avec un angle RH (soldes, remplacements), celle de `pointage` un angle exploitation (continuité de service) |
| **PRS-15** | Champs : `employe_id`, `type` (`conge_paye`, `maladie`, `accident_travail`, `conge_maternite`, `sans_solde`, `formation`, `mission`, `autre`), `date_debut`, `date_fin`, `demi_journees`, `motif_detail` (chiffré, voir RG-22), `justificatif_fichier_id`, `statut` (`demandee`, `validee`, `refusee`, `annulee`), `demande_par`, `validee_par`, `signature_id` |
| **PRS-16** | Workflow : demande (M-137) → justificatif téléversé si `maladie` ou `accident_travail` (M-138) → validation par le titulaire (M-139) → effet sur le planning et sur les soldes |
| **PRS-17** | Contrôle de continuité : une absence validée qui laisse une tranche d'ouverture **sans pharmacien** est signalée avant validation et exige la désignation d'un remplaçant (lien vers M-141) |
| **PRS-18** | Soldes par type et par exercice, avec report ; le décompte est en demi-journées. Aucun solde n'est codé en dur (`compte.tsx` affiche aujourd'hui « 24 jours » et « 16 jours » statiques — volet 3, D-16) |
| **PRS-19** | Une absence non justifiée au-delà de 48 h est remontée comme anomalie et propose une NC |

### 2.7 Plannings et gardes — PLN-01 → PLN-06

| Code | Exigence |
| --- | --- |
| **PLN-01** | Table `plannings_creneaux` : `officine_id`, `jour_semaine` ou `date_specifique`, `heure_debut`, `heure_fin`, `type` (`ouverture`, `journee`, `soiree`, `garde_nuit`, `garde_dimanche`), `employe_id` (responsable du créneau), `effectif_cible` (jsonb par poste), `periode_validite_debut/fin` |
| **PLN-02** | Vue hebdomadaire en grille jours × tranches, avec le responsable de chaque tranche, l'effectif affecté et l'effectif réellement présent (comparé aux pointages) |
| **PLN-03** | Contrôle bloquant à l'enregistrement : **au moins un collaborateur dont `compte_pour_presence_pharmaceutique` est vrai** sur chaque tranche d'ouverture. Un créneau sans pharmacien est refusé avec message explicite |
| **PLN-04** | Bouton « Créer créneau » fonctionnel (M-140), aujourd'hui sans `onClick` (DEF-18) |
| **PLN-05** | Les gardes officielles de l'officine proviennent de `/dashboard/gardes` (`GardeOfficineController`, écran déjà spécifié au volet 1) : la section affiche les gardes à venir et l'astreinte désignée, **sans duplication de saisie** |
| **PLN-06** | Écart planning / présence : un créneau planifié sans pointage correspondant à l'heure dite déclenche une alerte « Pharmacien planifié non pointé » |

### 2.8 Rapports de présence et paie — RPT-01 → RPT-09

| Code | Exigence |
| --- | --- |
| **RPT-01** | `GET /officines/{id}/presence/rapport?debut=&fin=&employe_id=` renvoie : par collaborateur et par jour, les paires arrivée/départ appariées, la durée travaillée, les heures de nuit, les heures de garde, les heures supplémentaires, les retards (avec la tolérance appliquée), les départs anticipés, les corrections validées |
| **RPT-02** | Appariement : une `arrivee` est appariée au `depart` suivant du même employé et de la même journée civile **en `Africa/Porto-Novo`** (INC-03). Une arrivée non clôturée à minuit est clôturée à la fin de tranche planifiée et signalée « non clôturée » |
| **RPT-03** | Retard = arrivée postérieure à l'heure planifiée du créneau + `tolerance_pointage_minutes` (paramètre existant, aujourd'hui inutilisé — DEF-23) |
| **RPT-04** | Heures supplémentaires : au-delà de la durée légale hebdomadaire paramétrable ; les heures de garde de nuit sont comptées séparément |
| **RPT-05** | Aucun cumul n'est affiché sans provenance serveur : le bloc `96.4% / 412h / 14h / Novembre 2026` (DEF-21) est remplacé par les valeurs du rapport pour la période sélectionnée |
| **RPT-06** | Sélecteur de période (mois en cours, mois précédent, trimestre, personnalisé) persisté dans l'URL |
| **RPT-07** | Export CSV du **relevé calculé** (DEF-22) : une ligne par plage travaillée, colonnes `Collaborateur · Matricule · Date · Arrivée · Départ · Durée · Dont nuit · Dont garde · HS · Retard (min) · Source · Régularisé par`. Horodatages formatés `dd/MM/yyyy HH:mm` en `Africa/Porto-Novo` |
| **RPT-08** | Feuille d'émargement PDF (M-146) : cartouche réglementaire (officine, période, code de document, version, page N/M), tableau des mouvements, colonne « Méthode » (borne / application / régularisé), totaux, **cadre de signature du pharmacien responsable** avec empreinte vérifiée, mention « Document généré le … à … par … ». Impression et export sont journalisés (RG-24 du volet 3) |
| **RPT-09** | Le rapport de présence est l'unique base de la paie : il est figé à la clôture mensuelle (`cloture_le`, `cloture_par`) et toute modification ultérieure passe par une correction validée, jamais par recalcul silencieux |

### 2.9 Paramètres art. 1.11 — PAR-01 → PAR-06

| Code | Exigence |
| --- | --- |
| **PAR-01** | La section lit `GET /officines/{id}/parametres` et écrit `PUT /officines/{id}/parametres/{cle}` sur les clés existantes : `tolerance_pointage_minutes` (nombre, défaut 10), `mode_presence_pharmacien` (`alerte` \| `blocage`), et les clés nouvelles `duree_validite_badge_mois`, `pin_longueur_min`, `seuil_corrections_mensuel`, `heures_nuit_debut`, `heures_nuit_fin`, `duree_legale_hebdomadaire` |
| **PAR-02** | Les deux cartes actuelles deviennent des contrôles réels (radio + curseur), avec valeur courante, valeur par défaut réglementaire, et date de dernière modification (DEF-23) |
| **PAR-03** | Toute modification exige un motif et une signature (M-144) et alimente l'historique des paramètres — qui existe déjà côté `parametres.tsx:122` sous forme d'une ligne **codée en dur** (« HIST-01 … Dr Marie AGOSSOU … 04/11/2026 à 14:30 ») à remplacer par l'historique réel de `officine_parametres` |
| **PAR-04** | **`mode_presence_pharmacien = blocage` doit avoir un effet réel** (DEF-24) : `POST /caisse/ventes` et `POST /dispensations` renvoient `409 ABSENCE_PHARMACIEN` lorsque aucun pharmacien n'est sur place. L'interface de caisse et de dispensation affiche un bandeau bloquant avec le motif et l'accès à la dérogation |
| **PAR-05** | Dérogation (M-143) : en mode `blocage`, une vente ou une dispensation peut être débloquée par un motif obligatoire, une signature de responsable, une notification immédiate au promoteur, une écriture au journal d'audit et une NC pré-remplie. Le compteur de dérogations du mois est affiché |
| **PAR-06** | La section affiche l'**effet courant** du paramètre, vérifié côté serveur : « Actuellement : aucun pharmacien sur place → la caisse est bloquée » ou « → une alerte est affichée, la vente reste possible ». L'utilisateur voit la conséquence, pas seulement le libellé |

### 2.10 Personnel & Ordre B — DOS-01 → DOS-27

| Code | Exigence |
| --- | --- |
| **DOS-01** | Fiche collaborateur (M-132) en 3 onglets : Général (identité, poste, coordonnées, dates, habilitations, compétences), Badge (aperçu double face + actions), Dossier RH (pièces, diplômes, contrat, certificats) |
| **DOS-02** | Création et modification réelles (`POST`/`PUT /employes` existent) avec validation : nom obligatoire, poste issu d'une **liste close** (pas de texte libre — c'est ce qui permet DEF-09), date d'embauche, téléphone au format béninois |
| **DOS-03** | Désactivation ≠ suppression : `actif = false` révoque les badges, bloque le pointage, conserve l'historique. Aucune suppression physique n'est exposée dans l'interface (RG-13) |
| **DOS-04** | Habilitations et compétences (colonnes jsonb existantes, aujourd'hui jamais écrites) : matrice éditable, datée, signée ; une habilitation retirée est historisée |
| **DOS-05** | Visite médicale : `date_visite_medicale` existe ; ajouter `medecin`, `apte` (`apte`, `apte_avec_reserves`, `inapte`), `prochaine_echeance`, `justificatif_fichier_id`. Alerte à 30 jours. Le taux « 100 % du personnel dispose d'un certificat médical » (`personnel.tsx:747`) devient une mesure calculée |
| **DOS-06** | Charte qualité : `charte_qualite_signee` et `charte_signee_le` ne sont plus posés à la création (DEF-07) mais alimentés par une signature vérifiée, avec le document signé archivé |
| **DOS-07** | Pièces du dossier : téléversement via `/upload`, typage (`diplome`, `contrat`, `attestation_ordre`, `certificat_medical`, `fiche_poste`, `charte_signee`, `casier_judiciaire`), date de validité, contrôle des pièces obligatoires déjà listées (`personnel.tsx:250-256`) |
| **DOS-08** | Ordre section B (PER-02) : rattachement par `employe_id` (INC-04) — migration de `inscriptions_ordre.user_id` vers `employe_id`, ou table de liaison. Champs alignés sur le schéma réel : `numero_ordre`, `section_ordre` (défaut `B`), `date_inscription`, `date_echeance`, `en_regle`, `justificatif_url` |
| **DOS-09** | Le numéro d'Ordre affiché et imprimé provient de la fiche : suppression de « ONPB-2014-B-089 » et de « 31/12/2026 » codés en dur (`personnel.tsx:235,238,550,553` — INC-08) |
| **DOS-10** | L'attestation d'inscription imprimable porte le cartouche réglementaire, les données réelles, la date de génération, et la mention « Copie non contrôlée » si elle n'est pas signée |
| **DOS-11** | Échéance ordinale : alerte à 90 / 30 / 7 jours, remontée dans l'échéancier réglementaire (`/dashboard/echeances`) et dans le centre de notifications. Une inscription échue retire la mention ordinale du badge et déclenche une NC |
| **DOS-12** | Un collaborateur dont le poste exige l'inscription section B et qui ne l'a pas ne peut pas être affecté à un créneau d'ouverture (lien PLN-03) |
| **DOS-13** | Cotisation ordinale : `en_regle` éditable avec justificatif et date |
| **DOS-14** | Organigramme (PER-05) généré depuis les données réelles : postes, rattachements, suppléances. Suppression de « Dr Félicien AGBO » codé en dur (`personnel.tsx:625`) |
| **DOS-15** | L'organigramme est imprimable avec cartouche (code de document, version, date d'approbation, approbateur) |
| **DOS-16** | Toute modification de ligne hiérarchique est horodatée et signée |
| **DOS-17** | Plan de formation (BPD-2) : actions avec thème, public cible, organisme, dates, coût, statut (`planifiee`, `realisee`, `annulee`), participants, attestation |
| **DOS-18** | Formations obligatoires BPD identifiées comme telles, avec échéance de recyclage |
| **DOS-19** | Taux de réalisation calculé (réalisé / planifié) — c'est le G-67 |
| **DOS-20** | Une formation réalisée alimente la matrice de compétences (DOS-04) |
| **DOS-21** | Entretiens individuels annuels : fiche par collaborateur et par exercice, objectifs, évaluation, axes de progrès, signatures des deux parties |
| **DOS-22** | Échéance annuelle : alerte si un collaborateur actif n'a pas d'entretien sur l'exercice |
| **DOS-23** | Les entretiens ne contiennent pas de donnée de santé ; un champ libre médical y est interdit (RG-22) |
| **DOS-24** | Intégration : livret d'accueil remis (date + signature), charte d'hygiène signée, visite médicale initiale |
| **DOS-25** | Suivi médical périodique avec échéances calculées |
| **DOS-26** | Fiches de poste (PER-03/04) rattachées au poste, versionnées, signées, et liées aux habilitations |
| **DOS-27** | **Journalisation des consultations** : l'ouverture d'un dossier individuel est tracée (`qui`, `quand`, `quelle fiche`) et consultable par le responsable (M-157). Les données du personnel sont sensibles |

---

## 3 — Modales M-128 → M-157

Règles communes (identiques aux volets 2 et 3) : bureau → `Dialog`, mobile < 640 px → `Sheet` ; un refus serveur ne ferme jamais la modale ; chaque modale porte `data-testid` ; toute modale qui écrit exige une signature vérifiée serveur lorsque le champ `signature_id` existe.

| Code | Modale | Déclencheur | Champs | Effet serveur |
| --- | --- | --- | --- | --- |
| **M-128** | Badge professionnel double face | Ligne du tableau, section Badges, profil collaborateur | Aperçu recto/verso/les deux, bascule de format CR80 ↔ planche A4, état du badge, échéance | `GET /badges/{id}/qr` (QR signé) · `POST /badges/{id}/impressions` |
| **M-129** | Planche de badges | Section Badges → « Imprimer la planche » | Sélection multiple, format, nombre par feuille, aperçu paginé | `POST /badges/impressions/lot` |
| **M-130** | Photo du collaborateur | Profil → onglet Badge, M-128 | Zone de dépôt, recadrage carré 400×400, aperçu | `POST /officines/{id}/upload` puis `PUT /employes/{id}` |
| **M-131** | Perte, vol ou révocation de badge | M-128, liste des badges | Motif (`perdu`, `vole`, `deteriore`, `depart`, `autre`), date de constat, commentaire | `POST /badges/{id}/revoquer` → effet immédiat à la borne |
| **M-132** | Profil collaborateur & dossier RH | Clic sur le nom ou la photo | 3 onglets : Général, Badge, Dossier | `GET /employes/{id}` · `PUT /employes/{id}` |
| **M-133** | Historique des présences (global) | En-tête → « Historique des présences » | Recherche, filtre type, période, export CSV | `GET /officines/{id}/pointages?debut=&fin=` |
| **M-134** | Historique par collaborateur | Ligne du tableau → « Historique » | Tableau des mouvements, méthode, statut, export CSV individuel | `GET /officines/{id}/employes/{id}/pointages` |
| **M-135** | Correction d'oubli (POI-09) | Section Corrections → « Déclarer un oubli » | Collaborateur, type, date, heure réelle, motif (liste close + texte), justificatif | `POST /pointages/corrections` + `POST /signatures` |
| **M-136** | Signature par code personnel *(partagée, refondue)* | Toute action exigeant un visa | Code à 4+ chiffres, rappel de l'action et de l'article BPD | `POST /signatures` → vérification serveur, HMAC, horodatage serveur |
| **M-137** | Demande d'absence ou de congé (POI-10) | Section Absences → « Nouvelle demande » | Collaborateur, type, dates, demi-journées, motif, remplacement proposé | `POST /officines/{id}/absences` |
| **M-138** | Justificatif d'absence | M-137, liste des absences | Téléversement du certificat, date, confidentialité | `POST /officines/{id}/upload` |
| **M-139** | Validation d'absence par le titulaire | Liste des absences en attente | Décision, commentaire, contrôle de continuité, signature | `PUT /absences/{id}/valider` |
| **M-140** | Création de créneau de planning (POI-07) | Section Plannings → « Créer créneau » | Type, jour ou date, horaires, responsable, effectif cible par poste | `POST /officines/{id}/plannings` + contrôle PLN-03 |
| **M-141** | Affectation d'équipe et suppléance | Grille de planning | Collaborateurs affectés, suppléants, alerte si tranche sans pharmacien | `PUT /plannings/{id}/affectations` |
| **M-142** | Alerte de continuité pharmaceutique | Automatique, ou clic sur le bandeau rouge | État courant, dernier pharmacien pointé, durée de l'interruption, actions proposées | lecture seule · `POST /non-conformites` (pré-remplie) |
| **M-143** | Dérogation de vente sans pharmacien | Caisse ou dispensation bloquée | Motif obligatoire, durée, signature responsable, notification promoteur | `POST /caisse/ventes` avec `derogation` · écriture au journal d'audit |
| **M-144** | Paramètres art. 1.11 | Section Paramètres | Tolérance de retard, mode présence, validité badge, longueur PIN, seuil de corrections, plage horaire de nuit, durée légale | `PUT /officines/{id}/parametres/{cle}` + motif + signature |
| **M-145** | Rapport de présence | Section Rapports | Période, périmètre (tous / un collaborateur / un poste), options d'export | `GET /officines/{id}/presence/rapport` |
| **M-146** | Feuille d'émargement (aperçu) | Section Rapports → « Feuille de présence » | Aperçu du document, cartouche, cadre de signature, export PDF | `GET /presence/feuille-emargement?debut=&fin=` |
| **M-147** | Nouveau collaborateur | Section Équipe (personnel) | Identité, poste (liste close), coordonnées, date d'embauche, habilitations initiales | `POST /officines/{id}/employes` |
| **M-148** | Modification ou désactivation de fiche | Profil collaborateur | Champs modifiables, motif de désactivation, conséquence sur les badges | `PUT /officines/{id}/employes/{id}` |
| **M-149** | Réinitialisation du code personnel | Profil → onglet Badge | Nouveau code généré, affichage unique, ancienne valeur révoquée, signature | `POST /employes/{id}/pin/reinitialiser` |
| **M-150** | Inscription Ordre section B | Section Ordre | Numéro d'Ordre, section, dates d'inscription et d'échéance, `en_regle`, justificatif | `POST /officines/{id}/inscriptions-ordre` |
| **M-151** | Édition de l'organigramme | Section Organigramme | Rattachements, suppléances, encadrement pharmaceutique | `PUT /officines/{id}/organigramme` |
| **M-152** | Action de formation | Section Formations | Thème, public, organisme, dates, coût, participants, attestation | `POST /officines/{id}/formations` |
| **M-153** | Entretien individuel | Section Entretiens | Exercice, objectifs, évaluation, axes de progrès, signatures | `POST /officines/{id}/entretiens` |
| **M-154** | Visite médicale et aptitude | Section Intégration & Suivi | Médecin, date, aptitude, prochaine échéance, justificatif | `PUT /employes/{id}/visite-medicale` |
| **M-155** | Création de NC depuis une anomalie de présence | Alertes continuité, corrections répétées, absence non justifiée, inscription échue | Pré-remplie : gravité, processus `GAC`, article 1.11, description, responsable | `POST /officines/{id}/non-conformites` (existant, `bpd-communs.tsx:264`) |
| **M-156** | Sortie du mode borne | Borne → « Quitter » | Code responsable, confirmation | `POST /bornes/{id}/session/fermer` |
| **M-157** | Journal des accès aux dossiers du personnel | Profil → onglet Dossier | Liste horodatée des consultations, filtre par acteur | `GET /employes/{id}/acces` (issu de `audit_logs`) |

---

## 4 — Graphiques G-57 → G-68

Charte du volet 2 (§1.4) : fond `#0F3B27`, série primaire `#18AA38`, accent `#92FF5F`, alerte `#FF7036`, neutre `#475C50`, grille `#E5ECE7` en `strokeDasharray="3 3"`, infobulle sur fond `#0F3B27`. Bibliothèque `recharts` (déjà présente, `^2.15.4`).

| Code | Graphique | Type | Données | Emplacement |
| --- | --- | --- | --- | --- |
| **G-57** | Effectif présent par tranche de 30 min | `AreaChart` | `presence/rapport` → série horodatée | Section Présence en direct |
| **G-58** | Continuité pharmaceutique sur la journée | bande personnalisée + `ReferenceArea` | intervalles avec/sans pharmacien | Bandeau de tête (PRS-06) |
| **G-59** | Heures travaillées par collaborateur (mois) | `BarChart` horizontal | relevé mensuel | Section Rapports |
| **G-60** | Distribution des retards vs tolérance | `BarChart` (histogramme) | retards par tranche de 5 min, seuil `tolerance_pointage_minutes` en `ReferenceLine` | Section Rapports |
| **G-61** | Évolution du taux de ponctualité (12 mois) | `LineChart` | taux mensuel, cible paramétrable | Section Rapports |
| **G-62** | Heures supplémentaires et gardes par mois | `BarChart` empilé | HS, nuit, garde | Section Rapports |
| **G-63** | Absences par motif | `PieChart` | `absences` groupées par type — **catégorie seulement, jamais le détail médical** (RG-22) | Section Absences |
| **G-64** | Corrections d'oubli par mois et par collaborateur | `BarChart` groupé + `ReferenceLine` au seuil | `corrections_pointage` | Section Corrections |
| **G-65** | Couverture des postes (poste × tranche horaire) | matrice thermique personnalisée | planning vs présence réelle | Section Plannings |
| **G-66** | Échéances Ordre section B et visites médicales | jauges + calendrier | jours restants, seuils 90/30/7 | Section Ordre, Section Suivi médical |
| **G-67** | Plan de formation : réalisé vs planifié | `RadialBarChart` | taux de réalisation | Section Formations |
| **G-68** | Parc de badges : actifs, expirés, révoqués, à réimprimer | `BarChart` | `badges` groupées par statut | Section Badges |

Règles : aucun graphique ne rend de donnée nominative dans une infobulle exportable (G-63 exclut le motif détaillé) ; chaque graphique a un équivalent textuel ou tabulaire accessible ; un graphique vide affiche l'état vide du module, jamais une série fictive.

---

## 5 — Télémétrie du module présence

Mêmes principes que le volet 2 (§5) : lot de 20 événements ou 5 s via `navigator.sendBeacon`, file IndexedDB hors ligne avec UUID idempotent, aucun blocage ni toast en cas d'échec, jamais de donnée de santé, la télémétrie ne constitue jamais la preuve réglementaire (le registre d'émargement et `audit_logs` la constituent).

### 5.1 Métriques — dictionnaire complémentaire

| Clé | Libellé | Formule | Unité | Seuil / criticité |
| --- | --- | --- | --- | --- |
| `presence_pharmacien_continue` | Continuité pharmaceutique assurée | aucun intervalle sans pharmacien sur les tranches d'ouverture | booléen | `false` → **critique** |
| `heures_sans_pharmacien` | Heures d'ouverture sans pharmacien pointé | somme des intervalles d'interruption | h / jour | > 0 → critique |
| `interruptions_continuite_nombre` | Nombre d'interruptions de continuité | comptage des intervalles | nb / jour | ≥ 1 → majeure |
| `duree_max_interruption` | Plus longue interruption | max des intervalles | min | > 30 → critique |
| `minutes_avant_premier_pharmacien` | Délai d'ouverture sans pharmacien | premier pointage pharmacien − heure d'ouverture planifiée | min | > tolérance → majeure |
| `effectif_present_instantane` | Effectif sur place | derniers mouvements non clôturés | nb | informatif |
| `taux_presence_planifie` | Taux de présence vs planning | présents / planifiés sur la tranche | % | < 90 → mineure |
| `taux_ponctualite` | Taux de ponctualité | arrivées dans la tolérance / arrivées totales | % | < 95 → mineure |
| `retards_nombre` | Retards au-delà de la tolérance | comptage | nb / mois | informatif |
| `retard_moyen` | Retard moyen | moyenne des écarts | min | > 15 → mineure |
| `heures_travaillees_total` | Heures travaillées | somme des plages appariées | h / mois | informatif |
| `heures_supplementaires` | Heures supplémentaires | au-delà de la durée légale | h / mois | informatif |
| `heures_garde_nuit` | Heures de garde de nuit | somme sur la plage `heures_nuit_*` | h / mois | informatif |
| `pointages_non_clotures` | Arrivées sans départ à minuit | comptage | nb / jour | > 0 → mineure |
| `corrections_oubli_nombre` | Corrections d'oubli | comptage des corrections validées | nb / mois | informatif |
| `taux_corrections_oubli` | Part de pointages régularisés | corrections / total pointages | % | > 5 → majeure |
| `corrections_par_collaborateur` | Corrections par collaborateur | comptage groupé | nb / mois | > `seuil_corrections_mensuel` → mineure |
| `corrections_en_attente` | Corrections non validées | comptage statut `en_attente` | nb | > 0 depuis 7 j → mineure |
| `absences_nombre` | Absences sur la période | comptage | nb / mois | informatif |
| `absences_non_justifiees` | Absences sans justificatif validé | comptage | nb / mois | > 0 → majeure |
| `jours_conge_consommes` | Solde de congés consommé | somme des demi-journées validées | j / exercice | informatif |
| `creneaux_sans_pharmacien` | Tranches planifiées sans pharmacien | comptage | nb | > 0 → **critique** |
| `badges_emis` | Badges émis | comptage | nb / mois | informatif |
| `badges_actifs` | Badges actifs | comptage statut `actif` | nb | informatif |
| `badges_expires` | Badges expirés non remplacés | comptage | nb | > 0 → majeure |
| `badges_revoques` | Badges révoqués | comptage | nb / mois | informatif |
| `employes_sans_badge_actif` | Fiches actives sans badge actif | comptage | nb | > 0 → mineure |
| `employes_sans_photo` | Fiches actives sans photo | comptage | nb | informatif |
| `scans_totaux` | Scans présentés à la borne | comptage | nb / jour | informatif |
| `scans_rejetes` | Scans rejetés | comptage des `422` | nb / jour | > 10 % → majeure |
| `scans_rejetes_motif` | Répartition des rejets | comptage par code d'erreur | nb | `CODE_BADGE_INCONNU` dominant → vérifier le parc |
| `scan_duree_ms` | Latence de reconnaissance | p50 / p95 du `POST /pointages/scan` | ms | p95 > 800 → mineure |
| `bornes_actives` | Bornes ayant pointé dans la journée | comptage distinct de `borne_id` | nb | 0 en ouverture → majeure |
| `borne_verrouillages` | Verrouillages après échecs de code | comptage | nb / jour | > 5 → majeure (tentatives) |
| `derives_horloge_borne` | Écart horloge borne / serveur | moyenne absolue des écarts | s | > 30 → majeure |
| `pin_par_defaut_detectes` | Fiches équipées d'un code faible ou par défaut | comptage | nb | > 0 → **critique** |
| `matricules_en_collision` | Matricules ou codes badge dupliqués | comptage | nb | > 0 → **critique** |
| `signatures_pin_echecs` | Échecs de vérification de signature | comptage | nb / jour | > 5 → majeure |
| `derogations_vente_sans_pharmacien` | Dérogations accordées | comptage | nb / mois | > 0 → majeure |
| `dossiers_personnel_consultes` | Consultations de fiches du personnel | comptage | nb / jour | informatif (audit) |
| `inscriptions_ordre_echues` | Inscriptions section B échues | comptage | nb | > 0 → **critique** |
| `certificats_aptes_valides` | Part du personnel apte | fiches aptes / fiches actives | % | < 100 → majeure |
| `formations_realisees_taux` | Taux de réalisation du plan de formation | réalisées / planifiées | % | < 80 → mineure |
| `entretiens_annuels_couverts` | Collaborateurs ayant un entretien sur l'exercice | couverts / actifs | % | < 100 → mineure |

### 5.2 Événements d'usage

Format `<domaine>.<objet>.<action>`, lot envoyé par `sendBeacon`, UUID idempotent, aucun nom de personne (identifiants UUID uniquement), aucun motif médical.

| Événement | Déclencheur | Propriétés |
| --- | --- | --- |
| `prs.pointage.scan` | Scan reconnu à la borne | `borne_id`, `source`, `type`, `duree_ms` |
| `prs.pointage.refus` | Scan rejeté | `code_erreur`, `borne_id`, `source` |
| `prs.pointage.saisie_responsable` | Pointage saisi pour un tiers | `poste_acteur`, `motif` (catégorie) |
| `prs.borne.ouverture` | Entrée en mode borne | `borne_id`, `appareil_type` |
| `prs.borne.fermeture` | Sortie de mode borne | `borne_id`, `duree_session_s` |
| `prs.borne.verrouillage` | 3 échecs de code | `borne_id` |
| `prs.continuite.interruption` | Perte de présence pharmaceutique | `duree_s`, `dernier_pharmacien_id` |
| `prs.continuite.retablissement` | Retour d'un pharmacien | `duree_interruption_s` |
| `prs.correction.declaration` | Création d'une correction | `motif_categorie`, `demandeur_role` |
| `prs.correction.validation` | Validation ou refus | `decision`, `validateur_role`, `delai_h` |
| `prs.absence.demande` | Création d'une demande | `type`, `duree_j` |
| `prs.absence.validation` | Validation ou refus | `type`, `decision`, `continuite_impactee` |
| `prs.planning.creneau_creation` | Création d'un créneau | `type`, `avec_pharmacien` |
| `prs.planning.controle_echec` | Refus d'un créneau sans pharmacien | `tranche` |
| `prs.rapport.consultation` | Ouverture d'un rapport | `periode`, `perimetre` |
| `prs.rapport.export` | Export CSV ou PDF | `format`, `nb_lignes`, `periode` |
| `prs.parametre.modification` | Changement d'un paramètre art. 1.11 | `cle`, `ancienne`, `nouvelle`, `role` |
| `prs.derogation.accordee` | Vente ou dispensation débloquée | `objet`, `motif_categorie`, `role` |
| `bdg.badge.apercu` | Ouverture de M-128 | `badge_id`, `format` |
| `bdg.badge.impression` | Impression d'un badge | `badge_id`, `format`, `acteur_role` |
| `bdg.badge.planche` | Impression d'un lot | `nb_badges`, `format` |
| `bdg.badge.emission` | Émission d'un nouveau badge | `badge_id`, `employe_id` |
| `bdg.badge.revocation` | Révocation | `badge_id`, `motif_categorie` |
| `bdg.photo.televersement` | Ajout d'une photo | `taille_ko`, `succes` |
| `bdg.pin.reinitialisation` | Réinitialisation d'un code | `employe_id`, `acteur_role` |
| `dos.collaborateur.creation` | Création d'une fiche | `poste`, `acteur_role` |
| `dos.collaborateur.desactivation` | Désactivation | `motif_categorie`, `badges_revoques` |
| `dos.dossier.consultation` | Ouverture d'un dossier individuel | `employe_id`, `onglet` |
| `dos.ordre.saisie` | Saisie d'une inscription section B | `echeance_j` |
| `dos.ordre.echeance_alerte` | Alerte d'échéance ordinale | `jours_restants` |
| `dos.visite_medicale.saisie` | Saisie d'une aptitude | `apte`, `echeance_j` |
| `dos.formation.saisie` | Action de formation | `statut`, `nb_participants` |
| `dos.entretien.saisie` | Entretien individuel | `exercice` |
| `dos.organigramme.modification` | Édition d'une ligne hiérarchique | `nb_changements` |
| `dos.signature.apposition` | Signature vérifiée | `objet`, `article_bpd`, `succes` |
| `dos.signature.echec` | Signature refusée par le serveur | `objet`, `code_erreur` |

### 5.3 Télémétrie technique propre au module

| Mesure | Pourquoi |
| --- | --- |
| Latence et taux d'erreur de `POST /pointages/scan` (p50, p95, 4xx, 5xx) | Une borne lente ou en erreur est une borne contournée : le personnel revient au papier |
| Comptage des `423 SESSION_LOCKED_INACTIVITY` sur les routes de pointage | Détecte la contradiction DEF-13 avant qu'elle ne produise des trous dans le registre |
| Profondeur et âge de la file `begpharma-outbox` pour les pointages | Un pointage en attente depuis plus d'une heure est une perte de preuve |
| Dérive d'horloge borne / serveur | Une horloge fausse rend le registre contestable |
| Taux d'échec de génération de QR (avant suppression du service tiers) | Justifie la bascule en génération locale |
| Nombre de collisions détectées sur `matricule` et `code_badge` | Alerte sur DEF-05 et DEF-06 |
| Poids et temps de rendu de la feuille d'émargement PDF | Un document trop lourd n'est jamais imprimé |

### 5.4 Restitution

| Destinataire | Ce qu'il voit |
| --- | --- |
| Pharmacien titulaire | Bandeau continuité (G-58), alertes du jour, retards, corrections en attente, badges expirés |
| Promoteur / multi-officines | Vue consolidée : heures sans pharmacien par officine, taux de ponctualité comparé, dérogations accordées, échéances ordinales |
| Responsable qualité | Corrections répétées, absences non justifiées, NC ouvertes depuis le module, taux de réalisation des formations |
| Agent ABMed (mode inspecteur) | Registre d'émargement inaltérable sur la période demandée, en lecture seule, borné dans le temps et journalisé (RG-09 du volet 3) |

### 5.5 Garde-fous spécifiques

- Le **motif médical** d'une absence (`motif_detail`) est une donnée de santé : il n'est jamais envoyé en télémétrie, jamais présent dans un export non destiné au responsable, et son accès est journalisé. Seule la **catégorie** circule.
- Le **code personnel** n'est jamais journalisé, jamais envoyé en télémétrie, jamais renvoyé par une API. Seuls son empreinte et le résultat de la vérification existent.
- Les identifiants de personnes dans les événements sont des UUID, jamais des noms.
- La télémétrie ne remplace **jamais** le registre de présence : une panne de télémétrie n'invalide aucun pointage, et un pointage n'est jamais créé depuis un événement de télémétrie.

---

## 6 — Exigences transverses RG-13 → RG-24

Ces règles complètent les RG-01 → RG-12 du volet 3 et s'appliquent au module entier.

| Code | Règle | Vérification |
| --- | --- | --- |
| **RG-13** | Le registre de présence est **append-only** : trigger d'audit et politique RLS sur `pointages`, `employes`, `badges`, `corrections_pointage`, `absences`, `signatures_electroniques` (INC-01). Aucune interface n'expose de suppression ; `TRUNCATE` et `DELETE` sont refusés sur `pointages` comme sur `audit_logs` | `grep -c "trg_audit_pointages" backend/database/migrations/*.php` ≥ 1 · test d'intégration : un `UPDATE` sur `pointages` produit une ligne `audit_logs` |
| **RG-14** | Toute correction est une **écriture rectificative liée** : le pointage d'origine n'est jamais modifié, la correction porte `pointage_origine_id`, `motif`, `demande_par`, `signature_id`, `validee_par` | test : corriger un pointage laisse la ligne d'origine bit-à-bit identique |
| **RG-15** | Toute signature est **vérifiée serveur** : le code est comparé à `pin_hash`, l'horodatage est produit par le serveur, l'empreinte est un HMAC-SHA256 sur `{objet, acteur, officine, horodatage}`. Le client ne fabrique ni hash ni horodatage « serveur » (DEF-15) | `grep -rn "Math.random" frontend/src/components/modules/bpd-communs.tsx` → 0 · test : un code erroné renvoie `401 SIGNATURE_REFUSEE` |
| **RG-16** | Aucun secret ni code personnel côté client : `pin_code` devient `pin_hash`, n'est jamais renvoyé par une API, jamais accepté en `PUT` libre, affiché une seule fois à l'émission (DEF-04) | `grep -rn "pin_code" backend/app` → uniquement dans les migrations de reprise · test : `GET /employes` ne contient aucune clé `pin*` |
| **RG-17** | Les identifiants de badge sont **uniques et non réutilisables** : matricule séquentiel par officine et par année, `code_badge` unique avec retry, contrainte d'unicité en base, aucun repli calculé à l'affichage (DEF-05, DEF-06, BDG-D9) | test : créer 200 collaborateurs ne produit aucune collision · `matricules_en_collision = 0` |
| **RG-18** | **Une seule définition** du poste pharmaceutique, partagée front et back : une constante déclinée en `compte_pour_presence_pharmaceutique` et `inscription_ordre_section_b_requise` (DEF-09, DEF-10) | `grep -rn "pharmacien_remplacant\|\"rmq\"" frontend/src backend/app` → uniquement dans la constante partagée |
| **RG-19** | La **journée civile est `Africa/Porto-Novo`** partout : `APP_TIMEZONE`, requêtes `whereDate`, calculs d'heures, exports, feuilles d'émargement (INC-03) | test : un pointage à 23 h 30 heure du Bénin appartient à la journée locale en cours |
| **RG-20** | La borne est un **équipement autorisé** : enregistrée dans `appareils_autorises`, jeton à durée de vie limitée, révocable, exempté du verrou d'inactivité uniquement pour les routes de pointage (DEF-13, PRS-26) | test : une borne révoquée reçoit `403` ; le jeton ne permet pas d'appeler `/comptabilite` |
| **RG-21** | Le paramètre `mode_presence_pharmacien` est **opérant** : en mode `blocage`, caisse et dispensation refusent `409 ABSENCE_PHARMACIEN`, la dérogation est motivée, signée, notifiée au promoteur et journalisée (DEF-24) | test : en mode `blocage` et sans pharmacien pointé, `POST /caisse/ventes` renvoie `409` |
| **RG-22** | Les **données de santé du personnel sont minimisées** : motif médical stocké séparément, accès restreint aux rôles habilités, consultation journalisée, jamais en télémétrie ni en export courant (DOS-23, §5.5) | test : un export CSV de présence ne contient aucune colonne de motif médical |
| **RG-23** | **Aucun service tiers** dans la chaîne badge et impression : QR généré localement, photo stockée dans le tenant, impression via le mécanisme interne `bestpharma:apercu-document` (BDG-D1, BDG-D7, DEF-25) | `grep -rn "api.qrserver.com\|window.print()" frontend/src` → 0 |
| **RG-24** | Interface conforme au dépôt : libellés issus de `src/lib/i18n/fr.ts` (nouvelles sections `pointage`, `badge`, `personnel`, `presence`), ancres `data-testid` et `data-tour`, tableaux rendus par `TableauRegistre`, exports journalisés, `BoutonCreerNC` disponible sur chaque anomalie (INC-06) | `grep -c "data-testid=\"prs-" frontend/src/routes/_authenticated/dashboard/pointage.tsx` ≥ 20 |

---

## 7 — Contrats d'API et schéma de données

### 7.1 Endpoints

Toute route doit être implémentée **deux fois** : dans `backend/routes/api.php` + son contrôleur, et dans `mock-backend.mjs` (règle §8.1 du volet 1). Chaque `GET` nouveau exige une clé dans `frontend/src/test/reponses-demo.json` (INC-07).

| Méthode | Chemin | Statut | Rôle |
| --- | --- | --- | --- |
| `GET` | `/officines/{id}/employes` | **à corriger** | ne plus renvoyer `pin_code` ; joindre le badge actif et l'inscription Ordre par `employe_id` |
| `POST` | `/officines/{id}/employes` | **à corriger** | matricule séquentiel, `code_badge` avec retry, `pin_hash`, charte non signée par défaut, `user_id` de rattachement |
| `PUT` | `/officines/{id}/employes/{id}` | **à corriger** | liste blanche de champs, `pin_code` retiré, désactivation → révocation des badges |
| `GET` | `/officines/{id}/employes/{eid}` | nouveau | fiche complète + pièces + badge + historique des accès |
| `GET` | `/officines/{id}/employes/{eid}/pointages` | nouveau | relevé individuel paginé (M-134) |
| `POST` | `/officines/{id}/employes/{eid}/pin/reinitialiser` | nouveau | RG-16, BDG-13 |
| `PUT` | `/officines/{id}/employes/{eid}/visite-medicale` | nouveau | DOS-05 |
| `GET` | `/officines/{id}/pointages` | **à corriger** | journée en `Africa/Porto-Novo`, `etat_courant` par employé, pagination, filtres `debut`/`fin` |
| `POST` | `/officines/{id}/pointages` | **à corriger** | contrôle `actif`/`archived`, idempotence, `source`, `saisi_par`, `poste_de_travail` |
| `POST` | `/officines/{id}/pointages/scan` | nouveau | **reconnaissance serveur** du QR, du code-barres ou du PIN (PRS-28) |
| `GET` | `/officines/{id}/pointages/actif` | **à corriger** | ordre déterministe, définition unique du pharmacien, `mode_presence_pharmacien` inclus dans la réponse |
| `POST` | `/officines/{id}/pointages/prise` | **à corriger** | suppression de la création automatique d'employé et du `LIKE` sur le nom (DEF-08) |
| `POST` | `/officines/{id}/pointages/corrections` | nouveau | PRS-20 |
| `GET` | `/officines/{id}/pointages/corrections` | nouveau | PRS-23 |
| `PUT` | `/officines/{id}/pointages/corrections/{cid}` | nouveau | validation ou refus |
| `GET` | `/officines/{id}/presence/rapport` | nouveau | RPT-01 |
| `GET` | `/officines/{id}/presence/feuille-emargement` | nouveau | RPT-08 |
| `GET`/`POST` | `/officines/{id}/absences` | nouveau | PRS-14→19 |
| `PUT` | `/officines/{id}/absences/{aid}/valider` | nouveau | PRS-16 |
| `GET`/`POST` | `/officines/{id}/plannings` | nouveau | PLN-01→06 |
| `PUT` | `/officines/{id}/plannings/{pid}/affectations` | nouveau | PLN-02 |
| `GET` | `/officines/{id}/badges` · `POST` `/badges/{bid}/impressions` · `POST` `/badges/{bid}/revoquer` · `GET` `/badges/{bid}/qr` | nouveaux | BDG-01→14 |
| `POST` | `/officines/{id}/bornes` · `POST` `/bornes/{bid}/session/fermer` | nouveaux | PRS-26, M-156 |
| `POST` | `/signatures` | nouveau | RG-15 — partagé par tous les modules BPD |
| `GET`/`POST` | `/officines/{id}/inscriptions-ordre` | nouveau | DOS-08→13 |
| `GET`/`POST` | `/officines/{id}/formations` · `/entretiens` · `/organigramme` | nouveaux | DOS-14→23 |
| `GET` | `/officines/{id}/employes/{eid}/acces` | nouveau | DOS-27, M-157 |

### 7.2 Évolutions de schéma

| Table | Évolution |
| --- | --- |
| `employes` | **+** `photo_url` (BDG-D7), `email`, `user_id` (rattachement), `pin_hash` (**−** `pin_code`), `matricule` rendu **unique non null**, `poste` contraint par une liste close |
| `pointages` | **+** `source` (`borne_qr`, `borne_pin`, `application`, `saisie_responsable`, `borne_hors_ligne`, `correction`), `created_by`, `borne_id`, `poste_de_travail`, `ip`, `horodatage_saisie`, `ecart_horloge_s`, `annule`, `annule_motif`. Trigger d'audit + RLS (RG-13). Index `(officine_id, employe_id, horodatage desc)` |
| `badges` | nouvelle — BDG-01, avec contrainte d'unicité partielle sur `(employe_id) WHERE statut = 'actif'` |
| `corrections_pointage` | nouvelle — PRS-20 |
| `absences` | nouvelle — PRS-15, avec `motif_detail` chiffré ou en table séparée à accès restreint (RG-22) |
| `plannings_creneaux` | nouvelle — PLN-01 |
| `signatures_electroniques` | nouvelle — RG-15 : `objet`, `objet_id`, `acteur_id`, `empreinte_hmac`, `horodatage_serveur`, `adresse_ip`, `user_agent` |
| `inscriptions_ordre` | rattachement par `employe_id` (INC-04), champs alignés sur le schéma existant |
| `officine_parametres` | nouvelles clés : `duree_validite_badge_mois`, `pin_longueur_min`, `seuil_corrections_mensuel`, `heures_nuit_debut`, `heures_nuit_fin`, `duree_legale_hebdomadaire` |

---

## 8 — Critères d'acceptation

**Fonctionnel**

1. Un code non reconnu à la borne **ne crée aucun pointage** et affiche un refus explicite. Test automatisé sur le mock : `POST /pointages/scan` avec `{ code_brut: "0000" }` renvoie `422 CODE_BADGE_INCONNU` et `POINTAGES` reste inchangé.
2. Un PIN correct crée le pointage du **bon** collaborateur, vérifié serveur. Test : PIN de `emp2` → `employe_id = emp2`, quel que soit l'ordre de la liste.
3. Un employé désactivé ne peut plus pointer : `403 FICHE_INACTIVE`, badge révoqué, refus à la borne.
4. Deux `arrivee` consécutives sans `depart` renvoient `409 MOUVEMENT_REDONDANT`.
5. Une correction d'oubli crée une écriture rectificative, laisse l'origine intacte, et n'entre dans le calcul d'heures qu'après validation.
6. Une signature avec un code erroné est refusée par le serveur ; le client n'affiche jamais un succès non confirmé.
7. `mode_presence_pharmacien = blocage` bloque réellement caisse et dispensation, avec dérogation motivée et signée.
8. Une tranche d'ouverture sans pharmacien dans le planning est refusée à l'enregistrement.
9. Le rapport mensuel calcule les heures par appariement arrivée/départ en `Africa/Porto-Novo` ; un pointage à 23 h 30 locales appartient à la journée locale.
10. Un badge émis imprime l'identité de **l'officine courante** ; aucune valeur par défaut n'apparaît.
11. La révocation d'un badge prend effet à la borne en moins de 60 s.
12. Hors ligne, un pointage saisi est mis en file, resynchronisé, et porte `source = 'borne_hors_ligne'` avec les deux horodatages.

**Qualité du code — commandes qui doivent retourner zéro**

```bash
cd frontend
grep -rn "api.qrserver.com" src/                                     # RG-23
grep -rn "window.print()" src/routes/_authenticated/dashboard/       # RG-23
grep -rn "Dr Félicien AGBO\|Dr Sévérin BIO\|PHARMACIE DE L'ÉTOILE" src/   # DEF-02, DEF-18, BDG-D5
grep -rn "96.4%\|412h\|Novembre 2026\|ONPB-2014-B-089" src/          # DEF-21, INC-08
grep -rn "Math.random" src/components/modules/bpd-communs.tsx        # RG-15
grep -rn "employes\[0\]" src/routes/_authenticated/dashboard/        # DEF-02
cd ../backend
grep -rn "pin_code" app/                                             # RG-16
grep -rn "rand(10, 99)" app/                                         # RG-17
grep -rn "charte_qualite_signee' => true" app/                       # DEF-07
```

**Tests**

13. `pointage` est ajouté au `it.each` de `frontend/src/test/ecrans-demo.test.tsx` **avec** les clés `/officines/off1/pointages`, `/officines/off1/pointages/actif`, `/officines/off1/presence/rapport`, `/officines/off1/badges`, `/officines/off1/absences`, `/officines/off1/plannings` dans `reponses-demo.json` (INC-07).
14. Tests d'intégration Laravel : scan inconnu, PIN erroné ×3 → verrouillage, employé désactivé, mouvement redondant, correction non validée exclue du calcul, blocage caisse sans pharmacien, unicité du matricule sur 200 créations.
15. Test d'inaltérabilité : `UPDATE pointages SET type='depart'` produit une ligne `audit_logs` et est refusé par la règle append-only.
16. `npm run typecheck --prefix frontend` et `npm test --prefix frontend` passent sans modification de la suite existante.
17. Vérification visuelle sur les deux serveurs de démonstration : `node mock-backend.mjs` (0.0.0.0:8001) et `npm run dev --prefix frontend` (0.0.0.0:5174), parcours complet borne → pointage → rapport → impression de badge.

**Documentation**

18. Les libellés nouveaux sont ajoutés à `src/lib/i18n/fr.ts` (sections `pointage`, `badge`, `personnel`, `presence`).
19. Les ancres de l'annexe B sont posées et stables.
20. Le registre d'émargement imprimé porte le cartouche réglementaire complet et le cadre de signature.

---

## 9 — Plan de livraison L15 → L20

Les lots L1→L7 (volet 2) et L8→L14 (volet 3) restent valables. Ce module dépend de **L8** (`TableauRegistre`, registres inaltérables, pagination dans l'URL) et fournit à tous les modules BPD le composant de signature refondu.

| Lot | Contenu | Dépend de | Critère de sortie |
| --- | --- | --- | --- |
| **L15 — Intégrité du pointage** | RG-13 (trigger + RLS sur `pointages`, `employes`), colonnes de traçabilité (`source`, `created_by`, `borne_id`, `horodatage_saisie`), RG-19 (journée `Africa/Porto-Novo`), contrôles `store` (idempotence, `actif`/`archived`), correction de `prise()` | L8 | Critères 3, 4, 9, 15 |
| **L16 — Reconnaissance serveur et borne** | `POST /pointages/scan`, suppression du repli client (DEF-01, DEF-02), `pin_hash` (RG-16), anti-rejeu, verrouillage après 3 échecs, jeton de borne (RG-20), file hors ligne | L15 | Critères 1, 2, 12 · `grep "employes\[0\]"` → 0 |
| **L17 — Signature vérifiée** | `POST /signatures`, `signatures_electroniques`, refonte de `ModaleSignatureCode`, suppression du hash client, rattachement à toutes les actions BPD (inventaire, quarantaine, corrections, paramètres, dérogations) | L15 | Critère 6 · `grep "Math.random" bpd-communs.tsx` → 0 |
| **L18 — Badges** | Table `badges`, matricule séquentiel (RG-17), QR local signé, photo via `/upload`, cycle de vie complet, formats CR80 et planche A4, suppression des valeurs par défaut et du faux code-barres | L16, L17 | Critères 10, 11 · `grep "api.qrserver.com"` → 0 |
| **L19 — Corrections, absences, plannings** | `corrections_pointage` (RG-14), `absences` avec workflow et justificatifs, `plannings_creneaux` avec contrôle de continuité, fusion des deux écrans de congés (INC-05), modales M-135, M-137→M-141 | L17 | Critères 5, 8 · sections Corrections et Absences non statiques |
| **L20 — Rapports, paramètres opérants et dossiers** | `GET /presence/rapport` et feuille d'émargement, application réelle de `mode_presence_pharmacien` (RG-21) + dérogation, section Ordre B rattachée par `employe_id` (INC-04), organigramme et formations réels, télémétrie du module, fixtures et tests | L15→L19 | Critères 7, 13, 14 · `grep "96.4%"` → 0 |

**Ordre conseillé** : L15 puis L17 en premier — ce sont les deux lots qui transforment un affichage en preuve. Tant que le registre n'est pas inaltérable et que la signature n'est pas vérifiée, le module ne peut pas être présenté à un inspecteur ABMed, quelle que soit la qualité des écrans.

---

## Annexe A — Section → endpoints

| Section | Endpoints existants | Endpoints à créer |
| --- | --- | --- |
| `pointage?tab=direct` | `GET /employes`, `GET /pointages`, `POST /pointages`, `GET /pointages/actif` | `POST /pointages/scan`, `GET /employes/{eid}/pointages` |
| `pointage?tab=plannings` | — | `GET/POST /plannings`, `PUT /plannings/{id}/affectations`, `GET /officines/{id}/gardes` |
| `pointage?tab=absences` | — | `GET/POST /absences`, `PUT /absences/{id}/valider`, `POST /upload` |
| `pointage?tab=corrections` | — | `GET/POST /pointages/corrections`, `PUT /pointages/corrections/{id}`, `POST /signatures` |
| `pointage?tab=badges` | `POST /officines/{id}/employes` (génère matricule et code badge) | `GET /badges`, `GET /badges/{id}/qr`, `POST /badges/{id}/impressions`, `POST /badges/impressions/lot`, `POST /badges/{id}/revoquer`, `POST /employes/{id}/pin/reinitialiser`, `POST /upload` |
| `pointage?tab=rapports` | `GET /pointages` (liste brute du jour) | `GET /presence/rapport`, `GET /presence/feuille-emargement`, `POST /presence/rapports/{id}/cloturer` |
| `pointage?tab=parametres` | `GET/PUT /officines/{id}/parametres` (clés `tolerance_pointage_minutes`, `mode_presence_pharmacien` déjà présentes) | nouvelles clés · `GET /presence/effet-parametres` |
| `personnel?tab=equipe` | `GET/POST /employes`, `PUT /employes/{id}` | `GET /employes/{eid}`, photo via `/upload` |
| `personnel?tab=dossier` | `POST /officines/{id}/upload` | `GET /employes/{eid}/pieces`, `GET /employes/{eid}/acces` |
| `personnel?tab=ordre` | `inscriptions_ordre` (table créée, jamais rattachée) | `GET/POST /inscriptions-ordre`, `PUT /inscriptions-ordre/{id}` |
| `personnel?tab=postes` | — | `GET /postes`, `GET/PUT /employes/{eid}/habilitations` |
| `personnel?tab=organigramme` | — | `GET/PUT /organigramme` |
| `personnel?tab=formations` | — | `GET/POST /formations`, `PUT /formations/{id}` |
| `personnel?tab=entretiens` | — | `GET/POST /entretiens` |
| `personnel?tab=conges` | — | mêmes endpoints que `pointage?tab=absences` (source unique, INC-05) |
| `personnel?tab=hygiene` | `date_visite_medicale` (colonne existante) | `PUT /employes/{eid}/visite-medicale`, `GET /employes/{eid}/integration` |

## Annexe B — Ancres de test et de guide

| Ancres | Écran |
| --- | --- |
| `data-tour="prs-continuite"` · `data-tour="prs-equipe"` · `data-tour="prs-borne"` | Pointage — présence en direct |
| `data-testid="prs-section-<tab>"` · `prs-ligne-<employe_id>` · `prs-statut-<employe_id>` | Pointage — tableau |
| `data-testid="prs-borne-ecran"` · `prs-borne-pave` · `prs-borne-resultat` · `prs-borne-refus` | Borne H24 |
| `data-testid="prs-correction-ligne-<id>"` · `prs-correction-compteur` | Corrections |
| `data-testid="prs-absence-ligne-<id>"` · `prs-absence-solde-<type>` | Absences |
| `data-testid="prs-planning-creneau-<id>"` · `prs-planning-alerte-pharmacien` | Plannings |
| `data-testid="prs-rapport-periode"` · `data-testid="prs-rapport-synthese"` · `data-testid="prs-rapport-export-csv"` · `data-testid="prs-rapport-export-pdf"` | Rapports |
| `data-testid="prs-parametre-<cle>"` · `prs-parametre-effet` | Paramètres art. 1.11 |
| `data-tour="bdg-apercu"` · `data-testid="bdg-carte-<badge_id>"` · `bdg-format-cr80` · `bdg-format-planche` · `bdg-etat-<statut>` | Badges |
| `data-testid="dos-fiche-<employe_id>"` · `dos-onglet-<general\|badge\|dossier>` · `dos-ordre-<employe_id>` · `data-testid="dos-organigramme"` | Personnel |
| `data-testid="sig-code-saisie"` · `data-testid="sig-resultat"` · `data-testid="sig-erreur"` | Signature (M-136) |

## Annexe C — Check-list rapide

**Avant de commencer**

- [ ] L8 livré : `TableauRegistre`, pagination dans l'URL, registres inaltérables
- [ ] `APP_TIMEZONE=Africa/Porto-Novo` posé et vérifié sur les requêtes existantes
- [ ] Constante unique des postes pharmaceutiques créée et partagée front/back
- [ ] Fixtures `reponses-demo.json` ajoutées **avant** d'inscrire `pointage` au `it.each`

**Pendant**

- [ ] Aucune reconnaissance d'employé côté client
- [ ] Aucun repli silencieux sur un employé par défaut
- [ ] Aucun secret renvoyé par une API
- [ ] Chaque écriture porte `source`, `created_by` et horodatage serveur
- [ ] Chaque modale qui écrit appelle réellement un endpoint
- [ ] Chaque libellé vient de `i18n/fr.ts`

**Avant de livrer**

- [ ] Les 9 commandes `grep` du §8 retournent zéro
- [ ] Les 20 critères d'acceptation sont démontrés sur la pile de démonstration
- [ ] La feuille d'émargement imprimée porte cartouche, période, méthode par ligne et cadre de signature
- [ ] Un badge imprimé porte l'officine courante, une échéance réelle et un QR vérifiable hors ligne
- [ ] Le registre de présence survit à un `UPDATE` direct : la tentative est tracée

## Annexe D — Migrations SQL proposées

```sql
-- 1. Traçabilité et isolation du registre de présence (RG-13)
ALTER TABLE public.pointages ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_pointages_isolation ON public.pointages
  FOR ALL USING (
    current_setting('app.is_admin', true) = 'true'
    OR officine_id IN (SELECT user_officines())
  );
CREATE TRIGGER trg_audit_pointages
  AFTER INSERT OR UPDATE OR DELETE ON public.pointages
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

ALTER TABLE public.employes ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_employes_isolation ON public.employes
  FOR ALL USING (
    current_setting('app.is_admin', true) = 'true'
    OR officine_id IN (SELECT user_officines())
  );
CREATE TRIGGER trg_audit_employes
  AFTER INSERT OR UPDATE OR DELETE ON public.employes
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- 2. Append-only : aucune modification directe du registre (RG-14)
CREATE OR REPLACE FUNCTION public.fn_pointages_inalterables()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.autorise_correction_pointage', true) <> 'true' THEN
    RAISE EXCEPTION 'Le registre de présence est inaltérable : passez par une écriture rectificative.'
      USING ERRCODE = '27000';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_pointages_inalterables
  BEFORE UPDATE OR DELETE ON public.pointages
  FOR EACH ROW EXECUTE FUNCTION public.fn_pointages_inalterables();

-- 3. Provenance de chaque mouvement (INC-02)
ALTER TABLE public.pointages
  ADD COLUMN source TEXT NOT NULL DEFAULT 'application'
    CHECK (source IN ('borne_qr','borne_pin','application','saisie_responsable','borne_hors_ligne','correction')),
  ADD COLUMN created_by UUID,
  ADD COLUMN borne_id UUID,
  ADD COLUMN poste_de_travail TEXT,
  ADD COLUMN horodatage_saisie TIMESTAMPTZ,
  ADD COLUMN ecart_horloge_s INTEGER,
  ADD COLUMN annule BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN annule_motif TEXT;
CREATE INDEX idx_pointages_officine_employe_horodatage
  ON public.pointages (officine_id, employe_id, horodatage DESC);

-- 4. Identifiants de badge uniques (RG-17, DEF-05)
ALTER TABLE public.employes
  ADD COLUMN photo_url TEXT,
  ADD COLUMN email TEXT,
  ADD COLUMN user_id UUID,
  ADD COLUMN pin_hash TEXT;
UPDATE public.employes SET pin_hash = NULL;   -- les codes en clair sont jetés, jamais migrés
ALTER TABLE public.employes DROP COLUMN pin_code;
CREATE UNIQUE INDEX uq_employes_matricule ON public.employes (officine_id, matricule);
CREATE SEQUENCE seq_matricules_employes;

-- 5. Cycle de vie du badge (BDG-01)
CREATE TABLE public.badges (
  id UUID PRIMARY KEY,
  officine_id UUID NOT NULL REFERENCES public.officines(id) ON DELETE CASCADE,
  employe_id UUID NOT NULL REFERENCES public.employes(id) ON DELETE CASCADE,
  matricule TEXT NOT NULL,
  code_badge TEXT NOT NULL UNIQUE,
  photo_fichier_id UUID,
  statut TEXT NOT NULL DEFAULT 'emis'
    CHECK (statut IN ('emis','remis','actif','perdu','vole','revoque','expire')),
  date_emission TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_remise TIMESTAMPTZ,
  date_expiration DATE NOT NULL,
  date_revocation TIMESTAMPTZ,
  motif_revocation TEXT,
  impressions_nombre INTEGER NOT NULL DEFAULT 0,
  derniere_impression_le TIMESTAMPTZ,
  derniere_impression_par UUID,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_badge_actif_par_employe
  ON public.badges (employe_id) WHERE statut = 'actif';

-- 6. Écritures rectificatives (RG-14)
CREATE TABLE public.corrections_pointage (
  id UUID PRIMARY KEY,
  officine_id UUID NOT NULL REFERENCES public.officines(id) ON DELETE CASCADE,
  pointage_origine_id UUID REFERENCES public.pointages(id),
  employe_id UUID NOT NULL REFERENCES public.employes(id),
  type TEXT NOT NULL CHECK (type IN ('arrivee','depart')),
  date_concernee DATE NOT NULL,
  heure_declaree TIME NOT NULL,
  motif TEXT NOT NULL CHECK (motif IN
    ('panne_borne','reseau_indisponible','oubli_badge','affluence_comptoir','intervention_exterieure','autre')),
  motif_detail TEXT,
  justificatif_fichier_id UUID,
  demande_par UUID NOT NULL,
  signature_id UUID,
  statut TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente','validee','refusee')),
  validee_par UUID, validee_le TIMESTAMPTZ, motif_refus TEXT,
  pointage_cree_id UUID REFERENCES public.pointages(id),
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
);

-- 7. Signatures vérifiées serveur (RG-15)
CREATE TABLE public.signatures_electroniques (
  id UUID PRIMARY KEY,
  officine_id UUID NOT NULL REFERENCES public.officines(id) ON DELETE CASCADE,
  acteur_id UUID NOT NULL,
  objet TEXT NOT NULL,          -- ex. 'correction_pointage', 'parametre', 'inventaire'
  objet_id UUID NOT NULL,
  article_bpd TEXT,
  empreinte_hmac TEXT NOT NULL,
  horodatage_serveur TIMESTAMPTZ NOT NULL DEFAULT now(),
  adresse_ip INET, user_agent TEXT,
  created_at TIMESTAMPTZ
);
```

*Fin du volet 4.*
