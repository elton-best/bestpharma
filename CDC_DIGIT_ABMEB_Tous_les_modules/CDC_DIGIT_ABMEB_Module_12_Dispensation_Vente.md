# DIGIT ABMEB — Module 12 : Dispensation Vente

**Version :** 0.1 — 10 novembre 2026. **Statut :** cadrage de travail à compléter et à valider par l'équipe métier avant développement.

## 1. Objectif et sources

Assurer le parcours comptoir, la dispensation et la vente en lien avec les stocks et la caisse.

**Sources et contexte :** Procédure dispensation et conseils ; liste de couverture ; caisse et stocks. Les modèles et données d'OKPE OLUWA sont des sources de conception et ne sont pas des données à partager entre officines. Les paramètres non établis sont des propositions à valider. Le logiciel n'est pas un service officiel de l'ABMed.

## 2. Utilisateurs et parcours

Selon le périmètre : pharmacien titulaire, responsable qualité, personnel désigné, accompagnateur approuvé et administrateur habilité. Toute action exige une appartenance active, une permission du rôle propre à l'officine et, pour l'accompagnateur, une affectation approuvée selon le module 1. L'interface affiche uniquement les actions autorisées ; le serveur vérifie à nouveau chaque requête.

## 3. Écrans et actions

### 3.1 Ouvrir vente

Rechercher produit, afficher prix, disponibilité par lot admissible et restrictions paramétrées ; aucune donnée patient obligatoire sans justification.

### 3.2 Ordonnance et analyse

Associer référence ou document privé si nécessaire ; pharmaciens habilités enregistrent analyse et décisions ; règles précises, substitutions et délégations à valider.

### 3.3 Préparer dispensation

Choisir quantités, contrôler lot, péremption, quarantaine et disponibilité ; conserver conseils pertinents selon politique de minimisation.

### 3.4 Valider vente

Confirmer panier et transmettre à caisse ; décrémenter stock à l'événement transactionnel convenu, de manière atomique et idempotente.

### 3.5 Retour et avoir

Demander retour avec motif et lot ; pharmacien décide de l'état du produit et éventuelle quarantaine ; avoir lié à l'opération d'origine.

### 3.6 Signalement

Enregistrer événement ou défaut de qualité et suivi ; aucune notification officielle n'est déclarée sans canal effectivement intégré et preuve d'envoi.


Sur chaque écran : recherche, filtres adaptés, pagination, détails, états vide/chargement/erreur, sauvegarde brouillon si applicable, validation serveur et historique. « Annuler » avertit si une saisie non enregistrée existe. Les décisions critiques affichent les conséquences et demandent confirmation.

## 4. Données backend et intégrations

Entités proposées : sales, sale_lines, prescription_references, pharmaceutical_reviews, dispensing_events, returns, credits, safety_reports. Chaque objet porte ou hérite d'un identifiant d'officine ; clés étrangères, contraintes d'unicité, version pour concurrence et horodatages sont requis. Documents et preuves sont stockés en privé ; accès et exports vérifient les permissions. Les actions et documents relèvent respectivement des modules 4 et 3 : lier leurs identifiants sans dupliquer les données sources.

API à définir par ressource : liste filtrée et détail ; création brouillon ; modification contrôlée ; actions de transition dédiées ; ajout de preuve ; export autorisé. Réponses : 400 validation, 401 authentification, 403 autorisation, 404 ressource non accessible, 409 conflit de version ; journaliser décisions et modifications sans secrets. Les opérations critiques utilisent transactions et idempotence.

## 5. Règles et alertes

Les autorisations professionnelles, produits surveillés et règles d'ordonnance doivent être validées avant mise en production ; une fonctionnalité ne remplace pas le jugement du pharmacien. Les alertes d'échéance et de validation sont configurables et envoyées seulement aux destinataires autorisés ; toute notification échouée reste identifiable et réessayable. Aucune information ne doit laisser croire qu'une transmission à l'ABMed a eu lieu sans intégration et accusé effectifs.

## 6. Indicateurs

Afficher nombre d'éléments par état, éléments en attente, éléments en retard et événements réalisés sur période selon les entités du module. Chaque indicateur précise période, filtre, définition, nombre de référence et date de mise à jour. Un dénominateur nul produit « non disponible », non 0 %. L'accès au détail respecte les mêmes permissions.

## 7. Vérification et critères d'acceptation

Produit expiré ou quarantaine invendable ; paiement annulé ne crée pas de vente fantôme ; retours ne réintègrent pas automatiquement un lot vendable. Tester aussi : filtrage et accès direct entre deux officines ; refus après révocation de l'accompagnateur ; version de document stable ; double clic et requête rejouée sans doublon ; reprise après erreur ; journal et exports sans données non autorisées.

## 8. Points à préciser avant développement

Faire valider par les métiers les champs complets issus des documents originaux, rôles exacts, délais, grilles, états, critères de validation, modalités de signature, conservation et éventuelles obligations applicables. Le présent fichier est un cadrage initial : les dictionnaires champ par champ, maquettes détaillées, contrats d'API et règles propres à l'officine restent à compléter.

