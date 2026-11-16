# Annexe E — Parité d'API, contrôleurs et schéma

État mesuré le 12 novembre 2026 sur la branche `arena/a2e9c195-bestpharma`.

## E.1 Les trois inventaires

| Inventaire | Source | Effectif |
| --- | --- | --- |
| Routes Laravel | `backend/routes/api.php` (275 lignes) | **148 routes verbales** |
| Handlers de démonstration | `mock-backend.mjs` (108 Ko) | **≈ 104 handlers** |
| URL appelées par le frontend | `frontend/src/**` | **117 URL distinctes** |

Aucun des trois ne coïncide avec les deux autres. → **RG-25**, **lot L21**.

> **Méthode de mesure** : le mock route par `path.match(...)` et par `method`, souvent écrits sur des lignes différentes. Chercher les deux sur la même ligne sous-estime les handlers de 36 unités ; une fenêtre de ±1 ligne en laisse encore 22. La mesure juste utilise une **fenêtre de ±2 lignes** et capture `path === "…"`, `path.startsWith` et `path.endsWith`. Elle donne **14 vrais manquants**, dont **9 confirmés par `curl`**.

## E.2 Les 9 routes en `501` alors que le contrôleur existe (P0)

Réponse du mock : `501 {"message":"Route de démonstration absente du mock : …"}`.

| # | Méthode et chemin | `api.php` | Appelée depuis | Contrôleur Laravel |
| --- | --- | --- | --- | --- |
| 1 | `PUT /api/auth/profile` | l.53 | `compte.tsx:146` | `AuthController::updateProfile` |
| 2 | `PUT /api/auth/password` | l.54 | `securite.tsx:224` | `AuthController::updatePassword` |
| 3 | `POST /api/comptabilite/ecritures` | l.257 | `comptabilite.tsx:176` | `ComptabiliteController::storeEcriture` |
| 4 | `POST /api/comptabilite/ecritures/{id}/extourne` | l.258 | `comptabilite.tsx:195` | `ComptabiliteController::extourne` |
| 5 | `POST /api/upload` | l.43 | `stock.tsx:346` · `stupefiants.tsx:174` · `preparations.tsx:136` · `zone-depot.tsx:58` | `UploadController` (154 l., 2 méthodes) |
| 6 | `POST /api/appareils-autorises/{id}/revoquer` | l.65 | `appareils.tsx` | `AppareilAutoriseController::revoquer` |
| 7 | `POST /api/appareils-autorises/{id}/reactiver` | l.66 | `appareils.tsx` | `AppareilAutoriseController::reactiver` |
| 8 | `POST /api/auth/devices/revoke-others` | l.58 | `securite.tsx`, `appareils.tsx` | `AuthController::revokeOthers` |
| 9 | `GET /api/officines/{id}/audit-logs/verifier-integrite` | l.84 | `journal.tsx:52` | `AuditController::verifierIntegrite` (102 l., 2 méthodes) |

**Impact** : `POST /api/upload` à lui seul bloque tout téléversement de l'application — documents GED, photos du personnel, justificatifs de non-conformité, certificats d'étalonnage, preuves de clôture d'échéance, fichiers d'import de catalogue.

## E.3 Les 3 handlers du mock sans équivalent Laravel

| Handler mock | Statut | Décision |
| --- | --- | --- |
| `nouvelle-complete` (auto-évaluation) | appelé par `auto-evaluation.tsx:239` | **à porter dans Laravel** : création d'une campagne avec articles figés |
| `rattacher` | appelé par le frontend | **à porter dans Laravel** |
| `PUT /api/stocks/{id}/statut` | appelé par `stock.tsx` | **à porter dans Laravel** — aujourd'hui `PUT /stocks/lot1/statut` renvoie `404` en démo alors que le mock l'accepte : les deux piles divergent |

## E.4 Les 12 routes Laravel orphelines (jamais appelées)

