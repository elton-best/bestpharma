# DIGIT ABMEB — Cahier des charges du module 01

## Officines, inscriptions, utilisateurs, rôles et accès

**Version :** 1.1 — 10 novembre 2026  
**Public :** équipe métier, conception, développement et recette  
**Statut :** décisions du commanditaire intégrées ; choix signalés « à valider » encore ouverts.

## 1. Objectif et limites

DIGIT ABMEB est un SaaS de gestion et d'accompagnement des officines. Ce module établit l'inscription autonome d'une officine, la validation de sa demande par l'administration du SaaS, son espace isolé, l'accès de son équipe et l'accès approuvé des accompagnateurs de l'entreprise exploitante. Il fournit un socle commun aux autres modules.

L'ABMed est l'autorité de régulation et de contrôle ; l'entreprise exploitant ce SaaS est distincte de l'ABMed. L'approbation d'un compte SaaS ne constitue ni une licence pharmaceutique ni une validation réglementaire. Aucun accès officiel de l'ABMed n'est présumé.

Inclus : inscription, instruction et décision, authentification, profil d'officine, invitations, rôles personnalisés, affectation d'accompagnateurs avec approbation, notifications et traçabilité. Exclus : détail des missions d'accompagnement, abonnements et paiements, dossier RH, gestion documentaire, stocks et caisse. Le module prévoit leurs points d'intégration sans les implémenter ici.

## 2. Décisions confirmées et choix ouverts

| Sujet | Décision |
|---|---|
| Création | L'officine s'inscrit elle-même ; l'administration examine et valide sa demande avant accès actif. |
| Accompagnateurs | Chaque affectation d'accompagnateur nécessite l'approbation de l'officine. |
| Rôles | Chaque officine peut créer et gérer ses propres rôles. |
| Connexion | Email et Google, avec architecture extensible à d'autres fournisseurs. Google est identifié ; les autres fournisseurs et leur disponibilité restent à définir. |
| Attribution | Plusieurs administrateurs sont possibles. À l'ajout d'un membre, une fenêtre affiche les rôles avec des cases à cocher. |
| Documents d'identification | Liste et caractère obligatoire non décidés : ne pas inventer d'exigences réglementaires. |

Propositions opérationnelles à valider : validité des invitations 7 jours ; délai d'expiration des demandes d'accompagnement 14 jours ; administrateur initial désigné par le demandeur ; permissions multiples combinées par union, sous réserve des limites de périmètre et permissions réservées. Toutes ces durées sont configurables.

## 3. Acteurs et séparation des responsabilités

| Acteur | Périmètre | Actions principales |
|---|---|---|
| Demandeur d'une officine | Sa demande | Créer, compléter, soumettre et suivre le dossier ; répondre à une demande de correction. |
| Administrateur SaaS | Demandes et exploitation | Instruire, demander des corrections, approuver ou refuser ; administrer la plateforme dans le périmètre accordé. |
| Coordinateur | Accompagnements autorisés | Proposer un accompagnateur, suivre les demandes et mettre fin à une affectation. |
| Accompagnateur | Officines et permissions approuvées | Accéder aux seules données couvertes par l'affectation active. |
| Pharmacien titulaire / administrateur officine | Son officine | Gérer les informations, rôles et accès ; approuver ou refuser chaque accompagnateur. |
| Membre de l'officine | Officine et rôles attribués | Utiliser les fonctions autorisées, gérer son profil. |

Une fonction métier, un poste RH et un rôle applicatif sont distincts. Une personne peut cumuler plusieurs rôles et appartenir à plusieurs officines. L'administration SaaS n'a pas automatiquement accès aux données métier sensibles de toutes les officines ; tout accès d'assistance doit être explicitement autorisé, limité et journalisé.

## 4. Navigation

- Public : inscription d'une officine ; connexion ; mot de passe oublié ; état de ma demande après authentification.
- Administration : demandes d'inscription ; officines ; équipe d'accompagnement ; demandes d'affectation ; journal ; paramètres.
- Officine : tableau de bord ; mon officine ; équipe et invitations ; rôles et permissions ; accompagnateurs ; historique ; mon profil et sécurité.
- Une personne ayant plusieurs espaces dispose d'un sélecteur d'officine. Les API vérifient toujours explicitement le contexte de l'officine sélectionnée.

## 5. Inscription autonome de l'officine

