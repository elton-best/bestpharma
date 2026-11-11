# M2 — Constats issus des diagnostics : première tranche

## Connecté à Laravel

Entrée : Missions & équipe → Voir la mission → Constats du diagnostic.

Le responsable approuvé, doté d’un accès M1 actif et des permissions de contribution, peut créer un constat depuis une question d’un diagnostic soumis ou partagé de la même mission. Le diagnostic brouillon est refusé : l’origine doit être figée. La création conserve un instantané du modèle, de sa révision, de la question, de la réponse et du commentaire d’origine.

Formulaire en modale : titre, fait observé, catégorie proposée, cause présumée distincte du fait, recommandation et date d’observation non future. Catégories : point fort, point à améliorer, écart, non-conformité potentielle à qualifier. Aucune conversion réglementaire, action ou qualification automatique.

Le brouillon est modifiable avec contrôle de version. Son partage est explicite et le fige. Le diagnostic source doit déjà être partagé : le constat ne permet pas de divulguer indirectement une réponse encore privée. Les autres lecteurs autorisés ne reçoivent que les constats partagés ; l’officine ne peut pas éditer ou partager en se substituant au responsable.

Transactions, verrou d’officine, contrôle du périmètre de mission et de l’affectation à chaque requête, unicité des clés de création et empreinte de contenu contre les doubles créations. Les métadonnées de brouillon sont exclues du journal d’officine et de son export pour les autres auteurs. Le journal partagé ne contient pas le fait ou les commentaires.

Migration : `2026_11_10_000018_create_mission_findings`, appliquée localement.

API sous `/api/v1/support/missions/{id}/findings` : GET, POST ; PATCH `/{findingId}` ; POST `/{findingId}/share`. Lecture sans cache. Aucun endpoint de suppression ou modification d’un constat partagé.

## Vérification

- Régression backend complète : **138 tests / 927 assertions sur SQLite et PostgreSQL**.
- Dont 4 tests constats / 53 assertions : confidentialité, journal, diagnostic figé/partagé, versions, partage immuable, instantané, rejouabilité, validation, révocation et isolation entre officines.
- Frontend : **124 tests / 26 fichiers**, build TypeScript/Vite réussi. Formulaire en modale, source explicite, séparation fait/hypothèse, lecture seule et refus de partage sans fermeture optimiste.
- **Recette Chromium des constats non validée** : plusieurs essais du parcours complet ont bloqué dans le formulaire (interactions/attentes), malgré les tests unitaires réussis. Ne pas présenter cette tranche comme acceptée de bout en bout. Les fixtures de ces essais ont été désactivées et leurs officines archivées.
- Le test navigateur a aussi révélé un conteneur HTML `template` inerte sur la liste connectée après le raccourci démo ; il est remplacé par un `div`. L’ouverture de mission connectée et le parcours diagnostic ont ensuite été franchis avant le blocage du formulaire constat.

## Limites et suite

- Cette première tranche n’ajoute pas encore la simulation locale des constats au dashboard démo ; le panneau ci-dessus est dans la version connectée.
- Preuves privées M3, provenance détaillée, corrections versionnées des constats partagés, priorité configurable, recherche/pagination et notification dédiée restent ouverts.
- L’intégration M4 est explicitement indisponible dans l’interface et l’API ; aucune action indépendante n’est créée. Le plan devra conserver des références M4, pas des copies.
- Pas de qualification M6, suppression ou présomption de conformité.
- Plans et approbation officine, bilan partagé et accepté, disposition motivée des actions ouvertes et clôture restent à réaliser. Le module 2 complet n’est pas terminé.