| # | Route | Décision |
| --- | --- | --- |
| 1 | `POST /api/emplacements` | brancher depuis la section Emplacements de `/dashboard/stock` |
| 2 | `POST /api/mouvements` | brancher depuis la section Mouvements (transfert, ajustement) |
| 3 | `GET /api/stocks/alertes-peremption` | **doublon** de `GET /api/stocks/alertes` — supprimer ou fusionner |
| 4 | `GET /api/stupefiants/rapport` | brancher depuis la section Rapports du registre |
| 5 | `POST /api/echeances` (non scopé) | brancher ou retirer — coexiste avec la version scopée |
| 6 | `PATCH /api/echeances` (non scopé) | idem |
| 7 | `DELETE /api/echeances` (non scopé) | idem — une échéance réglementaire ne se supprime pas (RG-01) |
| 8 | `GET /api/echeances/{id}/ical` | déjà branché côté export ; vérifier l'appel réel |
| 9 | `GET /api/echeances` (non scopé) | **doublon** de la version scopée |
| 10 | `DELETE /api/appareils-autorises/{id}` | **supprimer** — la révocation suffit, un appareil autorisé ne se supprime pas |
| 11 | `GET /api/auto-evaluation/rapport` | **brancher en priorité** : c'est la pièce maîtresse de la revue de direction (AUT-D01) |
| 12 | `POST /api/sync/push` | brancher depuis l'outbox hors ligne, ou retirer l'affichage hors ligne (RG-27) |

**Doublon supplémentaire** : `GET /api/audit-logs` et `GET /api/officines/{id}/audit-logs` (`api.php:84-85`) exposent la même ressource sous deux conventions. → **RG-28**.

## E.5 Réponses légitimes observées (à conserver)

| Route | Réponse | Pourquoi c'est juste |
| --- | --- | --- |
| `PUT /api/stocks/lot1/statut` | `404` | l'identifiant n'existe pas dans le jeu de démonstration |
| `POST /api/auto-evaluation/evaluer/ev1` | `422 {"message":"Cotation invalide."}` | la liste close des 4 valeurs de cotation est contrôlée serveur |
| `PUT /api/echeances/e1` | `404` | identifiant inconnu |
| `POST /api/caisse/session/cs1/fermer` | `404` | session inconnue |

## E.6 Réponses `200` / `201` vérifiées

`POST /api/gardes` · `DELETE /api/gardes/{id}` · `POST /api/documents` · `PUT /api/documents/{id}` (`201`/`200`) · `PUT /api/employes/{id}` · `PUT /api/non-conformites/{id}` · `PUT /api/parametres/{cle}` · `GET /api/stupefiants/balance` · `GET /api/temperatures/stats` · `GET /api/stocks/valorisation` (**total 72 000 FCFA, non scopé par officine** — `stock.tsx:516`) · `GET /api/stocks/alertes` · `GET /api/stocks/peremptions` · `GET /api/emplacements` · `GET /api/mouvements` · `GET /api/modeles-bpd` (**3 fiches, `contenu: null`**).

> `GET /api/modeles-bpd` renvoie une **liste nue**, pas une enveloppe `{data: …}` : un client qui fait `reponse.get('data')` lève `AttributeError`. À normaliser (RG-28).

## E.7 Les 35 contrôleurs `app/Http/Controllers/Api/`

| Contrôleur | Lignes | Méthodes | Contrôleur | Lignes | Méthodes |
| --- | --- | --- | --- | --- | --- |
| `AuthController` | 509 | 15 | `ProduitController` | 120 | 2 |
| `PromoteurConsolidationController` | 426 | 4 | `PreparationController` | 112 | 3 |
| `StockLotController` | 422 | 8 | `SyncController` | 104 | 1 |
| `StupefiantController` | 324 | 11 | `FichierDocumentController` | 102 | 3 |
| `AutoEvaluationController` | 245 | 5 | `AuditController` | 102 | 2 |
| `DocumentController` | 237 | 6 | `DechetController` | 101 | 3 |
| `VenteCaisseController` | 231 | 3 | `NonConformiteController` | 100 | 3 |
| `DispensationController` | 206 | 3 | `AvisRappelController` | 92 | 3 |
| `PointageController` | 203 | 4 | `EmployeController` | 84 | 3 |
| `ReleveTemperatureController` | 187 | 3 | `MouvementStockController` | 84 | 2 |
| `OfficineController` | 184 | 5 | `ModeleBpdController` | 72 | 2 |
| `EcheanceController` | 177 | 6 | `CanevasController` | 54 | 3 |
| `AppareilAutoriseController` | 177 | 5 | `EmplacementController` | 50 | 3 |
| `ComptabiliteController` | 169 | 6 | `NettoyageController` | 48 | 2 |
| `ParametreController` | 163 | 3 | `InventaireController` | 150 | 5 |
| `UploadController` | 154 | 2 | `CaisseSessionController` | 145 | 4 |
| `SuiviDocumentaireController` | 141 | 4 | `EquipementController` | 133 | 2 |
| `GardeOfficineController` | 132 | 3 | | | |

