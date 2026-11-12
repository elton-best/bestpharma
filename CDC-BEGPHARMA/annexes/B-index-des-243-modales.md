# Annexe B — Index des 243 modales (M-01 → M-243)

Index consolidé généré depuis les cahiers **02** à **06**. Une « modale » est toute boîte de dialogue, panneau latéral ou formulaire modal que l'interface cible doit comporter. La colonne **Détail** reprend la définition du cahier d'origine (champs, règle, endpoints) ; le développement complet — validations, effets de bord, messages d'erreur, télémétrie émise — se lit dans le cahier indiqué.

> **Constat** : trois écrans affichent des formulaires sans **aucune** modale — `documents` (8 sections), `modeles` (4 sections) et `non-conformites` (6 sections), tous trois à `<Dialog>` = 0. → **RG-40**, codes M-207 et suivants.

| Code | Écran / rubrique | Titre | Détail | Cahier |
| --- | --- | --- | --- | --- |
| **M-01** | Tableau de bord | Création d'officine | `+ Nouvelle officine` · `ModaleFiche` 2 colonnes : identité (nom, ville) + « Après la création » (3 étapes) | 02 |
| **M-02** | Caisse | Ticket de vente réussi | validation d'une vente · reçu (officine, ticket, facture DGI, client, lignes, total, reçu/rendu), [Imprimer Ticket], [Fermer] | 02 |
| **M-03** | Caisse | Ouverture de session | `Ouvrir une session de caisse` · fond d'ouverture, rappel « une seule session à la fois », journalisation | 02 |
| **M-04** | Caisse | Clôture Z | `Clôturer la caisse (Z)` · fond d'ouverture, encaissé espèces, espèces théoriques, fond réel, écart, notes | 02 |
| **M-05** | Dispensation | Nouvelle dispensation | `Nouvelle Dispensation Ordonnance` · patient (nom, téléphone), prescription (médecin, établissement), lignes produits avec lot FEFO, posologie, total, [Annuler]/[Valider] | 02 |
| **M-06** | Facturation | Détail de facture | `Voir Ticket` · reçu fiscal complet, QR, code e-MECeF, [Imprimer Ticket Fiscal] | 02 |
| **M-07** | Consolidation | Confirmation de transfert | `Initier transfert` · origine, cible, produit, lot, quantité, motif | 02 |
| **M-08** | Gardes | Déclaration d'une période de garde | `Déclarer une Garde` · officine, commune, quartier, téléphone, début, fin, observations | 02 |
| **M-09** | Tableau de bord | Détail d'un indicateur | clic sur un KPI · période, décomposition, top contributeurs, lien vers la pièce · [Ouvrir la page] [Exporter] · forage limité aux droits \[DSH-12\] | 02 |
| **M-10** | Tableau de bord | Réglage des alertes | `Réglages` du centre d'alertes · par type : niveau, canaux (push/SMS/e-mail/WhatsApp), plage horaire, destinataires · [Enregistrer] · promoteur uniquement, versionné | 02 |
| **M-11** | Tableau de bord | Approbation d'une annulation | action du centre d'alertes · ticket, motif du caissier, code personnel du validateur · [Approuver] [Refuser] · RG-C04, signature | 02 |
| **M-12** | Tableau de bord | Résumé quotidien | `Résumés` · heure d'envoi, canaux, aperçu du dernier résumé, historique des envois · [Envoyer maintenant] [Modifier l'heure] · DSH-11 | 02 |
| **M-13** | Caisse | Mouvement de caisse | `Mouvements de caisse` · type (entrée/sortie), catégorie, montant, motif, pièce jointe · [Enregistrer] · CAI-06, inaltérable | 02 |
| **M-14** | Caisse | Ticket X | `Ticket X` · compteurs par mode, CA, espèces théoriques, depuis l'ouverture · [Imprimer] · POS-11, non destructif | 02 |
| **M-15** | Caisse | Règlement FeexPay | `FeexPay` · opérateur (MTN/Moov/Celtiis), numéro masqué, montant, QR, statut temps réel, compte à rebours · [Renvoyer la demande] [Annuler] [Changer de mode] · FPX-01 à FPX-03, polling 15 s | 02 |
| **M-16** | Caisse | Remise au-delà du seuil | saisie d'une remise hors plafond · remise demandée, plafond du rôle, motif, code personnel du validateur · [Valider la remise] · RG-C03 | 02 |
| **M-17** | Caisse | Annulation d'un ticket | ticket → `Annuler` · motif (liste + libre), code personnel, portée (ticket entier ou ligne) · [Annuler le ticket] · RG-C04, contre-passation | 02 |
| **M-18** | Caisse | Avoir / retour client | ticket → `Avoir` · lignes reprises, motif, type de produit (médicament = pas de retour en stock), validation · [Émettre l'avoir] · VTE-07, RG-C07, facture `EV` | 02 |
| **M-19** | Caisse | Envoi du reçu | modale ticket → `Envoyer` · canal (SMS/WhatsApp/e-mail), destinataire, aperçu · [Envoyer] · CAI-04, journalisé | 02 |
| **M-20** | Caisse | Choix d'un autre lot | clic sur le lot d'une ligne · lots disponibles (péremption, stock, statut), justification obligatoire · [Utiliser ce lot] · RG-D02, art. 5.8 | 02 |
| **M-21** | Caisse | Paniers en attente | `Mettre en attente` / `{n paniers}` · liste des paniers avec nom, ancienneté, total · [Reprendre] [Supprimer] · VTE-09 | 02 |
| **M-22** | Caisse | Prise en charge organisme | mode « Prise en charge » · organisme, n° de bon, part organisme, part patient, pièce téléversée · [Appliquer] · VTE-05 | 02 |
| **M-23** | Caisse | Crédit client | mode « Crédit » · client, plafond, encours, échéance, autorisation · [Accorder] · VTE-06, RG-C08 | 02 |
| **M-24** | Dispensation | Patient (recherche/création) | étape 1 · identité, date de naissance, sexe, poids, taille, téléphone, mandataire, allergies, terrain, consentement DP · [Sélectionner] [Créer] · DSP-01 à DSP-03, DP-01 | 02 |
| **M-25** | Dispensation | Ordonnance (photo/scan) | étape 2 · dépôt glisser-déposer, prescripteur, date, validité, produits prescrits · [Analyser l'ordonnance] · DSP-04, ≤ 10 Mo, SHA-256 | 02 |
| **M-26** | Dispensation | Détail d'une alerte | clic sur une alerte · produit, type, gravité, source, contre-indication, alternative proposée, motif du pharmacien · [Accepter] [Ignorer avec motif] · DSP-06, RG-D05, RG-D07 | 02 |
| **M-27** | Dispensation | Décision du pharmacien | étape 5 · décision (délivrer/surseoir/modifier/refuser), motif, code personnel, notification au prescripteur · [Signer la décision] · DSP-08, signature | 02 |
| **M-28** | Dispensation | Intervention pharmaceutique | décision « modifier » · type d'IP, description, prescripteur contacté (mode, date, réponse), résultat · [Enregistrer] [Envoyer le PDF] · DSP-09 | 02 |
| **M-29** | Dispensation | Substitution | ligne substituée · produit initial, produit substitué, accord du prescripteur ou urgence, justification · [Valider la substitution] · DSP-10, compréhension obligatoire | 02 |
| **M-30** | Dispensation | Scan d'une boîte | étape 6 · code-barres lu, lot, péremption, intégrité, conservation, photo · [Conformer] [Refuser la boîte] · DSP-12 | 02 |
| **M-31** | Dispensation | Conseil et plan de posologie | étape 7 · fiche conseil par produit, posologie, documents remis, compréhension vérifiée · [Imprimer] [Enregistrer] · DSP-16, DSP-18 | 02 |
| **M-32** | Dispensation | Erreur de délivrance | onglet « Erreurs » · déclarant, type (achat/délivrance/prescription), produit, lot, patient, gravité, causes, mesures · [Déclarer] [Créer la NC liée] · DSP-19, BPD-C05 | 02 |
| **M-33** | Dispensation | Notification de vigilance | onglet « Vigilances » · type (pharmaco/matério/réacto/hémovigilance), patient (initiales, âge, sexe), produit, lot, dates, description, gravité, caractère inattendu, évolution, notificateur · [Enregistrer] [Transmettre à l'ABMed] · DSP-26, DSP-27 | 02 |
| **M-34** | Dispensation | Parcours hors prescription | onglet « Conseils » · pour qui, symptômes, durée, traitements en cours, état physiopathologique, issue, risque d'usage détourné · [Conseiller] [Orienter] [Refuser] · DSP-20 | 02 |
| **M-35** | Facturation | Avoir (EV) | registre → `Avoir` · facture d'origine, lignes, motif, validation · [Émettre la facture d'avoir] · FDG-06 | 02 |
| **M-36** | Facturation | Vérification d'un reçu | onglet dédié · scan QR ou code e-MECeF · [Vérifier] · FDG-08, journalisé | 02 |
| **M-37** | Facturation | Paramètres fiscaux | onglet dédié · IFU, NIM, régime, taux, groupes, mentions légales, date d'effet · [Enregistrer la version] · FDG-09, promoteur/comptable | 02 |
| **M-38** | Facturation | Relance de certification | file d'attente · facture, erreur, tentative · [Relancer] · FDG-07 | 02 |
| **M-39** | Consolidation | Écart à la réception | transfert → `Valider réception` · quantité attendue, quantité reçue, écart, motif, pièces · [Clôturer avec écart] · CGL-07 | 02 |
| **M-40** | Consolidation | Alerte groupe | clic sur une alerte · officine, niveau, source, pièce · [Traiter] · CGL-10 | 02 |
| **M-41** | Gardes | Report d'une garde | calendrier (glisser-déposer) · nouvelle période, motif · [Reporter] · GRD-04, journalisé | 02 |
| **M-42** | Tous | Signature par code personnel | toute validation sensible · code personnel (masqué), nom, acte, horodatage · [Signer] · composant partagé `SignatureAgent` | 02 |
| **M-43** | Stock | Nouveau produit au catalogue | code interne, CIP, nom, DCI, forme, dosage, laboratoire, classe réglementaire, groupe de taxation, TVA, prix achat/vente, seuils mini/maxi, thermolabile · unicité CIP ; classe réglementaire conditionne la vente sur ordonnance | 03 |
| **M-44** | Stock | Réception d'une livraison | fournisseur (+ contrôle d'agrément et de validité), n° BL, facture, date, température à réception, lignes scannées, check-list, décision · fournisseur non agréé ou agrément expiré → commande impossible \[art. 5.6\] | 03 |
| **M-45** | Stock | Contrôle d'un lot à réception | numéro de lot, péremption, quantité, état des emballages, conformité, emplacement cible · thermolabile → emplacement enceinte 2-8 °C uniquement \[BPD5-F10\] | 03 |
| **M-46** | Stock | Changement de statut d'un lot | statut cible, motif obligatoire, pièce jointe, signature · statuts : `commercialisable`, `en_attente_controle`, `quarantaine`, `non_vendable`, `reserve`, `detruit` | 03 |
| **M-47** | Stock | Mise en quarantaine | motif, origine (rappel, excursion, retour, suspicion), portée (lot / produit / emplacement), notification · effet immédiat à la caisse et à la dispensation | 03 |
| **M-48** | Stock | Saisie d'un avis de rappel | source (ABMed, laboratoire, grossiste), produit, lots, date, action demandée, pièce jointe · blocage automatique des lots correspondants | 03 |
| **M-49** | Stock | Campagne d'inventaire | périmètre (global / emplacement / famille), type (comptable / tournant), date, équipes, comptage à l'aveugle · une seule campagne ouverte par périmètre | 03 |
| **M-50** | Stock | Comptage d'une ligne | lot, quantité théorique (masquée si à l'aveugle), quantité comptée, écart, motif · écart → ajustement validé par le pharmacien | 03 |
| **M-51** | Stock | Validation d'inventaire (PV) | synthèse des écarts, valeur de démarque, signature, observations · PV inaltérable, export PDF | 03 |
| **M-52** | Stock | Constitution d'un lot de déchets | origine, produits, quantités, catégorie, contenant, prestataire · aucune remise en circuit possible | 03 |
| **M-53** | Stock | Destruction de déchets | date, prestataire, PV, certificat, témoin, signature · sortie de stock + écriture comptable | 03 |
| **M-54** | Stock | Transfert d'emplacement | lot, origine, destination, quantité, motif · mouvement tracé, jamais de suppression | 03 |
| **M-55** | Stock | Contre-passation d'un mouvement | mouvement d'origine, motif, signature · INT-01 : un mouvement n'est jamais supprimé | 03 |
| **M-56** | Stock | Import du catalogue / du stock initial | dépôt du fichier, association des colonnes, aperçu (lignes valides / invalides), confirmation · rien n'est écrit avant confirmation ; rapport d'erreurs téléchargeable | 03 |
| **M-57** | Stupéfiants | Entrée de stupéfiant (livraison) | — | 03 |
| **M-58** | Stupéfiants | Sortie / délivrance (rattachée à une dispensation validée) | — | 03 |
| **M-59** | Stupéfiants | Visa du pharmacien (`SignatureAgent`) | — | 03 |
| **M-60** | Stupéfiants | Écriture rectificative (motif, référence à la ligne corrigée) | — | 03 |
| **M-61** | Stupéfiants | Inventaire (double compteur, écarts) | — | 03 |
| **M-62** | Stupéfiants | Déclaration de vol ou perte (date, produit, quantité, circonstances, autorité informée, récé | — | 03 |
| **M-63** | Stupéfiants | Demande de destruction | — | 03 |
| **M-64** | Stupéfiants | Rapport mensuel (période, signature, export) | — | 03 |
| **M-65** | Préparations magistrales | Nouvelle préparation | — | 03 |
| **M-66** | Préparations magistrales | Ajout d'une formule à la bibliothèque | — | 03 |
| **M-67** | Préparations magistrales | Réception d'une matière première | — | 03 |
| **M-68** | Préparations magistrales | Contrôle d'une préparation | — | 03 |
| **M-69** | Préparations magistrales | Visa pharmacien | — | 03 |
| **M-70** | Préparations magistrales | Étiquette (aperçu et impression) | — | 03 |
| **M-71** | Qualité & BPD ABMed — 9 pages | relevé | — | 03 |
| **M-72** | Qualité & BPD ABMed — 9 pages | décision après excursion | — | 03 |
| **M-73** | Qualité & BPD ABMed — 9 pages | incident technique | — | 03 |
| **M-74** | Qualité & BPD ABMed — 9 pages | rapport mensuel signé | — | 03 |
| **M-75** | Qualité & BPD ABMed — 9 pages | fiche équipement | — | 03 |
| **M-76** | Qualité & BPD ABMed — 9 pages | maintenance/étalonnage | — | 03 |
| **M-77** | Qualité & BPD ABMed — 9 pages | check-list de nettoyage | — | 03 |
| **M-78** | Qualité & BPD ABMed — 9 pages | intervention nuisibles | — | 03 |
| **M-79** | Qualité & BPD ABMed — 9 pages | contrôle extincteur | — | 03 |
| **M-80** | Qualité & BPD ABMed — 9 pages | sauvegarde et test PRA | — | 03 |
| **M-81** | Qualité & BPD ABMed — 9 pages | nouvelle campagne | — | 03 |
| **M-82** | Qualité & BPD ABMed — 9 pages | cotation d'un article (preuve, commentaire) | — | 03 |
| **M-83** | Qualité & BPD ABMed — 9 pages | génération de CAPA | — | 03 |
| **M-84** | Qualité & BPD ABMed — 9 pages | rapport d'auto-inspection | — | 03 |
| **M-85** | Qualité & BPD ABMed — 9 pages | pointage manuel justifié | — | 03 |
| **M-86** | Qualité & BPD ABMed — 9 pages | historique des présences (existe : `modale-historique-presences`) | — | 03 |
| **M-87** | Qualité & BPD ABMed — 9 pages | badge double face (existe : `badge-double-face`) | — | 03 |
| **M-88** | Qualité & BPD ABMed — 9 pages | correction de pointage | — | 03 |
| **M-89** | Qualité & BPD ABMed — 9 pages | dossier collaborateur (existe : `modale-profil-collaborateur`) | — | 03 |
| **M-90** | Qualité & BPD ABMed — 9 pages | inscription à l'Ordre | — | 03 |
| **M-91** | Qualité & BPD ABMed — 9 pages | habilitation | — | 03 |
| **M-92** | Qualité & BPD ABMed — 9 pages | formation | — | 03 |
| **M-93** | Qualité & BPD ABMed — 9 pages | demande d'absence | — | 03 |
| **M-94** | Qualité & BPD ABMed — 9 pages | approbation (`approbation-document` existe) | — | 03 |
| **M-95** | Qualité & BPD ABMed — 9 pages | diffusion | — | 03 |
| **M-96** | Qualité & BPD ABMed — 9 pages | révision / nouvelle version | — | 03 |
| **M-97** | Qualité & BPD ABMed — 9 pages | création de NC (existe : `BoutonCreerNC` de `bpd-communs`) | — | 03 |
| **M-98** | Qualité & BPD ABMed — 9 pages | action CAPA | — | 03 |
| **M-99** | Qualité & BPD ABMed — 9 pages | vérification d'efficacité | — | 03 |
| **M-100** | Qualité & BPD ABMed — 9 pages | clôture | — | 03 |
| **M-101** | Qualité & BPD ABMed — 9 pages | nouvelle échéance | — | 03 |
| **M-102** | Qualité & BPD ABMed — 9 pages | clôture avec preuve | — | 03 |
| **M-103** | Qualité & BPD ABMed — 9 pages | report motivé | — | 03 |
| **M-104** | Qualité & BPD ABMed — 9 pages | règles de rappel | — | 03 |
| **M-105** | Gestion & Finance — 3 pages | écriture manuelle | — | 03 |
| **M-106** | Gestion & Finance — 3 pages | extourne (existe) | — | 03 |
| **M-107** | Gestion & Finance — 3 pages | clôture de période | — | 03 |
| **M-108** | Gestion & Finance — 3 pages | import de relevé bancaire | — | 03 |
| **M-109** | Gestion & Finance — 3 pages | génération de la liasse | — | 03 |
| **M-110** | Gestion & Finance — 3 pages | détail d'une ligne d'audit | — | 03 |
| **M-111** | Gestion & Finance — 3 pages | ouverture d'un accès inspecteur (durée limitée, journalisée) | — | 03 |
| **M-112** | Gestion & Finance — 3 pages | enrôlement d'un appareil | — | 03 |
| **M-113** | Gestion & Finance — 3 pages | révocation | — | 03 |
| **M-114** | Gestion & Finance — 3 pages | arbitrage d'une opération en conflit | — | 03 |
| **M-115** | Compte & Officine — 3 pages | modification du profil | — | 03 |
| **M-116** | Compte & Officine — 3 pages | demande de droits | — | 03 |
| **M-117** | Compte & Officine — 3 pages | demande d'absence | — | 03 |
| **M-118** | Compte & Officine — 3 pages | export de mes données | — | 03 |
| **M-119** | Compte & Officine — 3 pages | modification d'un paramètre (avec motif et date d'effet) | — | 03 |
| **M-120** | Compte & Officine — 3 pages | rotation d'un secret | — | 03 |
| **M-121** | Compte & Officine — 3 pages | import initial | — | 03 |
| **M-122** | Compte & Officine — 3 pages | historique d'un paramètre | — | 03 |
| **M-123** | Compte & Officine — 3 pages | enrôlement MFA (QR + codes) | — | 03 |
| **M-124** | Compte & Officine — 3 pages | régénération des codes de secours | — | 03 |
| **M-125** | Compte & Officine — 3 pages | changement de mot de passe | — | 03 |
| **M-126** | Compte & Officine — 3 pages | révocation de session | — | 03 |
| **M-127** | Compte & Officine — 3 pages | autorisation nominative d'accès | — | 03 |
| **M-128** | Personnel & Ordre B — DOS-01 → DOS-27 | Badge professionnel double face | Ligne du tableau, section Badges, profil collaborateur · Aperçu recto/verso/les deux, bascule de format CR80 ↔ planche A4, état du badge, échéance · `GET /badges/{id}/qr` (QR signé) · `POST /badges/{id}/impressions` | 04 |
| **M-129** | Personnel & Ordre B — DOS-01 → DOS-27 | Planche de badges | Section Badges → « Imprimer la planche » · Sélection multiple, format, nombre par feuille, aperçu paginé · `POST /badges/impressions/lot` | 04 |
| **M-130** | Personnel & Ordre B — DOS-01 → DOS-27 | Photo du collaborateur | Profil → onglet Badge, M-128 · Zone de dépôt, recadrage carré 400×400, aperçu · `POST /officines/{id}/upload` puis `PUT /employes/{id}` | 04 |
| **M-131** | Personnel & Ordre B — DOS-01 → DOS-27 | Perte, vol ou révocation de badge | M-128, liste des badges · Motif (`perdu`, `vole`, `deteriore`, `depart`, `autre`), date de constat, commentaire · `POST /badges/{id}/revoquer` → effet immédiat à la borne | 04 |
| **M-132** | Personnel & Ordre B — DOS-01 → DOS-27 | Profil collaborateur & dossier RH | Clic sur le nom ou la photo · 3 onglets : Général, Badge, Dossier · `GET /employes/{id}` · `PUT /employes/{id}` | 04 |
| **M-133** | Personnel & Ordre B — DOS-01 → DOS-27 | Historique des présences (global) | En-tête → « Historique des présences » · Recherche, filtre type, période, export CSV · `GET /officines/{id}/pointages?debut=&fin=` | 04 |
| **M-134** | Personnel & Ordre B — DOS-01 → DOS-27 | Historique par collaborateur | Ligne du tableau → « Historique » · Tableau des mouvements, méthode, statut, export CSV individuel · `GET /officines/{id}/employes/{id}/pointages` | 04 |
| **M-135** | Personnel & Ordre B — DOS-01 → DOS-27 | Correction d'oubli (POI-09) | Section Corrections → « Déclarer un oubli » · Collaborateur, type, date, heure réelle, motif (liste close + texte), justificatif · `POST /pointages/corrections` + `POST /signatures` | 04 |
| **M-136** | Personnel & Ordre B — DOS-01 → DOS-27 | Signature par code personnel *(partagée, refondue)* | Toute action exigeant un visa · Code à 4+ chiffres, rappel de l'action et de l'article BPD · `POST /signatures` → vérification serveur, HMAC, horodatage serveur | 04 |
| **M-137** | Personnel & Ordre B — DOS-01 → DOS-27 | Demande d'absence ou de congé (POI-10) | Section Absences → « Nouvelle demande » · Collaborateur, type, dates, demi-journées, motif, remplacement proposé · `POST /officines/{id}/absences` | 04 |
| **M-138** | Personnel & Ordre B — DOS-01 → DOS-27 | Justificatif d'absence | M-137, liste des absences · Téléversement du certificat, date, confidentialité · `POST /officines/{id}/upload` | 04 |
| **M-139** | Personnel & Ordre B — DOS-01 → DOS-27 | Validation d'absence par le titulaire | Liste des absences en attente · Décision, commentaire, contrôle de continuité, signature · `PUT /absences/{id}/valider` | 04 |
| **M-140** | Personnel & Ordre B — DOS-01 → DOS-27 | Création de créneau de planning (POI-07) | Section Plannings → « Créer créneau » · Type, jour ou date, horaires, responsable, effectif cible par poste · `POST /officines/{id}/plannings` + contrôle PLN-03 | 04 |
| **M-141** | Personnel & Ordre B — DOS-01 → DOS-27 | Affectation d'équipe et suppléance | Grille de planning · Collaborateurs affectés, suppléants, alerte si tranche sans pharmacien · `PUT /plannings/{id}/affectations` | 04 |
| **M-142** | Personnel & Ordre B — DOS-01 → DOS-27 | Alerte de continuité pharmaceutique | Automatique, ou clic sur le bandeau rouge · État courant, dernier pharmacien pointé, durée de l'interruption, actions proposées · lecture seule · `POST /non-conformites` (pré-remplie) | 04 |
| **M-143** | Personnel & Ordre B — DOS-01 → DOS-27 | Dérogation de vente sans pharmacien | Caisse ou dispensation bloquée · Motif obligatoire, durée, signature responsable, notification promoteur · `POST /caisse/ventes` avec `derogation` · écriture au journal d'audit | 04 |
| **M-144** | Personnel & Ordre B — DOS-01 → DOS-27 | Paramètres art. 1.11 | Section Paramètres · Tolérance de retard, mode présence, validité badge, longueur PIN, seuil de corrections, plage horaire de nuit, durée légale · `PUT /officines/{id}/parametres/{cle}` + motif + signature | 04 |
| **M-145** | Personnel & Ordre B — DOS-01 → DOS-27 | Rapport de présence | Section Rapports · Période, périmètre (tous / un collaborateur / un poste), options d'export · `GET /officines/{id}/presence/rapport` | 04 |
| **M-146** | Personnel & Ordre B — DOS-01 → DOS-27 | Feuille d'émargement (aperçu) | Section Rapports → « Feuille de présence » · Aperçu du document, cartouche, cadre de signature, export PDF · `GET /presence/feuille-emargement?debut=&fin=` | 04 |
| **M-147** | Personnel & Ordre B — DOS-01 → DOS-27 | Nouveau collaborateur | Section Équipe (personnel) · Identité, poste (liste close), coordonnées, date d'embauche, habilitations initiales · `POST /officines/{id}/employes` | 04 |
| **M-148** | Personnel & Ordre B — DOS-01 → DOS-27 | Modification ou désactivation de fiche | Profil collaborateur · Champs modifiables, motif de désactivation, conséquence sur les badges · `PUT /officines/{id}/employes/{id}` | 04 |
| **M-149** | Personnel & Ordre B — DOS-01 → DOS-27 | Réinitialisation du code personnel | Profil → onglet Badge · Nouveau code généré, affichage unique, ancienne valeur révoquée, signature · `POST /employes/{id}/pin/reinitialiser` | 04 |
| **M-150** | Personnel & Ordre B — DOS-01 → DOS-27 | Inscription Ordre section B | Section Ordre · Numéro d'Ordre, section, dates d'inscription et d'échéance, `en_regle`, justificatif · `POST /officines/{id}/inscriptions-ordre` | 04 |
| **M-151** | Personnel & Ordre B — DOS-01 → DOS-27 | Édition de l'organigramme | Section Organigramme · Rattachements, suppléances, encadrement pharmaceutique · `PUT /officines/{id}/organigramme` | 04 |
| **M-152** | Personnel & Ordre B — DOS-01 → DOS-27 | Action de formation | Section Formations · Thème, public, organisme, dates, coût, participants, attestation · `POST /officines/{id}/formations` | 04 |
| **M-153** | Personnel & Ordre B — DOS-01 → DOS-27 | Entretien individuel | Section Entretiens · Exercice, objectifs, évaluation, axes de progrès, signatures · `POST /officines/{id}/entretiens` | 04 |
| **M-154** | Personnel & Ordre B — DOS-01 → DOS-27 | Visite médicale et aptitude | Section Intégration & Suivi · Médecin, date, aptitude, prochaine échéance, justificatif · `PUT /employes/{id}/visite-medicale` | 04 |
| **M-155** | Personnel & Ordre B — DOS-01 → DOS-27 | Création de NC depuis une anomalie de présence | Alertes continuité, corrections répétées, absence non justifiée, inscription échue · Pré-remplie : gravité, processus `GAC`, article 1.11, description, responsable · `POST /officines/{id}/non-conformites` (existant, `bpd-communs.tsx:264`) | 04 |
| **M-156** | Personnel & Ordre B — DOS-01 → DOS-27 | Sortie du mode borne | Borne → « Quitter » · Code responsable, confirmation · `POST /bornes/{id}/session/fermer` | 04 |
| **M-157** | Personnel & Ordre B — DOS-01 → DOS-27 | Journal des accès aux dossiers du personnel | Profil → onglet Dossier · Liste horodatée des consultations, filtre par acteur · `GET /employes/{id}/acces` (issu de `audit_logs`) | 04 |
| **M-158** | Stock | Nouveau produit / modification | Section Produits · Dénomination, DCI, forme, laboratoire, groupe fiscal (liste close), seuil d'alerte, prix · `POST /produits` (existant) | 05 |
| **M-159** | Stock | Fiche produit | Ligne du tableau · 5 onglets : identité, lots, mouvements, prix, historique · `GET /produits/{id}` | 05 |
| **M-160** | Stock | Réception de livraison | Section Réception · Fournisseur, n° BL, date, transporteur, conditions de transport, chaîne du froid, 5 contrôles, pièces jointes, lignes · `POST /receptions` (nouveau) + `POST /stocks` | 05 |
| **M-161** | Stock | Ligne de réception | M-160 · Produit, numéro de lot, quantité, péremption, prix unitaire, emplacement, décision par ligne · inclus dans M-160 | 05 |
| **M-162** | Stock | Validation ou refus de réception | Liste des réceptions · Décision, motifs par ligne, signature · `PUT /receptions/{id}/valider` | 05 |
| **M-163** | Stock | Rapprochement commande / BL / facture | M-160, liste · Écarts de quantité et de prix, décision, transmission en comptabilité · `POST /receptions/{id}/rapprocher` | 05 |
| **M-164** | Stock | Fiche de lot | Ligne de lot · Identité, quantités, emplacement, historique des statuts, mouvements, documents · `GET /stocks/{id}` | 05 |
| **M-165** | Stock | Changement de statut de lot | Fiche de lot, tableau · Nouveau statut, motif obligatoire, signature · `PUT /stocks/{id}/statut` (existant) | 05 |
| **M-166** | Stock | Mise en quarantaine | Fiche de lot, alerte · Motif, lien vers un avis de rappel ou une NC, durée attendue, signature · `POST /stocks/{id}/quarantaine` (existant) | 05 |
| **M-167** | Stock | Levée de quarantaine | Liste des quarantaines · Décision (`retour_fournisseur`, `liberation`, `destruction`), motif, signature · `POST /stocks/{id}/lever-quarantaine` (existant) | 05 |
| **M-168** | Stock | Nouvel emplacement | Section Emplacements · Code, libellé, type, capacité, zone de température · `POST /emplacements` (**existant, jamais appelé**) | 05 |
| **M-169** | Stock | Fiche emplacement | Ligne · Contenu, valorisation, relevés de température si enceinte, mouvements · `GET /emplacements/{id}` (existant) | 05 |
| **M-170** | Stock | Mouvement manuel | Section Mouvements · Type, lot, quantité, motif obligatoire, signature · `POST /mouvements` (**existant, jamais appelé**) | 05 |
| **M-171** | Stock | Fiche mouvement | Ligne · Origine, destination, source, acteur, pièce justificative · `GET /mouvements/{id}` | 05 |
| **M-172** | Stock | Nouvelle campagne d'inventaire | Section Inventaires · Type (annuel, tournant, inopiné), périmètre, date, équipe, double validateur · `POST /inventaires` (existant) | 05 |
| **M-173** | Stock | Comptage d'une ligne | Campagne · Quantité théorique masquée ou affichée selon le mode, quantité comptée, commentaire · `POST /inventaires/{id}/lignes/{ligneId}/compter` (existant) | 05 |
| **M-174** | Stock | Justification d'écart | Campagne, ligne en écart · Écart, justification contradictoire, analyse 5M, NC rattachée, signature · `POST /inventaires/{id}/lignes/{ligneId}/justifier` (nouveau) | 05 |
| **M-175** | Stock | Validation d'inventaire (double) | Campagne · Deux signatures distinctes, PV généré · `POST /inventaires/{id}/valider` (existant) + `POST /signatures` | 05 |
| **M-176** | Stock | Avis de rappel | Section Quarantaine · Autorité émettrice, référence, produits et lots concernés, motif, décision, effet automatique sur les lots · `POST /rappels` (existant) | 05 |
| **M-177** | Stock | Destruction de déchet | Section Déchets · Bordereau, filière, date, témoin, deux signatures · `POST /dechets/{id}/detruire` (existant) | 05 |
| **M-178** | Stupéfiants | Écriture au registre | Date, patient ou ordonnance, prescripteur, produit, quantité en lettres et en chiffres, solde, signature · `POST /stupefiants` (existant) | 05 |
| **M-179** | Stupéfiants | Écriture rectificative | Écriture d'origine, motif, nouvelle valeur, signature · `POST /stupefiants/{id}/rectificative` (existant) | 05 |
| **M-180** | Stupéfiants | Visa d'une écriture | Code personnel vérifié serveur · `POST /stupefiants/{id}/viser` + `POST /signatures` | 05 |
| **M-181** | Stupéfiants | Inventaire des stupéfiants | Deux compteurs, contenu attendu, contenu compté, écarts, PV, deux signatures · `POST /stupefiants/inventaire` (existant) | 05 |
| **M-182** | Stupéfiants | Déclaration de vol ou de perte | Date de constat, produits, quantités, circonstances, plainte, notification autorité, PV · `POST /stupefiants/declaration-vol` (existant) | 05 |
| **M-183** | Stupéfiants | Demande de destruction | Produits, quantités, motif, autorisation, témoin, filière · `POST /stupefiants/demande-destruction` (existant) | 05 |
| **M-184** | Stupéfiants | Consultation de la balance permanente | Période, produit, rapprochement armoire, écart, NC · `GET /stupefiants/balance` (existant) | 05 |
| **M-185** | Stupéfiants | Copie du registre | Période, portée, destinataire, motif, mention « Copie non contrôlée », journalisation · `POST /stupefiants/copies` (nouveau) | 05 |
| **M-186** | Préparations | Nouvelle préparation | Formule (catalogue), forme, quantité, destination, DLU calculée, numéro de lot · `POST /preparations` (existant) | 05 |
| **M-187** | Préparations | Choix et consultation d'une formule | Composition, mode opératoire, DLU, conservation, indice de révision, statut d'approbation · `GET /formules-preparation` (nouveau) | 05 |
| **M-188** | Préparations | Pesée des matières premières | Par matière : lot (FEFO), quantité théorique, quantité pesée, écart, balance, étalonnage · `POST /preparations/{id}/pesee` (nouveau) | 05 |
| **M-189** | Préparations | Contrôle avant libération | Aspect, pH, masse, volume, identité, conformité, signature · `POST /preparations/{id}/controles` (nouveau) | 05 |
| **M-190** | Préparations | Libération par le pharmacien | Décision, réserve, code personnel vérifié · `POST /preparations/{id}/viser` (existant) | 05 |
| **M-191** | Préparations | Génération d'étiquette | Format (flacon, pot, sachet, tube), mentions obligatoires, aperçu, impression · `POST /preparations/{id}/etiquette` (nouveau) | 05 |
| **M-192** | Préparations | Matière première | Dénomination, grade, fournisseur, certificat d'analyse, lots · `POST /matieres-premieres` (nouveau) | 05 |
| **M-193** | Préparations | Rapport de préparation | Période, forme, préparateur, export · `GET /preparations/rapport` (nouveau) | 05 |
| **M-194** | Transverses | Signature par code personnel | Composant partagé refondu (M-136 du volet 4) : vérification serveur, HMAC, horodatage serveur | 05 |
| **M-195** | Transverses | Téléversement de pièce | `ZoneDepot` normalisé : types acceptés, taille maximale, aperçu, rattachement à l'objet, journalisation — **nécessite `POST /api/upload` fonctionnel** | 05 |
| **M-196** | Transverses | Création de non-conformité | `BoutonCreerNC` pré-rempli depuis un écart, une excursion, un contrôle en échec, un rappel | 05 |
| **M-197** | Transverses | Aperçu de document imprimable | `modale-apercu-document` existant : cartouche réglementaire, pagination, export PDF | 05 |
| **M-198** | Transverses | Confirmation motivée | Toute action irréversible (destruction, révocation, blocage de lot) exige motif + signature | 05 |
| **M-199** | Transverses | État d'erreur de données réglementaires | Remplace les replis silencieux (RG-26) : message, code, heure, bouton « Réessayer », lien vers le support | 05 |
| **M-200** | Qualité environnement | Saisie d'un relevé de température | `POST …/temperatures` (existant) | 06 |
| **M-201** | Qualité environnement | Décision après excursion | quarantaine / retour fournisseur / levée / destruction + signature + effet sur les lots | 06 |
| **M-202** | Qualité environnement | Import CSV de relevés | `POST …/temperatures/csv` (existant) | 06 |
| **M-203** | Qualité environnement | Capteur : déclaration et étalonnage | `POST /capteurs`, `POST /etalonnages` | 06 |
| **M-204** | Qualité environnement | Intervention de maintenance / nettoyage / traitement nuisibles | `POST …/nettoyages` (existant), `suivis_documentaires/maintenance` (existant), `POST /traitements-nuisibles` | 06 |
| **M-205** | Qualité environnement | Campagne d'auto-évaluation : ouverture, cotation, clôture | `POST …/nouvelle-complete` (existant), `PUT …/evaluer/{id}` (existant), `POST …/cloturer` | 06 |
| **M-206** | GED & amélioration continue | Nouveau document | `POST …/documents` (existant) | 06 |
| **M-207** | GED & amélioration continue | Approbation d'un document | `approbation-document.tsx` + signature | 06 |
| **M-208** | GED & amélioration continue | Diffusion et accusé de réception | `POST …/documents/{id}/diffusions` | 06 |
| **M-209** | GED & amélioration continue | Révision d'un document | `PUT …/documents/{id}` (existant) | 06 |
| **M-210** | GED & amélioration continue | Qualification d'un document | `qualification-document.tsx` | 06 |
| **M-211** | GED & amélioration continue | Import du corpus de référence | `imports-corpus.tsx` + vérification `sha256` | 06 |
| **M-212** | GED & amélioration continue | Aperçu et impression d'un document | `modale-apercu-document` (existant) | 06 |
| **M-213** | GED & amélioration continue | Instanciation d'un modèle BPD | `POST …/modeles-bpd/{id}/instancier` (existant) | 06 |
| **M-214** | GED & amélioration continue | Adoption et divergence d'un modèle | `POST …/modeles-bpd/{id}/adopter` | 06 |
| **M-215** | GED & amélioration continue | Nouvelle non-conformité | `POST …/non-conformites` (existant, via `BoutonCreerNC`) | 06 |
| **M-216** | GED & amélioration continue | Analyse 5M et plan CAPA | `PUT …/non-conformites/{id}` (existant) | 06 |
| **M-217** | GED & amélioration continue | Vérification d'efficacité et clôture | `PUT …/non-conformites/{id}` + signature | 06 |
| **M-218** | GED & amélioration continue | Échéance : création, clôture, report | `POST/PUT /officines/{id}/echeances` | 06 |
| **M-219** | Finance & audit | Saisie d'une écriture comptable | `POST /comptabilite/ecritures` (**501 à corriger**) | 06 |
| **M-220** | Finance & audit | Extourne d'une écriture | `POST /comptabilite/ecritures/{id}/extourne` (**501 à corriger**) | 06 |
| **M-221** | Finance & audit | Clôture mensuelle ou annuelle | `POST /comptabilite/clotures` | 06 |
| **M-222** | Finance & audit | Lettrage d'un tiers | `POST /comptabilite/lettrages` | 06 |
| **M-223** | Finance & audit | Rapprochement bancaire | `POST /comptabilite/rapprochements` | 06 |
| **M-224** | Finance & audit | États financiers : génération et export | `GET /comptabilite/etats?periode=` | 06 |
| **M-225** | Finance & audit | Vérification d'intégrité du journal | `GET …/audit-logs/verifier-integrite` (**501 à corriger**) | 06 |
| **M-226** | Finance & audit | Export signé du journal d'audit | `POST …/audit-logs/exports` | 06 |
| **M-227** | Finance & audit | Mode inspecteur : ouverture d'une session bornée | `POST …/sessions-inspecteur` | 06 |
| **M-228** | Finance & audit | Détail d'une entrée d'audit | `GET …/audit-logs/{id}` | 06 |
| **M-229** | Finance & audit | Réconciliation inter-modules | `GET /comptabilite/reconciliation` | 06 |
| **M-230** | Finance & audit | Déclaration fiscale / liasse | `POST /comptabilite/liasses` | 06 |
| **M-231** | Appareils, compte, paramètres, sécurité | Appairage d'un appareil | `POST …/appareils-autorises` (existant) | 06 |
| **M-232** | Appareils, compte, paramètres, sécurité | Révocation d'un appareil | `POST /appareils-autorises/{id}/revoquer` (**501 à corriger**) | 06 |
| **M-233** | Appareils, compte, paramètres, sécurité | Réactivation d'un appareil | `POST /appareils-autorises/{id}/reactiver` (**501 à corriger**) | 06 |
| **M-234** | Appareils, compte, paramètres, sécurité | Détail d'un appareil et de ses sessions | `GET …/appareils-autorises/{id}` | 06 |
| **M-235** | Appareils, compte, paramètres, sécurité | Révocation des autres sessions | `POST /auth/devices/revoke-others` (**501 à corriger**) | 06 |
| **M-236** | Appareils, compte, paramètres, sécurité | Registre des appareils : export | `GET …/appareils-autorises/registre` | 06 |
| **M-237** | Appareils, compte, paramètres, sécurité | Modification du profil | `PUT /auth/profile` (**501 à corriger**) | 06 |
| **M-238** | Appareils, compte, paramètres, sécurité | Demande de droit supplémentaire | `POST …/demandes-droits` | 06 |
| **M-239** | Appareils, compte, paramètres, sécurité | Exercice d'un droit sur les données | `POST …/demandes-donnees` | 06 |
| **M-240** | Appareils, compte, paramètres, sécurité | Modification d'un paramètre d'officine | `PUT …/parametres/{cle}` (existant) + motif + signature | 06 |
| **M-241** | Appareils, compte, paramètres, sécurité | Activation ou désactivation du MFA | `POST /auth/mfa/demarrer`, `POST /auth/verify-mfa`, `DELETE /auth/mfa` (existants) | 06 |
| **M-242** | Appareils, compte, paramètres, sécurité | Génération des codes de secours | `POST /auth/mfa/codes-secours` | 06 |
| **M-243** | Appareils, compte, paramètres, sécurité | Changement du mot de passe | `PUT /auth/password` (**501 à corriger**) | 06 |

