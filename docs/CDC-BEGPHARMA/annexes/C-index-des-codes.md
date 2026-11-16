# Annexe C — Index de tous les codes

Tous les objets numérotés des sept cahiers, avec leur plage, leur effectif vérifié par extraction automatique, leur signification et le cahier qui les définit. **1 218 objets** au total.

> **Convention de levée d'ambiguïté** (§1.5 du maître) : trois familles sont réutilisées avec des numérotations différentes. Un code ambigu est toujours préfixé par le numéro de cahier — `04/PAR-03`, `06/PAR-03`, `06/TEM-05`, `07/TEM-05`.

## C.1 Exigences fonctionnelles par écran

| Famille | Plage | Effectif | Écran ou objet | Cahiers |
| --- | --- | --- | --- | --- |
| `TDB-nn` | 01 → 17 | 17 | Tableau de bord | 01, 02, 03 |
| `DSH-nn` | 01 → 14 | 14 | Tableau de bord, vue qualité ABMed | 01, 02, 07 |
| `CGL-nn` | 01 → 12 | 12 | Consolidation Groupe | 01, 02, 03 |
| `GRD-nn` | 01 → 10 | 10 | Pharmacies de Garde | 01, 02 |
| `CAI-nn` | 01 → 08 | 8 | Caisse — session, clôture, écart | 01, 02 |
| `VTE-nn` | 01 → 10 | 10 | Vente au comptoir | 01, 02 |
| `POS-nn` | 11 → 14 | 4 | Caisse POS tactile e-MECeF | 01, 02 |
| `DSP-nn` | 01 → 31 | 31 | Dispensation & Ordonnances | 01, 02 |
| `FDG-nn` | 01 → 16 | 16 | Facturation DGI | 01, 02 |
| `STK-nn` | 01 → 46 | 46 | Stock & Magasin | 05, 06 |
| `STU-nn` | 01 → 22 | 22 | Registre des Stupéfiants | 05 |
| `PRE-nn` | 01 → 18 | 18 | Préparations Magistrales | 05, 06 |
| `MAG-nn` | — | — | Magasin avancé (module) | 05 |
| `TEM-nn` | 01 → 18 | 18 | Chaîne du froid | 06, **07 fait foi** |
| `LOC-nn` | 01 → 16 | 16 | Locaux & Matériel (5M) | 06, **07 fait foi** |
| `AUT-nn` | 01 → 14 | 14 | Auto-évaluation 267 articles | 06, **07 fait foi** |
| `POI-nn` | 01 → 16 | 16 | Pointage, vue qualité ABMed | 04, **07 fait foi** |
| `PER-nn` | 01 → 18 | 18 | Personnel, vue qualité ABMed | 04, **07 fait foi** |
| `DOC-nn` | 01 → 18 | 18 | GED & Procédures | 06, **07 fait foi** |
| `MOD-nn` | 01 → 12 | 12 | Modèles Types BPD | 06, **07 fait foi** |
| `NCC-nn` | 01 → 14 | 14 | Non-conformités & CAPA | 06, **07 fait foi** |
| `ECH-nn` | 01 → 12 | 12 | Échéancier réglementaire | 06, **07 fait foi** |
| `PRS-nn` | 01 → 38 | 38 | Présence et pointage (dont mode borne H24) | 04, 06 |
| `BDG-nn` | 01 → 14 | 14 | Badges professionnels | 04 |
| `DOS-nn` | 01 → 27 | 27 | Dossiers du personnel & Ordre B | 04 |
| `PLN-nn` | 01 → 06 | 6 | Plannings et continuité de service | 04 |
| `RPT-nn` | 01 → 09 | 9 | Rapports d'heures et feuille d'émargement | 04 |
| `04/PAR-nn` | 01 → 06 | 6 | Paramètres de l'art. 1.11 | 04 |
| `CPT-nn` | 01 → 16 | 16 | Comptabilité SYSCOHADA | 06 |
| `JRN-nn` | 01 → 10 | 10 | Journal d'audit SHA-256 | 06 |
| `APP-nn` | 01 → 10 | 10 | Appareils autorisés | 03, 06 |
| `CMP-nn` | 01 → 07 | 7 | Mon profil & Rôle | 06 |
| `06/PAR-nn` | 01 → 09 | 9 | Paramètres d'officine (11 sections) | 06 |
| `SEC-nn` | 01 → 08 | 8 | Sécurité & MFA | 06 |
| `AE-nn` | 01 → 06 | 6 | Auto-évaluation, exigences propres | 07 |
| `EN-nn` | 01 → 12 | 7 | Enregistrement et maîtrise documentaire | 01, 03, 06, 07 |
| `FI-nn` | 01 → 04 | 4 | Fichiers et pièces jointes | 01, 07 |
| `LI-nn` | 01 → 04 | 3 | Lecture, diffusion et accès | 01, 07 |
| `PL-nn` | 01 → 04 | 4 | Plan de classement | 07 |
| `RH-nn` | 02 → 07 | 4 | Ressources humaines, vue qualité | 07 |
| `INT-nn` | 01 → 05 | 5 | Intégrité des données (aucune suppression) | 01, 03 |
| `DP-nn` | 01 → 06 | 6 | Droits du personnel et protection des données | 01, 02, 03 |
| `AC-nn` | 01 → 04 | 3 | Accès et habilitations | 01, 03 |
| **Sous-total** | | **493** | | |

