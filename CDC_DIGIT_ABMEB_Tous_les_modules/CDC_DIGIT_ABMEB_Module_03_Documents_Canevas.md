# DIGIT ABMEB — Module 03 : Documents Canevas

**Version :** 0.1 — 10 novembre 2026. **Statut :** cadrage de travail à compléter et à valider par l'équipe métier avant développement.

## 1. Objectif et sources

Maîtrise des documents, modèles versionnés, formulaires et registres.

**Sources et contexte :** Inventaire documentaire ; procédure de gestion des informations documentées ; fiche de mise en application ; fiche de modification du SMQ ; canevas de procédure. Les modèles et données d'OKPE OLUWA sont des sources de conception et ne sont pas des données à partager entre officines. Les paramètres non établis sont des propositions à valider. Le logiciel n'est pas un service officiel de l'ABMed.

## 2. Utilisateurs et parcours

Selon le périmètre : pharmacien titulaire, responsable qualité, personnel désigné, accompagnateur approuvé et administrateur habilité. Toute action exige une appartenance active, une permission du rôle propre à l'officine et, pour l'accompagnateur, une affectation approuvée selon le module 1. L'interface affiche uniquement les actions autorisées ; le serveur vérifie à nouveau chaque requête.

## 3. Écrans et actions

### 3.1 Inventaire et recherche

Afficher type, processus, code, version, statut, auteur, date et responsable ; filtrer par processus, état et échéance ; « Ouvrir » montre les versions et leur historique.

### 3.2 Créer un document

Choisir procédure, MOP, formulaire ou enregistrement ; choisir modèle, saisir titre, processus, objectifs, champ, définitions, activités, responsables, livrables et délais ; enregistrer brouillon ou soumettre.

### 3.3 Vérifier et approuver

Le vérificateur accepte ou demande correction motivée ; l'approbateur décide sur la version soumise ; les contrôles et signatures sont enregistrés et une décision simultanée obsolète est rejetée.

### 3.4 Diffuser et attester

Choisir personnes ou rôles ; après approbation, publier une version exacte ; chaque destinataire ouvre et atteste la lecture ; afficher les destinataires et leurs états sans supposer la compréhension.

### 3.5 Modifier et retirer

Créer une nouvelle version issue de l'ancienne ; analyser objectif, conséquences, risques, moyens, actions, dates et efficacité ; publier après règles de validation ; marquer l'ancienne obsolète sans la supprimer.

### 3.6 Configurer un canevas

Définir sections, champs typés, validations, conditions, tableaux répétables, calculs et rendu ; publier une version immuable ; chaque enregistrement conserve la version d'origine.

### 3.7 Renseigner un registre

Choisir officine et modèle, compléter les champs, joindre preuves, sauvegarder brouillon puis soumettre ; générer document à partir de la version et conserver l'instantané validé.

### 3.8 Importer et exporter

Importer fichier privé et métadonnées, détecter doublons sans écraser ; export PDF ou tableur filtré selon permissions ; les modèles existants remplis servent à extraire leur structure, sans répliquer leurs données personnelles.


Sur chaque écran : recherche, filtres adaptés, pagination, détails, états vide/chargement/erreur, sauvegarde brouillon si applicable, validation serveur et historique. « Annuler » avertit si une saisie non enregistrée existe. Les décisions critiques affichent les conséquences et demandent confirmation.

## 4. Données backend et intégrations

Entités proposées : documents, document_versions, approvals, distributions, acknowledgements, template_definitions, template_versions, template_fields, form_records, form_values, attachments, change_requests, effectiveness_reviews. Chaque objet porte ou hérite d'un identifiant d'officine ; clés étrangères, contraintes d'unicité, version pour concurrence et horodatages sont requis. Documents et preuves sont stockés en privé ; accès et exports vérifient les permissions. Les actions et documents relèvent respectivement des modules 4 et 3 : lier leurs identifiants sans dupliquer les données sources.

API à définir par ressource : liste filtrée et détail ; création brouillon ; modification contrôlée ; actions de transition dédiées ; ajout de preuve ; export autorisé. Réponses : 400 validation, 401 authentification, 403 autorisation, 404 ressource non accessible, 409 conflit de version ; journaliser décisions et modifications sans secrets. Les opérations critiques utilisent transactions et idempotence.

## 5. Règles et alertes

Code de document unique selon politique de l'officine ; formulaire et enregistrement distincts ; conservation paramétrable sans suppression automatique ; les délais d'une semaine et de trois mois observés dans la fiche de modification sont configurables et à valider. Les alertes d'échéance et de validation sont configurables et envoyées seulement aux destinataires autorisés ; toute notification échouée reste identifiable et réessayable. Aucune information ne doit laisser croire qu'une transmission à l'ABMed a eu lieu sans intégration et accusé effectifs.

## 6. Indicateurs

Afficher nombre d'éléments par état, éléments en attente, éléments en retard et événements réalisés sur période selon les entités du module. Chaque indicateur précise période, filtre, définition, nombre de référence et date de mise à jour. Un dénominateur nul produit « non disponible », non 0 %. L'accès au détail respecte les mêmes permissions.

## 7. Vérification et critères d'acceptation

Diffuser une version approuvée, consulter attestations, modifier puis vérifier que les anciens enregistrements pointent encore sur l'ancien modèle ; refus d'export inter-officines. Tester aussi : filtrage et accès direct entre deux officines ; refus après révocation de l'accompagnateur ; version de document stable ; double clic et requête rejouée sans doublon ; reprise après erreur ; journal et exports sans données non autorisées.

## 8. Points à préciser avant développement

Faire valider par les métiers les champs complets issus des documents originaux, rôles exacts, délais, grilles, états, critères de validation, modalités de signature, conservation et éventuelles obligations applicables. Le présent fichier est un cadrage initial : les dictionnaires champ par champ, maquettes détaillées, contrats d'API et règles propres à l'officine restent à compléter.