**Modèles Eloquent** : 36, dont **aucun** `Employe`, `Pointage` ou `InscriptionOrdre` n'existe en tant que modèle dédié — les tables correspondantes sont utilisées sans modèle, donc sans casts, sans relations et sans validation.

**Chemin trompeur** : il n'existe pas de `backend/app/Http/Controllers/PointageController.php` — tous les contrôleurs d'API sont dans le sous-dossier `Api/`.

## E.8 Couverture RLS et triggers d'audit

| Statut | Tables |
| --- | --- |
| **RLS + trigger d'audit** (10) | `audit_logs`, `alertes_peremption`, `inscriptions_ordre`, `officines`, `officine_parametres`, `utilisateurs_officines`, `appareils_autorises`, `approbations_documents`, `fichiers_documents`, `suivis_documentaires` |
| **Ni RLS ni trigger** (30+) | `employes`, `pointages`, `produits`, `stock_lots`, `mouvements_stock`, `emplacements`, `registre_stupefiants`, `registre_preparations`, `releves_temperatures`, `non_conformites`, `documents`, `ecritures_syscohada`, `ventes`, `dispensations`, `factures`, `gardes`, `inventaires`, `dechets`, `avis_rappels`, `absences`, `equipements`, `nettoyages`, et toutes les tables des modules qualité |

Défenses existantes à conserver et à étendre (migration `120100_create_audit_triggers.php`) :

| Objet | Effet |
| --- | --- |
| `fn_audit_trigger()` | fonction PL/pgSQL qui écrit dans `audit_logs` |
| `trg_audit_logs_tamper_defense` | refuse `UPDATE` et `DELETE` sur `audit_logs` |
| `trg_audit_no_truncate` | refuse `TRUNCATE` sur `audit_logs` |

→ **RG-37** : étendre à toutes les tables métier, mesurer la couverture par `audit_couverture_tables`.
→ **RG-38** : garde append-only sur `ecritures_syscohada`, `releves_temperatures`, `registre_stupefiants`, `registre_preparations`, `non_conformites`, `documents`, `audit_logs`.

**Vérifications `grep`** : `grep -rn "ROW LEVEL SECURITY" backend/database/migrations` ne renvoie rien pour `employes` ni `pointages` — c'est une **absence réelle**, pas un échec de la commande.

## E.9 Contexte tenant et fuseau horaire

| Élément | Emplacement | Valeur | Conséquence |
| --- | --- | --- | --- |
| Middleware tenant | `backend/bootstrap/app.php:15-19` | `SetPostgresTenantContext` | pose le contexte PostgreSQL par officine sur chaque requête |
| Verrou d'inactivité | `SetPostgresTenantContext.php:20-30` | 15 min → `423 SESSION_LOCKED_INACTIVITY` | s'applique à **toutes** les routes, y compris la borne de pointage qui annonce « Session Continue H24 » (DEF-13) |
| Fuseau serveur | `backend/config/app.php:68` | `APP_TIMEZONE=UTC` | les `whereDate` sont en UTC |
| Fuseau client | `frontend/src/lib/format.ts` | `Africa/Porto-Novo` | **décalage d'un jour** possible aux bornes de journée → RG-19 |
| Convention d'URL | `frontend/src/lib/api-client.ts:92-101` | `formatUrl` préfixe `/api/` | un appel écrit `/api/x` produit `/api/api/x` → RG-28 |

## E.10 Seeders et corpus

| Source | Contenu | État |
| --- | --- | --- |
| `database/seeders/DatabaseSeeder.php` | jeu de démonstration | utilisé |
| `database/seeders/Partie1BpdSeeder.php` | socle partie 1 | **ne contient aucun code `BPD10-F*`** — ne pas y chercher les 59 modèles |
| `references/canevas/catalogue.json` | **62 documents** hashés `sha256`, 0 non intégré, 5 rubriques : maîtrise documentaire 4 · ressources 31 · surveillance 17 · procédures 4 · en cours 6 ; formats : 39 `.docx`, 16 `.xlsx`, 5 `.doc`, 1 `.pdf`, 1 `.odt` | **jamais branché** sur `GET /api/modeles-bpd` |
| `references/canevas/anciens-doc/` | 6 fichiers `.xml` | jamais branché |
| Interface `modeles.tsx:56/169/552` | annonce « **59 modèles** » | contredit le corpus (62) et l'API (3 fiches vides) |

→ **RG-41**, **lot L28** : seeder les 62 documents, vérifier les empreintes, calculer le nombre affiché.
