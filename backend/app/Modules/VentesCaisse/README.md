# Module VentesCaisse — Ventes & Caisse (POS)

**Phase :** Phase 2 — Pharmacie

Panier, sessions caisse, passations, rapprochements, avoirs, FeexPay, idempotence paiement.

**Tables prévues :** `ventes_sessions, ventes_transactions, ventes_paiements, ventes_avoirs`

## Canevas DDD
- `Config/` — configuration du module
- `Controllers/` — contrôleurs API
- `Models/` — modèles Eloquent (trait `BelongsToCompany` pour isolation officine)
- `Requests/` — validation (FormRequest)
- `Resources/` — API Resources JSON
- `Services/` — logique métier
- `Providers/VentesCaisseServiceProvider.php` — enregistrement migrations + routes
- `Database/Migrations/` — migrations autonomes du module
- `routes.php` — routes `/api/v1/ventescaisse/*` avec middlewares `tenant.context` + `module.active`

## Règles
- Isolation stricte par `officine_id` (adaptation de company_id ERPSAAS).
- Contrôle serveur systématique (lecture, écriture, export, fichier).
- Aucune donnée d'une officine visible depuis une autre (tests croisés).