### 5.1 Accès public et compte demandeur

Sur « Inscrire mon officine », afficher les étapes et informer que l'accès dépend d'un examen administratif. Le demandeur crée ou utilise un compte personnel par email ou Google. Pour l'email, vérifier l'adresse avant soumission. Pour Google, utiliser l'identifiant stable du fournisseur et vérifier le statut de l'email communiqué ; ne pas associer automatiquement deux comptes simplement parce qu'ils partagent un email. Si un compte existe, demander une connexion et une association authentifiée. Prévoir annulation, erreur fournisseur, retour sécurisé et reprise de dossier. D'autres fournisseurs ne sont pas promis tant qu'ils ne sont pas choisis et configurés.

Le compte personnel et la demande d'officine ont des statuts séparés : un compte authentifié ne donne pas accès à un espace d'officine actif avant approbation.

### 5.2 Formulaire de demande

| Section | Champ | Type / obligation pour soumission |
|---|---|---|
| Officine | Nom ; code souhaité | Texte ; nom obligatoire ; code proposé par système ou saisi, contrôle d'unicité |
| Officine | Téléphone ; email ; logo | Téléphone obligatoire ; email valide si renseigné ; logo facultatif, format et taille contrôlés |
| Localisation | Pays, département, commune, adresse descriptive | Obligatoires dans la proposition initiale ; Bénin présélectionné |
| Localisation | Arrondissement, quartier, repère, latitude, longitude | Facultatifs ; coordonnées validées si présentes |
| Responsable | Nom, prénoms, fonction, téléphone, email | Identité et contact obligatoires ; titulaire ou qualité du demandeur à confirmer |
| Justificatifs | Type, fichier, commentaire | Facultatifs tant que la liste et les obligations ne sont pas validées ; stockage privé |
| Vérification | Exactitude déclarée et conditions applicables | Cases distinctes si nécessaires ; version du texte conservée |

**Enregistrer le brouillon** : enregistrer les informations saisies sans exiger tous les champs, conserver leur propriétaire, revenir sur la page de suivi. **Suivant/Précédent** : valider les champs de l'étape lorsque nécessaire, préserver la saisie. **Soumettre** : contrôler les champs requis, l'email vérifié et le statut ; détecter les doublons possibles sans exposer des données d'autres officines ; créer ou mettre à jour la demande, passer à `soumise`, enregistrer l'événement et notifier le demandeur et l'administration. Une double soumission doit produire un seul dossier.

Sur erreur, conserver la saisie, afficher les champs invalides et ne pas annoncer de soumission réussie. Le demandeur peut consulter son dossier, son statut, ses messages et son historique de décision ; il ne voit pas les notes internes de l'administration.

### 5.3 Instruction administrative

Liste avec recherche par nom, code, commune et date ; filtres par statut, responsable d'instruction et période ; colonnes nom, contact, date, statut et actions. **Ouvrir** montre le dossier, les pièces accessibles, l'historique, les éventuels doublons et les notes internes.

| Action | Comportement attendu |
|---|---|
| Prendre en charge | Assigner un instructeur autorisé et passer à `en_instruction` ; journaliser. |
| Demander des corrections | Saisir les champs attendus et un message visible ; passer à `corrections_demandees` ; notifier le demandeur. |
| Modifier et renvoyer | Le demandeur corrige uniquement son dossier ; le renvoi vérifie les champs et repasse à `soumise` ; conserver les versions et commentaires. |
| Approuver | Vérifier les prérequis, afficher un récapitulatif, confirmer ; transactionnellement activer l'officine et créer l'accès administrateur initial ; notifier. |
| Refuser | Motif obligatoire, message visible adapté, confirmation ; passer à `refusee` ; notifier. Pas de création d'accès actif. |
| Reprendre un dossier refusé | À définir : nouvelle demande ou réouverture ; aucune réouverture automatique sans décision. |

Le demandeur ne peut ni approuver sa propre demande ni modifier directement une décision. Protéger les décisions concurrentes par version de dossier ou verrouillage : une seconde décision sur une version périmée est refusée et l'instructeur recharge le dossier.

### 5.4 États

Demande : `brouillon → soumise → en_instruction → approuvee | refusee | corrections_demandees`, puis `corrections_demandees → soumise`. Compte utilisateur : invité / actif / suspendu selon le fournisseur d'identité. Officine : `en_attente → active → suspendue → active` ou `archivee` selon permissions. Refus d'inscription et suspension d'officine sont deux événements distincts. Une suspension, son motif et ses effets doivent être définis au module SaaS ; elle ne supprime pas les données.

