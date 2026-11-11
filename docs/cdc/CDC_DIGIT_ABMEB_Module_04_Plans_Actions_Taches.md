# DIGIT ABMEB — Module 04 : Plans Actions Taches

**Version :** 0.1 — 10 novembre 2026. **Statut :** cadrage de travail à compléter et à valider par l'équipe métier avant développement.

## 1. Objectif et sources

Piloter les actions issues des constats, des risques, des réclamations et des missions.

**Sources et contexte :** Tableau de suivi des améliorations du SMQ et plan d'actions du SMQ. Les modèles et données d'OKPE OLUWA sont des sources de conception et ne sont pas des données à partager entre officines. Les paramètres non établis sont des propositions à valider. Le logiciel n'est pas un service officiel de l'ABMed.

## 2. Utilisateurs et parcours

Selon le périmètre : pharmacien titulaire, responsable qualité, personnel désigné, accompagnateur approuvé et administrateur habilité. Toute action exige une appartenance active, une permission du rôle propre à l'officine et, pour l'accompagnateur, une affectation approuvée selon le module 1. L'interface affiche uniquement les actions autorisées ; le serveur vérifie à nouveau chaque requête.

## 3. Écrans et actions

### 3.1 Créer un plan

Saisir objectif, officine, période, source, responsable et statut ; enregistrer brouillon ou soumettre à validation.

### 3.2 Créer une action

Saisir description, source, responsable, échéance, priorité, ressources, preuve attendue et critère d'efficacité ; vérifier que la source appartient à la même officine.

### 3.3 Exécuter

Le responsable ajoute commentaire et preuve puis marque réalisée ; le vérificateur accepte ou demande une reprise ; la réalisation ne vaut pas efficacité.

### 3.4 Vérifier et clôturer

Planifier et consigner la mesure d'efficacité ; si inefficace, rouvrir ou créer action complémentaire ; clôturer avec date et décision ; conserver historique.

### 3.5 Reporter et visualiser

Report motivé avec ancien et nouveau délai ; filtrer par responsable, origine, échéance et statut ; retard calculé, non statut permanent.


Sur chaque écran : recherche, filtres adaptés, pagination, détails, états vide/chargement/erreur, sauvegarde brouillon si applicable, validation serveur et historique. « Annuler » avertit si une saisie non enregistrée existe. Les décisions critiques affichent les conséquences et demandent confirmation.

## 4. Données backend et intégrations

Entités proposées : action_plans, plan_versions, actions, action_sources, assignments, evidence, effectiveness_reviews, state_events. Chaque objet porte ou hérite d'un identifiant d'officine ; clés étrangères, contraintes d'unicité, version pour concurrence et horodatages sont requis. Documents et preuves sont stockés en privé ; accès et exports vérifient les permissions. Les actions et documents relèvent respectivement des modules 4 et 3 : lier leurs identifiants sans dupliquer les données sources.

API à définir par ressource : liste filtrée et détail ; création brouillon ; modification contrôlée ; actions de transition dédiées ; ajout de preuve ; export autorisé. Réponses : 400 validation, 401 authentification, 403 autorisation, 404 ressource non accessible, 409 conflit de version ; journaliser décisions et modifications sans secrets. Les opérations critiques utilisent transactions et idempotence.

## 5. Règles et alertes

Une seule action source de vérité peut être reliée à plusieurs constats d'une même officine ; droits vérifiés et notifications dédupliquées. Les alertes d'échéance et de validation sont configurables et envoyées seulement aux destinataires autorisés ; toute notification échouée reste identifiable et réessayable. Aucune information ne doit laisser croire qu'une transmission à l'ABMed a eu lieu sans intégration et accusé effectifs.

## 6. Indicateurs

Afficher nombre d'éléments par état, éléments en attente, éléments en retard et événements réalisés sur période selon les entités du module. Chaque indicateur précise période, filtre, définition, nombre de référence et date de mise à jour. Un dénominateur nul produit « non disponible », non 0 %. L'accès au détail respecte les mêmes permissions.

## 7. Vérification et critères d'acceptation

Une action achevée sans preuve ou vérification requise ne peut être clôturée ; changer l'échéance conserve l'ancien délai. Tester aussi : filtrage et accès direct entre deux officines ; refus après révocation de l'accompagnateur ; version de document stable ; double clic et requête rejouée sans doublon ; reprise après erreur ; journal et exports sans données non autorisées.

## 8. Points à préciser avant développement

Faire valider par les métiers les champs complets issus des documents originaux, rôles exacts, délais, grilles, états, critères de validation, modalités de signature, conservation et éventuelles obligations applicables. Le présent fichier est un cadrage initial : les dictionnaires champ par champ, maquettes détaillées, contrats d'API et règles propres à l'officine restent à compléter.

