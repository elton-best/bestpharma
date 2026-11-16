#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# BEGPHARMA — recette transverse par grep (annexe D du CDC, §D.2)
#
# Vérifie les 14 contrôles globaux qui s'appliquent à TOUS les lots.
# À lancer depuis la racine du dépôt :  bash CDC-BEGPHARMA/annexes/recette-grep.sh
#
# Sortie : une ligne par contrôle, OK ou KO, puis le bilan.
# Code de retour : 0 si tout est conforme, 1 sinon.
#
# Un contrôle « KO » au début du chantier est NORMAL : ce script décrit
# l'état cible. Il devient l'outil de recette au fur et à mesure des lots.
# ---------------------------------------------------------------------------
set -uo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONT="$RACINE/frontend/src"
BACK="$RACINE/backend"
DASH="$FRONT/routes/_authenticated/dashboard"

KO=0; OK=0
rapport() { # $1 = numéro, $2 = règle, $3 = OK|KO, $4 = détail
  if [ "$3" = OK ]; then OK=$((OK+1)); printf '  %2s  OK   %-16s %s\n' "$1" "$2" "$4"
  else KO=$((KO+1)); printf '  %2s  KO   %-16s %s\n' "$1" "$2" "$4"; fi
}
compte() { grep -rnE "$1" "$2" 2>/dev/null | wc -l | tr -d ' '; }

echo "BEGPHARMA — recette transverse (annexe D §D.2)"
echo "dépôt : $RACINE"
echo

# 1 — RG-35 : documents imprimables qui déclarent un fait non vérifiable
n=$(compte '100% Réussie|CERT-2026-042|94\.2' "$FRONT")
[ "$n" = 0 ] && rapport 1 RG-35 OK "aucun document imprimable fictif" \
             || rapport 1 RG-35 KO "$n occurrence(s) : dossier PRA, certificat d'étalonnage, trame de rapport annuel"

# 2 — RG-35 : taux et montants écrits en dur
n=$(compte '96\.4%|4\.2 jours|18 950 000|94\.8|85% réalisés' "$FRONT")
[ "$n" = 0 ] && rapport 2 RG-35 OK "aucun taux ni montant codé en dur" \
             || rapport 2 RG-35 KO "$n occurrence(s) : rapport d'heures, délai de NC, comptabilité, lettrage, jauge de tournée"

# 3 — RG-42 : identités et domaine fictifs
n=$(compte '@bestpharma\.bj|Dr Marie AGOSSOU|ONPB-2014-B-089' "$FRONT")
[ "$n" = 0 ] && rapport 3 RG-42 OK "aucune identité fictive" \
             || rapport 3 RG-42 KO "$n occurrence(s) : utilisateurs, numéro d'Ordre ou domaine inventé"

# 4 — RG-07 : secrets en clair côté client
n=$(compte '8492-1049|dgi_live_sec_' "$FRONT")
[ "$n" = 0 ] && rapport 4 RG-07 OK "aucun secret côté client" \
             || rapport 4 RG-07 KO "$n occurrence(s) : codes de secours MFA ou jeton e-MECeF en clair"

# 5 — RG-36 : une seule source par seuil de température
n=$(grep -rlE '2\.0 ?°C|15\.0 ?°C|tempFrigoMin|tempFrigoMax' "$FRONT" 2>/dev/null | wc -l | tr -d ' ')
o=$(grep -rnoE '2\.0 ?°C|15\.0 ?°C|tempFrigoMin|tempFrigoMax' "$FRONT" 2>/dev/null | wc -l | tr -d ' ')
[ "$n" -le 1 ] && rapport 5 RG-36 OK "seuils de température en source unique ($o occurrence(s) dans $n fichier)" \
               || rapport 5 RG-36 KO "$o occurrence(s) réparties dans $n fichiers (attendu : 1 seul, la constante ou le paramètre)"