## 6. Fiche et gestion de l'officine

Liste autorisée : nom, code, commune, titulaire, statut, accompagnateur principal si approuvé, actions ; recherche et filtres. Cliquer sur une ligne ouvre le dossier autorisé.

Onglets : **Informations générales**, **Contacts**, **Équipe et accès**, **Rôles**, **Accompagnateurs**, **Historique**. Modifier : formulaire prérempli, contrôles, enregistrement et journal ; Annuler avertit en cas de modifications non sauvegardées. Un contact (nom, fonction, téléphone, email, type et actif) n'est pas automatiquement un compte. Désactiver un contact conserve l'historique et ne supprime pas le compte.

Activer, suspendre, réactiver ou archiver requiert la permission, une confirmation, un motif pour suspension/archivage et un événement horodaté. L'archivage est réversible et n'efface pas les données. Les décisions sur suppression définitive et durées de conservation restent ouvertes.

## 7. Équipe et invitations

### 7.1 Liste de l'équipe

Afficher nom, email, fonction, rôles, statut d'accès à l'officine, date d'invitation et dernière connexion si autorisée. Filtres : actif, invité, expiré, suspendu, terminé, rôle et fonction. Recherche et pagination. Une fiche affiche les rôles, l'historique d'accès et les actions autorisées.

### 7.2 Ajouter un membre et attribuer ses rôles

**Inviter un membre** ouvre une fenêtre avec nom, prénoms, email obligatoire, téléphone et poste facultatifs, dates de début et fin éventuelles. La section **Rôles** affiche les rôles de cette officine sous forme de cases à cocher ; plusieurs cases peuvent être sélectionnées. Au moins un rôle actif et attribuable est requis ; afficher son résumé de permissions et un avertissement explicite pour tout rôle administratif. L'utilisateur qui invite ne peut attribuer une permission qu'il n'est pas habilité à déléguer.

**Envoyer** : contrôler email, dates, rôles et permission ; détecter l'accès actif ou l'invitation en attente dans cette officine ; créer une invitation à jeton aléatoire stocké sous forme d'empreinte et à usage unique ; envoyer le lien ; journaliser. Si l'envoi échoue, conserver l'invitation avec un statut d'envoi échoué, sans prétendre que l'email a été reçu ; permettre une relance autorisée. **Annuler** ferme la fenêtre après confirmation si la saisie a changé.

Le destinataire ouvre le lien, constate l'officine et les rôles proposés, puis se connecte ou crée un compte. La consommation du jeton est atomique ; créer l'appartenance et les rôles uniquement après acceptation et vérification. L'invitation expirée, révoquée ou utilisée ne fonctionne plus. **Renvoyer** invalide l'ancien jeton et en crée un nouveau ; **Révoquer** bloque son usage. Éviter la divulgation de l'existence d'autres comptes ou officines.

### 7.3 Gestion d'un membre

**Modifier les rôles** : ouvrir la même fenêtre à cases cochées, afficher l'effet de la modification, confirmer, vérifier les limites de délégation et le dernier administrateur, appliquer et journaliser. **Suspendre** : demander un motif, confirmer, suspendre seulement l'accès à cette officine et invalider ou vérifier immédiatement les autorisations des sessions concernées. **Réactiver** : vérifier dates et rôles, confirmer et journaliser. **Terminer l'accès** : conserver l'historique ; les accès à d'autres officines restent inchangés. Un utilisateur ne doit pas retirer ou suspendre le dernier administrateur actif : transfert préalable requis. La protection doit être atomique en cas de modifications simultanées.

## 8. Rôles et permissions personnalisés

Chaque officine dispose de rôles prédéfinis de départ et peut créer ses rôles. Écran : liste, nom, description, nombre de membres, statut et boutons **Créer**, **Modifier**, **Dupliquer**, **Désactiver**, **Attribuer**.

**Créer un rôle** : saisir nom unique dans l'officine, description, puis cocher les permissions regroupées par module et action (consulter, créer, modifier, valider, administrer). Afficher les dépendances et les permissions sensibles. Enregistrer uniquement si l'auteur dispose du droit de gestion des rôles et ne s'octroie ni ne délègue des pouvoirs supérieurs à sa propre portée.

