# Module 02 — Première tranche connectée

État au 10 novembre 2026. Le CDC M2 v1.0 est une proposition : ce document décrit uniquement le périmètre effectivement implémenté, pas une validation de toutes ses règles métier.

## Livré

Dans le frontend **mode API**, le portefeuille d’accompagnement est connecté à Laravel pour les administrateurs actifs de l’officine sélectionnée :

- Liste, recherche, filtre de statut et pagination des demandes de cette officine.
- Création et modification d’un brouillon via modale, sans soumission implicite.
- Brouillons privés à leur auteur ; les événements de création/modification ne sont pas visibles dans le journal d’un autre administrateur d’officine.
- Soumission avec confirmation et champs obligatoires (intitulé, description, contact).
- Retrait motivé via modale de confirmation, sans suppression de la demande.
- Contrôle des versions pour refuser une modification périmée, création par clé de rejeu et soumission rejouable sans doubler notification/événement.
- Audit des transitions sans texte métier ; notifications via l’outbox existante. Aucun engagement de délai dérivé de l’urgence déclarée.

Routes authentifiées sous `/api/v1/support/requests` : GET/POST, PATCH `/{id}`, POST `/{id}/submit`, POST `/{id}/withdraw`.

Les droits d’administration d’officine et le MFA privilégié sont contrôlés côté serveur. Un rôle plateforme ou coordinateur n’accorde pas d’accès implicite à ces demandes. Les demandes soumises ou retirées sont visibles aux administrateurs de leur officine. La démo reste séparée ; une erreur API n’est pas remplacée par des données fictives.

## Vérifications exécutées

- Backend complet : **96 tests, 539 assertions** sur SQLite, puis PostgreSQL.
- Dont tests M2 : confidentialité inter-officines et des brouillons, rôles, MFA/suspension, filtres, validation, versions, rejeu, conservation et audit.
- Frontend complet : **80 tests dans 17 fichiers**, build réussi.
- Chromium réel : MFA et export M1, brouillon persistant après rechargement, soumission confirmée, retrait motivé conservé après rechargement ; zéro erreur JavaScript.
- Migration appliquée localement et exécutée par les suites de tests sur les deux moteurs.

Reproduction navigateur : `scripts/browser/README.md`, commande `npm run test:support` avec une fixture neuve `create --office`. Les suites isolent leurs bases et utilisent des données fictives.

## Suite du M2 — non livrée dans cette tranche

Qualification, affectation/acceptation des missions, accès des équipes approuvées, diagnostic, visites, livrables, pièces jointes, délégation de demandes et intégration M3/M4 restent à traiter. Les écrans de démonstration correspondants ne constituent pas des fonctions backend terminées.

Avant la qualification : valider qui peut lire et qualifier les demandes, à quel moment et avec quel périmètre ; préciser les statuts et transitions, les règles d’affectation/acceptation et les éventuels engagements de délai. Ne pas transformer les propositions du CDC en autorisations automatiques ni en scores réglementaires.

Les réserves de production M1 demeurent : SMTP/Google réels, déploiement/TLS, sauvegardes et restauration, supervision, exécution Docker/CI et décisions juridiques/récupération MFA. L’archive historique Module01 publiée n’inclut pas cette tranche ni les dernières décisions M1.

## Ajout — tableau de bord connecté

L’entrée « Mon accompagnement » affiche désormais les demandes connectées en mode API, avec trois compteurs calculés côté serveur : mes brouillons privés, demandes soumises et demandes retirées de l’officine sélectionnée. Les compteurs portent sur toutes les demandes visibles, indépendamment de la pagination et des filtres. Chaque carte permet de filtrer la liste ; création, consultation et décisions restent en modales. Aucun compteur de missions fictif n’est injecté dans cette vue.

Le résumé utilise exactement le même périmètre de visibilité que la liste et n’est pas retourné sans autorisation. Une erreur de chargement efface le résumé affiché. La démo conserve son tableau de bord distinct.

Validation de cet ajout : **8 tests M2 / 52 assertions** sur SQLite puis PostgreSQL ; **83 tests frontend / 18 fichiers**, build réussi. Ces résultats ciblés ne remplacent pas le bilan de régression complète précédent. Deux tests supplémentaires couvrent l’entrée principale API/démo ; le test dashboard vérifie les compteurs serveur et le filtrage depuis les cartes.

## Suite : guichet central

Le périmètre de lecture/qualification a depuis été validé par l’utilisateur. Voir [décisions, implémentation et limites de recette du guichet BEG](CDC_02_GUICHET_BEG.md). Cette extension ne démarre aucune mission et ne vaut pas autorisation d’accès aux autres données métier.
