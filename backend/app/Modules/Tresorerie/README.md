# Module Tresorerie — Trésorerie

**Phase :** Phase 3 — Gestion

Encaissements, décaissements, rapprochements bancaires, MoMo.

**Tables prévues :** `treso_mouvements, treso_rapprochements`

## Canevas DDD
- `Config/` — configuration du module
- `Controllers/` — contrôleurs API
- `Models/` — modèles Eloquent (trait `BelongsToCompany` pour isolation officine)
- `Requests/` — validation (FormRequest)
- `Resources/` — API Resources JSON
- `Services/` — logique métier
- `Providers/TresorerieServiceProvider.php` — enregistrement migrations + routes
- `Database/Migrations/` — migrations autonomes du module
- `routes.php` — routes `/api/v1/tresorerie/*` avec middlewares `tenant.context` + `module.active`

## Règles
- Isolation stricte par `officine_id` (adaptation de company_id ERPSAAS).
- Contrôle serveur systématique (lecture, écriture, export, fichier).
- Aucune donnée d'une officine visible depuis une autre (tests croisés).
