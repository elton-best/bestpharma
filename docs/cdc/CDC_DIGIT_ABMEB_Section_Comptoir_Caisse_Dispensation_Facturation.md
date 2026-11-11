# DIGIT ABMEB — Cahier des charges fonctionnel
## Section « Comptoir & Caisse »

**Écrans concernés :** Caisse POS tactile · Dispensation & Ordonnances · Facturation DGI/e-MECeF  
**Version :** 0.2 — 11 novembre 2026  
**Statut :** cahier des charges fonctionnel de travail. À valider par l’équipe métier, le pharmacien responsable et, pour les sujets concernés, les interlocuteurs réglementaires et fiscaux avant mise en production.

> Ce document détaille les fonctionnalités de la section de navigation « Comptoir & Caisse ». Il complète les CDC **Module 12 — Dispensation Vente** et **Module 13 — Caisse Finances**, sans remplacer les modules Stock, Documents, Comptabilité, Non-conformités, Sécurité ou Administration. Les procédures de l’officine fournies dans le projet servent de sources métier; les règles propres à l’officine ne sont pas automatiquement applicables à toutes les officines. BestPharma est indépendant de l’ABMed, de l’ABRP et de la DGI.

## 1. Finalité, principes et résultats attendus

La section doit couvrir le parcours opérationnel allant de l’accueil et de la délivrance d’un produit à la vente, l’encaissement, la remise du reçu et le suivi de caisse. Le parcours inclut les délivrances sur ordonnance ou sans ordonnance, les situations nécessitant une revue pharmaceutique, ainsi que le suivi d’une demande de facturation fiscale lorsque le service officiel est réellement accessible.

Résultats attendus :

- sécuriser la délivrance et tracer les lots réellement sortis ;
- enregistrer chaque vente et chaque encaissement une seule fois ;
- permettre l’ouverture, la passation, le contrôle et la clôture de caisse ;
- produire un reçu interne tant qu’aucune certification fiscale officielle n’est confirmée ;
- distinguer explicitement opération interne, paiement externe, demande DGI et facture officiellement normalisée ;
- fournir un historique exploitable et des preuves d’audit, sous contrôle des droits ;
- ne pas faire prendre au logiciel une décision clinique, pharmaceutique, fiscale ou réglementaire qui revient à une personne habilitée ou à un service compétent.

## 2. Sources métier et niveau d’autorité

Sources présentes dans le projet :

1. `BestPharma_CDC/CDC_DIGIT_ABMEB_Module_12_Dispensation_Vente.md` ;
2. `BestPharma_CDC/CDC_DIGIT_ABMEB_Module_13_Caisse_Finances.md` ;
3. procédure de l’officine « Dispensation et Conseils » ;
4. procédure de l’officine « Gestion de la Caisse et Traitement des Recettes » ;
5. écrans, routes, migrations, contrôleurs et tests BestPharma existants.

Les procédures de l’officine décrivent notamment l’accueil, la vente libre, la vente sur prescription, les conseils, le suivi des plaintes et effets indésirables, les avoirs, la prise de service, l’encaissement, les mini-dépenses, la passation, la comparaison des recettes et les règlements mobiles. Les formulaires, intitulés, seuils, rôles et délais provenant de ces documents doivent être configurables ou validés avant généralisation. Les règles applicables au Bénin et les spécifications DGI/e-MECeF doivent être confirmées avec les sources officielles à jour.

## 3. Acteurs et habilitations

Les rôles ci-dessous sont des profils fonctionnels; les codes de rôles et autorisations précis doivent être arrêtés dans le Module 15 et par l’officine.

| Profil | Actions fonctionnelles possibles, sous réserve d’autorisation |
|---|---|
| Pharmacien titulaire / responsable habilité | Paramétrage autorisé; revue et visa des dispensations selon règles validées; arbitrage de corrections, retours, écarts, dépenses et opérations fiscales sensibles. |
| Pharmacien adjoint / pharmacien de service | Revue, visa, conseil et délivrance dans les limites de son habilitation et de la politique de l’officine. |
| Dispensateur / auxiliaire habilité | Accueil, recherche produit, préparation de panier, saisie d’une dispensation et conseils dans le périmètre de son rôle; transmission au pharmacien lorsqu’une revue est requise. |
| Caissier / personnel comptoir | Ouverture et conduite de sa session, encaissement des modes activés, émission du reçu correspondant, passation et clôture selon la politique validée. |
| Assistant de gestion / contrôleur de recettes | Consultation des journaux et états autorisés, rapprochement des recettes, saisie de justificatifs et signalement des écarts; pas de modification silencieuse d’une vente clôturée. |
| Responsable qualité | Consultation des preuves et indicateurs qualité autorisés, suivi des anomalies, réclamations et actions correctives associées. |
| Accompagnateur externe | Accès limité à une affectation active et approuvée; aucun accès implicite aux ordonnances, ventes nominatives, encaissements ou secrets fiscaux. |
| Administrateur habilité | Administration technique selon permission explicite; aucune consultation métier générale sans justification et trace d’accès. |

Règles : appartenance active à l’officine, contrôle des permissions côté serveur pour toute lecture/écriture, refus des accès inter-officines, principe du moindre privilège, journalisation des décisions sensibles et révocation effective des sessions/droits.

## 4. Parcours commun et états métier

### 4.1 Parcours de bout en bout

