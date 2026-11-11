# Module Qualite — Qualité BPD — SMQ

**Phase :** Phase 1 — Socle

SMQ, 10 chapitres BPD, auto-évaluation, registres, risques (criticité P×G), CAPA, auto-inspections, revue de direction.

**Tables prévues :** `qualite_constats, qualite_actions, qualite_risques, qualite_auto_inspections`

## Canevas DDD
- `Config/` — configuration du module
- `Controllers/` — contrôleurs API
- `Models/` — modèles Eloquent (trait `BelongsToCompany` pour isolation officine)
- `Requests/` — validation (FormRequest)
- `Resources/` — API Resources JSON
- `Services/` — logique métier
- `Providers/QualiteServiceProvider.php` — enregistrement migrations + routes
- `Database/Migrations/` — migrations autonomes du module
- `routes.php` — routes `/api/v1/qualite/*` avec middlewares `tenant.context` + `module.active`

## Règles
- Isolation stricte par `officine_id` (adaptation de company_id ERPSAAS).
- Contrôle serveur systématique (lecture, écriture, export, fichier).
- Aucune donnée d'une officine visible depuis une autre (tests croisés).
