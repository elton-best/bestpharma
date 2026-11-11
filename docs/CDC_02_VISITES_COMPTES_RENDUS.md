# M2 — Visites et comptes rendus connectés

## Périmètre livré

Depuis **Accompagnement → Missions & équipe → Voir la mission → Planning & comptes rendus**, en mode API :

- Le responsable approuvé actif crée une intervention en brouillon, puis la propose explicitement.
- La création utilise une clé de rejeu : même clé/contenu ne duplique ni intervention ni audit ; contenu différent refusé.
- L’administrateur actif de l’officine confirme une intervention proposée. Le responsable ne peut pas confirmer au nom de l’officine sans cette qualité.
- Le responsable reporte une intervention proposée/confirmée avec nouveau créneau et motif. L’ancienne occurrence conserve ses horaires et passe à « reportée ». La nouvelle occurrence proposée référence la précédente et exige une nouvelle confirmation.
- Le responsable ou l’administrateur peut annuler avec motif selon ses droits et l’état courant.
- Le responsable saisit les horaires réels passés, présences/absences, activités, décisions et prochaines étapes dans un compte rendu en brouillon. Il peut modifier ce brouillon avec contrôle de version.
- La soumission fige la version, sans la publier. Le partage explicite la rend visible à l’officine. Une correction après partage crée une nouvelle révision ; la version partagée précédente reste conservée.
- Une intervention confirmée peut être marquée réalisée après présence d’un compte rendu partagé ; le temps passé ne la marque jamais réalisée automatiquement.

Toutes les actions de création, consultation et décision utilisent des modales ; l’interface distingue saisie, soumission et partage. Les créneaux sont affichés/saisis en **Africa/Porto-Novo, UTC+1**, puis conservés en UTC côté serveur.

## Droits, confidentialité et intégrité

- Réutilisation de `MissionAccess` : compte/officine actifs, double approbation M1 et mission, permissions et période. Un coordinateur central seul ne lit ni ne modifie ces interventions.
- Écritures de planification et de compte rendu réservées au responsable approuvé avec contribution, en mission active. Annulation possible en mission suspendue pour les acteurs autorisés.
- Dates de planification futures, fin après début, période de mission respectée. Réalisation déclarée : horaires réels passés et fin après début.
- Verrou transactionnel d’officine, versions d’intervention et de compte rendu. Les doubles transitions ou versions périmées sont refusées, sans doubler occurrence ou notification.
- Marqueur de publication séparé de l’état : **annuler un brouillon ne publie pas ses métadonnées**.
- Côté officine et équipe non responsable : seules les interventions déjà proposées sont retournées, et seuls les comptes rendus partagés. Aucun brouillon ou compte rendu soumis non partagé dans la réponse.
- Les événements d’audit de préparation restent filtrés du journal d’officine des autres auteurs, y compris export. Aucun titre, lieu privé, contenu de compte rendu ou motif métier n’est copié dans le journal d’accès.
- Les événements publics de mission et l’outbox ne sont produits qu’aux transitions publiées. La notification générique ne contient pas le lien privé ni les contenus de compte rendu. L’outbox cible actuellement les administrateurs officine ; elle ne prétend pas notifier tous les participants individuels.
- Aucun champ de note interne n’est proposé dans le compte rendu partagé. Ne pas y saisir une note destinée à rester interne.
- L’historique n’est pas supprimé : anciennes occurrences et anciennes révisions restent reconstructibles.

## API

Sous `/api/v1/support/missions/{missionId}/visits`, avec authentification et contexte officine :

- GET : liste filtrée par droits avec versions de comptes rendus autorisées.
- POST : création en brouillon, confirmation et `request_key` obligatoires.
- POST `/{visitId}/transition` : `propose`, `confirm`, `cancel`, `reschedule`, `complete`, version/motif/confirmation.
- POST `/{visitId}/reports` : nouvelle révision brouillon.
- PATCH `/{visitId}/reports/{reportId}` : modification d’un brouillon uniquement.
- POST `/{visitId}/reports/{reportId}/decision` : `submit` ou `share`, version/confirmation.

Migrations `000015_create_mission_visits` et `000016_add_visit_creation_key` appliquées localement et par les suites de test.

## Recette exécutée

- **126 tests backend / 811 assertions sur SQLite puis PostgreSQL**, régression complète.
- Dont **8 tests visites / 61 assertions** : confidentialité des brouillons et du journal, distinction rôles, dates et période, report/rejeu, conservation d’horaires, versions de comptes rendus, publication, révision, réalisation, révocation et isolation entre officines.
- **116 tests frontend / 24 fichiers**, build TypeScript/Vite réussi. Tests de modales de planification/confirmation/report, motif obligatoire, refus de version périmée et lecture seule des versions partagées côté officine.
- Pas de parcours Chromium exécuté pour cette nouvelle tranche ; les tests Chromium des autres tranches ne sont pas revendiqués comme recette visites.

## Limites et suite

Cette tranche livre le cœur du planning et des comptes rendus, pas la totalité de la section 12 du CDC : participants individuels/présences structurées, détection informative des conflits d’agenda, types d’intervention configurables, pièces préparatoires et preuves privées, demandes de correction formalisées et accusés de réception restent à traiter. Les présences sont actuellement déclaratives en texte. Une réalisation n’est pas une preuve de formation ou une signature juridique.

Une intervention brouillon incorrecte peut être annulée puis recréée ; l’édition directe d’un créneau brouillon n’est pas encore proposée. Après soumission d’un compte rendu, cette tranche permet le partage puis une nouvelle révision ; un retour formalisé en correction reste à ajouter, sans écraser la version soumise.

Le **M2 entier n’est pas terminé** : diagnostics configurables/versionnés, constats, plans avec liens M4, livrables/preuves via M3, échanges, bilan et clôture contrôlée restent à raccorder. La clôture n’est pas activée sans ces prérequis.


## Suite livrée

Les modèles et diagnostics configurables/versionnés sont maintenant connectés : [périmètre et recette](CDC_02_DIAGNOSTICS.md). Les constats, preuves, plans et la clôture restent ouverts.
