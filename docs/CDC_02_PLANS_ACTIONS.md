# M2 — Plans d’accompagnement (première tranche)

## Périmètre connecté

Dans **Accompagnement → Missions & équipe → Voir la mission → Plan d’accompagnement**, un responsable de mission approuvé peut créer un brouillon et le soumettre. Un administrateur actif de l’officine peut approuver la version soumise ou demander des modifications avec un motif. Les dates, objectifs, résultats attendus, responsables, échéances, priorité et preuve attendue sont versionnés. Une révision conserve la version précédente ; une version approuvée n’est pas modifiable.

Les lignes peuvent référencer un constat déjà partagé de la même mission. Un constat privé, absent ou d’une autre mission est refusé côté serveur. Les brouillons et leur contenu ne sont pas visibles à l’officine avant soumission. Les décisions publiées produisent un événement d’historique générique et une notification via l’outbox ; aucun contenu métier sensible n’est copié dans l’audit.

## Contrats

- GET `/api/v1/support/missions/{id}/plan`
- PUT `/api/v1/support/missions/{id}/plan` — créer/modifier un brouillon avec contrôle de version
- POST `/api/v1/support/missions/{id}/plan/submit`
- POST `/api/v1/support/missions/{id}/plan/decision` — `approve` ou `request_changes`

Le responsable doit avoir les accès M1 et mission actifs, le rôle responsable et une mission active. La décision est réservée à un administrateur actif de l’officine. Les modifications utilisent le verrou d’officine et la version optimiste. Les références de constats sont limitées au tenant et à la mission.

## Limites explicites

**Les actions ne sont pas créées directement dans M2.** Un administrateur peut intégrer un plan approuvé au module 04 via un endpoint idempotent ; les exécutions vivent ensuite dans le registre unique M4. Les responsables textuels du plan doivent correspondre exactement à un membre actif, sinon l’intégration est refusée sans création partielle. Les notifications sont préparées dans l’outbox, pas garanties livrées.

La version actuelle ne livre pas encore le bilan, la clôture, les livrables/preuves via le module 03, les pièces jointes aux échanges, ni le circuit formel de correction des comptes rendus. **Elle ne clôt pas le module 02.**

## Échanges connectés

Le fil de mission est également connecté : commentaires immuables, datés et attribués, avec visibilité `internal` ou `shared`. Le responsable approuvé peut ajouter une note interne ; les autres lecteurs et l’officine ne reçoivent jamais ce texte via l’API. Les messages partagés déclenchent une notification générique via l’outbox et un événement d’historique sans contenu métier. Une clé de rejeu renvoie le même message sans doublon ; réutiliser cette clé avec un autre contenu est refusé. Le serveur vérifie la mission, l’officine, l’état de la mission et la participation M1/M2 à chaque requête.

Routes : GET/POST `/api/v1/support/missions/{id}/comments`. Pièces jointes et modification/retrait des messages ne sont pas activés ; aucun commentaire ne crée de droit d’accès. Le canal ne remplace pas une communication d’urgence ni une transmission au régulateur.

## Vérifications de cette tranche

- 5 tests backend dédiés / 38 assertions : confidentialité du brouillon et des notes internes, approbation, version, rôle, isolation inter-officines, rejeu et notifications partagées.
- 4 tests frontend dédiés : visibilité, contrôles en modales/formulaires et absence de création d’action ; build TypeScript/Vite.
- Le jeu de tests backend local en SQLite nécessite le pilote `pdo_sqlite`, absent de l’hôte actuel. L’exécution PostgreSQL utilise exclusivement la base dédiée `bestpharma_test`.
