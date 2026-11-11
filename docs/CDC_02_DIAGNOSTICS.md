# M2 — Diagnostics configurables et versionnés

## Décision métier appliquée

Le référentiel est **configurable et sans score**, vide au départ. Aucune question, obligation, pondération ou grille réglementaire n’est inventée. Les modèles de cette tranche appartiennent à une mission ; il n’existe pas encore de catalogue global BEG.

## Parcours livré

Dans l’aperçu connecté : **Accompagnement → Missions & équipe → Voir la mission → Diagnostics & modèles**.

### Modèle

Le responsable approuvé, actif et disposant des permissions Accompagnement peut :

1. Créer un brouillon de modèle avec titre et questions propres au métier.
2. Définir pour chaque question une clé stable, un libellé, une indication obligatoire/facultative, une source libre (référence/version/date de vérification) et les réponses autorisées parmi « Conforme (déclaré) », « Écart observé », « Non applicable », « Non évalué ».
3. Sauvegarder le brouillon ; un modèle vide ne peut pas être publié.
4. Publier explicitement : la version devient immuable.
5. Préparer une nouvelle révision d’un modèle publié, sans écraser les versions précédentes.

La présence d’un texte dans « source » ne prouve pas sa vérification juridique. La publication reste une décision humaine de configuration, pas une validation officielle.

### Diagnostic

- Créer un diagnostic initial ou de suivi à partir d’un **modèle publié de la même mission**, avec date d’évaluation non future.
- Le diagnostic conserve un instantané figé du titre, de la famille, de la révision et des questions du modèle.
- Saisir un brouillon incomplet. Les réponses étrangères au modèle ou non autorisées sont refusées.
- « Non applicable » exige une justification non vide, y compris au stade du brouillon ; « Non évalué » reste une réponse distincte et n’est jamais converti en « Conforme ».
- Soumettre vérifie les réponses obligatoires puis fige la version, **sans la partager**.
- Partager explicitement rend la version visible à l’officine et prépare une notification générique via l’outbox.
- Une correction d’un diagnostic partagé crée une nouvelle révision, avec le même modèle et le même type ; elle reprend les réponses précédentes sans modifier la version partagée. La chaîne précédente reste conservée.

Toutes les créations, saisies, consultations et décisions utilisent des modales. Après enregistrement, l’éditeur reste occupé jusqu’au rechargement des versions serveur pour éviter une soumission trop rapide avec une ancienne version. Les conflits sont affichés sans publier ni fermer silencieusement le formulaire.

## Autorisations et confidentialité

- Authentification, officine active, compte actif et contrôle de `MissionAccess` à chaque requête.
- Préparation/publication : responsable de mission, affectation M1 et participation approuvées et actives, permissions lecture/contribution, mission active.
- L’administrateur officine ne devient pas responsable de diagnostic automatiquement.
- Office et autres lecteurs autorisés : modèles publiés et diagnostics **partagés uniquement**. Les réponses brouillon/soumises ne figurent pas dans leur liste.
- Les métadonnées de préparation et soumission sont exclues du journal d’officine des autres auteurs et de son export ; pas de texte de question/réponse dans le journal d’accès.
- Le coordinateur central seul n’accède pas à ce contenu opérationnel.
- Aucun champ dédié aux notes internes : tous les commentaires d’un diagnostic sont destinés à être partagés au moment de sa publication. Ne pas y saisir une note confidentielle interne.
- Relations parent/modèle/diagnostic contrôlées dans la même mission ; IDs étrangers refusés, révocation M1 appliquée immédiatement aux requêtes suivantes.
- Transactions et verrou d’officine, contraintes d’unicité, contrôles de version et clés de création contre les doublons.

## API et stockage

Migration `2026_11_10_000017_create_mission_diagnostics` appliquée localement et dans les suites : `support_diagnostic_templates`, `support_diagnostics`.

Sous `/api/v1/support/missions/{missionId}/diagnostics` :

- GET : modèles et diagnostics filtrés selon les droits.
- POST `/templates` : création du brouillon de modèle ou nouvelle révision, avec clé de création et confirmation.
- PATCH `/templates/{templateId}` : modifier un brouillon à la bonne version.
- POST `/templates/{templateId}/publish` : publication explicite et gel.
- POST : créer un diagnostic ou sa révision avec modèle publié, date, type et clé de création.
- PATCH `/{diagnosticId}` : réponses d’un brouillon, avec version.
- POST `/{diagnosticId}/decision` : soumettre/partager avec version et confirmation.

Aucun endpoint ne supprime un modèle publié ou une version partagée. Les contenus métier restent dans le stockage de mission ; notifications et audit n’en copient pas le texte.

## Recette exécutée

- **134 tests backend / 874 assertions sur SQLite puis PostgreSQL**, régression complète.
- Dont **8 tests diagnostics / 63 assertions** : absence de grille par défaut, confidentialité des brouillons/journal, règles de publication, modèles figés, instantanés, réponses obligatoires, justification, choix autorisés, versions, rejeu, révocation et isolation entre officines.
- **121 tests frontend / 25 fichiers**, build TypeScript/Vite réussi. Création vide, questions en modale, justification conditionnelle, publication distincte, lecture seule côté officine, erreur de version et attente du rechargement avant fermeture.
- **Chromium local réussi** : MFA, création/publication d’un modèle fictif, diagnostic, réponse non applicable justifiée, sauvegarde, soumission/partage distincts, rechargement et conservation de la version figée ; zéro erreur JavaScript.
- Compte jetable désactivé, jetons révoqués et officine de recette archivée après le scénario ; pas de purge des preuves métier.

Le helper local `create --office --mission` prépare une mission active et une double affectation de fixture pour isoler le test diagnostic. Cette préparation directe n’est ni une route HTTP ni une nouvelle procédure d’approbation utilisable en production. Le scénario ne prétend donc pas retester le parcours complet d’approbation d’équipe.

## Limites restant à traiter

- Référentiel global, sections/consignes, types de réponses supplémentaires, conditions et preuves attendues structurées.
- Preuves/fichiers privés via le module documentaire, constats structurés et liens d’action M4.
- Circuit de revue avec demande de correction avant partage. Dans cette tranche, une version soumise est figée ; la révision est ouverte après partage, pas par écrasement.
- Provenance détaillée par réponse, comparaison initial/suivi et signalement explicite des questions modifiées. **Aucune comparaison automatique n’est affichée**, donc aucune équivalence entre grilles différentes n’est supposée.
- Pas de score, export de diagnostic, certification ou validation pharmaceutique officielle.

Le M2 complet reste ouvert : plans, constats, livrables/preuves, échanges, bilan et clôture, ainsi que les compléments de planning documentés dans la tranche précédente.