1. L’utilisateur s’identifie et l’officine active est déterminée côté serveur.
2. Le personnel accueille et oriente le client; le dossier patient n’est créé que si nécessaire et autorisé.
3. Les produits sont recherchés et préparés, sur ordonnance ou dans le cadre d’un conseil autorisé.
4. Les restrictions, disponibilité, lots, péremption et revue requise sont contrôlés.
5. Le panier de dispensation est relié à la vente lorsqu’il y a délivrance concernée.
6. La session de caisse ouverte reçoit le règlement réellement confirmé.
7. La vente et les mouvements associés sont enregistrés de manière atomique et traçable.
8. Un reçu interne est remis; la facture fiscale est un parcours distinct qui dépend d’une intégration officielle opérationnelle.
9. La session est passée, contrôlée et clôturée; les recettes sont rapprochées selon la procédure de l’officine.

### 4.2 Statuts à distinguer

- **Panier :** vide, en préparation, prêt à confirmer, abandonné.
- **Dispensation :** brouillon/préparée, en attente de revue si applicable, délivrée, visée, refusée/à corriger, annulée selon une action traçable. La liste exacte est à valider.
- **Vente :** en préparation, enregistrée, payée, paiement incertain/en attente, annulée/contrepassée selon autorisation.
- **Paiement :** non initié, en attente, confirmé par le prestataire ou encaissé en espèces, échoué, expiré, à rapprocher.
- **Caisse :** non ouverte, ouverte, en passation si ce workflow est activé, clôturée.
- **Facturation fiscale :** non configurée, non demandée, à transmettre, en attente de réponse, certifiée/normalisée après preuve officielle, rejetée, échec technique, état inconnu à vérifier, avoir/annulation officiel si l’API et les règles le permettent.

Un échec réseau ne doit pas être transformé en succès. Une réponse inconnue après timeout doit être recherchée par identifiant de corrélation avant toute reprise afin d’éviter les doubles transactions.

## 5. Écran « Caisse POS tactile »

### 5.1 État de caisse et prise de service

Actions :

1. Afficher la session active de l’officine, le numéro, l’utilisateur, la date/heure d’ouverture et les derniers tickets utiles.
2. Afficher un état vide avec l’action « Ouvrir la caisse » lorsqu’aucune session n’est active.
3. Ouvrir une session avec fonds initial en XOF, utilisateur, horodatage et poste/appareil si cette identification est disponible.
4. Empêcher l’ouverture d’une deuxième session lorsque la politique autorise une seule session active; la possibilité de sessions parallèles par poste doit être décidée.
5. Confirmer et journaliser l’ouverture; afficher clairement le statut de session.
6. Empêcher un encaissement si la session requise est fermée ou inexistante.
7. Autoriser la correction du fonds initial uniquement selon les droits et avant le premier mouvement; conserver ancienne/nouvelle valeur, auteur, date et motif.
8. Fournir les consignes de prise de service issues de la procédure (comptage, passation, contrôle du matériel) sous forme de checklist configurable, sans rendre obligatoires des éléments non validés.

### 5.2 Recherche et sélection d’articles

- Recherche par nom commercial, DCI, CIP/code-barres et autres identifiants validés.
- Afficher au minimum : nom, dosage/forme si disponibles, prix courant, disponibilité, avertissements utiles, caractère thermosensible ou restriction si la donnée est fiable.
- Scanner code-barres si appareil pris en charge; permettre la saisie manuelle si le scan échoue.
- Filtrer les articles vendables; refuser les produits inactifs, bloqués, rappelés, en quarantaine, périmés ou en quantité insuffisante selon les données du module Stock.
- Afficher les résultats de recherche vide, la rupture et une erreur d’indisponibilité de catalogue.
- Ne pas considérer le stock affiché comme une réservation: revalider le stock et les lots au moment de confirmer la vente.

### 5.3 Composition et modification du panier

- Ajouter un article depuis une carte tactile ou un résultat de recherche.
- Réajouter un article existant en augmentant la quantité.
- Augmenter/diminuer une quantité; retirer une ligne; vider le panier avec confirmation si la saisie est significative.
- Afficher quantité, prix unitaire, total ligne et total estimatif.
- Permettre l’association à une dispensation existante sans créer de doublon.
- Conserver le panier uniquement le temps nécessaire; en cas de brouillon persistant, appliquer une durée de vie et une protection de confidentialité à valider.
- Aucune remise n’est appliquée implicitement. Remises, prix particuliers, tiers payant, crédit, assurance et ventes partielles exigent des règles et habilitations approuvées.

### 5.4 Calcul du total et fiscalité locale

- Calculer les sous-totaux à partir des prix en vigueur côté serveur; ne jamais faire confiance au total reçu du navigateur.
- Afficher les montants en XOF, les arrondis, remises autorisées, taxes et total à payer selon une configuration/version fiscale validée.
- Distinguer total estimatif de panier et montant final validé.
- Ventiler les catégories de taxation par article uniquement à partir d’une règle officielle et datée. Ne pas imposer comme règle universelle les taux ou groupes inscrits dans des exemples ou migrations historiques.
- Conserver pour chaque ligne le prix, taux/groupe appliqué, date/version de règle et total ayant servi à l’opération.
- Si la règle de taxation n’est pas paramétrée ou vérifiée, signaler l’absence de calcul fiscal et bloquer toute présentation du total comme montant fiscal certifié.

### 5.5 Encaissement

