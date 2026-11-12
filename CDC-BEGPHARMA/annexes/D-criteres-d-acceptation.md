# Annexe D — Critères d'acceptation globaux et recette

Cette annexe est la **grille de recette transverse** : elle s'applique à tous les lots, en plus des critères propres à chaque lot (23 en 05, 38 en 06, 20 en 04, 15 en 03, et ceux des cahiers 01, 02, 07).

## D.1 Les dix critères globaux

Un lot n'est accepté que si **les dix** critères suivants sont vérifiés.

| # | Critère | Preuve attendue |
| --- | --- | --- |
| **1** | Les exigences numérotées du lot sont implémentées et leur critère individuel est vérifié | revue des codes `nn-nn` du lot, un par un |
| **2** | Aucun `grep` de contrôle ne renvoie de résultat (D.2) | sortie vide des 14 commandes |
| **3** | Toute route touchée existe **à la fois** dans `backend/routes/api.php` et dans `mock-backend.mjs` (RG-25) | test de parité vert |
| **4** | Les libellés visibles viennent de `src/lib/i18n/fr.ts` (RG-24, RG-43) | `grep -L "@/lib/i18n/fr"` vide sur les routes |
| **5** | Chaque section a un `data-testid` stable et un test dans `src/test/` | 24 écrans couverts à terme, contre 14 aujourd'hui |
| **6** | Aucun repli silencieux introduit (RG-26), aucun secret côté client (RG-07) | `grep -rn "\.catch(() =>"` sans nouvelle occurrence |
| **7** | Toute transition d'état exige un motif et une signature vérifiée serveur (RG-15, RG-30, RG-39) | aucun `PUT` de statut sans `motif` et `signature_id` |
| **8** | Tableaux, modales et graphiques correspondent aux codes `TAB-nn`, `M-nn`, `G-nn`, `I-nn` attribués | revue d'interface contre les annexes B et C |
| **9** | La télémétrie du lot émet ses métriques sans jamais servir de preuve réglementaire | `evenements_usage` et `metriques_horodatees` alimentés, tables append-only |
| **10** | `npm test` et `npm run build` passent dans `frontend/`, CI `.github/workflows/ci.yml` vert | pipeline GitHub Actions |

## D.2 Les quatorze commandes `grep` de recette

Toutes doivent renvoyer **zéro résultat** dans un dépôt propre, sauf indication contraire. Elles sont livrées prêtes à exécuter dans [`annexes/recette-grep.sh`](recette-grep.sh).

| # | Objet vérifié | Attendu | Règle |
| --- | --- | --- | --- |
| 1 | Dossier PRA, certificat d'étalonnage et trame de rapport annuel fictifs | 0 | RG-35 |
| 2 | Taux et montants écrits en dur (heures, NC, comptabilité, lettrage) | 0 | RG-35 |
| 3 | Identités et domaine fictifs | 0 | RG-42 |
| 4 | Codes de secours MFA et jeton e-MECeF en clair | 0 | RG-07 |
| 5 | Seuils de température dupliqués | 1 seule occurrence, dans la constante ou le paramètre | RG-36 |
| 6 | Service tiers de QR et impression navigateur | 0 | RG-23 |
| 7 | `window.print()` dans les écrans | 0 | RG-23 |
| 8 | Empreinte de signature fabriquée au hasard | 0 | RG-15 |
| 9 | Code PIN en clair côté serveur | 0 — remplacé par `pin_hash` | RG-16 |
| 10 | Repli sur le premier employé lors du scan | 0 | DEF-01 |
| 11 | Écrans qui n'importent pas les libellés centralisés | aucune ligne | RG-24, RG-43 |
| 12 | Écrans à formulaire sans modale | > 0 sur les trois fichiers | RG-40 |
| 13 | Trigger d'audit du registre de présence | > 0 | RG-13, RG-37 |
| 14 | Constantes de données du tableau de bord et slogans de conformité | 0 | RG-35 |