**Modifier** : montrer les membres affectés et les impacts, confirmer ; journaliser avant/après et appliquer aux sessions dès la prochaine vérification serveur. **Dupliquer** : créer un nouveau rôle à partir d'un rôle existant, sans attribution automatique. **Désactiver** : empêcher toute nouvelle attribution ; si des membres sont encore affectés, imposer leur réaffectation ou une décision explicite qui préserve l'accès minimal. Ne pas supprimer des rôles nécessaires à l'historique.

Rôles système protégés : au minimum un rôle administrateur d'officine non supprimable ; son attribution et ses permissions critiques sont protégées. Les rôles d'une officine ne sont ni visibles ni applicables à une autre. Plusieurs rôles sont combinés par union des autorisations explicitement attribuées, sauf restrictions de portée ou règles de séparation ; aucune permission n'est accordée par défaut. La séparation des actions sensibles par module sera définie dans les modules concernés.

## 9. Accompagnateurs et approbation

Coordinateur : **Demander une affectation**, choisir officine, collaborateur actif, mission ou motif, rôle, permissions précises, date de début et fin si connue. La demande `en_attente` ne donne aucun accès. Notification aux administrateurs officine habilités. Dans **Accompagnateurs → Demandes**, l'officine voit l'identité, l'entreprise, les permissions, les dates et le motif.

**Approuver** : afficher le détail et confirmer ; vérifier les droits et la version de demande ; créer une affectation active seulement à sa date de début ; notifier et journaliser. **Refuser** : motif facultatif ou obligatoire selon paramétrage, notifier et conserver la décision. **Demander une modification** : commentaire sans accorder d'accès ; toute modification de permissions ou de période après décision exige une nouvelle approbation. **Retirer l'accès** : officine ou coordinateur autorisé termine l'affectation, motif, effet immédiat et historique conservé. Expiration et désactivation du collaborateur coupent également l'accès. L'officine peut voir les accès accordés et leur portée.

## 10. Authentification, profil et sécurité

Connexion : email/mot de passe et Google ; messages génériques en cas d'échec ; contrôle du compte, de l'officine et des permissions à chaque requête. Autres méthodes à définir. Pour OAuth/OIDC : validation de `state`, protection contre rejeu, vérification des jetons et usage de PKCE lorsque le flux le nécessite. Protéger contre les tentatives abusives ; expiration et révocation des sessions ; stockage sécurisé des secrets et des fichiers ; ne pas journaliser jetons, mots de passe ni données excessives.

Mot de passe oublié : message générique ; lien temporaire à usage unique ; renouvellement et révocation des sessions selon politique. Profil : modifier nom, téléphone et préférences ; changement d'email seulement après vérification ; changement de mot de passe après vérification appropriée ; déconnexion de la session courante. Prévoir une authentification multifacteur pour les comptes privilégiés ; méthode et caractère obligatoire restent à valider.

## 11. Permissions initiales

| Action | Admin SaaS | Coordinateur | Accompagnateur | Admin officine | Personnel |
|---|---|---|---|---|---|
| Instruire les inscriptions | Oui si habilité | Selon permission | Non | Non | Non |
| Voir le dossier métier d'une officine | Seulement accès autorisé | Seulement accès autorisé | Affectation approuvée | Son officine | Selon rôle |
| Proposer accompagnateur | Selon permission | Oui | Non | Non | Non |
| Approuver accompagnateur | Non | Non | Non | Oui | Si rôle délégué |
| Inviter et attribuer des rôles | Équipe interne uniquement | Selon permission interne | Non par défaut | Oui | Si droit délégué |
| Créer et modifier rôles officine | Non par défaut | Non | Non | Oui | Si droit délégué |
| Voir son profil | Oui | Oui | Oui | Oui | Oui |

La matrice représente le point de départ ; chaque permission de module futur sera ajoutée à un catalogue contrôlé. Un rôle personnalisé ne doit jamais contourner l'isolation des officines.

## 12. Données et contraintes

Types de base recommandés : UUID, horodatages UTC, dates locales pour périodes métier, textes bornés, enums ou référentiels versionnés. Toutes les tables tenant portent `pharmacy_id` ou sont reliées par clé étrangère vérifiable ; contrôle d'accès serveur systématique, y compris exports, fichiers, recherche et tâches asynchrones.