Modes que le parcours doit pouvoir prendre en charge après validation et configuration : espèces, paiement mobile via prestataire connecté, carte via terminal connecté, règlement mixte, crédit/assurance/tiers payant si le workflow métier est validé. Un mode non configuré reste désactivé et explique pourquoi.

Pour chaque mode activé :

- demander les informations strictement nécessaires (montant, opérateur, référence, numéro masqué si besoin); ne jamais stocker de code secret ou PIN client ;
- créer une tentative de paiement avec idempotency key avant appel externe ;
- attendre et vérifier la réponse du prestataire; gérer succès, refus, timeout, annulation et callback tardif ;
- permettre la consultation et le rapprochement du statut; une capture d’écran ou déclaration du client ne vaut pas confirmation technique ;
- pour espèces, saisir ou confirmer le montant remis et calculer la monnaie; refuser un montant reçu insuffisant ;
- pour paiement mixte, ventiler les montants et s’assurer que leur somme égale le solde dû ;
- empêcher l’émission d’un reçu « payé » tant qu’il reste un solde, sauf statut crédit/tier-payant explicitement autorisé.

État projet observé : l’API POS annonce actuellement l’espèce comme seul moyen réellement accepté et renvoie une indisponibilité pour les moyens externes. L’interface doit rester cohérente avec cet état.

### 5.6 Validation, ticket et après-vente immédiat

- Avant validation, récapituler les articles, quantités, total, client si nécessaire, mode de règlement et état de session.
- Revalider produit, prix, disponibilité, lot et session dans une transaction serveur.
- Protéger la validation contre doubles clics, perte réseau et répétition de requête.
- Enregistrer le ticket, les lignes, lot(s) consommé(s), l’utilisateur, l’heure, les montants et la référence de dispensation éventuelle.
- À succès, vider le panier et afficher le récapitulatif lié au ticket créé.
- Imprimer/télécharger le reçu interne ou le renvoyer à l’impression; enregistrer l’événement d’impression si requis, sans modifier la vente.
- Sur le reçu interne, afficher clairement « reçu interne — non fiscal/non certifié » tant qu’aucune preuve DGI authentique n’est reliée à la vente.
- Après succès, proposer « Nouvelle vente », « Imprimer le reçu », « Voir la vente » et, si permis, « Demander facture normalisée »; ne pas confondre ces actions.
- La réimpression doit porter le même numéro et ne crée pas de nouvelle vente.

### 5.7 Historique des ventes

La page ou le panneau d’historique doit permettre, selon les droits :

- liste paginée triée par date, numéro de ticket, caisse/caissier et état ;
- recherche par ticket, date, client/IFU lorsque ces données sont conservées, article et référence externe ;
- filtres par intervalle de dates, session, opérateur, mode de paiement, statut de vente et statut fiscal ;
- fiche détail : officine, ticket, session, caissier, lignes, prix, lots, total, paiement, rendu de monnaie, dispensation liée, reçu et statut fiscal ;
- réimpression/téléchargement du reçu selon permission ;
- consultation des opérations liées et de l’historique d’événements ;
- export filtré en CSV/PDF si autorisé, horodaté et marqué comme export interne lorsque non certifié.

### 5.8 Annulation, retour, remboursement, avoir et demande non satisfaite

- Aucune vente payée n’est effacée ni modifiée silencieusement.
- Une annulation avant paiement libère les réservations éventuelles et garde la trace si le panier a été enregistré.
- Une annulation après paiement exige un motif, un acteur habilité, une référence à l’original et une contre-opération de caisse; le remboursement effectif doit être confirmé par le moyen concerné.
- Retour produit : identifier les lignes/quantités concernées, état et lot retourné; décider séparément si le produit est remis en stock vendable, placé en quarantaine ou détruit, selon la procédure validée.
- Émettre un avoir uniquement selon une règle confirmée, lié à la vente/facture d’origine; l’avoir fiscal nécessite le parcours officiel correspondant et ne doit jamais être simulé.
- Indisponibilité produit : enregistrer une demande non satisfaite ou une alternative proposée, sans promettre une disponibilité ultérieure; notifier/suivre uniquement si le client y consent et si le processus est validé.
- Toute restitution financière respecte les montants effectivement encaissés; les retours cumulés ne dépassent pas la valeur payée.

### 5.9 Ticket X, clôture Z, passation et rapprochement

**Ticket X / consultation intermédiaire** : afficher ventes et totaux à l’instant T sans fermer la session; filtrer par mode et statut; imprimer/exporter si autorisé; ne pas modifier les compteurs.

**Passation de service** :

- sélectionner session sortante/entrante et les personnes présentes ;
- compter les espèces et comparer au théorique ; distinguer les totaux par mode ;
- afficher ventes, tickets annulés, dépenses, remboursements, paiements en attente et opérations à confirmer ;
- saisir les observations, anomalies techniques, pièces justificatives et tâches en attente ;
- préparer et confirmer le procès-verbal de passation par les personnes autorisées ; signatures/attestations et présence d’un second agent à valider ;
- remettre la responsabilité de la session selon le modèle retenu, sans créer de session concurrente implicite.

**Clôture Z** :

- calculer le montant théorique à partir du fonds d’ouverture et mouvements réellement enregistrés, par mode ;
- saisir le comptage réel et billetage si activé, les remises/versements et pièces ;
- calculer l’écart (réel - théorique), permettre une justification et déclencher une alerte suivant un seuil configurable ;
- demander une confirmation explicite; conserver le Ticket Z, les chiffres, l’auteur, les horodatages et les motifs ;
- empêcher la double clôture et toute modification directe d’une session fermée; les corrections sont des événements/contrepassations autorisés.