## C.2 Objets d'interface

| Famille | Plage | Effectif | Objet | Cahiers |
| --- | --- | --- | --- | --- |
| `M-nn` | 01 → 243 | **243** | Modales et formulaires modaux — voir **annexe B** | 02, 03, 04, 05, 06 |
| `G-nn` | 01 → 124 | **124** | Graphiques (`recharts` : `LineChart`, `BarChart`, `PieChart`, `ScatterChart`, `RadialBar`, radar) | 02, 03, 04, 05, 06 |
| `TAB-nn` | 01 → 10 | 10 | Tableaux réglementaires structurés | 03, 04, 05 |
| `I-nn` | 01 → 15 | 15 | Interfaces et entités manquantes | 02, 03, 04, 05 |
| `UI-nn` | 01 → 12 | 12 | Composants d'interface partagés | 02 |
| `NF-nn` | 01 → 12 | 10 | Exigences non fonctionnelles (NF-01 < 500 ms, NF-02 < 2 s) | 01, 02, 03 |
| **Sous-total** | | **402** | | |

## C.3 Défauts et anomalies — 191

| Famille | Plage | Effectif | Périmètre | Cahier |
| --- | --- | --- | --- | --- |
| `D-nn` | 01 → 17 | 17 | défauts d'interface des 18 écrans cartographiés | 03 |
| `DEF-nn` | 01 → 25 | 25 | pointage, présence | 04 |
| `BDG-D1 → BDG-D9` | 1 → 9 | 9 | chaîne badge (QR, impression, cycle de vie) | 04 |
| `INC-nn` | 01 → 28 | 28 | incohérences transverses (08 en 04, 10 en 05, 10 en 06) | 04, 05, 06 |
| `STK-D1 → STK-D12` | 1 → 12 | 12 | `stock.tsx` (2 759 l.) | 05 |
| `STU-D1 → STU-D8` | 1 → 8 | 8 | `stupefiants.tsx` (874 l.) | 05 |
| `PRE-D1 → PRE-D6` | 1 → 6 | 6 | `preparations.tsx` (746 l.) | 05 |
| `MAG-D1 → MAG-D5` | 1 → 5 | 5 | `magasin-avance.tsx` (816 l.) | 05 |
| `TEM-D1 → TEM-D8` | 1 → 8 | 8 | `temperatures.tsx` (1 157 l.) | 06 |
| `LOC-D1 → LOC-D7` | 1 → 7 | 7 | `locaux.tsx` (1 250 l.) | 06 |
| `AUT-D1 → AUT-D6` | 1 → 6 | 6 | `auto-evaluation.tsx` (829 l.) | 06 |
| `DOC-D1 → DOC-D7` | 1 → 7 | 7 | `documents.tsx` (899 l.) | 06 |
| `MOD-D1 → MOD-D4` | 1 → 4 | 4 | `modeles.tsx` (562 l.) | 06 |
| `NCC-D1 → NCC-D7` | 1 → 7 | 7 | `non-conformites.tsx` (816 l.) | 06 |
| `ECH-D1 → ECH-D6` | 1 → 6 | 6 | `echeances.tsx` (1 566 l.) | 06 |
| `CPT-D1 → CPT-D9` | 1 → 9 | 9 | `comptabilite.tsx` (1 060 l.) | 06 |
| `JRN-D1 → JRN-D4` | 1 → 4 | 4 | `journal.tsx` (115 l.) | 06 |
| `APP-D1 → APP-D6` | 1 → 6 | 6 | `appareils.tsx` (1 108 l.) | 06 |
| `CMP-D1 → CMP-D6` | 1 → 6 | 6 | `compte.tsx` (1 370 l.) | 06 |
| `PAR-D1 → PAR-D6` | 1 → 6 | 6 | `parametres.tsx` (1 125 l.) | 06 |
| `SEC-D1 → SEC-D5` | 1 → 5 | 5 | `securite.tsx` (1 038 l.) | 06 |
| **Sous-total** | | **191** | | |