| Table | Champs principaux et contraintes |
|---|---|
| `users` | id, nom, prénoms, email normalisé, téléphone, état, email vérifié, timestamps ; unicité de l'email selon politique. |
| `auth_identities` | user_id, fournisseur, subject immuable, état ; unique `(provider, subject)` ; secrets confiés au service d'identité. |
| `registration_applications` | id, demandeur, statut, données de dossier, version, dates de soumission et décision, instructeur ; index statut/date. |
| `application_comments` | demande, auteur, visibilité interne/demandeur, message, date ; ne jamais divulguer les notes internes. |
| `application_documents` | demande, type configurable, fichier privé, état, date ; aucune pièce imposée avant décision métier. |
| `pharmacies` | id, code unique, nom, adresse, contacts principaux, logo, statut, dates ; lien à la demande approuvée. |
| `pharmacy_contacts` | pharmacy_id, identité, fonction, coordonnées, actif ; aucun compte implicite. |
| `organization_memberships` | organisation exploitante, user_id, rôle interne, état et dates. |
| `pharmacy_memberships` | pharmacy_id, user_id, statut, dates, auteur ; contrainte contre appartenances actives concurrentes. |
| `roles` | id, pharmacy_id nullable pour modèles système, code, nom, description, protégé, état ; unicité du nom/code par périmètre. |
| `permissions` / `role_permissions` | catalogue des permissions et association à un rôle ; clés étrangères et unicité de couple. |
| `membership_roles` | appartenance et rôle de la même officine ; unicité du couple ; contrôle d'intégrité inter-officines. |
| `invitations` | officine, email, auteur, rôles proposés, empreinte jeton, statut, expiration, acceptation et état d'envoi. |
| `support_requests` | officine, accompagnateur, initiateur, permissions, dates, statut, approbateur, décision et version. |
| `support_assignments` | demande approuvée, officine, collaborateur, portée, dates, état, fin et motif. |
| `files` | propriétaire, stockage privé, nom, MIME vérifié, taille, empreinte, statut d'analyse et dates ; URL d'accès temporaire autorisée. |
| `audit_events` | acteur, officine éventuelle, action, objet, date, résultat, métadonnées utiles ; aucune donnée secrète. |
| `notification_outbox` | événement, destinataire, canal, état, tentatives, identifiant d'idempotence ; envoi asynchrone et traçable. |

Modifications d'état, création du premier administrateur et émission de notifications utilisent une transaction et une outbox pour éviter activation partielle ou double envoi. Les exports sont soumis aux mêmes droits que les écrans. Les données réelles d'OKPE OLUWA ne sont pas préchargées dans les autres officines.

## 13. API indicative

| Méthode et route | Action et contrôle |
|---|---|
| `POST /registration-applications` | Créer un brouillon pour le compte authentifié. |
| `GET/PATCH /registration-applications/{id}` | Consulter ou modifier sa demande si l'état le permet. |
| `POST /registration-applications/{id}/submit` | Soumettre avec contrôles et idempotence. |
| `GET /admin/registration-applications` | Lister les demandes avec autorisation administrative. |
| `POST /admin/registration-applications/{id}/decision` | Approuver, refuser ou demander correction avec version et motif applicable. |
| `GET/PATCH /pharmacies/{id}` | Consulter ou modifier sous contrôle d'appartenance et permission. |
| `GET /pharmacies/{id}/members` | Lister les membres autorisés. |
| `POST /pharmacies/{id}/invitations` | Inviter avec plusieurs rôles autorisés. |
| `POST /invitations/{token}/accept` | Consommer atomiquement une invitation valide. |
| `PATCH /pharmacies/{id}/members/{memberId}/roles` | Changer les rôles, contrôle de délégation et dernier administrateur. |
| `POST /pharmacies/{id}/roles` ; `PATCH /pharmacies/{id}/roles/{roleId}` | Créer ou modifier un rôle local. |
| `POST /pharmacies/{id}/support-requests` | Proposer une affectation sans accorder d'accès. |
| `POST /support-requests/{id}/decision` | Accepter ou refuser par officine habilitée, contrôle de version. |
| `POST /support-assignments/{id}/end` | Mettre fin à l'accès. |
| `GET/PATCH /me` ; `GET /me/pharmacies` | Profil et espaces accessibles. |
| `GET /pharmacies/{id}/audit-events` | Historique filtré selon permission. |