**Contrôle des recettes** : rapprocher le journal système des déclarations de caisse et pièces soumises; afficher les écarts par mode et par période; permettre commentaire/justificatif et transmission pour revue; suivi des versements bancaires et rapprochement mensuel des paiements mobiles si source importée; distinguer valeur importée, valeur saisie et résultat calculé. Les échéances (par exemple contrôles quotidiens ou hebdomadaires mentionnés dans la procédure source) doivent être configurables et validées.

### 5.10 Mini-dépenses et décaissements de caisse

Fonctionnalité prévue par la procédure source et à inclure au périmètre cible, bien qu’elle ne soit pas encore exposée comme écran dédié dans le POS observé.

- créer une demande avec date, demandeur, bénéficiaire/fournisseur, nature, montant, motif, mode de décaissement et justificatif ;
- distinguer bon de caisse/décharge et facture justificative selon le type de dépense validé ;
- soumettre à approbation selon montant/nature/rôle; ne pas décaisser avant accord lorsqu’il est requis ;
- enregistrer décaissement effectif, caisse/session concernée et reçu de paiement ;
- permettre régularisation par facture, rattachement de pièce et suivi de l’échéance ;
- intégrer la dépense au théorique de caisse et au journal de recettes/dépenses sans double imputation ;
- permettre rejet, demande de complément, approbation, paiement et clôture avec historisation.

Les exceptions de la procédure (par exemple certains règlements fournisseurs) doivent être traduites en règles explicites après validation.

## 6. Écran « Dispensation & Ordonnances »

### 6.1 Accueil, orientation et création

- Démarrer une dispensation sur ordonnance ou une délivrance/conseil sans ordonnance lorsque ce parcours est autorisé.
- Enregistrer le type, la date, l’opérateur, le pharmacien impliqué et les références utiles.
- Recueillir l’identité et les coordonnées du patient seulement si nécessaires au parcours choisi; les rendre facultatives si l’obligation n’est pas établie.
- Recueillir les informations du prescripteur et du centre selon les champs confirmés; date d’ordonnance et référence/pièce sont à définir.
- Permettre brouillon, reprise, annulation de brouillon et soumission à revue sans déstocker prématurément.
- Afficher la checklist d’accueil et la possibilité de prise en charge prioritaire/aide lorsque l’officine valide ce service; ne pas collecter les motifs sensibles inutilement.

### 6.2 Vente libre et conseil officinal

- Documenter la demande et les produits présentés; distinguer médicament, produit de santé et parapharmacie selon le catalogue.
- Prévoir un espace de note de conseil/suivi uniquement si nécessaire, avec accès restreint et durée de conservation à valider.
- Permettre au professionnel de renseigner conseils de bon usage, précautions, posologie communiquée et suivi demandé; le logiciel ne prescrit pas et ne choisit pas seul de traitement.
- Faciliter la transmission au pharmacien ou l’orientation hors officine en cas de doute/urgence, sans classement clinique automatique non validé.
- Relier la dispensation au panier et à la vente; éviter une seconde saisie d’articles et d’identité.

### 6.3 Analyse d’ordonnance et revue professionnelle

Pour une ordonnance, permettre de saisir/consulter, selon règles validées :

- prescripteur (nom, titre/spécialité, coordonnées/centre), date, référence ou copie de prescription conservée en privé ;
- données patient minimales nécessaires (par exemple âge si requis), sans transformer les champs de confort en champs obligatoires sans justification ;
- médicaments prescrits, dosage, forme, fréquence/posologie, durée, quantité, disponibilité et délivrance totale/partielle ;
- contrôle et commentaires du professionnel sur cohérence apparente, interactions/contre-indications signalées, populations particulières, information manquante et appel au prescripteur ;
- décision : à compléter, délivrer selon analyse professionnelle, substitution proposée/acceptée/refusée si légalement permise, produit indisponible, refus ou orientation ;
- auteur, pharmacien réviseur, visa éventuel, date et commentaire motivé.

Les règles de substitution, renouvellement, délivrance partielle, ordonnance étrangère, médicaments réglementés et délégation doivent être validées. Aucun contrôle logiciel ne doit être qualifié d’analyse pharmaceutique validée sans décision du professionnel habilité.

### 6.4 Sélection des produits, quantités et lots

- Rechercher par nom, DCI, code CIP, dosage/forme et identifier les articles réellement disponibles.
- Ajouter, modifier ou supprimer les lignes avant validation; calculer le montant indicatif à partir des prix de vente courants.
- Afficher le lot prioritaire FEFO, date de péremption, stock vendable et état (quarantaine/rappel/thermosensible) s’ils sont fournis par le module Stock.
- Allouer les lots au moment de l’acte final dans une transaction verrouillée; afficher les lots réellement prélevés après confirmation.
- Refuser la validation si stock vendable insuffisant, lot expiré, lot bloqué ou lot en quarantaine; éviter la décrémentation en double.
- Permettre délivrance partielle et reliquat uniquement si procédure métier validée et traçabilité configurée.
- Produits thermosensibles : afficher un rappel de chaîne du froid et étapes de remise/transport approuvées; les consignes précises, les pochettes ou alternatives sont à confirmer avec la procédure applicable. Ne pas prescrire d’actions de conservation risquées sans validation professionnelle.

### 6.5 Visa, validation et lien à la vente

