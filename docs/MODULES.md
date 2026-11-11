# Modules BEGPHARMA (25)

| Module | Phase | Rôle |
|---|---|---|
| Tenancy | 1 Socle | Officines, inscriptions, validation BEG, modules activés |
| ACL | 1 Socle | Rôles personnalisés par officine |
| Users | 1 Socle | Membres, Email + Google, 2FA |
| Workflow | 1 Socle | Validations paramétrables |
| Administration | 1 Socle | Profil + paramètres officine |
| Parametrage | 1 Socle | Référentiels |
| PlatformAdmin | 1 Socle | Back-office BEG |
| Accompagnement | 1 Socle | Missions, diagnostics, visites, livrables |
| Qualite | 1 Socle | SMQ BPD 10 chapitres, risques, CAPA, auto-inspections |
| Documents | 1 Socle | GED versionnée, attestations |
| Personnel | 1 Socle | Dossiers, habilitations, formations, planning, pointage |
| LocauxEquipements | 1 Socle | Maintenance, étalonnage, températures, nettoyage |
| Catalogue | 2 Pharmacie | Médicaments, fournisseurs |
| Achats | 2 Pharmacie | Commandes, réceptions, retours |
| Stock | 2 Pharmacie | Lots, FEFO, quarantaine, inventaires |
| Dispensation | 2 Pharmacie | Ordonnances, registres, conseils |
| VentesCaisse | 2 Pharmacie | POS, sessions, FeexPay, avoirs |
| Vigilance | 2 Pharmacie | Signalements, rappels |
| Comptabilite | 3 Gestion | Journaux, écritures SYSCOHADA |
| Tresorerie | 3 Gestion | Mouvements, rapprochements |
| Paie | 3 Gestion | Bulletins, barèmes datés |
| Fiscalite | 3 Gestion | Déclarations préparatoires |
| Dashboard | Transverse | Indicateurs, alertes |
| Reporting | Transverse | Exports, inspection |
| Notifications | Transverse | Alertes, audit |

Chaque module : `backend/app/Modules/<Nom>/` (DDD) + `frontend/src/views/<slug>/` + `frontend/src/router/modules/<slug>.ts`.