## C.4 Règles, lots et codes divers

| Famille | Plage | Effectif | Objet | Cahiers |
| --- | --- | --- | --- | --- |
| `RG-nn` | 01 → 44 | **44** | Règles globales transverses — voir §7 du maître | 03 (01→12), 04 (13→24), 05 (25→34), 06 (35→44) |
| `RG-T/C/D/F-nn` | — | — | règles propres aux cahiers 01 et 02 (T = tableau de bord, C = caisse, D = dispensation, F = facturation) | 01, 02 |
| `L1 → L33` | 1 → 33 | **33** | Lots de livraison — voir §9 du maître | 02 (L1→L7), 03 (L8→L14), 04 (L15→L20), 05 (L21→L26), 06 (L27→L33) |
| `HIST-01 → HIST-02` | 1 → 2 | 2 | entrées d'historique fictives de `parametres.tsx:122-123` | 04, 06 |
| `BOR-01` | 1 | 1 | mode borne de pointage H24 | 04 |
| **Sous-total** | | **81** | | |

## C.5 Codes du référentiel ABMed (cités, non définis ici)

| Code | Objet |
| --- | --- |
| `GAC-EN-001`, `GAC-EN-002` | registres codifiés de la chaîne du froid (enceintes) — cités par `temperatures.tsx` |
| `GLO-EN-001` | plan de nettoyage des locaux |
| `GAC-STU-001` | registre des stupéfiants |
| `BPD4-F12` | registre d'audit des appareils |
| `BPD5-F10` | emplacement sous enceinte 2-8 °C pour thermolabile |
| `BPD10-F*` | 59 modèles de documents — **aucun code de cette famille n'existe dans `Partie1BpdSeeder.php`** ; le corpus réel est `references/canevas/catalogue.json` (62 documents) |
| `TAM-RA-001` | trame du rapport annuel, téléchargée avec un taux de 94.2 % écrit dans la chaîne (`documents.tsx:873`) |
| art. 1.11 | présence effective du pharmacien — règle pivot du pointage |
| art. 4.32, 4.33 | autorisation nominative d'accès au système informatisé |
| art. 5.6 | agrément et validité du fournisseur à la réception |
| 267 articles | référentiel coté par `/dashboard/auto-evaluation` |

## C.6 Contrôle de continuité

Extraction automatique exécutée le 12 novembre 2026 sur les sept cahiers. Résultat :

| Contrôle | Résultat |
| --- | --- |
| `M-01 → M-243` | **243 codes, aucun trou, aucun doublon** |
| `G-01 → G-124` | **124 codes, aucun trou** |
| `RG-01 → RG-44` | **44 codes, aucun trou** |
| `L1 → L33` | **33 lots, aucun trou** |
| `INC-01 → INC-28` | continu à travers trois cahiers : 01→08 (04), 09→18 (05), 19→28 (06) |
| `TAB-01 → TAB-10` | continu : 01→06 (03), 07→10 (04) |
| Backticks appariés | oui dans les 7 fichiers |
| Caractères non latins (`ord > 0x2500`) | un seul résidu, `▸` dans le cahier 05 — inoffensif, aucune écriture non latine |
| Collisions de familles | 3, documentées au §1.5 du maître (`PAR`, les 7 familles qualité 06/07, `POI`/`PER` vs `PRS`/`DOS`) |
