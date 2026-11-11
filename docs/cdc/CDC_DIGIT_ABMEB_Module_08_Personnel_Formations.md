# DIGIT ABMEB — Module 08 : Personnel Formations

**Version :** 0.1 — 10 novembre 2026. **Statut :** cadrage de travail à compléter et à valider par l'équipe métier avant développement.

## 1. Objectif et sources

Gérer dossiers, postes, plannings, congés, formations et évaluations.

**Sources et contexte :** Procédure RH ; fiches de poste ; demande d'absence ; congés et plan de formation ; évaluations cadre et non-cadre. Les modèles et données d'OKPE OLUWA sont des sources de conception et ne sont pas des données à partager entre officines. Les paramètres non établis sont des propositions à valider. Le logiciel n'est pas un service officiel de l'ABMed.

## 2. Utilisateurs et parcours

Selon le périmètre : pharmacien titulaire, responsable qualité, personnel désigné, accompagnateur approuvé et administrateur habilité. Toute action exige une appartenance active, une permission du rôle propre à l'officine et, pour l'accompagnateur, une affectation approuvée selon le module 1. L'interface affiche uniquement les actions autorisées ; le serveur vérifie à nouveau chaque requête.

## 3. Écrans et actions

### 3.1 Dossier et poste

Créer fiche du salarié et rattachement facultatif à un compte ; enregistrer poste, dates et pièces confidentielles ; accès RH limité.

### 3.2 Absences et congés

Demandeur saisit période et motif, responsable approuve ou refuse ; calculer jours selon calendrier paramétré et journal de droits ; garder prévision et réalisé distincts.

### 3.3 Planning et gardes

Créer période, créneaux, affectations et remplacements ; signaler conflits et notifier après publication.

### 3.4 Formation

Planifier thème, cible, formateur, calendrier ; créer session, présence, preuves et évaluation ; distinguer prévu, réalisé et absent.

### 3.5 Évaluation

Choisir grille cadre ou non-cadre versionnée, période, évalué et évaluateur ; saisir critères, scores et justifications ; restreindre l'accès.


Sur chaque écran : recherche, filtres adaptés, pagination, détails, états vide/chargement/erreur, sauvegarde brouillon si applicable, validation serveur et historique. « Annuler » avertit si une saisie non enregistrée existe. Les décisions critiques affichent les conséquences et demandent confirmation.

## 4. Données backend et intégrations

Entités proposées : employees, employment_records, job_descriptions, shifts, leave_requests, leave_balances, training_plans, sessions, attendance, performance_reviews. Chaque objet porte ou hérite d'un identifiant d'officine ; clés étrangères, contraintes d'unicité, version pour concurrence et horodatages sont requis. Documents et preuves sont stockés en privé ; accès et exports vérifient les permissions. Les actions et documents relèvent respectivement des modules 4 et 3 : lier leurs identifiants sans dupliquer les données sources.

API à définir par ressource : liste filtrée et détail ; création brouillon ; modification contrôlée ; actions de transition dédiées ; ajout de preuve ; export autorisé. Réponses : 400 validation, 401 authentification, 403 autorisation, 404 ressource non accessible, 409 conflit de version ; journaliser décisions et modifications sans secrets. Les opérations critiques utilisent transactions et idempotence.

## 5. Règles et alertes

Jours restants = droits ajustés − jours pris selon règles à valider ; les règles sociales ne sont pas déduites des exemples. Les alertes d'échéance et de validation sont configurables et envoyées seulement aux destinataires autorisés ; toute notification échouée reste identifiable et réessayable. Aucune information ne doit laisser croire qu'une transmission à l'ABMed a eu lieu sans intégration et accusé effectifs.

## 6. Indicateurs

Afficher nombre d'éléments par état, éléments en attente, éléments en retard et événements réalisés sur période selon les entités du module. Chaque indicateur précise période, filtre, définition, nombre de référence et date de mise à jour. Un dénominateur nul produit « non disponible », non 0 %. L'accès au détail respecte les mêmes permissions.

## 7. Vérification et critères d'acceptation

Une absence refusée ne réduit pas les droits ; personnel non autorisé ne peut lire les évaluations. Tester aussi : filtrage et accès direct entre deux officines ; refus après révocation de l'accompagnateur ; version de document stable ; double clic et requête rejouée sans doublon ; reprise après erreur ; journal et exports sans données non autorisées.

## 8. Points à préciser avant développement

Faire valider par les métiers les champs complets issus des documents originaux, rôles exacts, délais, grilles, états, critères de validation, modalités de signature, conservation et éventuelles obligations applicables. Le présent fichier est un cadrage initial : les dictionnaires champ par champ, maquettes détaillées, contrats d'API et règles propres à l'officine restent à compléter.