## Répartition par cahier

| Cahier | Plage | Nombre | Périmètre |
| --- | --- | --- | --- |
| **02** | M-01 → M-42 | 42 | Tableau de bord, Groupe & Réseau, Comptoir & Caisse |
| **03** | M-43 → M-127 | 85 | Cartographie des 18 écrans restants |
| **04** | M-128 → M-157 | 30 | Présences, Pointage, Badges & Personnel |
| **05** | M-158 → M-199 | 42 | Stock, Magasin, Stupéfiants & Préparations |
| **06** | M-200 → M-243 | 44 | Qualité, GED, Finance, Compte & Sécurité |
| **Total** | M-01 → M-243 | **243** | 24 écrans, 132 sections |

## Composants de modale déjà présents dans le code

| Composant | Emplacement | État | À brancher sur |
| --- | --- | --- | --- |
| `ModaleFiche` · `ColonneFiche` · `Champ` | `components/modules/modale.tsx:16 / 64 / 89` | existe, importé par **`stock.tsx:48` uniquement** | toutes les modales formulaire des 24 écrans (RG-34) |
| `SignatureAgent` | `components/modules/bpd-communs.tsx` | existe | M-46, M-51, M-55, M-59, M-69, M-127 et toute validation |
| `BoutonCreerNC` | `components/modules/bpd-communs.tsx:264` | existe, `api.post` réel | M-97 depuis tous les écrans (RG-06) |
| `approbation-document.tsx` | `components/modules/` | existe | M-94 |
| `modale-apercu-document.tsx` | `components/modules/` | existe | aperçu et impression de document |
| `qualification-document.tsx` | `components/modules/` | existe | qualification de document |
| `imports-corpus.tsx` | `components/modules/` | existe | M-56, M-121 |
| `zone-depot.tsx` | `components/ui/` | existe, `zone-depot.tsx:58` appelle `POST /upload` | tout téléversement — **bloqué par le `501`** |
| `registre-documentaire.tsx` (113 l.) | `components/modules/` | existe | M-76, M-92 via `suivis_documentaires` (`mock-backend.mjs:507`) |
| `modale-profil-collaborateur` | — | existe | M-89 |
| `ModaleSignatureCode` | `pointage.tsx` | **à remplacer** : ne vérifie rien, `hash_signature` = `Date.now()` + `Math.random()` | M-128→M-157 (RG-15, lot L17) |
| état `modaleAbsence` | `pointage.tsx:108-112, 699` | **mort** : aucun `<Dialog>` rendu | M-146 (PRS-14→19, DEF-16) |