- Soumettre la dispensation au pharmacien si un visa est requis par le type de produit, la procédure ou la permission.
- Le pharmacien peut viser, refuser avec motif ou demander correction; auteur et réviseur ne sont pas confondus lorsque séparation des tâches requise.
- Une dispensation visée ne peut être altérée sans réouverture/versionnement autorisé; conserver le contenu observé lors du visa.
- Créer une vente liée à la dispensation ou rattacher une vente existante; contrôler que produits/quantités concordent ou tracer explicitement l’écart autorisé.
- Les mouvements de stock, ordonnance, vente et registre associé doivent être atomiques ou présenter une reprise compensatoire explicite.

### 6.6 Antibiotiques, stupéfiants et médicaments sous surveillance

- Identifier ces catégories uniquement à partir d’une configuration validée et versionnée; afficher les contrôles spécifiques et les permissions correspondantes.
- Exiger les renseignements/justificatifs prévus par les règles applicables; ces champs et contraintes doivent être établis avec les professionnels compétents.
- Inscrire les mouvements de stupéfiants dans le registre concerné au même moment que la délivrance validée, avec numéro d’ordre, produit, lot, quantité, stock avant/après, référence, opérateur et visa requis.
- Empêcher suppression ou correction directe d’une ligne de registre; passer par mouvement correctif motivé et autorisé.
- Fournir recherche, consultation chronologique et export du registre selon habilitations, avec historique d’accès.
- Ne pas afficher « registre officiel conforme » ou « inaltérable » sans validation juridique, technique et preuve de mécanisme de conservation.

### 6.7 Ordonnancier, historique et consultation

Liste paginée et filtrable par date, numéro, type, statut, dispensateur, pharmacien, prescripteur et produit, en respectant les droits sur les données patient. Détail d’une dispensation : lignes, quantité, posologie/durée si renseignées, lots, montant, document/source, décision, visa, vente liée, pièces et historique.

Actions autorisées : ouvrir le détail, poursuivre un brouillon, demander correction, viser/refuser selon rôle, ouvrir la vente liée, imprimer/exporter un relevé autorisé, ajouter une pièce, créer un suivi/rappel si cette fonction est validée. Les accès, exports et impressions de données nominatives sont journalisés selon la politique de confidentialité.

### 6.8 Avoirs, demandes non satisfaites, plaintes et pharmacovigilance

La procédure source indique des parcours de support à couvrir ou à intégrer avec les modules concernés :

- **Demande non satisfaite :** produit demandé, motif (indisponibilité/autre), quantité éventuelle, consentement au rappel, coordonnées minimales et statut de suivi.
- **Avoir client :** créer une demande liée à la vente et aux lignes, motif, montant proposé, décision, preuve et remboursement/contre-écriture ; le traitement fiscal est séparé.
- **Erreur ou réclamation liée à la délivrance :** enregistrer un signalement avec référence, description, impact, pièces, traitement et lien vers Non-conformités/CAPA; ne pas créer un doublon de dossier si le module 06 est utilisé.
- **Effet indésirable suspecté :** formulaire de recueil conforme au modèle validé, informations du notificateur/patient/produit, description, gravité, prise en charge et évolution; accès restreint et export/transmission uniquement selon consentement, règles et intégration réellement approuvés.
- **Produit de santé non utilisé rapporté par le client :** enregistrer la remise et diriger vers la procédure de collecte/destruction, sans réintégrer en stock vendable automatiquement.

Ces fonctions peuvent être réalisées dans leurs modules dédiés; le présent module doit fournir le lien, le contexte et les transitions nécessaires sans dupliquer la gestion CAPA, documents ou notifications réglementaires.

## 7. Écran « Facturation DGI / e-MECeF »

### 7.1 Configuration et disponibilité du service

- Afficher un état explicite du service : non configuré, test, disponible, indisponible, authentification expirée ou erreur de configuration.
- La configuration est réservée aux administrateurs légalement/techniquement habilités; secrets stockés côté serveur dans un coffre/configuration sécurisée et masqués à l’écran.
- Isoler l’environnement test de production et afficher un indicateur non ambigu; aucune facture de test ne doit être remise comme facture officielle.
- Vérifier la configuration (connectivité/authentification) par une opération sans effet fiscal si l’API officielle le permet.
- Tant que l’IFU, NIM, clés, endpoints et droits officiels ne sont pas validés, désactiver l’émission fiscale et indiquer « non configurée/non certifiée ».

### 7.2 Demande de normalisation

- Déclencher depuis une vente payée et figée; ne pas créer une facture officielle en parallèle de données de vente encore modifiables.
- Afficher avant envoi les données destinées à l’API : officine, IFU/NIM, type de facture, lignes, unités, quantités, prix, catégorie/taux validés, totaux, mode de règlement, informations client requises et identifiant de vente.
- Valider les champs obligatoires selon le contrat API officiel configuré et la réglementation applicable.
- Ajouter idempotency key / référence locale unique; conserver demande et date, sans journaliser secrets ni données sensibles en clair.
- Envoyer la requête côté serveur uniquement; la validation locale de l’API BestPharma ne doit pas être présentée comme certification DGI.

### 7.3 Réponse, statut et reprise

