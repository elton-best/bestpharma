# Module Dispensation — Dispensation & Ordonnances

**Phase :** Phase 2 — Pharmacie

Ordonnances, analyse pharmaceutique, conseils, registres, dossier pharmaceutique. Accès clinique restreint.

**Tables prévues :** `dispensation_ordonnances, dispensation_registres, dispensation_conseils`

## Canevas DDD
- `Config/` — configuration du module
- `Controllers/` — contrôleurs API
- `Models/` — modèles Eloquent (trait `BelongsToCompany` pour isolation officine)
- `Requests/` — validation (FormRequest)
- `Resources/` — API Resources JSON
- `Services/` — logique métier
- `Providers/DispensationServiceProvider.php` — enregistrement migrations + routes
- `Database/Migrations/` — migrations autonomes du module
- `routes.php` — routes `/api/v1/dispensation/*` avec middlewares `tenant.context` + `module.active`

## Règles
- Isolation stricte par `officine_id` (adaptation de company_id ERPSAAS).
- Contrôle serveur systématique (lecture, écriture, export, fichier).
- Aucune donnée d'une officine visible depuis une autre (tests croisés).

## Tranche demande → délivrance (interne)

- `GET /api/v1/dispensation/workspace` expose le catalogue et uniquement les soldes des lots disponibles/non expirés ainsi que les 50 demandes récentes.
- `POST /api/v1/dispensation/requests` crée une demande/ordonnance minimisée et idempotente; n'effectue aucun mouvement de stock.
- `POST /api/v1/dispensation/requests/{id}/dispense` exige `confirmed`, `decision=dispense`, `pharmacist_visa_confirmed` et une clé de rejeu. La transaction verrouille l'officine, alloue les lots FEFO, refuse les lots expirés, en quarantaine ou rappelés et écrit le ledger avant validation.
- Le champ patient est une référence facultative, jamais un nom obligatoire. La confirmation de visa est enregistrée au nom du compte qui valide; la qualité professionnelle/permission pharmaceutique doit encore être définie et validée métier avant déploiement.
- Périmètre interne uniquement : pas de caisse/paiement, e-MECEF, registre officiel, analyse ou décision clinique automatique.

Tests ciblés : `php artisan test --filter=DispensationWorkflowTest` avec `bestpharma_test`. Dans l'environnement de portage courant, PHP 8.3 est inférieur à la contrainte projet 8.4 et les migrations globales échouent en amont sur `officine_authorized_devices.registered_by` (UUID contre `users.id` bigint); exécuter après correction de cette migration d'environnement. Le build frontend global peut aussi être bloqué par le fichier préexistant absent `src/views/documents/IndexView.vue`; le typecheck ciblé de cette vue passe.