Codes proposés : 200/201 succès, 400 validation, 401 authentification, 403 permission, 404 ressource non accessible, 409 conflit ou version périmée, 429 limitation. Réponses structurées avec code métier, message et erreurs par champ ; pas de fuite inter-officines.

## 14. Notifications, tableaux de bord et journal

Notifier : soumission, demande de correction, approbation ou refus ; invitation envoyée, relancée, acceptée ou révoquée ; demande d'accompagnateur, décision et fin ; changement de rôle et suspension. Canaux : application et email ; les SMS restent à décider. Les échecs d'envoi sont visibles à l'expéditeur habilité et retentés selon politique ; pas de notification de succès fictive.

Tableau administration : demandes par statut, anciennes demandes en attente, officines actives/suspendues, affectations et invitations en attente, avec date et filtres. Tableau officine : membres actifs, invitations en attente, demandes d'accompagnateurs, accès actifs et échéances. Compter uniquement les enregistrements autorisés, préciser la période et les états inclus.

Journal : qui, quoi, quand, officine, résultat, objet et modifications significatives ; filtrage, pagination et permissions. Les politiques d'accès, de conservation et d'export du journal restent à valider.

## 15. Recette et critères d'acceptation

1. Une officine s'inscrit, vérifie son email et soumet ; aucun accès métier actif avant décision.
2. L'administrateur demande une correction, le demandeur corrige et renvoie ; l'historique des échanges demeure visible selon les droits.
3. L'approbation active une seule officine et crée un seul administrateur initial, même en cas de double clic ou de décisions concurrentes ; un refus ne l'active pas.
4. Google : inscription, connexion, annulation et erreur ; aucun compte fusionné sur la seule correspondance d'email ; refus d'accès si compte ou affectation suspendu.
5. Un membre reçoit plusieurs rôles cochés ; les permissions sont effectivement combinées dans cette seule officine, et la délégation abusive est refusée.
6. Une officine crée un rôle, le modifie et observe le changement ; un autre tenant ne voit ni ne peut attribuer ce rôle.
7. Toute tentative de suppression du dernier administrateur échoue, y compris deux opérations simultanées.
8. Un accompagnateur proposé ne peut accéder à aucune donnée avant approbation ; refus, expiration et retrait interdisent l'accès ; changement de portée requiert une nouvelle approbation.
9. Un utilisateur A ne peut lire, modifier, exporter, télécharger un fichier ou interroger une recherche de l'officine B sans autorisation, y compris via URL/API directe.
10. Une invitation expirée, révoquée ou déjà utilisée est refusée ; un renvoi invalide l'ancien lien ; échec d'email correctement signalé.
11. Suspendre l'accès de A à une officine n'affecte pas ses autres appartenances ; effet de révocation vérifié même avec session ouverte.
12. Le journal retrace création, décision, invitation, changements de rôles et affectations sans secrets ; l'accès au journal est contrôlé.
13. Une erreur de service ou notification ne laisse pas d'activation partielle ; les tentatives répétées ne créent pas de doublons.
14. L'interface affiche chargement, liste vide, erreurs, refus et confirmation ; parcours utilisable clavier et mobile.

## 16. Règles et décisions encore ouvertes

- Liste des identifiants et pièces de l'officine, caractère obligatoire, contrôle et responsabilité de vérification : non décidés.
- Preuve du lien du demandeur avec l'officine et procédure lorsqu'il n'est pas titulaire : à définir avant mise en production.
- Autres fournisseurs d'identité, configuration, association et récupération de compte : à choisir ; Google et email seuls sont explicitement identifiés.
- Durées des invitations, demandes et conservation ; politique de suspension et d'archivage : à approuver.
- Modalités détaillées de l'assistance technique exceptionnelle, son autorisation et sa durée.
- Nombre minimal et profils des approbateurs d'accompagnement ; délégation éventuelle au sein de l'officine.
- Validation métier et juridique des documents, conditions d'utilisation et obligations applicables ; ne pas présenter la validation SaaS comme une autorisation officielle.

## 17. Livrables de développement

Écrans public, demandeur, administration et officine ; système d'identité extensible ; schéma et migrations ; contrôles d'accès et rôles ; gestion des invitations et approbations ; notifications ; journal ; tests de parcours, de concurrence et d'isolation ; documentation d'installation, configuration et exploitation. Les modules métier complémentaires seront spécifiés séparément.