- Interpréter la réponse officielle suivant son schéma/version; valider succès, identifiant, numéro, code, signature, compteur, QR et données de montant reçues.
- Conserver la réponse brute chiffrée ou dans un stockage sécurisé si nécessaire, plus un modèle normalisé exploitable et une empreinte; définir rétention et accès.
- États : prêt à envoyer, en attente, normalisé selon réponse officielle, rejeté par la DGI, erreur réseau, résultat incertain, à rapprocher. Une erreur locale et une erreur distante sont distinctes.
- Timeout : rechercher la transaction par référence; ne pas renvoyer aveuglément une requête susceptible d’avoir déjà été acceptée.
- Reprise : action contrôlée, idempotente, documentée et autorisée; conserver chaque tentative et sa réponse.
- Alertes sur échec durable ou état incertain; permettre résolution manuelle avec preuve et commentaire, sans créer de valeur officielle.

### 7.4 Journal et détail d’une facture

Liste paginée consultable selon droits avec : numéro facture, date, ticket/vente, client/IFU si requis, montant, devise, état, référence d’API, NIM/IFU, type/compteur, code e-MECeF et disponibilité du QR lorsqu’ils sont officiels.

Filtres et actions : période, état, numéro DGI, ticket, client/IFU, code ou référence; voir le document figé et les lignes; consulter les détails de certification et tentatives; télécharger/imprimer, exporter registre autorisé, rechercher la vente d’origine; réessayer ou rapprocher uniquement selon droit et statut.

Les statistiques de taux de certification doivent utiliser un numérateur constitué uniquement de réponses officiellement certifiées et un dénominateur défini (ventes éligibles sur période). Si la configuration ne permet pas de vérifier les données, afficher « non disponible », jamais « 100 % » par défaut.

### 7.5 Facture, reçu, QR et vérification

- Une facture normalisée est rendue à partir des données certifiées et de la réponse DGI conservée; rendu figé et rattaché à l’empreinte/source de vente.
- Le QR code encode les données exactes exigées par l’API et est généré seulement avec des données officielles authentiques.
- Vérifier la cohérence entre montant, code, signature, QR, numéro et réponse conservée avant de proposer l’impression.
- L’écran de détail montre clairement les preuves disponibles et les champs absents; ne pas fabriquer le nom légal ou l’IFU depuis un fallback de démonstration.
- Distinguer facture interne, reçu de paiement, facture normalisée, facture rejetée et avoir.
- L’impression et le téléchargement n’altèrent pas le contenu fiscal; chaque version remise est retrouvable selon conservation approuvée.

### 7.6 Avoir fiscal, annulation et correction

Une facture certifiée n’est pas supprimée ni remplacée par une autre en silence. Si le service officiel le permet, l’avoir/annulation suit son propre type, référence à l’original, motif, approbation et réponse DGI. Tant que ces règles et l’API ne sont pas validées, ces actions restent indisponibles; un retour interne n’est pas un avoir fiscal.

## 8. Exigences transversales d’interface

Chaque écran doit prévoir : chargement, vide, erreur technique, erreur métier, absence d’autorisation, service externe non configuré, résultat obsolète/conflit, confirmation et succès réel. Il doit fournir :

- recherche et filtres adaptés au volume; pagination côté serveur pour les historiques ;
- détail avant action sensible et conservation des filtres lors du retour ;
- feedback de sauvegarde, prévention de perte de saisie et confirmation avant fermeture si données non enregistrées ;
- focus clavier, tailles tactiles utilisables au comptoir, contrastes, navigation sans souris lorsque possible ;
- dates/heures dans le fuseau de l’officine, devise explicite, états textuels en plus de la couleur ;
- aucune notification « réussi » avant confirmation effective du serveur ou du prestataire ;
- affichage des données périmées ou en cache sans les présenter comme disponibles à la vente.

## 9. Données, intégrations et invariants techniques

Entités fonctionnelles existantes/proposées : officine, produit, lot, prix/configuration fiscale versionnée, session caisse, vente, ligne vente, paiement/tentative, dispensation, ligne dispensation, ordonnance/pièce privée, revue/visa, dépense, passation, mouvement caisse, clôture X/Z, demande e-MECeF, réponse fiscale, avoir/retour, incident, journal d’audit.

Intégrations : Module 11 stock et FEFO; Module 03 documents privés; Module 06 réclamations/CAPA; Module 07 risques/continuité; Module 13 comptabilité/caisse; Module 15 utilisateurs, droits et configuration; prestataire paiement; API officielle DGI/e-MECeF; imprimante/scanner/appareils autorisés.

Invariants :

1. Toutes les requêtes métier sont scellées à l’officine autorisée côté serveur.
2. Toute vente finalisée, son paiement local, ses lignes et ses prélèvements de lots sont atomiques ou disposent d’une compensation traçable.
3. Aucun lot expiré, rappelé, bloqué ou quarantainé n’est délivré par le flux normal.
4. Toute opération externe a une référence de corrélation, un état explicite, des tentatives traçables et une clé d’idempotence.
5. Les sommes sont recalculées et validées côté serveur; pas de confiance dans le navigateur.
6. L’original validé est conservé; annulation, correction, retour et avoir sont des événements reliés à l’original.
7. Les secrets, données d’ordonnance et données patient n’apparaissent pas dans les journaux ordinaires.
8. Les migrations et API ne déclarent pas une opération fiscale simulée comme officielle.

## 10. Notifications, justificatifs et archivage