```bash
cd frontend

# 1 — RG-35 : documents imprimables fictifs
grep -rnE "100% Réussie|CERT-2026-042|94\.2" src                                    # attendu : 0
# 2 — RG-35 : taux et montants en dur
grep -rnE "96\.4%|4\.2 jours|18 950 000|94\.8|85% réalisés" src                     # attendu : 0
# 3 — RG-42 : identités fictives
grep -rnE "@bestpharma\.bj|Dr Marie AGOSSOU|ONPB-2014-B-089" src                      # attendu : 0
# 4 — RG-07 : secrets en clair
grep -rnE "8492-1049|dgi_live_sec_" src                                                # attendu : 0
# 5 — RG-36 : seuils de température
grep -rcE "2\.0°C|15\.0°C" src | grep -v ':0$'                                       # attendu : 1 fichier
# 6 — RG-23 : service tiers et impression navigateur
grep -rnE "api\.qrserver\.com|window\.print\(\)" src                               # attendu : 0
# 7 — RG-23 : impression navigateur dans les écrans
grep -rn "window.print()" src/routes/_authenticated/dashboard/                          # attendu : 0
# 8 — RG-15 : signature non vérifiée
grep -rn "Math.random" src/components/modules/bpd-communs.tsx                           # attendu : 0
# 9 — RG-16 : code PIN en clair
grep -rn "pin_code" ../backend/app                                                      # attendu : 0
# 10 — DEF-01 : repli sur le premier employé
grep -rn "employes\[0\]" src                                                          # attendu : 0
# 11 — RG-24 / RG-43 : libellés centralisés
grep -L "@/lib/i18n/fr" src/routes/_authenticated/dashboard/*.tsx                       # attendu : aucune ligne
# 12 — RG-40 : modales manquantes
grep -c "<Dialog" src/routes/_authenticated/dashboard/documents.tsx \
                  src/routes/_authenticated/dashboard/modeles.tsx \
                  src/routes/_authenticated/dashboard/non-conformites.tsx               # attendu : > 0 chacun
# 13 — RG-13 / RG-37 : audit du pointage
grep -rc "trg_audit_pointages" ../backend/database/migrations/*.php | grep -v ':0$'     # attendu : 1 fichier
# 14 — RG-35 : données codées en dur du tableau de bord
grep -rnE "DONNEES_VENTES_HEBDO|DONNEES_TEMP_24H|4 875|318 ord|15 330|\+14\.2%|263 / 267|100% Certifié|100% Automatique" src   # attendu : 0
```

### Résultat de la première exécution — 12 novembre 2026

Le script a été exécuté sur la branche `arena/a2e9c195-bestpharma`, commit `5b8becf`. **Les 14 contrôles échouent** : c'est l'état de départ mesuré, pas une hypothèse.

| # | Règle | Résultat | Mesure |
| --- | --- | --- | --- |
| 1 | RG-35 | **KO** | 3 occurrences : dossier PRA « 100% Réussie », certificat `CERT-2026-042`, trame à 94.2 % |
| 2 | RG-35 | **KO** | 5 occurrences : rapport d'heures 96.4 %, délai de NC 4.2 jours, comptabilité 18 950 000, lettrage 94.8 %, jauge 85 % réalisés |
| 3 | RG-42 | **KO** | 16 occurrences : utilisateurs `@bestpharma.bj`, « Dr Marie AGOSSOU », `ONPB-2014-B-089` |
| 4 | RG-07 | **KO** | 2 occurrences : codes de secours MFA en clair, jeton `dgi_live_sec_…` |
| 5 | RG-36 | **KO** | **14 occurrences réparties dans 2 fichiers** : `temperatures.tsx` (12) et `parametres.tsx` (2, en chaînes) |
| 6 | RG-23 | **KO** | 10 occurrences : `api.qrserver.com` et `window.print()` |
| 7 | RG-23 | **KO** | 3 écrans impriment avec `window.print()` |
| 8 | RG-15 | **KO** | 1 occurrence : `Math.random` dans `bpd-communs.tsx` |
| 9 | RG-16 | **KO** | 3 occurrences de `pin_code` côté serveur |
| 10 | DEF-01 | **KO** | 1 occurrence : repli sur `employes[0]` |
| 11 | RG-43 | **KO** | **19 écrans sur 24** n'importent pas `@/lib/i18n/fr` (5 seulement le font) |
| 12 | RG-40 | **KO** | 3 écrans sans aucune modale : `documents`, `modeles`, `non-conformites` |
| 13 | RG-37 | **KO** | aucun trigger d'audit sur la table `pointages` |
| 14 | RG-35 | **KO** | 12 occurrences : constantes de données et slogans de conformité |
| | | **0 / 14** | code de retour `1` |

