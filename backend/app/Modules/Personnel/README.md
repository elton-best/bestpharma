# Module Personnel — Personnel — RH Santé

**Phase :** Phase 1 — Socle

Dossiers, postes, habilitations, formations, absences, planning, gardes, pointage. Séparation poste/qualification/permissions.

**Tables prévues :** `personnel_dossiers, personnel_formations, personnel_plannings, personnel_pointages`

## Canevas DDD
- `Config/` — configuration du module
- `Controllers/` — contrôleurs API
- `Models/` — modèles Eloquent (trait `BelongsToCompany` pour isolation officine)
- `Requests/` — validation (FormRequest)
- `Resources/` — API Resources JSON
- `Services/` — logique métier
- `Providers/PersonnelServiceProvider.php` — enregistrement migrations + routes
- `Database/Migrations/` — migrations autonomes du module
- `routes.php` — routes `/api/v1/personnel/*` avec middlewares `tenant.context` + `module.active`

## Règles
- Isolation stricte par `officine_id` (adaptation de company_id ERPSAAS).
- Contrôle serveur systématique (lecture, écriture, export, fichier).
- Aucune donnée d'une officine visible depuis une autre (tests croisés).