- Alertes internes : session non clôturée, passation en attente, écart supérieur au seuil validé, paiement ou certification en état incertain, rejet fiscal, stock indisponible au moment de confirmer.
- Les destinataires, seuils, délais, canaux et règles d’escalade sont définis par l’officine; notification non délivrée reste consultable et réessayable.
- Associer les justificatifs privés : ordonnance, facture de dépense, preuve de paiement, déclaration de recette, document de retour, réponse DGI selon l’objet et les permissions.
- Définir conservation, archivage, extraction, rectification et suppression/anonymisation selon obligations légales; aucune durée non confirmée n’est imposée dans le logiciel.
- Les événements d’impression, consultation de données sensibles et export peuvent être journalisés selon politique validée.

## 11. Indicateurs, rapports et exports

Indicateurs cibles configurables : nombre de ventes et montant par période, panier moyen si défini, totaux par mode, remboursements/avoirs, sessions ouvertes/fermées, fonds théorique/réel/écart, dispensations par statut/type, visas en attente, mouvements de stupéfiants selon droits, paiements externes par état, factures DGI éligibles/transmises/certifiées/rejetées/incertaines.

Rapports cibles : ticket X, clôture Z, journal de caisse/recettes, déclaration de passation, contrôle des recettes, suivi des justificatifs et registre DGI. Les rapports « journaliers », « hebdomadaires » ou « mensuels » cités dans la procédure source sont paramétrables jusqu’à validation des échéances.

Tous les rapports indiquent période, filtre, date de génération, provenance et statut fiscal. Les exports respectent les autorisations, les données minimales et l’isolation par officine. Pas de génération d’un dénominateur nul en pourcentage artificiel.

## 12. Exigences non fonctionnelles

- **Fiabilité :** transaction de vente résistante aux doubles clics, timeout, rejeu et reprise réseau.
- **Performance :** recherche utilisable au comptoir; critères chiffrés de latence et volumétrie à fixer lors du test de charge.
- **Disponibilité :** état des dépendances affiché; procédures de continuité et mode dégradé soumis à validation; pas de mode hors-ligne qui certifie fiscalement ou vend un stock non vérifié.
- **Sécurité :** authentification, permissions serveur, MFA pour fonctions administratives sensibles si exigé, appareils approuvés, chiffrement des flux et stockage privé.
- **Confidentialité :** collecte minimisée, masquage des données client/patient, exports limités et politiques de rétention.
- **Accessibilité et périphériques :** POS tactile, imprimante ticket, scanner et autres appareils doivent être testés sur les équipements ciblés; succès d’impression à distinguer de succès de vente.
- **Auditabilité :** utilisateur, officine, horodatage, objet, action, résultat, motif et identifiant externe disponibles pour les opérations sensibles.

## 13. Critères d’acceptation et cas de test

### Caisse/POS

1. Une vente sans session ouverte est refusée avec une action d’ouverture clairement indiquée.
2. L’ouverture concurrente de deux sessions ne crée pas de sessions incohérentes; le cas multi-poste respecte la politique configurée.
3. Recherche nom/DCI/CIP, ajout, quantité, suppression et panier vide donnent les bons totaux serveur/client avant confirmation.
4. Le serveur refuse stock insuffisant, prix obsolète ou lot bloqué après validation initiale du panier.
5. Deux soumissions identiques produisent une vente et un prélèvement de stock uniques.
6. Paiement espèces insuffisant est refusé; monnaie rendue calculée correctement; reçu relié à la vente.
7. Mobile Money/carte indisponibles ne peuvent pas produire une vente payée; succès, échec, timeout et callback tardif sont testés dès activation réelle.
8. Un ticket réimprimé garde le même numéro; il ne crée ni vente ni débit de stock supplémentaire.
9. Ticket X ne clôture pas la session; Ticket Z calcule un écart correct et bloque les répétitions.
10. Passation entre deux personnes conserve billets/écarts, commentaires et attestations.
11. Mini-dépense sans autorisation est bloquée lorsque approbation requise; dépense approuvée et justifiée apparaît une seule fois au journal.

### Dispensation/ordonnancier

12. Délivrance sans ligne produit est refusée; stock insuffisant bloque la validation.
13. Plusieurs lots FEFO sont correctement répartis et les lots réellement consommés sont affichés.
14. Périmé, quarantaine ou rappel ne sont pas délivrables.
15. Brouillon et demande de revue n’entraînent pas de sortie de stock avant l’événement métier validé.
16. Visa réservé aux rôles prévus; accès API direct d’un rôle interdit renvoie refus.
17. Stupéfiant génère un mouvement unique cohérent au registre et un doublon est empêché; correction crée une contre-écriture autorisée.
18. Ordonnance/pièce et données patient ne sont accessibles qu’aux profils autorisés; export nominatif est tracé.
19. Dispensation, vente liée et retour sont rapprochables sans double mouvement.

### Facturation DGI/e-MECeF

20. Sans configuration vérifiée, aucune action ne crée de numéro, code, signature ou QR officiel; l’interface montre « non configuré ».
21. Les données envoyées sont recalculées et comparées au ticket figé; champ fiscal invalide bloque l’envoi avec erreur claire.
22. Réponse officielle authentique crée une seule facture liée à la vente; numéro/code/QR peuvent être retrouvés et vérifiés.
23. Rejet, erreur réseau, timeout avant réponse et timeout après acceptation sont distingués; reprise n’émet pas de doublon.
24. Les indicateurs n’affichent pas 100 % lorsqu’aucune facture certifiée vérifiable n’existe.
25. Facture interne, test, normalisée et avoir ont un rendu/label distinct; seul un avoir officiellement accepté est présenté comme fiscal.
26. Utilisateur d’une autre officine ne peut consulter facture, ticket, ordonnance ou réponse DGI par API ou URL directe.

