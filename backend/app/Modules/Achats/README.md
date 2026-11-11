# Module Achats — Achats — Commandes

**Phase :** Phase 2 — Pharmacie

Commandes fournisseurs, réceptions, contrôle qualité, retours.

**Tables prévues :** `achats_commandes, achats_receptions, achats_retours`

## Canevas DDD
- `Config/` — configuration du module
- `Controllers/` — contrôleurs API
- `Models/` — modèles Eloquent (trait `BelongsToCompany` pour isolation officine)
- `Requests/` — validation (FormRequest)
- `Resources/` — API Resources JSON
- `Services/` — logique métier
- `Providers/AchatsServiceProvider.php` — enregistrement migrations + routes
- `Database/Migrations/` — migrations autonomes du module
- `routes.php` — routes `/api/v1/achats/*` avec middlewares `tenant.context` + `module.active`

## Règles
- Isolation stricte par `officine_id` (adaptation de company_id ERPSAAS).
- Contrôle serveur systématique (lecture, écriture, export, fichier).
- Aucune donnée d'une officine visible depuis une autre (tests croisés).
