# M2 — Proposition et accord de mission

## Périmètre livré

Suite aux décisions validées pour le guichet central et l’accord de l’officine :

1. Le coordinateur BEG avec MFA ouvre une demande soumise et qualifiée « Prête pour une proposition ».
2. Il transmet une proposition en modale : intitulé, périmètre, début et fin. La période doit commencer au plus tôt le jour de la proposition et finir après ou le même jour que le début.
3. Un administrateur actif de l’officine consulte les mêmes termes dans le détail de sa demande.
4. Il accepte ou refuse dans une modale distincte, avec case de confirmation obligatoire. Le refus exige un motif non vide.

L’accord enregistre une mission **acceptée**, pas une intervention réalisée, un contrat signé, ni une certification. Aucune affectation, permission, visite ou donnée clinique n’est créée par cette décision. Le démarrage opérationnel, l’équipe, le planning et les livrables restent à implémenter.

## Contraintes de cette première version

- Une proposition immuable par demande. La révision ou la nouvelle proposition après refus n’est pas encore disponible ; aucun écrasement silencieux des termes acceptés.
- La qualification est figée une fois la proposition transmise.
- Une demande retirée annule atomiquement sa proposition en attente. Une mission déjà acceptée nécessite un parcours distinct de clôture, non encore livré : le retrait de la demande est alors refusé.
- Une proposition dont la fin est passée ne peut plus être acceptée.
- Les versions périmées et les doubles décisions sont refusées (409), sans doubler audit ou notification.
- Les mutations verrouillent l’officine puis la demande puis la mission. Suspension et isolation inter-officines sont contrôlées côté serveur.
- Un rôle coordinateur seul ne peut pas décider pour l’officine : une appartenance administrateur active est requise sur cette officine. Les droits ne reposent pas sur la visibilité des boutons.
- L’audit contient l’identifiant de demande et la version, sans périmètre ni motif métier. Les notifications passent par l’outbox ; leur préparation ne signifie pas livraison SMTP.

## API et interface

- POST `/api/v1/support/intake/{requestId}/propose-mission` : coordinateur MFA, version de la demande, titre/périmètre/période.
- POST `/api/v1/support/requests/{requestId}/mission-decision` : administrateur de l’officine, version de proposition, décision, confirmation et motif en cas de refus.
- Les listes existantes renvoient la proposition rattachée, dans leur périmètre d’autorisation habituel.
- Guichet BEG : `/beg/demandes-accompagnement`, ouvrir une demande qualifiée puis « Proposer une mission ».
- Officine : `/dashboard/accompagnement`, ouvrir la demande puis accepter/refuser. Le frontend démo n’est pas remplacé par ce parcours API.

## Recette exécutée

- Migration `2026_11_10_000012_create_support_missions` appliquée localement.
- Backend complet : **102 tests / 608 assertions réussis sur SQLite, puis PostgreSQL**.
- Frontend : **88 tests / 20 fichiers**, build TypeScript/Vite réussi.
- Tests dédiés : période invalide, version périmée, proposition dupliquée, rôle coordinateur sans administration d’officine, confirmation obligatoire, acceptation/rejeu, refus motivé, retrait annulant la proposition, absence d’octroi d’accès, affichage en modales et conservation du formulaire sur conflit.
- Aucun parcours Chromium de cette nouvelle tranche n’a encore été exécuté. Docker/Redis/SMTP réels et la validation de production restent distincts.

La configuration PHP locale de développement désactive le cache opcode CLI persistant afin que les tests et la preview exécutent les fichiers à jour. Cette configuration runtime est hors Git.


## Suite livrée

L’équipe approuvée et les transitions démarrer/suspendre/reprendre sont désormais connectées : [périmètre et recette](CDC_02_EQUIPE_ET_PILOTAGE.md). Les autres réserves (diagnostics, interventions, livrables et clôture) restent ouvertes.