## 14. État initial du projet et écarts à traiter

Constats à la lecture du code du 11 novembre 2026 (à confirmer par tests et recette) :

| Zone | Éléments déjà présents | Écart / travail nécessaire |
|---|---|---|
| POS | Recherche catalogue, panier, ouverture session, espèces, calcul monnaie, Ticket X/Z côté API, ticket interne non certifié, sélection FEFO côté serveur. | Historique/filtres détaillés, passation bilatérale, mini-dépenses et rapprochements complets à confirmer/compléter; modes externes bloqués tant que non configurés. |
| Dispensation | Saisie ordonnance/conseil, données patient/prescripteur, lignes, posologie/durée, allocation FEFO, ordonnancier paginé, visa pharmacien, écriture stupéfiant présente dans le contrôleur. | Revoir champs obligatoires/minimisation, brouillon et moment de déstockage, analyse structurée, dispense partielle/retour, contrôle accès multi-officine, pharmacovigilance et procédures associées. |
| e-MECeF/DGI | Écran de registre et tables de données existent. | L’écran comporte des mentions de certification et statistiques fixes; `EmecefService` contient une génération locale simulée. Ces éléments ne constituent pas une preuve DGI. Désactiver tout statut/valeur simulée en environnement métier et remplacer par l’intégration officielle vérifiée ou état « non configuré ». |
| Paiements externes | Modèle de transaction et mentions de prestataire existent. | API POS refuse les moyens non espèces comme indisponibles. Ne pas activer sans clés, contrat, callback authentifié, idempotence et tests de rapprochement réels. |
| Fiscalité produit | Colonnes de taxation et écrans dédiés existent. | Valider source des taux/groupes, date d’effet, règle par produit et conformité; aucune valeur codée en dur ne doit être considérée règle officielle sans confirmation. |
| Comptabilité | Endpoint journal de ventes et tables d’écritures existent. | Définir événements d’alimentation, annulation/extourne, rapprochement et preuves; éviter doublon ou écritures de simulation. |

## 15. Décisions métier, réglementaires et produit encore ouvertes

### Rôles et processus

- Matrice exhaustive par action : vente, accès ordonnance, visa, correction, dépense, remboursement, réimpression, export, clôture et transmission fiscale.
- Cas où le visa pharmacien est obligatoire, séparation dispensateur/visa et procédure de remplacement/délégation.
- Gestion des sessions par officine ou par poste, passation et billetage obligatoire ou facultatif.

### Dispensation

- Champs minimaux patient et ordonnance, supports acceptés, durée de conservation et permissions.
- Règles de prescription, renouvellement, substitution, équivalence, délivrance partielle et médicaments concernés.
- Gestion des conseils, signes d’orientation médicale, rappels de suivi, consentement et pharmacovigilance.
- Règles de vente libre, médicaments sous surveillance, stupéfiants, antibiotiques et exigences de registres.
- Transport des produits thermosensibles et consignes validées.

### Caisse et vente

- Modes de paiement activés et prestataires retenus; crédit, assurance, tiers-payant et paiement mixte.
- Remises, retour, remboursement, annulation, avoir, revente et traitement du produit retourné.
- Mini-dépenses : seuils, approbateur, justificatifs et exceptions fournisseurs.
- Ticket X/Z, nomenclature des pièces, délai de passation, seuil d’écart, destinataires et périodicité des rapports.
- Vente en cas d’indisponibilité réseau ou stock; réconciliation des ventes hors ligne.

### Fiscalité et DGI/e-MECeF

- Contrat/API officielle et spécification versionnée; environnement test/prod et authentifiants propres à chaque officine.
- IFU/NIM et identité légale de l’officine; gestion des appareils habilités et changement de terminal.
- Nature de facture, groupes/taux d’imposition, calcul, arrondis, données client, modes de règlement et mentions obligatoires.
- Moment obligatoire de certification, effets d’une panne, durée de reprise, conservation, annulation et avoirs fiscaux.
- Preuves et modalités de vérification publique des codes, signatures et QR.
- Règles comptables/fiscales de rapprochement entre vente, facture DGI, paiement et déclaration.

## 16. Découpage de réalisation proposé

1. **Assainissement et vérité des états** : retirer toute présentation de certification simulée; tests d’isolation officine, accès et stock; aligner interface avec APIs réellement actives.
2. **Caisse cœur** : sessions, POS espèces, validations atomiques, reçu interne, historique et clôture X/Z; recette sur cas normaux et erreurs.
3. **Dispensation** : sécuriser permissions, minimiser les données, séparer brouillon/revue/délivrance, améliorer ordonnancier et lien à la vente.
4. **Passation et contrôle recettes** : PV de passation, dépenses, justificatifs et rapprochements selon règles validées.
5. **Services externes** : intégration paiement et DGI seulement après disponibilité des contrats/credentials/docs officielles; environnements isolés, callbacks sécurisés, idempotence et recette externe.
6. **Retours, avoirs, pharmacovigilance et reporting** : développer après arbitrages métier et contrats d’intégration avec les modules concernés.

Chaque étape est livrée avec tests fonctionnels, de permission, multi-officine, concurrence, reprise, audit, confidentialité et export. Le présent CDC décrit la cible fonctionnelle; la présence d’un écran, d’une table ou d’une route dans le code ne vaut pas réalisation complète ni validation réglementaire.
