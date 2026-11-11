# DIGIT ABMEB — Module 11 : Produits Approvisionnements Stocks

**Version :** 0.1 — 10 novembre 2026. **Statut :** cadrage de travail à compléter et à valider par l'équipe métier avant développement.

## 1. Objectif et sources

Gérer catalogue, commandes, réceptions, lots, inventaires et sécurité de stockage.

**Sources et contexte :** Procédures approvisionnement et gestion des stocks ; liste des activités de couverture. Les modèles et données d'OKPE OLUWA sont des sources de conception et ne sont pas des données à partager entre officines. Les paramètres non établis sont des propositions à valider. Le logiciel n'est pas un service officiel de l'ABMed.

## 2. Utilisateurs et parcours

Selon le périmètre : pharmacien titulaire, responsable qualité, personnel désigné, accompagnateur approuvé et administrateur habilité. Toute action exige une appartenance active, une permission du rôle propre à l'officine et, pour l'accompagnateur, une affectation approuvée selon le module 1. L'interface affiche uniquement les actions autorisées ; le serveur vérifie à nouveau chaque requête.

## 3. Écrans et actions

### 3.1 Catalogue

Créer produit, conditionnement, unité, identifiants et fournisseurs ; ne pas affirmer une AMM sans source officielle vérifiée.

### 3.2 Commander

Calculer suggestion selon paramètres configurables et consommation ; réviser, approuver et émettre commande ; conserver versions et origine du calcul.

### 3.3 Réceptionner

Rapprocher commande, bordereau, colis et lignes ; enregistrer quantités, lots, péremption et réserves ; cas thermosensible : température et décision ; refuser ou mettre en quarantaine les lots non conformes.

### 3.4 Mouvements et inventaires

Comptabiliser réceptions acceptées et mouvements traçables ; compter physique, comparer théorique et approuver écarts ; empêcher stock négatif sauf politique validée.

### 3.5 Péremption et rappels

Alertes configurables ; FEFO pour lots admissibles, quarantaine et retrait avec blocage de vente ; retour ou destruction avec preuve et validation.

### 3.6 Chaîne du froid

Relevés horodatés par équipement, alertes seuils configurables, incidents, mesures, décision pharmacien et suivi d'efficacité.


Sur chaque écran : recherche, filtres adaptés, pagination, détails, états vide/chargement/erreur, sauvegarde brouillon si applicable, validation serveur et historique. « Annuler » avertit si une saisie non enregistrée existe. Les décisions critiques affichent les conséquences et demandent confirmation.

## 4. Données backend et intégrations

Entités proposées : products, product_units, suppliers, purchase_orders, order_lines, receipts, receipt_lines, lots, stock_movements, stock_balances, inventories, quarantine_events, temperature_readings. Chaque objet porte ou hérite d'un identifiant d'officine ; clés étrangères, contraintes d'unicité, version pour concurrence et horodatages sont requis. Documents et preuves sont stockés en privé ; accès et exports vérifient les permissions. Les actions et documents relèvent respectivement des modules 4 et 3 : lier leurs identifiants sans dupliquer les données sources.

API à définir par ressource : liste filtrée et détail ; création brouillon ; modification contrôlée ; actions de transition dédiées ; ajout de preuve ; export autorisé. Réponses : 400 validation, 401 authentification, 403 autorisation, 404 ressource non accessible, 409 conflit de version ; journaliser décisions et modifications sans secrets. Les opérations critiques utilisent transactions et idempotence.

## 5. Règles et alertes

Les paramètres de stock de deux semaines sont propres à l'exemple fourni ; les valeurs de conservation doivent être issues des spécifications produit et procédures validées. Les alertes d'échéance et de validation sont configurables et envoyées seulement aux destinataires autorisés ; toute notification échouée reste identifiable et réessayable. Aucune information ne doit laisser croire qu'une transmission à l'ABMed a eu lieu sans intégration et accusé effectifs.

## 6. Indicateurs

Afficher nombre d'éléments par état, éléments en attente, éléments en retard et événements réalisés sur période selon les entités du module. Chaque indicateur précise période, filtre, définition, nombre de référence et date de mise à jour. Un dénominateur nul produit « non disponible », non 0 %. L'accès au détail respecte les mêmes permissions.

## 7. Vérification et critères d'acceptation

Réception partielle et idempotente ; deux ventes concurrentes ne peuvent vendre même unité ; lot en quarantaine invendable ; correction par mouvement traçable. Tester aussi : filtrage et accès direct entre deux officines ; refus après révocation de l'accompagnateur ; version de document stable ; double clic et requête rejouée sans doublon ; reprise après erreur ; journal et exports sans données non autorisées.

## 8. Points à préciser avant développement

Faire valider par les métiers les champs complets issus des documents originaux, rôles exacts, délais, grilles, états, critères de validation, modalités de signature, conservation et éventuelles obligations applicables. Le présent fichier est un cadrage initial : les dictionnaires champ par champ, maquettes détaillées, contrats d'API et règles propres à l'officine restent à compléter.