## Modales dont l'endpoint répond `501` en démonstration

| Modale | Endpoint | `api.php` | Appel |
| --- | --- | --- | --- |
| M-115 modification du profil | `PUT /api/auth/profile` | l.53 | `compte.tsx:146` |
| M-243 changement du mot de passe | `PUT /api/auth/password` | l.54 | `securite.tsx:224` |
| M-105 écriture manuelle | `POST /api/comptabilite/ecritures` | l.257 | `comptabilite.tsx:176` |
| M-106 extourne | `POST /api/comptabilite/ecritures/{id}/extourne` | l.258 | `comptabilite.tsx:195` |
| M-56, M-121 et tout dépôt de fichier | `POST /api/upload` | l.43 | `stock.tsx:346`, `stupefiants.tsx:174`, `preparations.tsx:136`, `zone-depot.tsx:58` |
| M-113 révocation d'appareil | `POST /api/appareils-autorises/{id}/revoquer` | l.65 | `appareils.tsx` |
| réactivation d'appareil | `POST /api/appareils-autorises/{id}/reactiver` | l.66 | `appareils.tsx` |
| M-126 révocation des autres sessions | `POST /api/auth/devices/revoke-others` | l.58 | `securite.tsx`, `appareils.tsx` |
| vérification d'intégrité du journal | `GET /api/officines/{id}/audit-logs/verifier-integrite` | l.84 | `journal.tsx:52` |

→ **lot L21**, à livrer avant tout le reste.
