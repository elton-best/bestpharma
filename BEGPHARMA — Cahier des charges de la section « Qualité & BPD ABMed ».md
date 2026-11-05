# BEGPHARMA — Cahier des charges de la section « Qualité & BPD ABMed »

Version 1.0 · 5 novembre 2026 · Dérivé du cahier des charges BEGPHARMA (§4.0 à 4.4 et 4.10 du module BPD, §8.1 pointage, §9.2 alertes, §12 traçabilité)

**Pages couvertes (9) :** Chaîne du froid 2-8 °C (`/temperatures`), Locaux & Matériel 5M (`/locaux`), Auto-évaluation 267 articles (`/auto-evaluation`), Pointage Présence art. 1.11 (`/pointage`), Personnel & Ordre B (`/personnel`), GED & Procédures (`/documents`), Modèles Types BPD 59 (`/modeles`), Non-conformités & CAPA (`/non-conformites`), Échéancier réglementaire (`/echeances`).

**Convention des références :** TEM, LOC, AUT, POI, PER, DOC, MOD, NCC, ECH selon la page. Les références du cahier d'origine sont rappelées entre crochets, par exemple \[BPD4-F04\] ou \[BPD-C06\]. Priorités : P1 indispensable, P2 important, P3 souhaitable.

## 0. Cadre commun à la section

### 0.1 Rôle de la section

Cette section numérise le Guide de bonnes pratiques de dispensation (BPD) de l'ABMed : elle apporte la preuve quotidienne de conformité (relevés, nettoyages, formations, signatures), pilote les écarts jusqu'à leur clôture et prépare l'inspection. Elle repose sur le même principe partout : **un cahier papier devient un registre électronique horodaté, signé, verrouillé après validation** \[BPD-C03\].

| Page | Rôle |
| --- | --- |
| `/temperatures` | Relevés de température, excursions, chaîne du froid |
| `/locaux` | Équipements, maintenance, étalonnage, nettoyage, locaux, système informatisé |
| `/auto-evaluation` | Grille des 267 articles, scores, campagnes d'audit |
| `/pointage` | Présence du personnel, règle du pharmacien présent |
| `/personnel` | Dossiers, inscription à l'Ordre, habilitations, formations |
| `/documents` | GED : procédures, versions, signatures, diffusion |
| `/modeles` | Bibliothèque de modèles types fournis par BEG |
| `/non-conformites` | Non-conformités et actions correctives et préventives |
| `/echeances` | Calendrier de toutes les échéances réglementaires |

### 0.2 Accès par rôle

A = administre et valide · E = saisit · V = valide seulement · L = lecture · – = aucun accès.

| Domaine | Promoteur | Pharmacien | RMQ | Dispensateur | Caissier | Magasinier | Comptable | Inspecteur |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SMQ, CAPA, revue de direction | L | A | A | L | – | – | – | L |
| GED et enregistrements | L | V | A | L | – | E | – | L |
| RH, formations, habilitations | A | V | E | – | – | – | E | L |
| Locaux, équipements, températures | L | V | E | E | – | E | – | L |
| Auto-inspection et audits | L | V | A | – | – | – | – | L |

Le pointage et l'échéancier ne figurent pas dans la matrice d'origine. Proposition à valider : pointage rattaché au domaine « RH » (le promoteur administre, chaque agent pointe lui-même) ; échéancier visible de tous les rôles pour leurs propres échéances, administré par le RMQ. L'agent d'entretien n'a accès qu'aux check-lists de nettoyage et aux relevés de température sur mobile.

### 0.3 Gestion des fichiers : téléversement, glisser-déposer, téléchargement

**Téléversement**

- Entrées : glisser-déposer, sélecteur de fichiers, caméra directe (mobile et tablette).
- Formats : JPG, PNG, WebP, HEIC, PDF ; Word et Excel pour les imports ; CSV pour les données ; audio pour les notes vocales d'audit. Taille maximale 10 Mo par fichier (paramétrable).
- Contrôle du type réel, analyse antivirus côté serveur, refus clair avec le motif.
- Aperçu, rotation, recadrage, compression des photos côté client, barre de progression, reprise après coupure.
- Chaque fichier reçoit une empreinte SHA-256, un horodatage serveur, un auteur, un appareil et un lien vers son objet. Il est chiffré au repos.
- Hors-ligne : mise en file locale, envoi à la reconnexion avec l'heure de saisie conservée.
- Une pièce rattachée à un enregistrement validé ne se remplace ni ne se supprime : on ajoute une version. Conservation selon le type (3, 5, 10 ou 40 ans) avec verrou de suppression \[BPD-C07\].

**Imports par fichier** : un assistant en quatre étapes (dépôt, association des colonnes, aperçu avec lignes valides et invalides, résultat) ; rien n'est écrit avant confirmation ; rapport d'erreurs téléchargeable.

**Téléchargement et impression** : PDF, Word (documents), Excel, CSV, ZIP. Chaque export est journalisé. Toute impression d'un document diffusé porte la mention « Copie non contrôlée » et la date. Tout export réglementaire porte son code, sa version et la date d'édition \[BPD-C01\].

### 0.4 Conventions d'interface et règles transversales

- Mobile et tablette d'abord ; zones tactiles d'au moins 48 px ; interface en français ; dates JJ/MM/AAAA ; fuseau Africa/Porto-Novo.
- Barre d'état permanente : officine, utilisateur, réseau, nombre d'alertes critiques et d'échéances en retard.
- **Signature** : validation par code personnel, horodatage serveur et nom enregistrés dans le document \[BPD-C10\].
- **Codification** : tout document ou enregistrement porte un code PROCESSUS-TYPE-NUMÉRO, par exemple GAC-EN-004 \[BPD-C01\].
- **Lien avec l'article** : chaque enregistrement est relié à un ou plusieurs articles du Guide, ce qui alimente l'auto-évaluation \[BPD-C04\].
- **Non-conformité en un clic** : tout écart ouvre une fiche NC/CAPA préremplie depuis n'importe quel écran \[BPD-C05\].
- **Rappels** : toute échéance déclenche une notification à J-30, J-7 et J \[BPD-C06\].
- **Mode inspecteur** : vue en lecture seule filtrée par période, registre ou chapitre, avec export horodaté \[BPD-C08\].
- Une entrée de registre validée est immuable ; correction par écriture rectificative liée, avec motif.

## 1. Page « Chaîne du froid (2-8 °C) » (`/temperatures`)

### 1.1 Objectif

Prouver que les produits sont conservés dans les bonnes conditions : relevés réguliers par zone, détection immédiate d'une excursion, protection automatique du stock concerné et décision tracée du pharmacien.

### 1.2 Onglets

| Onglet | Contenu |
| --- | --- |
| Tournée du jour | Relevés prévus et réalisés, saisie rapide |
| Zones et enceintes | Zones surveillées, seuils, thermomètres associés |
| Courbes et historique | Courbes min / max par zone et par période |
| Excursions | Alertes, décisions, produits concernés |
| Rapports | Registres mensuels signés |
| Capteurs connectés | Sondes et enregistreurs (extension) |

### 1.3 Fonctionnalités

