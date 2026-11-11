# M2 — Équipe approuvée et pilotage de mission

## Décisions utilisateur à conserver pour la suite

1. **Accès au contenu : responsable et équipe approuvés par l’officine.** Le guichet central de qualification ne donne pas un accès général au contenu opérationnel des missions.
2. **Diagnostics : référentiel configurable et versionné, sans score.** Aucun barème ni question réglementaire ne doit être inventé. Modèles serveur vides au départ, exemples fictifs exclusivement en démo.
3. **Validations officine : administrateur actif.** Il valide les plans, confirme les visites et accepte le bilan. Pas de signature juridique présumée. Clôture après bilan partagé/validé et décision motivée sur les actions ouvertes.

Les décisions 2 et 3 sont enregistrées mais leurs écrans et workflows ne sont pas encore livrés par cette tranche.

## Livré dans cette tranche

### Double approbation

- Le coordinateur actif avec MFA propose une participation à une mission acceptée, en référençant une affectation existante du M1 dans la même officine.
- Les nouvelles permissions M1 sont `accompagnement.read` et `accompagnement.write`. Elles ne donnent aucun accès Stock ni écriture Qualité. Les anciennes affectations ne reçoivent aucune permission supplémentaire automatiquement.
- Le responsable exige ces deux permissions ; l’intervenant au minimum la lecture.
- L’officine approuve d’abord l’affectation M1 et sa période, puis approuve explicitement la participation à la mission. Une proposition seule ne donne aucun accès ; l’auto-approbation est interdite.
- Un seul responsable de mission approuvé à la fois. Pour le remplacer, retirer la participation précédente puis proposer/approuver le nouveau responsable. Le changement de portée M1 reste soumis à une nouvelle approbation ; aucun écrasement d’une portée approuvée.
- À chaque requête : compte actif, officine active, éventuelle appartenance non suspendue, intervenant interne actif, affectation M1 approuvée et dans sa période, permissions effectives et participation approuvée. Retrait/expiration M1 ou retrait de participation coupe l’accès sans effacer l’historique.

### Espace de mission

Route `/dashboard/missions-accompagnement`, entrée **Missions & équipe** dans le menu Accompagnement.

- Liste paginée des missions de l’officine sélectionnée, limitée au périmètre effectivement autorisé.
- Fiche en modale : termes acceptés, période, état/version, équipe et historique partagé.
- Administrateur d’officine : lecture et décisions sur les participations, sans devenir responsable opérationnel automatiquement.
- Responsable approuvé avec contribution : démarrage (`accepted → active`), suspension (`active → suspended`) et reprise (`suspended → active`). Démarrage/reprise dans la période prévue uniquement.
- Confirmation et motif obligatoires, révision optimiste, transaction/verrou d’officine, historique ajouté sans écraser les événements antérieurs et notification outbox aux administrateurs.
- Pas de transition vers « clôturée » tant que le bilan et la décision sur les actions ouvertes ne sont pas implémentés.

### Guichet central

Les coordinateurs gardent la qualification et les termes de proposition déjà accessibles au guichet. Ils peuvent consulter les **métadonnées de coordination d’équipe** et proposer des participations, pas ouvrir l’espace opérationnel au seul titre de coordinateur. La préparation d’équipe se trouve dans le détail d’une proposition acceptée. Les futurs diagnostics, notes, comptes rendus et livrables devront utiliser `MissionAccess`, jamais le droit du guichet seul.

## API

- GET `/api/v1/support/missions` et `/{id}` : contexte officine et autorisation effective.
- POST `/api/v1/support/missions/{id}/transition` : responsable actif, action/version/motif/confirmation.
- POST `/api/v1/support/missions/{id}/team/{memberId}/decision` : administrateur, version de participation/décision/motif/confirmation.
- GET/POST `/api/v1/support/intake/{requestId}/team` : métadonnées et proposition par coordination ; aucun droit d’accès induit.

Les relations mission/affectation sont vérifiées côté serveur. Les IDs étrangers et contenus hors périmètre ne sont pas retournés. Les raisons sont des informations partagées, pas des notes internes. Le journal d’accès ne contient que référence de demande/version ; le motif métier est conservé dans l’historique de mission.

## Recette exécutée

- Migration `2026_11_10_000014_add_mission_team_and_history` appliquée localement.
- **118 tests backend / 750 assertions sur SQLite et PostgreSQL**, régression complète.
- Dont 7 tests mission : guichet sans accès implicite, double approbation, transitions et versions, administrateur/intervenant non responsables, expiration/suspension/révocation et isolation inter-officines.
- **112 tests frontend / 23 fichiers**, build réussi. Tests modales de démarrage et d’approbation, absence de droits implicites, conservation du formulaire sur conflit et refus d’accès sans démo de secours.
- Pas de parcours Chromium de la nouvelle double approbation exécuté dans cette tranche. Les résultats Chromium précédents du Stock ou des demandes M2 ne remplacent pas cette recette.

## Pour essayer dans l’aperçu connecté (3001)

1. Coordination : proposer en M1 une affectation avec permissions Accompagnement et période couvrant la mission.
2. Administrateur de l’officine : approuver cette portée dans Accompagnateurs.
3. Coordination : guichet M2, demande avec mission acceptée, **Préparer l’équipe de mission**, proposer l’affectation comme responsable/intervenant.
4. Administrateur : **Missions & équipe**, ouvrir la mission, approuver la participation.
5. Intervenant : sélectionner l’officine, **Missions & équipe**. Le responsable peut démarrer si la période prévue a commencé.

## État de complétude — ne pas déclarer le M2 terminé

| Partie CDC | État connecté |
|---|---|
| Demandes, soumission et retrait | Livré ; conversation de précisions encore à traiter |
| Qualification centrale | Livrée |
| Proposition et accord de mission | Livrés ; révision/reproposition après refus encore à traiter |
| Équipe / portée M1 / contrôle des accès | Livrés dans cette tranche |
| Démarrage, suspension, reprise | Livrés dans cette tranche |
| Modèles et diagnostics versionnés / constats | À implémenter selon la décision validée, sans grille inventée |
| Plan et liens d’actions | À implémenter ; intégration M4 sans copie métier indépendante |
| Visites, reports et comptes rendus versionnés | À implémenter |
| Livrables, preuves privées et échanges | À implémenter ; intégration M3 et filtrage des notes internes requis |
| Bilan, validation officine et clôture | À implémenter ; interdiction de solder artificiellement les actions ouvertes |
| Statistiques, export filtré et notifications complètes | Partiels ; recette de bout en bout encore nécessaire |

Les écrans de démonstration correspondants ne constituent pas une implémentation serveur de ces dernières parties. La clôture technique de l’ensemble du module exige de couvrir ces lignes et la recette du CDC, pas seulement un build vert.


## Suite livrée : visites et comptes rendus

Le cœur du planning, des confirmations/report/annulation et des comptes rendus versionnés est maintenant connecté. Voir [périmètre, limites et recette](CDC_02_VISITES_COMPTES_RENDUS.md). La ligne « visites » du tableau historique ci-dessus est donc partiellement levée ; les autres réserves restent ouvertes.

Les plans d’accompagnement sont disponibles dans une première tranche : [périmètre et limites M4](CDC_02_PLANS_ACTIONS.md). Les plans approuvés peuvent être intégrés de façon idempotente au registre unique des actions M4 ; l’exécution reste dans M4.
