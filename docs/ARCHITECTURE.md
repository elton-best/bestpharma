# Architecture BEGPHARMA

## Vue d'ensemble
```
Interfaces officine (frontend/) + BEG (admin/)
        ↓
API Laravel (backend/) — contrôle des accès (tenant + rôle + état compte + ressource + affectation accompagnateur)
        ↓
Données métier isolées (PostgreSQL, officine_id) | Documents privés (stockage objet) | Traitements async (Redis/Horizon)
```

## Multi-tenancy (repris ERPSAAS)
- `organizations` → `officines` (espaces isolés) → `officine_user`, `officine_modules`, `officine_invitations`
- Header `X-Officine-ID` (alias `X-Company-ID`), middleware `tenant.context`, trait `BelongsToCompany` + `TenantScope`
- `officine_modules` + middleware `module.active:<module>` (App Store SaaS à la Odoo)
- Rôles Spatie scopés `officine_id` (rôles universels + rôles locaux), multi-rôles par cases à cocher, protection dernier admin

## Workflow
`workflow_definitions` → `workflow_steps` → `workflow_instances` → `workflow_logs`. Trait `HasCustomWorkflow`. Usages : validation inscription, approbation accompagnateur, cycle document, CAPA.

## Données sensibles
Accès nominatif clinique limité aux habilités. Caissier, magasinier, comptable, promoteur, accompagnateur : pas d'accès clinique par défaut. Journal append-only, chiffrement, exports limités.

## Hors ligne (à décider par opération)
Caisse, dispensation, pointage, températures visés. Règles par opération : données minimales, appareils approuvés, sécurité stockage, conflits stock, rappel lot, paiement inconnu, doublons. Voir CDC §9.3.