> **Lecture du contrôle 11.** Le dossier `routes/_authenticated/dashboard/` contient **25 fichiers** : 24 écrans plus `route.tsx` (mise en page, qui n'a pas de libellé à centraliser). `grep -L` en signale 19 sans import, donc **6 écrans les importent** : `index` (tableau de bord), `personnel`, `appareils`, `compte`, `parametres`, `securite`. Les volets 05 et 06 annoncent « 4 écrans » : c'est exact dans leur périmètre (4 sur 14 fichiers audités, 4 sur 13 écrans), mais au périmètre du projet entier le compte est **6 sur 24**. La cible reste la même : 24 sur 24.

Commandes de **diagnostic complémentaire** (résultat non nul autorisé, mais à connaître) :

| Commande | État actuel | Cible |
| --- | --- | --- |
| `grep -rn "\.catch(() =>" frontend/src` | **11 occurrences** (§8.3 du maître) | 0 sur les données réglementaires |
| `grep -rn "enregistrerHandler\|\.ajouter(" frontend/src` | 0 appel réel — l'outbox est décorative | handlers enregistrés pour les mutations critiques (RG-27) |
| `grep -rn "sync/push" frontend/src` | 0 — `SyncController::push` jamais appelé | appelé par l'outbox (RG-27) |
| `grep -rc "<table" frontend/src/routes/_authenticated/dashboard/*.tsx` | 22 `<table>`, 227 `<td>` | 0 — migration vers `TableauRegistre` (RG-10, I-07) |
| `grep -rn "pharmacien_remplacant\|\"rmq\"" frontend/src backend/app` | définitions divergentes du poste pharmaceutique | une seule définition partagée (RG-18) |
| `grep -rn "a_6_mois\|a_3_mois\|a_1_mois" frontend/src` | durées de conservation non appliquées comme verrou | verrou réel (RG-02) |
| `grep -rn "96.4%" frontend/src` | rapport d'heures fictif | taux calculé (RPT-01→09) |

## D.3 Recette fonctionnelle sur la pile de démonstration

Recette exécutable sans backend Laravel, sur la pile de démonstration.

```bash
# 1. Démarrer la pile
node mock-backend.mjs            # 0.0.0.0:8001
cd frontend && npm run dev       # 0.0.0.0:5174, proxy /api -> 127.0.0.1:8001

# 2. Se connecter en deux temps (MFA obligatoire)
curl -s -X POST http://127.0.0.1:8001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"pharmacien@begpharma.bj","password":"Begpharma2026!"}'
# -> {"mfa_required":true,"temp_token":"temp-demo-u2"}

curl -s -X POST http://127.0.0.1:8001/api/auth/verify-mfa \
  -H 'Content-Type: application/json' \
  -d '{"temp_token":"temp-demo-u2","code":"123456"}'
# -> {"token":"demo-token-u2","user":{...}}

# 3. Vérifier que les 9 routes P0 répondent (lot L21)
TOK=demo-token-u2
for r in "PUT /api/auth/profile" "PUT /api/auth/password" \
         "POST /api/comptabilite/ecritures" "POST /api/upload" \
         "POST /api/auth/devices/revoke-others" ; do
  set -- $r
  curl -s -o /tmp/o -w "%{http_code} $1 $2\n" -X $1 "http://127.0.0.1:8001$2" \
    -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{}'
done
# Attendu après L21 : aucun 501 « Route de démonstration absente du mock »
```

| Compte de démonstration | Rôle | Particularité |
| --- | --- | --- |
| `promoteur@begpharma.bj` | promoteur | 2 officines, accès consolidation |
| `pharmacien@begpharma.bj` | pharmacien titulaire | accès complet, signatures |
| `dispensateur@begpharma.bj` | dispensateur | remise plafonnée, pas de stupéfiants |
| `agent.b@begpharma.bj` | agent | périmètre restreint |

Mot de passe de démonstration `Begpharma2026!`, code MFA `123456`, secret TOTP `JBSWY3DPEHPK3PXP`. Verrou d'inactivité 15 min → `423 SESSION_LOCKED_INACTIVITY`.

> **Piège de recette** : ne pas tronquer une sortie `curl` avec `head -c` — le proxy Vite journalise alors `Error: aborted (status 500)`. Utiliser `-o fichier -w "%{http_code}"`.

## D.4 Définition de « fini » pour une section

Une section d'écran est **finie** lorsque :

1. ses données viennent du serveur (état **réel** dans l'annexe A),
2. ses trois états — chargement, erreur, vide — sont distincts et visibles (RG-26),
3. son onglet, ses filtres et sa page sont dans l'URL (RG-08),
4. son tableau utilise `TableauRegistre` avec en-têtes `<th scope="col">` (RG-10, I-07),
5. ses formulaires utilisent `ModaleFiche` (RG-34),
6. ses libellés viennent de `@/lib/i18n/fr.ts` (RG-24, RG-43),
7. elle a un `data-testid` et un test,
8. ses écritures sont journalisées (trigger d'audit) et scopées (RLS),
9. ses documents imprimables portent le cartouche réglementaire (RG-03) et ne déclarent aucun fait non vérifiable (RG-35),
10. ses seuils sont lus des paramètres d'officine, jamais codés en dur (RG-12, RG-32, RG-36).

## D.5 Ce qui ne doit jamais être accepté

| Refus | Motif |
| --- | --- |
| Un document imprimable dont un taux, un certificat ou un résultat est écrit dans une chaîne de caractères | RG-35 — déclaration fausse opposable à l'entreprise |
| Un secret, un jeton, un code de secours ou un code PIN dans un `useState` | RG-07, RG-16 |
| Un `.catch(() => valeurParDefaut)` sur une donnée réglementaire | RG-26 |
| Une signature dont l'empreinte est calculée côté client | RG-15 |
| Un paramètre affiché mais non appliqué (`mode_presence_pharmacien`, seuils de température) | RG-21, RG-12 |
| Une route exposée sans handler de démonstration | RG-25 |
| Un matricule, un numéro de lot ou une référence tiré au hasard | RG-17, INT-01 |
| Une suppression là où le référentiel impose une écriture rectificative | RG-01, RG-31, RG-38 |
