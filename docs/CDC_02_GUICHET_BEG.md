# M2 — Guichet central BEG

## Décisions validées par l’utilisateur

- Les coordinateurs BEG actifs, avec MFA, peuvent lire et qualifier les demandes soumises de toutes les officines. Le rôle plateforme seul ne suffit pas.
- Une mission ne peut démarrer qu’après accord explicite d’un administrateur de l’officine. L’autorisation d’accès aux autres données reste une approbation distincte.

Ces décisions remplacent la réserve précédente sur le périmètre de qualification uniquement. Elles n’accordent aucun accès aux brouillons ni aux autres contenus métier.

## Implémentation de cette tranche

- Page `/beg/demandes-accompagnement`, lien « Guichet accompagnement » dans la navigation des coordinateurs connectés.
- API GET `/api/v1/support/intake` : liste paginée/recherche, uniquement demandes soumises d’officines actives. Ni demandes retirées, ni brouillons, ni officines suspendues. Pas de dépendance à l’officine sélectionnée dans le frontend.
- Consultation en modale, puis qualification confirmée dans une seconde modale avec note obligatoire partagée avec l’officine.
- Résultats : prête pour une proposition, informations complémentaires nécessaires, non retenue à ce stade. Ce sont des annotations ; la demande demeure soumise et aucune mission n’est créée.
- POST `/api/v1/support/intake/{id}/qualify` : contrôle rôle/MFA, version et état, verrouillage transactionnel de l’officine puis de la demande, audit sans note métier. Les versions périmées sont refusées.
- La qualification et sa note apparaissent dans le détail de la demande côté officine.
- Aucune affectation ni autorisation d’accès créée. Proposition de mission et acceptation explicite restent à implémenter.

## Validation et limite de recette

Frontend : **85 tests dans 19 fichiers passent**, build TypeScript/Vite réussi, dont tests de consultation/confirmation en modales et refus d’accès au guichet.

Deux scénarios backend ont été ajoutés dans `SupportRequestsTest` : rôle/MFA, confidentialité des brouillons, absence de doublon sur version périmée, audit, retrait et suspension.

### Environnement rétabli et recette serveur

PHP 8.4.27 et les dépendances Composer verrouillées ont été restaurés hors Git. PostgreSQL 16.15 est relancé ; les migrations, dont la qualification, et le seed fictif ont été appliqués à la base locale.

**Régression complète exécutée après restauration : 99 tests / 576 assertions réussis sur SQLite puis PostgreSQL.** La réserve précédente « backend non exécuté » est donc levée. Le parcours Chromium du nouveau guichet n’a pas encore été rejoué ; les tests frontend restent à 85 réussis et le build validé.

Aperçus : port 3000 démonstration ; port 3001 application API avec proxy relatif vers Laravel port 8000. Les services de cette recette sont natifs (Docker non exécuté). Pour cette preview, sessions/cache utilisent des fichiers et l’outbox la file database ; Redis et le worker de livraison ne sont pas relancés. Une notification préparée n’est pas une notification délivrée. Les comptes privilégiés fictifs doivent configurer leur MFA à la connexion.

La proposition de mission et son acceptation explicite restent la tranche suivante ; aucune mission n’est démarrée par la qualification.

## Extension suivante livrée

La [proposition et l’accord explicite de mission](CDC_02_PROPOSITIONS_MISSIONS.md) sont désormais implémentés et testés. La réserve précédente sur cette tranche est levée uniquement pour ce périmètre ; l’équipe, le démarrage opérationnel et les interventions restent à traiter.
