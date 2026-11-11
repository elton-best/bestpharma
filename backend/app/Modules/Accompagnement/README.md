# Module Accompagnement — Accompagnement BEG

**Phase :** Phase 1 — Socle

Demandes, missions, diagnostics, équipe approuvée, visites, livrables, bilan. Accès soumis à approbation officine.

**Tables prévues :** `accompagnement_missions, accompagnement_visites, accompagnement_livrables`

## Canevas DDD
- `Config/` — configuration du module
- `Controllers/` — contrôleurs API
- `Models/` — modèles Eloquent (trait `BelongsToCompany` pour isolation officine)
- `Requests/` — validation (FormRequest)
- `Resources/` — API Resources JSON
- `Services/` — logique métier
- `Providers/AccompagnementServiceProvider.php` — enregistrement migrations + routes
- `Database/Migrations/` — migrations autonomes du module
- `routes.php` — routes `/api/v1/accompagnement/*` avec middlewares `tenant.context` + `module.active`

## Règles
- Isolation stricte par `officine_id` (adaptation de company_id ERPSAAS).
- Contrôle serveur systématique (lecture, écriture, export, fichier).
- Aucune donnée d'une officine visible depuis une autre (tests croisés).