| Réf. | Fonctionnalité | Détail | Prio. |
| --- | --- | --- | --- |
| TEM-01 | Zones et seuils | Zones : magasin et hall (15 à 25 °C), enceinte réfrigérée (2 à 8 °C), autres zones ajoutables ; seuils paramétrables par zone ; thermomètre rattaché à chaque zone (fiche équipement de `/locaux`) | P1 \[BPD4-F04\] |
| TEM-02 | Planification | Deux relevés par jour au minimum et par zone ; horaires configurables ; rappel push aux agents concernés avant l'heure | P1 |
| TEM-03 | Saisie d'un relevé | Zone, température actuelle, minimum et maximum, heure serveur, agent ; photo du thermomètre en option ; commentaire ; signature par code personnel ; saisie en moins de 15 secondes sur mobile ; code QR collé sur chaque enceinte pour ouvrir directement la bonne zone | P1 |
| TEM-04 | Complétude | Relevés réalisés sur prévus ; un relevé manquant est signalé comme écart ; indicateur du tableau de bord (alerte sous 100 %) | P1 |
| TEM-05 | Détection d'une excursion | Valeur hors seuil : alerte immédiate par push et SMS au pharmacien et au promoteur (niveau critique), ouverture d'une fiche NC, passage des produits thermolabiles de la zone en statut « À évaluer » (non vendables) | P1 \[BPD4-F05\] |
| TEM-06 | Décision du pharmacien | Après une excursion : levée du statut, quarantaine, retour fournisseur ou destruction, avec motif, durée de l'excursion et signature ; effet immédiat dans `/stock` | P1 |
| TEM-07 | Appareil non étalonné | Un thermomètre non étalonné ou hors tolérance est signalé en rouge et ses relevés sont marqués comme non fiables | P1 \[BPD4-F03\] |
| TEM-08 | Incident technique | Déclaration d'une panne (frigo, climatiseur, onduleur, coupure d'électricité) avec durée, produits exposés et plan de secours ; lien vers la fiche équipement | P2 |
| TEM-09 | Courbes et historique | Courbes par zone, filtres par période, annotations (livraison, dégivrage, intervention) | P1 |
| TEM-10 | Rapports mensuels | Registres signés par zone : relevés, excursions, décisions ; conservation 5 ans | P1 \[GAC-EN-001, GAC-EN-002\] |
| TEM-11 | Température à la réception | Valeur saisie à la réception d'une livraison thermolabile dans `/stock`, rattachée à la réception | P1 \[BPD5-F05\] |
| TEM-12 | Capteurs connectés | Réception automatique des mesures de sondes ou d'enregistreurs, courbes continues, alertes ; le relevé manuel reste un contrôle croisé | P3 \[BPD4-F06\] |

### 1.4 Règles de gestion

- Un relevé validé est immuable ; une erreur se corrige par une entrée rectificative liée.
- Une valeur hors seuil ne peut pas être « corrigée » : elle déclenche toujours le circuit d'excursion.
- Les produits thermolabiles ne s'affectent qu'à une enceinte 2 à 8 °C \[BPD5-F10\].
- Les seuils et fréquences sont des paramètres de l'officine, jamais du code.
- Une zone sans aucun relevé dans le délai prévu est traitée comme une excursion potentielle (alerte au pharmacien).

### 1.5 Téléversements, glisser-déposer et téléchargements

| Contexte | Fichier |
| --- | --- |
| Relevé | Photo du thermomètre |
| Étalonnage | Certificat de l'organisme |
| Excursion | Preuves d'intervention, rapport du technicien, photos |
| Capteurs | CSV d'un enregistreur (assistant d'import) |

Glisser-déposer : dépôt des photos sur la ligne du relevé ; dépôt du CSV de l'enregistreur sur l'assistant d'import.

Téléchargements et modèles : registre des relevés magasin et hall (GAC-EN-001), registre de l'enceinte réfrigérée (GAC-EN-002), courbes en image et PDF, rapport d'excursions, planche de codes QR des zones à imprimer et plastifier.

### 1.6 Modales

Saisie d'un relevé · Alerte d'excursion et décision du pharmacien · Déclaration d'incident technique · Appareil non étalonné (détail) · Impression des codes QR.

### 1.7 Critères d'acceptation

- Une température hors seuil crée en moins de 30 secondes une alerte, une fiche NC et le statut « À évaluer » des produits thermolabiles de la zone.
- Un relevé se saisit hors-ligne et se synchronise sans doublon.
- Un relevé signé ne peut plus être modifié.
- Le rapport mensuel d'une zone se génère en un clic avec toutes les signatures.
- Un agent d'entretien peut saisir un relevé mais ne peut pas lever une excursion.

## 2. Page « Locaux & Matériel (5M) » (`/locaux`)

### 2.1 Objectif

Maîtriser le matériel et le milieu de travail : inventaire et carnet de vie des équipements, maintenance et étalonnage, nettoyage, conformité des locaux, système informatisé et sécurité des données.

