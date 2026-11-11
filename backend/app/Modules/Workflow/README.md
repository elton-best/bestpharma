# Module Workflow — Workflow — Moteur paramétrable

**Phase :** Phase 1 — Socle

Circuits de validation par officine : inscription, approbation accompagnateur, documents, CAPA. Trait HasCustomWorkflow.

**Tables prévues :** `workflow_definitions, workflow_steps, workflow_instances, workflow_logs`

## Canevas DDD
- `Config/` — configuration du module
- `Controllers/` — contrôleurs API
- `Models/` — modèles Eloquent (trait `BelongsToCompany` pour isolation officine)
- `Requests/` — validation (FormRequest)
- `Resources/` — API Resources JSON
- `Services/` — logique métier
- `Providers/WorkflowServiceProvider.php` — enregistrement migrations + routes
- `Database/Migrations/` — migrations autonomes du module
- `routes.php` — routes `/api/v1/workflow/*` avec middlewares `tenant.context` + `module.active`

## Règles
- Isolation stricte par `officine_id` (adaptation de company_id ERPSAAS).
- Contrôle serveur systématique (lecture, écriture, export, fichier).
- Aucune donnée d'une officine visible depuis une autre (tests croisés).
