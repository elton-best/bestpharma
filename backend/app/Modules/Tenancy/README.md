# Module Tenancy — Tenancy — Officines & SaaS

**Phase :** Phase 1 — Socle

Espaces officines isolés, inscriptions, validation BEG, officine_modules (App Store SaaS), invitations, onboarding, audit tenant.

**Tables prévues :** `officines, organizations, officine_user, officine_modules, officine_invitations, tenant_audit_logs`

## Canevas DDD
- `Config/` — configuration du module
- `Controllers/` — contrôleurs API
- `Models/` — modèles Eloquent (trait `BelongsToCompany` pour isolation officine)
- `Requests/` — validation (FormRequest)
- `Resources/` — API Resources JSON
- `Services/` — logique métier
- `Providers/TenancyServiceProvider.php` — enregistrement migrations + routes
- `Database/Migrations/` — migrations autonomes du module
- `routes.php` — routes `/api/v1/tenancy/*` avec middlewares `tenant.context` + `module.active`

## Règles
- Isolation stricte par `officine_id` (adaptation de company_id ERPSAAS).
- Contrôle serveur systématique (lecture, écriture, export, fichier).
- Aucune donnée d'une officine visible depuis une autre (tests croisés).