**À confirmer :** le libellé « 5M » désigne la méthode des cinq M (Main-d'œuvre, Matériel, Matière, Méthode, Milieu) utilisée par le cahier pour l'analyse des causes des non-conformités \[BPD1-F09\]. La page porte les deux M qui la concernent, Matériel et Milieu, et permet de les rattacher aux non-conformités (LOC-13).

### 2.2 Onglets

| Onglet | Contenu |
| --- | --- |
| Équipements | Inventaire et carnet de vie |
| Maintenance | Plan annuel, ordres de travail, dépannages |
| Étalonnage | Appareils de mesure et certificats |
| Nettoyage | Check-lists par zone |
| Nuisibles et sécurité | Lutte contre les nuisibles, extincteurs, consignes |
| Conformité des locaux | Check-list illustrée de photos, plan des zones |
| Système informatisé | Dossier du système, sauvegardes, accès, continuité |

### 2.3 Fonctionnalités

| Réf. | Fonctionnalité | Détail | Prio. |
| --- | --- | --- | --- |
| LOC-01 | Inventaire et carnet de vie | Fiche par matériel (frigo, climatiseur, onduleur, balance, ordinateur, thermomètre) : identifiant, date d'acquisition, statut, fournisseur, garantie, localisation, photo, notice, périodicités de maintenance et d'étalonnage, historique | P1 \[BPD4-F01\] |
| LOC-02 | Plan et cahier de maintenance | Planification annuelle ; ordres de travail sur mobile ; alerte avant échéance ; dépannages enregistrés ; prestataire lié à la sous-traitance ; preuve d'intervention | P1 \[BPD4-F02\] |
| LOC-03 | Étalonnage | Date, organisme, résultat, certificat joint ; appareil non étalonné ou hors tolérance signalé en rouge, ses relevés marqués | P1 \[BPD4-F03\] |
| LOC-04 | Nettoyage et bio-nettoyage | Check-lists interactives par zone (comptoir, réserve, vestiaires, sanitaires), fréquence, produit utilisé, signature de l'agent, contrôle par l'encadrement ; photo avant et après en option | P1 \[BPD4-F07\] |
| LOC-05 | Lutte contre les nuisibles | Calendrier des interventions, rapport du prestataire, constats | P2 \[BPD4-F08\] |
| LOC-06 | Conformité des locaux | Check-list illustrée de photos : emplacement conforme à la licence, locaux d'un seul tenant, espace de confidentialité, zones de stockage, armoire fermée des stupéfiants, dispositif d'isolement hors heures d'ouverture, signalétique, sanitaires et vestiaires, accès des clients ; score par rubrique | P2 \[BPD4-F09\] |
| LOC-07 | Sécurité des installations | Registre des extincteurs et contrôles, stockage des liquides inflammables et des gaz médicaux, consignes | P2 \[BPD4-F10\] |
| LOC-08 | Dossier du système informatisé | Description, contrat de maintenance, preuves de certification et de validation, journal des mises à jour, banque de données médicaments et date de sa dernière mise à jour | P1 \[BPD4-F12\] |
| LOC-09 | Sécurité informatique | Procédure d'autorisation d'accès signée, journal des accès, politique de mots de passe, journal des sauvegardes (date, résultat, lieu externe), essai de restauration | P1 \[BPD4-F13\] |
| LOC-10 | Plan de continuité | Fiche réflexe imprimable (cahiers de secours, procédure de reprise) ; test annuel enregistré | P2 \[BPD4-F14\] |
| LOC-11 | Plan des locaux | Plan téléversé avec zones (comptoir, réserve, frigo, armoire sécurisée, confidentialité) reliées aux emplacements de `/stock` | P2 |
| LOC-12 | Déclaration de modification substantielle | Préparation du dossier pour l'autorité en cas de changement des conditions d'installation | P3 \[BPD4-F11\] |
| LOC-13 | Vue 5M | Rattachement d'une non-conformité au M concerné (Matériel ou Milieu) et statistiques par équipement et par zone | P2 |

### 2.4 Règles de gestion

- Un équipement hors service ou non étalonné ne peut pas être sélectionné comme thermomètre d'une zone.
- Une échéance de maintenance ou d'étalonnage dépassée passe en alerte et alimente `/echeances`.
- Une check-list de nettoyage signée est immuable ; un contrôle de l'encadrement est une seconde signature.
- Les sauvegardes échouées déclenchent une alerte critique.
- Les journaux d'accès au système ne se modifient pas.

### 2.5 Téléversements, glisser-déposer et téléchargements

| Contexte | Fichier |
| --- | --- |
| Équipement | Photo, notice, facture, garantie |
| Maintenance et nuisibles | Rapport du prestataire, bon d'intervention |
| Étalonnage | Certificat |
| Locaux | Photos de chaque point de la check-list, plan des locaux |
| Système informatisé | Contrat, certificats de validation, preuves de sauvegarde et de restauration |
| Inventaire initial | CSV ou Excel des équipements (assistant d'import) |

Glisser-déposer : dépôt de plusieurs photos sur un point de check-list ; dépôt du plan sur l'onglet Conformité ; dépôt du CSV d'inventaire.

Téléchargements et modèles : inventaire des équipements (GAR-EN-001), plan et cahier des maintenances (GAR-PL-003), plan de nettoyage et registre d'entretien (GAR-PL-004), fiche réflexe de continuité, dossier du système informatisé (PDF), étiquette d'équipement avec code QR.

### 2.6 Modales

Fiche équipement · Ordre de travail · Saisie d'un étalonnage · Check-list de nettoyage · Point de conformité avec photo · Journal de sauvegarde · Déclaration d'une modification.

### 2.7 Critères d'acceptation

- Un thermomètre dont l'étalonnage a expiré apparaît en rouge et ses relevés sont marqués.
- Une maintenance planifiée génère une alerte à J-30, J-7 et J, puis un ordre de travail.
- Une check-list de nettoyage se signe sur mobile, hors-ligne.
- Un échec de sauvegarde produit une alerte critique.
- Le dossier du système informatisé s'exporte en un PDF unique pour l'inspecteur.

## 3. Page « Auto-évaluation 267 articles » (`/auto-evaluation`)

### 3.1 Objectif

Montrer à tout instant le niveau de conformité de l'officine, chapitre par chapitre, planifier les audits internes, transformer chaque écart en action corrective et produire le rapport d'auto-inspection prêt à présenter à l'ABMed. C'est la vitrine du module BPD.

### 3.2 Onglets

| Onglet | Contenu |
| --- | --- |
| Tableau de bord | Score global, scores par chapitre, évolution |
| Campagnes | Évaluations en cours et clôturées |
| Grille des 267 articles | Cotation, commentaires, preuves |
| Écarts et actions | Écarts ouverts et actions liées |
| Programme d'audit | Calendrier annuel, plans d'audit |
| Rapports | Rapports par processus et rapport global |
| Auditeurs | Fiches d'évaluation des auditeurs |

### 3.3 Fonctionnalités

| Réf. | Fonctionnalité | Détail | Prio. |
| --- | --- | --- | --- |
| AUT-01 | Grille des 267 articles | Numéro, chapitre, texte de l'article, cotation (Conforme, Écart mineur, Écart majeur, Non applicable), commentaire, preuve, responsable ; filtres par chapitre, processus, thème, statut ; recherche | P1 \[AE-01, BPD10-F03\] |
| AUT-02 | Calcul du score | Par chapitre et global ; Conforme = 1, Écart mineur = 0,5, Écart majeur = 0 ; Non applicable exclu du dénominateur ; pondération modifiable par le pharmacien | P1 \[AE-02\] |
| AUT-03 | Campagnes | Création (nom, périmètre, dates, auditeurs), statuts brouillon, en cours, clôturée ; une campagne clôturée est verrouillée ; audits thématiques ou à la demande | P1 |
| AUT-04 | Preuves | Rattachement de documents de la GED, d'enregistrements, de photos, de notes vocales et de la zone auditée ; collecte sur mobile hors-ligne | P1 \[BPD10-F04\] |
| AUT-05 | Évaluation assistée par les données | Quand le système possède la preuve (par exemple relevés complets pour l'article 5.20, formation enregistrée pour l'article 2.18), il propose la cotation et l'utilisateur confirme | P2 \[AE-03\] |
| AUT-06 | Écart vers action corrective | Tout écart ouvre automatiquement une action dans `/non-conformites` avec porteur et échéance | P1 \[AE-04, BPD10-F07\] |
| AUT-07 | Programme annuel d'auto-inspection | Calendrier par thème (chaîne du froid, traçabilité des stupéfiants, hygiène, qualification du personnel, dispensation, documentation, déchets) ; fréquence paramétrable | P1 \[BPD10-F01\] |
| AUT-08 | Plan d'audit | Périmètre, objectifs, critères, calendrier, équipe, processus audités | P1 \[BPD10-F02\] |
| AUT-09 | Indépendance des auditeurs | Un auditeur ne peut pas auditer son propre processus ; fiche d'évaluation des auditeurs ; invitation d'un expert externe en accès limité | P2 \[BPD10-F05\] |
| AUT-10 | Rapports d'audit | Génération automatique par processus et global : observations, synthèse des écarts, cartographie des risques, recommandations ; diffusion avec accusé de lecture | P1 \[BPD10-F06\] |
| AUT-11 | Rapport d'auto-inspection pour l'ABMed | Synthèse, cartographie des écarts et plan d'actions prêts à présenter | P2 \[AE-06\] |
| AUT-12 | Historique et progression | Comparaison des campagnes, courbe d'évolution ; alerte si le score baisse de plus de 5 points entre deux évaluations | P1 \[AE-05\] |
| AUT-13 | Suivi de l'efficacité | Contrôle de la mise en œuvre et du résultat de chaque action ; réouverture si inefficace | P1 \[BPD10-F08\] |
| AUT-14 | Traçabilité article ↔ fonctionnalité | Chaque article renvoie aux écrans et enregistrements qui l'appliquent, et inversement | P1 \[BPD-C04, §12\] |

### 3.4 Règles de gestion

- 100 % des articles du Guide figurent dans la grille ; aucun article ne peut être masqué, seulement coté Non applicable avec motif.
- Une cotation Écart mineur ou majeur sans commentaire est refusée.
- Une campagne clôturée est immuable ; une nouvelle évaluation ouvre une nouvelle campagne.
- L'auditeur désigné ne peut pas coter un article du processus dont il est pilote.

### 3.5 Téléversements, glisser-déposer et téléchargements

| Contexte | Fichier |
| --- | --- |
| Article | Photos, PDF, notes vocales |
| Référentiel | Texte des 267 articles du Guide (CSV ou Excel, à fournir) |
| Reprise | Évaluation papier existante (CSV ou Excel) |
| Auditeur externe | Rapport signé |

Glisser-déposer : dépôt de preuves directement sur une ligne de la grille ; dépôt du fichier de reprise sur l'assistant d'import.

Téléchargements et modèles : programme d'audit annuel (QAM-PL-002), plan d'audit (QAM-PL-003), grille d'évaluation BPD (QAM-FI-003), fiche d'évaluation des auditeurs (QAM-FI-004), rapports d'audit par processus et global (QAM-RA-001), plan CAPA (QAM-PL-004), rapport d'auto-inspection en PDF.

### 3.6 Modales

Cotation d'un article (cotation, commentaire, preuve, responsable) · Création d'une campagne · Plan d'audit · Ajout d'une preuve (fichier, photo, vocal) · Clôture de campagne · Pondération des scores · Invitation d'un auditeur externe.

### 3.7 Critères d'acceptation

- La grille contient 267 articles, tous filtrables par chapitre.
- Un écart ouvre une action avec porteur et échéance sans ressaisie.
- Le score global et ceux des 10 chapitres se recalculent immédiatement après chaque cotation.
- Un audit sur mobile se fait hors-ligne, avec photos, et se synchronise sans perte.
- Une campagne clôturée ne peut plus être modifiée.

## 4. Page « Pointage Présence (Art. 1.11) » (`/pointage`)

### 4.1 Objectif

Savoir qui est présent, prouver les heures travaillées et appliquer la règle de l'article 1.11 : **la dispensation et la caisse ne s'ouvrent que si un pharmacien inscrit est pointé présent**. Le pointage sert aussi à la paie et au contrôle de la continuité de service.

### 4.2 Onglets

| Onglet | Contenu |
| --- | --- |
| Borne de pointage | Écran plein écran de scan à l'entrée de l'officine |
| Présence en direct | Présents, en pause, absents, en retard ; pharmacien présent oui/non |
| Plannings | Horaires, équipes de jour et de nuit, gardes |
| Absences et congés | Demandes, justificatifs, décisions |
| Corrections | Oublis et corrections tracées |
| Badges | Génération, réémission, révocation |
| Appareils | Bornes et téléphones autorisés |
| Rapports | Feuilles de présence, synthèses, exports pour la paie |
| Paramètres | Tolérances, heures d'ouverture, mode de la règle du pharmacien |

### 4.3 Fonctionnalités

| Réf. | Fonctionnalité | Détail | Prio. |
| --- | --- | --- | --- |
| POI-01 | Badge d'identification | Badge individuel avec photo, nom, qualification et code QR signé propre à la personne ; option NFC | P1 \[BPD2-F06\] |
| POI-02 | Code QR dynamique | Sur téléphone, le code change toutes les quelques secondes pour empêcher le partage d'une photo | P2 |
| POI-03 | Borne de pointage | Tablette ou téléphone fixé à l'entrée, enregistré comme appareil autorisé ; scan par caméra ou lecteur ; retour immédiat visuel et sonore (nom, photo, heure, entrée ou sortie) ; entrée ou sortie déduite de l'état précédent | P1 |
| POI-04 | Pointage mobile personnel | Depuis le téléphone de l'agent, uniquement dans la zone de l'officine (géorepérage) et depuis un appareil enregistré ; réservé aux cas prévus par le promoteur | P3 |
| POI-05 | Preuve de présence | Horodatage fourni par le serveur ; photo de contrôle facultative ; appareil et lieu enregistrés | P1 |
| POI-06 | Hors-ligne | Pointage stocké sur l'appareil puis synchronisé avec l'heure locale sécurisée ; retour visuel immédiat même sans réseau | P1 |
| POI-07 | Plannings et équipes | Horaires par agent, équipes jour et nuit, gardes ; calendrier avec congés | P1 |
| POI-08 | Retards, départs anticipés, heures supplémentaires | Calcul automatique par rapport au planning ; tolérance paramétrable | P1 |
| POI-09 | Oubli et correction | Le responsable corrige avec motif, valeur proposée et trace ; la correction ne remplace jamais le pointage d'origine | P1 |
| POI-10 | Absences | Motif, justificatif, décision (autorisée, non autorisée), imputation sur les congés ou retenue | P1 |
| POI-11 | Règle du pharmacien présent | Fonction centrale lue par `/caisse` et `/dispensation` : au moins un pharmacien inscrit (inscription en cours de validité) pointé présent ; mode blocage ou alerte avec justification, selon le paramètre ; alerte critique au promoteur si aucun pharmacien n'est présent pendant les heures d'ouverture | P1 \[BPD-C09\] |
| POI-12 | Présence en direct | Liste en temps réel des présents, en pause, absents et en retard, visible du promoteur à distance | P1 |
| POI-13 | Rapports | Feuille de présence mensuelle par agent, synthèse des retards et absences, export pour la paie, rapport mensuel des heures d'ouverture sans pharmacien pointé | P1 \[BPD1-F03\] |
| POI-14 | Anti-fraude | Doubles pointages, pointages simultanés en deux lieux, pointages hors zone, horaires répétitifs inhabituels | P2 |
| POI-15 | Consentement et confidentialité | Information du personnel sur les données collectées (photo, lieu), accusé enregistré ; conservation et accès limités | P1 |
| POI-16 | Badge oublié ou perdu | Pointage manuel validé par le responsable avec motif ; révocation immédiate du badge perdu et réémission | P1 |

### 4.4 Règles de gestion

- L'heure d'un pointage est celle du serveur ; l'heure locale n'est qu'un champ de contrôle en mode hors-ligne.
- Un pointage n'est jamais supprimé : une correction crée une ligne rectificative liée.
- Un badge révoqué ou une personne désactivée est refusé à la borne.
- Un agent n'accède qu'à ses propres pointages ; le promoteur et le comptable lisent ceux de toute l'équipe, selon la matrice.
- Les heures d'ouverture, par jour et par officine, sont un paramètre : sans elles, la règle du pharmacien présent ne peut pas être évaluée.

### 4.5 Téléversements, glisser-déposer et téléchargements

| Contexte | Fichier |
| --- | --- |
| Badge | Photo de l'agent (cadrage et recadrage guidés) |
| Absence | Justificatif (certificat médical, courrier) |
| Plannings | Import CSV ou Excel (assistant d'import) |
| Correction | Pièce justifiant l'oubli |

Glisser-déposer : dépôt de la photo sur la fiche du badge ; dépôt du fichier de planning ; déplacement d'un créneau d'un agent à un autre dans le planning sur ordinateur, avec contrôle de la présence d'un pharmacien.

Téléchargements et modèles : badges en PDF (format carte), planche de badges, feuille de présence mensuelle, rapport des heures sans pharmacien, export de paie (CSV, Excel), tableau des congés (GAR-PL-002), code QR d'enregistrement de la borne.

### 4.6 Modales

Résultat de scan (accueil, refus) · Correction d'un oubli · Demande d'absence ou de congé · Génération et révocation d'un badge · Enregistrement d'un appareil · Consentement du personnel · Pointage manuel validé.

### 4.7 Critères d'acceptation

- Un scan valide affiche le nom, la photo et l'heure en moins de 2 secondes, en ligne ou hors-ligne.
- Sans pharmacien pointé présent, l'ouverture d'une session de caisse est bloquée ou exige une justification, selon le paramètre.
- Dix pointages saisis hors-ligne se synchronisent sans doublon ni perte.
- Une correction conserve le pointage d'origine visible.
- Un badge révoqué est refusé immédiatement.

## 5. Page « Personnel & Ordre B » (`/personnel`)

### 5.1 Objectif

Garantir un personnel qualifié, en nombre suffisant, placé sous la responsabilité d'un pharmacien inscrit à l'Ordre : dossiers, inscriptions, postes, habilitations, formations, entretiens, congés et contrats.

**À confirmer :** le libellé « Ordre B » vient de ta navigation. Le cahier parle de « la section de l'Ordre » pour le titulaire, les adjoints, les assistants et les remplaçants \[BPD2-F04\] sans détailler les sections. La liste des sections de l'Ordre et leur signification exacte doivent être confirmées avant de figer la liste des valeurs.

### 5.2 Onglets

| Onglet | Contenu |
| --- | --- |
| Équipe | Liste du personnel, statuts, filtres |
| Dossier individuel | Pièces, qualification, contrat |
| Inscription à l'Ordre | Numéro, section, validité, alertes |
| Postes et habilitations | Fiches de poste, fonctions autorisées |
| Organigramme | Organigramme nominatif imprimable |
| Formations et compétences | Plan annuel, matrice, émargements |
| Entretiens | Entretiens annuels et objectifs |
| Congés et contrats | Congés, contrats, périodes d'essai |
| Intégration et hygiène | Parcours des nouveaux, suivi de l'hygiène |

### 5.3 Fonctionnalités

| Réf. | Fonctionnalité | Détail | Prio. |
| --- | --- | --- | --- |
| PER-01 | Dossier individuel sécurisé | Identité, diplômes, attestations de stage, certificat médical d'aptitude, pièces d'identité ; case « original présenté » et copie archivée ; liste de pièces obligatoires par type de recrutement avec statut (manquante, fournie, expirée) | P1 \[BPD2-F03\] |
| PER-02 | Contrôle d'exercice | Numéro, section et validité de l'inscription à l'Ordre pour titulaire, adjoints, assistants et remplaçants ; alerte de renouvellement ; le système refuse de désigner comme pharmacien un utilisateur dont l'inscription est expirée | P1 \[BPD2-F04\] |
| PER-03 | Fiches de poste | Missions de chaque poste (titulaire, adjoint, assistant, responsable comptoir, caissière, auxiliaire, entretien, liaison) ; la délégation d'une fonction exige la qualification requise | P1 \[BPD2-F02\] |
| PER-04 | Habilitations | Chaque fonction de dispensation est liée à la qualification du dossier ; un auxiliaire ne dispense que dans son périmètre | P1 \[BPD2-F05\] |
| PER-05 | Organigramme | Généré à partir des dossiers ; affichage mobile et impression pour l'officine | P1 \[BPD2-F01\] |
| PER-06 | Effectif de pharmaciens requis | Nombre minimal paramétrable selon le chiffre d'affaires ou autre critère ; alerte si l'effectif inscrit est insuffisant | P2 \[BPD1-F02\] |
| PER-07 | Plan annuel de formation | Besoins issus de la matrice, sessions internes ou externes, e-learning, parcours de l'Ordre ; émargement électronique | P1 \[BPD2-F09\] |
| PER-08 | Matrice de compétences | Grille par poste et par agent : niveaux acquis, cibles, écarts | P2 \[BPD2-F07\] |
| PER-09 | Efficacité des formations | Fiche d'efficacité à chaud et à froid ; compte rendu diffusé | P2 \[BPD2-F10\] |
| PER-10 | Entretien annuel | Trame standard avec objectifs et moyens, signature des deux parties, planification automatique | P2 \[BPD2-F08\] |
| PER-11 | Formation initiale des nouveaux | Parcours d'intégration avec check-list qualité et BPD, validé avant toute dispensation autonome | P2 \[BPD2-F11\] |
| PER-12 | Hygiène du personnel | Programme d'hygiène, suivi des visites médicales, rappel des règles | P2 \[BPD2-F12\] |
| PER-13 | Contrats | Types (CDI, CDD, stage, prestation), dates, période d'essai et renouvellement avec rappel, modèles de contrat générés | P1 \[RH-02\] |
| PER-14 | Congés et continuité | Droits, soldes, demande sur mobile, validation, planning ; alerte si une période n'a aucun pharmacien affecté | P1 \[BPD2-F13, RH-04\] |
| PER-15 | Charte et engagement qualité | Signature électronique de la charte déontologique et de l'engagement qualité par chaque membre | P2 \[BPD1-F12\] |
| PER-16 | Sortie d'un agent | Désactivation du compte et du badge le jour du départ, restitution des accès, dossier archivé | P1 \[RH-07\] |
| PER-17 | Gestion des conflits | Fiche d'enregistrement et d'arbitrage, accès restreint | P3 \[BPD2-F14\] |
| PER-18 | Registre du personnel | Généré à partir des dossiers, exportable | P2 \[RH-03\] |

### 5.4 Règles de gestion

- Un dossier du personnel est visible du promoteur, du pharmacien et du comptable selon la matrice ; les pièces d'identité et médicales ne sont visibles que du promoteur et du titulaire.
- Une inscription expirée retire immédiatement la qualité de pharmacien de l'utilisateur dans toutes les pages (caisse, dispensation, pointage).
- Un agent désactivé conserve son historique, jamais supprimé.
- Les pièces d'un dossier sont conservées pendant la durée du contrat plus 5 ans.

### 5.5 Téléversements, glisser-déposer et téléchargements

| Contexte | Fichier |
| --- | --- |
| Dossier | Diplômes, attestations de stage, certificat médical, pièces d'identité, contrat signé |
| Inscription à l'Ordre | Carte ou attestation d'inscription |
| Formation | Feuille d'émargement, certificat |
| Entretien | Compte rendu signé |
| Reprise | CSV ou Excel du personnel (assistant d'import) |

Glisser-déposer : dépôt de plusieurs pièces sur le dossier avec classement par type proposé ; dépôt de la carte de l'Ordre sur l'onglet Inscription ; réordonnancement des blocs de l'organigramme sur ordinateur (cadre hiérarchique modifiable avec validation).

Téléchargements et modèles : organigramme nominatif et hiérarchique (GAR-DO-001), fiches de poste (GAR-FI-001), liste des pièces du dossier (GAR-LI-001), plan annuel de formation (GAR-PL-001), fiche d'évaluation du personnel (GAR-FI-002), tableau des congés (GAR-PL-002), fiche de gestion des conflits (GAR-FI-003), modèles de contrat, registre du personnel, dossier complet d'un agent en ZIP (accès restreint, journalisé).

### 5.6 Modales

Nouvel agent · Ajout d'une pièce · Saisie de l'inscription à l'Ordre · Désignation d'un pharmacien (avec contrôle) · Habilitation · Demande de congé · Émargement d'une formation · Entretien annuel · Sortie d'un agent.

### 5.7 Critères d'acceptation

- Un utilisateur dont l'inscription est expirée ne peut plus être désigné pharmacien ni valider une dispensation.
- Une alerte part à J-30, J-7 et J avant l'expiration d'une inscription.
- Une pièce manquante apparaît dans la liste de pièces du dossier avec le statut correct.
- Un agent sans habilitation de dispensation n'apparaît dans aucun choix de dispensateur.
- L'organigramme se génère et s'imprime à partir des dossiers sans ressaisie.

## 6. Page « GED & Procédures » (`/documents`)

### 6.1 Objectif

Maîtriser tout le cycle de vie des documents du système qualité : rédaction, vérification, approbation, diffusion contrôlée, révision, retrait et archivage, avec la preuve que chaque personne a lu la version en vigueur.

### 6.2 Onglets

| Onglet | Contenu |
| --- | --- |
| Bibliothèque | Documents en vigueur, filtrables, recherche plein texte |
| Mes tâches | Documents à vérifier, approuver ou lire |
| Éditeur de procédures | Rédaction structurée avec champs obligatoires |
| Versions et archives | Historique, comparaison, retrait |
| Diffusion et émargement | Listes de diffusion, accusés de lecture |
| Révisions | Documents dont la révision est due |
| Demandes de modification | Formulaires de demande et décisions |
| Cartographie des processus | Les cinq processus et leurs documents |
| Politique et revue de direction | Politique qualité, objectifs, rapport annuel |

### 6.3 Fonctionnalités

| Réf. | Fonctionnalité | Détail | Prio. |
| --- | --- | --- | --- |
| DOC-01 | Cycle de vie documentaire | Brouillon, vérifié, approuvé, diffusé, retiré ; chaque document porte nature, titre, objet, domaine, textes réglementaires cités, code, date, version, indice de révision ; aucun document n'entre en vigueur sans approbation | P1 \[BPD3-F01, F02\] |
| DOC-02 | Codification | Code automatique PROCESSUS-TYPE-NUMÉRO ; processus TAM, QAM, GAD, GAC, GAR ; types PR, MO, EN, FI, PL, LI, RA, DO ; numérotation continue | P1 \[BPD-C01\] |
| DOC-03 | Éditeur de procédures structurées | Champs obligatoires : objet, domaine d'application, qui, quand, où, comment, matériel et documents, maîtrise et enregistrement ; instructions de travail rattachées ; mise en forme avec titres, tableaux, images | P1 \[BPD1-F07\] |
| DOC-04 | Import de documents existants | Dépôt d'un fichier Word ou PDF converti en document de la GED ; le fichier d'origine reste joint | P1 |
| DOC-05 | Signatures | Rédacteur, vérificateur et approbateur signent par code personnel ; nom et horodatage inscrits dans le document ; un document signé est verrouillé | P1 \[BPD-C10\] |
| DOC-06 | Versions et comparaison | Chaque modification crée une version suivant le même circuit ; comparaison de deux versions avec surlignage des différences | P1 |
| DOC-07 | Diffusion contrôlée | Listes de diffusion par rôle ou personne ; accusés de lecture et émargement électronique ; seuls les documents en vigueur sont visibles des utilisateurs | P1 \[BPD3-F04\] |
| DOC-08 | Révision périodique | Périodicité par document ; alerte à l'échéance ; une modification d'un texte réglementaire, d'une pratique ou d'un matériel force une alerte de mise à jour | P1 \[BPD3-F03\] |
| DOC-09 | Archivage des versions | Anciennes versions retirées de la circulation, au moins un exemplaire conservé 5 ans ; verrou de suppression selon la durée du type | P1 \[BPD3-F05, BPD-C07\] |
| DOC-10 | Inventaire documentaire | Répertoire de tous les documents en vigueur, tenu à jour automatiquement, exportable | P1 \[BPD3-F06\] |
| DOC-11 | Demande de modification | Formulaire de traçabilité des évolutions de procédures, suivi de la décision | P2 \[BPD3-F07\] |
| DOC-12 | Cartographie des processus | Cinq processus avec fiche descriptive (finalité, pilote, interactions, ressources, entrées, sorties, indicateurs) ; chaque bloc donne accès aux procédures et enregistrements liés | P1 \[BPD1-F06\] |
| DOC-13 | Politique qualité et objectifs | Texte versionné, signature du titulaire, diffusion avec accusé de lecture, objectifs annuels mesurés | P1 \[BPD1-F05\] |
| DOC-14 | Contexte et parties intéressées | Fiche du contexte interne et externe, parties intéressées et leurs attentes, domaine d'application du SMQ | P2 \[BPD1-F08\] |
| DOC-15 | Revue de direction | Rapport annuel généré : indicateurs, écarts, non-conformités, résultats d'audit, satisfaction, décisions et ressources à prévoir | P2 \[BPD1-F11\] |
| DOC-16 | Médiathèque patient | Documents d'information santé validés par le pharmacien, mis à jour périodiquement, imprimables pour remise au patient | P2 \[BPD3-F13\] |
| DOC-17 | Registre des courriers et chèques | Flux administratifs entrants et sortants | P3 \[BPD3-F14\] |
| DOC-18 | Vérification d'une copie papier | Un code QR sur chaque impression permet de vérifier que la version imprimée est celle en vigueur | P2 |

### 6.4 Règles de gestion

- Un document approuvé ne se modifie pas : toute modification crée une nouvelle version et repasse par le circuit.
- Le rédacteur ne peut pas approuver son propre document ; vérificateur et approbateur sont des personnes distinctes (paramétrable pour un effectif de très petite taille, avec trace).
- Une version retirée n'est visible que des rôles d'audit et de contrôle.
- La suppression d'un document est impossible avant la fin de sa durée de conservation.
- Les durées de conservation sont définies par type (par exemple 5 ans après retrait pour la politique qualité).

### 6.5 Téléversements, glisser-déposer et téléchargements

| Contexte | Fichier |
| --- | --- |
| Document | Word, PDF, images et pièces jointes |
| Politique qualité | Version signée |
| Médiathèque | Documents des autorités, des laboratoires, des revues |
| Courriers | Scan des courriers et copies de chèques |

Glisser-déposer : dépôt d'un fichier Word ou PDF sur la bibliothèque pour créer un document ; dépôt de pièces jointes dans l'éditeur ; réordonnancement des étapes d'une procédure ; glisser un document vers une liste de diffusion.

Téléchargements et modèles : document en PDF avec code, version, date et signatures ; version Word éditable pour les rédacteurs ; copie imprimée « Copie non contrôlée » ; inventaire documentaire (QAM-LI-001) ; listes de diffusion et émargements (QAM-LI-002) ; fiche de demande de modification (QAM-FI-002) ; courriers et chèques (QAM-EN-001) ; politique qualité (TAM-DO-001) ; rapport de revue de direction (TAM-RA-001) ; archive ZIP d'un processus.

### 6.6 Modales

Nouveau document (processus, type, titre) · Circuit de validation (vérificateur, approbateur, diffusion) · Signature par code personnel · Comparaison de versions · Retrait d'un document · Demande de modification · Accusé de lecture.

### 6.7 Critères d'acceptation

- Un document n'apparaît pour les utilisateurs qu'une fois approuvé et diffusé.
- Une nouvelle version retire automatiquement l'ancienne de la circulation tout en la conservant.
- Un document dont la révision est due génère une alerte à J-30, J-7 et J.
- Un fichier Word déposé devient un document de la bibliothèque avec son code et sa première version.
- Le rédacteur ne peut pas signer comme approbateur du même document.
- L'inventaire documentaire se télécharge avec tous les documents en vigueur et leurs versions.

## 7. Page « Modèles Types BPD (59) » (`/modeles`)

### 7.1 Objectif

Livrer à chaque officine, dès son ouverture, la bibliothèque de documents et d'enregistrements du modèle BEG, prête à l'emploi : l'officine les adopte, les adapte à sa pratique, puis ils deviennent des documents ou des registres actifs.

**Écart à réconcilier :** le cahier annonce 59 documents et enregistrements. Les tableaux des chapitres 4.1 à 4.10 en listent environ 66 codes distincts (par exemple TAM, QAM, GAD, GAC, GAR). Le nombre exact et la liste définitive sont à fixer avec BEG avant l'import des modèles.

### 7.2 Onglets

| Onglet | Contenu |
| --- | --- |
| Catalogue | Tous les modèles, groupés par processus et par type |
| Mes adoptions | Modèles adoptés par l'officine et leur état |
| Mises à jour | Nouvelles versions des modèles de base |
| Modèles de l'officine | Modèles propres ajoutés par l'officine |

### 7.3 Fonctionnalités

| Réf. | Fonctionnalité | Détail | Prio. |
| --- | --- | --- | --- |
| MOD-01 | Catalogue des modèles | Liste filtrable par processus (TAM, QAM, GAD, GAC, GAR), type (PR, MO, EN, FI, PL, LI, RA, DO), chapitre du Guide, état d'adoption ; recherche par code ou intitulé | P1 \[BPD-C02\] |
| MOD-02 | Fiche d'un modèle | Code, intitulé, rôle, conservation par défaut, articles du Guide liés, aperçu, module de l'application qui l'utilise | P1 |
| MOD-03 | Adopter un modèle | Copie en brouillon dans `/documents`, modifiable par le titulaire ; le modèle d'origine reste intact | P1 |
| MOD-04 | Adaptation à l'officine | Variables préremplies (raison sociale, adresse, titulaire, licence, logo) ; personnalisation de l'en-tête sans toucher aux blocs réglementaires | P1 |
| MOD-05 | Registres actifs | Un modèle de type registre (EN) est relié au module qui le tient en électronique (voir 7.4) : il n'est pas rempli à la main | P1 \[BPD-C03\] |
| MOD-06 | Taux d'adoption | Nombre de modèles adoptés, approuvés et diffusés, sur le total ; liste des modèles manquants | P1 |
| MOD-07 | Mises à jour du catalogue | Quand BEG publie une nouvelle version d'un modèle, notification, comparaison avec la version adoptée, choix d'adopter ou de garder | P2 |
| MOD-08 | Modèles propres | L'officine ajoute ses propres modèles, codés selon la même règle | P2 |
| MOD-09 | Conservation par défaut | Durée de conservation héritée du modèle (3, 5, 10, 40 ans ou version en vigueur plus 5 ans), modifiable avec motif dans les limites réglementaires | P1 |
| MOD-10 | Lien avec les articles | Chaque modèle est relié aux articles qu'il sert, ce qui alimente l'auto-évaluation | P1 \[BPD-C04\] |

### 7.4 Correspondance entre les modèles et les pages de l'application

| Modèles | Page qui les tient |
| --- | --- |
| TAM-DO, TAM-FI, TAM-RA-001, QAM-PR-002, QAM-LI, QAM-FI-002, QAM-EN-001 | `/documents` |
| QAM-PR-001, QAM-FI-001, QAM-PL-001, QAM-PL-004 | `/non-conformites` |
| QAM-PL-002, QAM-PL-003, QAM-FI-003, QAM-FI-004, QAM-RA-001 | `/auto-evaluation` |
| GAR-DO-001, GAR-FI, GAR-LI-001, GAR-PL-001, GAR-PL-002 | `/personnel` |
| GAR-EN-001, GAR-PL-003, GAR-PL-004 | `/locaux` |
| GAC-EN-001, GAC-EN-002 | `/temperatures` |
| GAC-PR, GAC-EN-003 à GAC-EN-011, GAC-FI-001, GAC-DO-001 | `/stock` |
| GAD-EN-010, GAD-EN-011, GAD-EN-012 | `/stupefiants` |
| GAD-PR, GAD-MO-001, GAD-FI, GAD-EN-001 à GAD-EN-004, GAD-LI | `/dispensation` et `/caisse` |
| GAR-PR-001, GAR-LI-002 à GAR-LI-004, GAR-FI-004, GAR-EN-002 | Sous-traitance (page à venir dans la navigation) |

### 7.5 Règles de gestion

- Un modèle de base n'est modifiable que par BEG ; l'officine travaille toujours sur sa copie.
- Un modèle adopté suit le circuit de la GED : brouillon, vérifié, approuvé, diffusé.
- Un modèle de registre adopté ne peut pas être supprimé tant que le module correspondant l'utilise.
- Le code d'un modèle ne change jamais, même si son intitulé évolue.

### 7.6 Téléversements, glisser-déposer et téléchargements

| Contexte | Fichier |
| --- | --- |
| Catalogue de base | Modèles livrés par BEG (Word, PDF ou CSV d'import) |
| Personnalisation | Logo, en-tête et pied de page |
| Modèles propres | Word ou PDF |

Glisser-déposer : dépôt du logo sur l'en-tête ; dépôt d'un modèle propre pour l'ajouter au catalogue de l'officine.

Téléchargements : modèle vierge en PDF ou Word, catalogue complet en Excel, pack ZIP de tous les modèles adoptés, état d'adoption en PDF.

### 7.7 Modales

Aperçu d'un modèle · Adoption (confirmation, destination dans la GED) · Comparaison de versions · Personnalisation de l'en-tête · Ajout d'un modèle propre.

### 7.8 Critères d'acceptation

- Le catalogue affiche tous les modèles livrés, avec code, intitulé et conservation.
- L'adoption d'un modèle crée un brouillon dans `/documents` avec les variables de l'officine préremplies.
- Un modèle de registre est relié à son module et n'est pas téléchargeable comme cahier vierge de remplacement.
- Le taux d'adoption se calcule correctement après chaque adoption.

## 8. Page « Non-conformités & CAPA » (`/non-conformites`)

### 8.1 Objectif

Signaler chaque dysfonctionnement, comprendre ses causes, décider des actions, les suivre jusqu'à la clôture et vérifier leur efficacité. C'est le circuit commun à tous les modules : températures, réceptions, erreurs de délivrance, réclamations, écarts d'audit, écarts de registre.

### 8.2 Onglets

| Onglet | Contenu |
| --- | --- |
| Tableau de maîtrise | Vue Kanban des actions par statut |
| Liste | Toutes les non-conformités et actions, filtrables |
| Nouvelle non-conformité | Formulaire de déclaration |
| Analyse des causes | Outils 5M et 5 pourquoi |
| Plan CAPA | Actions correctives et préventives |
| Efficacité | Vérifications à planifier ou réalisées |
| Statistiques | Répartition par source, par M, par processus |

### 8.3 Fonctionnalités

| Réf. | Fonctionnalité | Détail | Prio. |
| --- | --- | --- | --- |
| NCC-01 | Déclaration | Source (module d'origine), description, date, gravité, zone, personnes concernées, pièces ; ouverture possible en un clic depuis n'importe quel écran avec préremplissage | P1 \[BPD-C05, BPD1-F09\] |
| NCC-02 | Sources automatiques | Excursion de température, anomalie de réception, écart de caisse, écart de registre des stupéfiants, erreur de délivrance, réclamation, écart d'audit, échec de sauvegarde : une fiche s'ouvre automatiquement | P1 |
| NCC-03 | Workflow | Détection, enregistrement, analyse des causes, actions, vérification d'efficacité, clôture ; chaque transition est signée et datée | P1 \[BPD1-F09\] |
| NCC-04 | Analyse des causes | Grille 5M (Main-d'œuvre, Matériel, Matière, Méthode, Milieu) et méthode des 5 pourquoi ; cause racine retenue | P1 |
| NCC-05 | Actions | Action corrective, curative ou préventive ; porteur, échéance, ressources, preuve de réalisation ; plusieurs actions par non-conformité | P1 \[BPD10-F07\] |
| NCC-06 | Tableau de maîtrise | Vue Kanban et vue liste par statut, porteur et échéance ; même table d'actions que le plan CAPA | P1 \[BPD1-F10\] |
| NCC-07 | Retards et escalade | Une action dépassant son échéance passe en alerte, notifie le porteur puis le RMQ puis le pharmacien | P1 |
| NCC-08 | Vérification de l'efficacité | Contrôle de la mise en œuvre et du résultat ; réouverture si l'action est inefficace | P1 \[BPD10-F08\] |
| NCC-09 | Gravité et priorités | Niveaux paramétrables ; une non-conformité grave notifie immédiatement le pharmacien et le promoteur | P1 |
| NCC-10 | Lien avec les autres pages | Depuis une fiche : accès à la température, au lot, au registre, à la réclamation ou à l'article du Guide concerné | P1 |
| NCC-11 | Statistiques | Répartition par source, par processus, par M ; délai moyen de clôture ; taux de réouverture ; diagramme de Pareto | P2 |
| NCC-12 | Revue de direction | Les non-conformités et actions de l'année alimentent le rapport de revue de direction | P2 \[BPD1-F11\] |
| NCC-13 | Réclamations et plaintes | Les réclamations clients non clôturées depuis plus de 7 jours (paramétrable) créent une alerte | P2 \[BPD8-F04\] |

### 8.4 Règles de gestion

- Une non-conformité n'est jamais supprimée ; elle est clôturée avec preuve ou annulée avec motif validé par le RMQ.
- Une clôture exige au moins une action réalisée et une vérification d'efficacité, sauf non-conformité sans suite justifiée.
- Les actions du plan CAPA et celles du tableau de maîtrise sont les mêmes lignes présentées de deux façons.
- Le porteur d'une action ne peut pas valider seul son efficacité.

### 8.5 Téléversements, glisser-déposer et téléchargements

| Contexte | Fichier |
| --- | --- |
| Déclaration | Photos, documents, copies d'écran |
| Action | Preuve de réalisation (photo, PDF, facture) |
| Analyse | Schéma ou diagramme (image) |

Glisser-déposer : dépôt de photos sur la fiche ; déplacement d'une carte du tableau Kanban d'un statut à l'autre (avec les contrôles de transition) ; glisser une action d'un porteur à un autre pour la réaffecter avec confirmation.

Téléchargements et modèles : fiche de traitement d'une non-conformité en PDF (QAM-FI-001), plan CAPA (QAM-PL-004), tableau de maîtrise d'actions (QAM-PL-001), liste filtrée en Excel, rapport mensuel des non-conformités.

### 8.6 Modales

Déclaration rapide · Analyse 5M · Nouvelle action · Clôture d'une action · Vérification d'efficacité · Escalade · Annulation avec motif.

### 8.7 Critères d'acceptation

- Une excursion de température ouvre une non-conformité préremplie sans aucune saisie.
- Une action en retard notifie le porteur et escalade selon la règle.
- Une non-conformité ne peut pas être clôturée sans preuve de réalisation et vérification d'efficacité.
- Un écart d'auto-évaluation crée une action visible dans le tableau de maîtrise.
- Le Kanban se met à jour en temps réel entre deux utilisateurs.

## 9. Page « Échéancier réglementaire » (`/echeances`)

### 9.1 Objectif

Rassembler en un seul calendrier toutes les échéances réglementaires de l'officine, pour qu'aucune licence, inscription, étalonnage, révision, déclaration ou audit ne soit oublié.

### 9.2 Onglets

| Onglet | Contenu |
| --- | --- |
| Calendrier | Vue mois, semaine, liste |
| À venir et en retard | Liste priorisée |
| Par catégorie | Filtres par domaine |
| Règles de rappel | Paramétrage des délais, canaux et destinataires |
| Historique | Échéances réalisées avec preuve |

### 9.3 Fonctionnalités

| Réf. | Fonctionnalité | Détail | Prio. |
| --- | --- | --- | --- |
| ECH-01 | Échéances automatiques | Alimentées par les autres pages : pièces et licence de l'officine, inscriptions à l'Ordre, contrats et périodes d'essai, étalonnages, maintenances, révisions de documents, actions CAPA, audits programmés, formations, essais de restauration, test du plan de continuité, extincteurs, nuisibles, agréments des fournisseurs et prestataires, calendrier fiscal et social | P1 \[BPD-C06\] |
| ECH-02 | Rappels | Notification à J-30, J-7 et J ; délais paramétrables par catégorie | P1 |
| ECH-03 | Niveaux et canaux | Critique (push et SMS), important (push), information (dans l'application) ; le promoteur choisit canal et plages horaires par type d'alerte | P1 \[§9.2, DSH-10\] |
| ECH-04 | Échéances manuelles | Création d'une échéance libre avec catégorie, responsable, récurrence | P1 |
| ECH-05 | Responsable et suivi | Chaque échéance a un responsable, un statut (à venir, en cours, réalisée, en retard) ; escalade au RMQ puis au promoteur en cas de retard | P1 |
| ECH-06 | Réalisation avec preuve | Marquer une échéance réalisée exige la pièce renouvelée ou la preuve ; la nouvelle date d'échéance se calcule automatiquement | P1 |
| ECH-07 | Report | Possible pour les échéances internes avec motif ; interdit pour les échéances réglementaires, qui ne peuvent qu'être réalisées ou signalées en retard | P1 |
| ECH-08 | Vues et filtres | Calendrier mois, semaine, liste ; filtres par catégorie, responsable, statut, niveau | P1 |
| ECH-09 | Résumé quotidien | Message envoyé à l'heure choisie avec les échéances du jour, de la semaine et les retards | P1 \[DSH-11\] |
| ECH-10 | Synchronisation calendrier | Export ou abonnement au format iCal pour le téléphone | P2 |
| ECH-11 | Visibilité par rôle | Chaque utilisateur voit les échéances qui le concernent ; le promoteur et le RMQ voient tout | P1 |
| ECH-12 | Alimentation du tableau de bord | Nombre d'échéances en retard et à venir dans le tableau de bord du promoteur | P1 |

### 9.4 Règles de gestion

- Une échéance générée par un module ne se modifie que dans ce module ; l'échéancier la reflète.
- Une échéance réglementaire en retard est toujours visible en rouge, quel que soit le filtre appliqué.
- Les notifications respectent les plages horaires du destinataire, sauf le niveau critique.
- Une échéance réalisée reste dans l'historique avec sa preuve pendant la durée de conservation du type.

### 9.5 Téléversements, glisser-déposer et téléchargements

| Contexte | Fichier |
| --- | --- |
| Réalisation | Pièce renouvelée (attestation, licence, certificat), preuve d'intervention |
| Import | CSV ou Excel d'échéances existantes (assistant d'import) |

Glisser-déposer : dépôt de la pièce renouvelée sur l'échéance pour la clôturer et recalculer la suivante ; déplacement d'une échéance interne d'un jour à l'autre dans le calendrier, avec motif.

Téléchargements : calendrier au format iCal, liste des échéances en PDF et Excel, rapport mensuel des échéances réalisées et en retard.

### 9.6 Modales

Nouvelle échéance · Clôture avec preuve · Report avec motif · Règles de rappel · Détail d'une échéance avec son module d'origine.

### 9.7 Critères d'acceptation

- Une inscription à l'Ordre qui expire dans 30 jours apparaît dans l'échéancier et déclenche la notification.
- Une échéance réglementaire ne peut pas être reportée.
- Le dépôt d'une attestation renouvelée clôture l'échéance et crée la suivante avec la bonne date.
- Le résumé quotidien arrive à l'heure choisie avec les échéances du jour.
- Les échéances d'un module se retrouvent sans doublon dans l'échéancier.

## 10. Exigences transversales de la section

### 10.1 Indicateurs du tableau de bord qualité

| Indicateur | Source | Alerte |
| --- | --- | --- |
| Score global et par chapitre | `/auto-evaluation` | Baisse de plus de 5 points entre deux évaluations |
| Non-conformités ouvertes et en retard | `/non-conformites` | Toute action dépassant son échéance |
| Relevés de température réalisés sur prévus | `/temperatures` | Moins de 100 % |
| Documents à réviser | `/documents` | Révision dépassée |
| Formations réalisées sur planifiées | `/personnel` | Retard |
| Réclamations clients non clôturées | Retours et réclamations | Plus de 7 jours (paramétrable) |
| Heures d'ouverture sans pharmacien pointé | `/pointage` | Toute occurrence |
| Échéances en retard | `/echeances` | Toute échéance réglementaire en retard |

### 10.2 Hors-ligne

| Fonction | Hors-ligne |
| --- | --- |
| Relevés de température | Oui |
| Pointage | Oui, avec synchronisation sécurisée de l'heure |
| Check-lists de nettoyage et de conformité | Oui |
| Audit et collecte de preuves | Oui, avec photos et notes vocales |
| Consultation de la bibliothèque documentaire | Oui, pour les documents en vigueur déjà chargés |
| Signatures et validations | En file, horodatage serveur à la synchronisation |

### 10.3 Sécurité, audit et conservation

- Journal d'audit sur chaque création, validation, signature, export et consultation de registre.
- Code personnel pour toute signature ; verrouillage après plusieurs essais ratés.
- Isolation stricte par officine ; données du personnel et pièces d'identité à accès restreint.
- Verrou de suppression selon les durées de conservation (3, 5, 10 et 40 ans selon le type).
- Mode inspecteur en lecture seule, limité dans le temps, journalisé.

## 11. Points à valider avant développement

| # | Point | Interlocuteur |
| --- | --- | --- |
| 1 | Signification et liste des sections de l'Ordre derrière « Ordre B » | Ordre des pharmaciens, BEG |
| 2 | Sens du libellé « 5M » et périmètre exact de la page Locaux | BEG |
| 3 | Nombre exact de modèles (59 annoncés, environ 66 codes recensés) et contenu de chaque modèle | BEG |
| 4 | Texte des 267 articles du Guide, au format exploitable | ABMed, BEG |
| 5 | Seuils de température, nombre minimal de relevés par jour et par zone | Pharmacien référent, Guide BPD |
| 6 | Pondération du score d'auto-évaluation validée | BEG, pharmacien référent |
| 7 | Mode de la règle du pharmacien présent : blocage ou alerte avec justification, et heures d'ouverture | Promoteur, pharmacien |
| 8 | Droits des pages Pointage et Échéancier dans la matrice des rôles | BEG |
| 9 | Consentement et durée de conservation des données de pointage (photo, lieu) | Promoteur, conseil juridique |
| 10 | Capteurs de température connectés : choix du matériel et de l'interface | BEG, officine pilote |
| 11 | Validation du circuit vérificateur et approbateur pour un effectif très réduit | Titulaire |
| 12 | Page Sous-traitance : absente de ta navigation, à prévoir (agréments, prestataires, cahier de visite) | BEG |

## 12. Ordre de réalisation conseillé

1. **Socle** (Phase 0 et Lot 1.1) : rôles, signature par code personnel, `/personnel` (dossiers, inscription à l'Ordre), `/pointage`, `/documents`, `/modeles`, `/non-conformites`, `/echeances`.
2. **Lot 1.2** : `/temperatures` et `/locaux` (équipements, étalonnage, maintenance, nettoyage) : saisie simple sur mobile, preuves attendues à l'inspection.
3. **`/auto-evaluation`** dès que les articles du Guide sont fournis : la grille peut être livrée tôt, l'évaluation assistée par les données vient ensuite, quand les autres pages produisent des preuves.
4. **Extensions** : code QR dynamique, anti-fraude du pointage, capteurs connectés, tableau de revue de direction automatique.

La grille des 267 articles, la signature par code personnel et le générateur de non-conformité doivent être des composants communs, développés une seule fois et réutilisés par toutes les pages.