# 6 — RG-23 : aucun service tiers dans la chaîne badge et impression
n=$(compte 'api\.qrserver\.com|window\.print\(\)' "$FRONT")
[ "$n" = 0 ] && rapport 6 RG-23 OK "aucun service tiers, aucune impression navigateur" \
             || rapport 6 RG-23 KO "$n occurrence(s) : QR externe ou window.print()"

# 7 — RG-23 : impression navigateur dans les écrans
n=$(grep -rn 'window\.print()' "$DASH" 2>/dev/null | wc -l | tr -d ' ')
[ "$n" = 0 ] && rapport 7 RG-23 OK "impression par composant interne" \
             || rapport 7 RG-23 KO "$n écran(s) impriment avec window.print()"

# 8 — RG-15 : signature vérifiée serveur
n=$(grep -rn 'Math\.random' "$FRONT/components/modules/bpd-communs.tsx" 2>/dev/null | wc -l | tr -d ' ')
[ "$n" = 0 ] && rapport 8 RG-15 OK "aucune empreinte de signature fabriquée au hasard" \
             || rapport 8 RG-15 KO "$n occurrence(s) : hash_signature calculé côté client"

# 9 — RG-16 : code PIN jamais en clair
n=$(grep -rn 'pin_code' "$BACK/app" 2>/dev/null | wc -l | tr -d ' ')
[ "$n" = 0 ] && rapport 9 RG-16 OK "pin_hash uniquement" \
             || rapport 9 RG-16 KO "$n occurrence(s) de pin_code côté serveur"

# 10 — DEF-01 : aucun repli sur le premier employé
n=$(compte 'employes\[0\]' "$FRONT")
[ "$n" = 0 ] && rapport 10 DEF-01 OK "le scan rejette un code inconnu" \
             || rapport 10 DEF-01 KO "$n occurrence(s) : repli sur employes[0]"

# 11 — RG-24 / RG-43 : libellés centralisés
n=$(grep -L '@/lib/i18n/fr' "$DASH"/*.tsx 2>/dev/null | wc -l | tr -d ' ')
[ "$n" = 0 ] && rapport 11 RG-43 OK "tous les écrans importent @/lib/i18n/fr" \
             || rapport 11 RG-43 KO "$n écran(s) n'importent pas les libellés centralisés"

# 12 — RG-40 : une modale là où il y a un formulaire
n=0
for f in documents modeles non-conformites; do
  c=$(grep -c '<Dialog' "$DASH/$f.tsx" 2>/dev/null); c=${c:-0}
  if [ "$c" -eq 0 ]; then n=$((n+1)); fi
done
[ "$n" = 0 ] && rapport 12 RG-40 OK "documents, modeles et non-conformites ont leurs modales" \
             || rapport 12 RG-40 KO "$n écran(s) sans aucune modale alors qu'ils ont des formulaires"

# 13 — RG-13 / RG-37 : audit du registre de présence
n=$(grep -rl 'trg_audit_pointages' "$BACK/database/migrations" 2>/dev/null | wc -l | tr -d ' ')
[ "$n" -ge 1 ] && rapport 13 RG-37 OK "trigger d'audit sur pointages" \
               || rapport 13 RG-37 KO "aucun trigger d'audit sur la table pointages"

# 14 — RG-35 : données codées en dur du tableau de bord
n=$(compte 'DONNEES_VENTES_HEBDO|DONNEES_TEMP_24H|4 875|318 ord|15 330|\+14\.2%|263 / 267|100% Certifié|100% Automatique' "$FRONT")
[ "$n" = 0 ] && rapport 14 RG-35 OK "indicateurs calculés" \
             || rapport 14 RG-35 KO "$n occurrence(s) : constantes de données ou slogan de conformité"

echo
echo "bilan : $OK conforme(s), $KO à corriger, sur 14 contrôles"
[ "$KO" = 0 ] || exit 1
exit 0
