# Annexe A — État réel des 162 zones fonctionnelles

Cette annexe est la **vue plate** du §4 du document maître : une ligne par zone analysée, sur les 24 écrans. Elle répond à une seule question — *qu'est-ce qui est vrai aujourd'hui dans l'application livrée ?* — et sert de grille de recette : chaque ligne doit passer de son état actuel à **réel**.

> Les 24 écrans comptent **132 sections d'interface** (onglets et cartes visibles, §3.1 du maître). L'audit les décompose en **162 zones fonctionnelles** : une section qui regroupe plusieurs fonctions distinctes est analysée en plusieurs lignes. Les deux comptes sont justes et mesurent des choses différentes.

## A.1 Synthèse

| État | Zones | Part | Sens |
| --- | --- | --- | --- |
| **réel** | 37 | 23 % | l'écran appelle un endpoint qui existe, fonctionne en démonstration et restitue des données serveur |
| **partiel** | 37 | 23 % | certaines fonctions sont réelles, d'autres sont en état local ou statiques |
| **vitrine** | 28 | 17 % | l'interface est rendue mais aucune donnée ne vient du serveur |
| **mort** | 27 | 17 % | un contrôle existe dans le JSX mais rien ne se produit, ou l'endpoint renvoie une erreur en démonstration |
| **faux** | 33 | 20 % | l'interface affiche une valeur ou un document qui décrit un fait inexistant |
| **Total** | **162** | 100 % | 24 écrans · 132 sections · 8 groupes |

**Lecture** : 74 zones sur 162 (46 %) s'appuient au moins partiellement sur le serveur. **33 zones affichent un fait inexistant** : ce sont les plus urgentes, parce qu'elles produisent des documents opposables à l'entreprise (RG-35). 27 zones sont mortes : un contrôle existe, rien ne se produit.

## A.2 Répartition par écran

| Groupe | Écran | Route | Zones | réel | partiel | vitrine | mort | faux |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Groupe 1 | Tableau de bord | `/dashboard` | 6 | 2 | 2 | 0 | 0 | 2 |
| Groupe 2 | Consolidation Groupe | `/dashboard/consolidation` | 4 | 3 | 1 | 0 | 0 | 0 |
| Groupe 2 | Pharmacies de Garde | `/dashboard/gardes` | 4 | 2 | 1 | 0 | 0 | 1 |
| Groupe 3 | Caisse POS Tactile e-MECeF | `/dashboard/vente` | 6 | 1 | 3 | 0 | 1 | 1 |
| Groupe 3 | Dispensation & Ordonnances | `/dashboard/dispensation` | 7 | 0 | 1 | 0 | 6 | 0 |
| Groupe 3 | Facturation DGI | `/dashboard/facturation` | 5 | 0 | 2 | 0 | 1 | 2 |
| Groupe 4 | Stock & Magasin | `/dashboard/stock` | 11 | 4 | 7 | 0 | 0 | 0 |
| Groupe 5 | Registre des Stupéfiants | `/dashboard/stupefiants` | 9 | 3 | 2 | 1 | 2 | 1 |
| Groupe 5 | Préparations Magistrales | `/dashboard/preparations` | 6 | 1 | 0 | 1 | 3 | 1 |
| Groupe 6 | Chaîne du froid (2 | `/dashboard/temperatures` | 6 | 1 | 3 | 0 | 1 | 1 |
| Groupe 6 | Locaux & Matériel (5M) | `/dashboard/locaux` | 7 | 2 | 1 | 1 | 0 | 3 |
| Groupe 6 | Auto-évaluation 267 articles | `/dashboard/auto-evaluation` | 5 | 4 | 0 | 0 | 1 | 0 |
| Groupe 6 | Pointage Présence (art. 1.11) | `/dashboard/pointage` | 7 | 0 | 0 | 0 | 3 | 4 |
| Groupe 6 | Personnel & Ordre B | `/dashboard/personnel` | 9 | 1 | 2 | 3 | 0 | 3 |
| Groupe 6 | GED & Procédures | `/dashboard/documents` | 8 | 1 | 2 | 3 | 1 | 1 |
| Groupe 6 | Modèles Types BPD | `/dashboard/modeles` | 4 | 0 | 1 | 2 | 0 | 1 |
| Groupe 6 | Non-conformités & CAPA | `/dashboard/non-conformites` | 6 | 2 | 3 | 0 | 0 | 1 |
| Groupe 6 | Échéancier réglementaire | `/dashboard/echeances` | 6 | 5 | 0 | 1 | 0 | 0 |
| Groupe 7 | Comptabilité SYSCOHADA | `/dashboard/comptabilite` | 6 | 0 | 1 | 1 | 1 | 3 |
| Groupe 7 | Journal d'audit SHA | `/dashboard/journal` | 5 | 1 | 0 | 0 | 4 | 0 |
| Groupe 7 | Appareils autorisés | `/dashboard/appareils` | 7 | 2 | 2 | 2 | 1 | 0 |
| Groupe 8 | Mon profil & Rôle | `/dashboard/compte` | 9 | 0 | 1 | 5 | 1 | 2 |
| Groupe 8 | Paramètres Officine | `/dashboard/parametres` | 11 | 1 | 1 | 5 | 0 | 4 |
| Groupe 8 | Sécurité & MFA | `/dashboard/securite` | 8 | 1 | 1 | 3 | 1 | 2 |
| | **Total** | **24 routes** | **162** | **37** | **37** | **28** | **27** | **33** |

## A.3 Détail zone par zone

| Groupe | Route | Zone | État | Constat vérifié | Réf. |
| --- | --- | --- | --- | --- | --- |
| Groupe 1 | `/dashboard` | Bandeau d'indicateurs | **faux** | **faux** — `DONNEES_VENTES_HEBDO` et `DONNEES_TEMP_24H` codés en dur, `+14.2%`, `4 875 k F`, `318 ord.`, `15 330 F`, replis `4.2`/`21.4`/`98.4`, `263 / 267 critères`, `12 SOPs`, `0 litige critique` | 01 TDB-01→17 · 02 §1.2 |
| Groupe 1 | `/dashboard` | Centre d'alertes | **partiel** | alertes consolidées par gravité | 01 TDB · 02 M-01→M-08 |
| Groupe 1 | `/dashboard` | Graphiques de ventes | **partiel** | partiel — 4 graphiques `recharts` sur données fixes | 02 §4 |
| Groupe 1 | `/dashboard` | Chaîne du froid | **faux** | **faux** — replis `4.2 °C`, `21.4 °C`, `98.4 %` | 06 TEM-15 |
| Groupe 1 | `/dashboard` | Présence pharmaceutique | **réel** | conformité art. 1.11 | 04 PAR-04 |
| Groupe 1 | `/dashboard` | Raccourcis métiers | **réel** | navigation vers les écrans | 02 annexe B |
| Groupe 2 | `/dashboard/consolidation` | Synthèse multi-officines | **réel** | CA, stock, alertes agrégés | 01 CGL-01→12 |
| Groupe 2 | `/dashboard/consolidation` | Comparaison d'officines | **réel** | classement, écarts | 02 §4 |
| Groupe 2 | `/dashboard/consolidation` | Transferts inter-officines | **partiel** | demandes, réceptions | 05 INC-23 |
| Groupe 2 | `/dashboard/consolidation` | Présence par officine | **réel** | pharmacien sur place par site | 04 RG-18 |
| Groupe 2 | `/dashboard/gardes` | Calendrier des gardes | **réel** | périodes attribuées | 01 GRD-01→10 |
| Groupe 2 | `/dashboard/gardes` | Déclaration de garde | **réel** | création d'une période | 05 §0.1 |
| Groupe 2 | `/dashboard/gardes` | Garde et planning d'équipe | **faux** | **faux** — « Nuit du Samedi 07/11 » et « Dr Félicien AGBO » en dur dans `pointage.tsx:678-679` | 04 PLN-05, DEF-18 |
| Groupe 2 | `/dashboard/gardes` | Tableau de bord de garde | **partiel** | indicateurs de la période | 02 §4 |
| Groupe 3 | `/dashboard/vente` | Recherche de produit | **partiel** | sélection rapide au comptoir | 01 POS-11→14 · 02 §2 |
| Groupe 3 | `/dashboard/vente` | Panier et remise | **réel** | construction du ticket | 06 PAR-D05 |
| Groupe 3 | `/dashboard/vente` | Paiement et encaissement | **partiel** | espèces, mobile money, carte | 01 FPX-01→10 |
| Groupe 3 | `/dashboard/vente` | Session de caisse | **faux** | **défaut** — `VenteCaisseController@store` **crée automatiquement une session** si aucune n'est ouverte, ce qui viole CAI-01 | 01 CAI-01→08 |
| Groupe 3 | `/dashboard/vente` | Ticket et rendu | **partiel** | impression du reçu | 01 §8 · 05 INC-23 |
| Groupe 3 | `/dashboard/vente` | Blocage sans pharmacien | **mort** | **mort** — `mode_presence_pharmacien = blocage` n'est appliqué nulle part | 04 PAR-04, PAR-05, DEF-24 |
| Groupe 3 | `/dashboard/dispensation` | Assistant de dispensation en 7 étapes | **partiel** | analyse, contrôle, conseil, délivrance | 01 DSP-01→31 · 02 §2 |
| Groupe 3 | `/dashboard/dispensation` | Ordonnances et prescripteurs | **mort** | **absent** — aucune table `ordonnances`, `lignes_ordonnance`, `prescripteurs`, `patients` | 01 DSP |
| Groupe 3 | `/dashboard/dispensation` | Analyses pharmaceutique et réglementaire | **mort** | interventions, refus, substitution | 01 §8.2 |
| Groupe 3 | `/dashboard/dispensation` | Conseils délivrés | **mort** | traçabilité du conseil | 01 §8.2 · `PRO-Dispensation et Conseils.docx` |
| Groupe 3 | `/dashboard/dispensation` | Dossier pharmaceutique et consentement | **mort** | historique patient | 01 DP-01→06 |
| Groupe 3 | `/dashboard/dispensation` | Vigilance et erreurs de délivrance | **mort** | signalement | 01 INT-01→05 |
| Groupe 3 | `/dashboard/dispensation` | Blocage sans pharmacien | **mort** | **mort** | 04 PAR-04 |
| Groupe 3 | `/dashboard/facturation` | Factures e-MECeF | **partiel** | émission et statut | 01 FDG-01→16 |
| Groupe 3 | `/dashboard/facturation` | TVA et groupes fiscaux | **faux** | **faux** — « TVA collectée (0%) : 0 FCFA », « 100% Automatique », « 100% Certifié », « Groupe A (0%) » | 02 §1.2 · 06 CPT-D06 |
| Groupe 3 | `/dashboard/facturation` | Paramètres e-MECeF | **faux** | **faux** — `environnementMECeF` et `tokenMECeF = "dgi_live_sec_994829384729182374"` en clair côté client (`parametres.tsx:108-109`) | 06 PAR-D01, PAR-01 |
| Groupe 3 | `/dashboard/facturation` | Journal de facturation | **partiel** | suivi des émissions | 06 JRN |
| Groupe 3 | `/dashboard/facturation` | Rapprochement comptable | **mort** | factures ↔ écritures | 06 CPT-08 |
| Groupe 4 | `/dashboard/stock` | Vue d'ensemble | **partiel** | **partiel** — les 2 requêtes les plus sensibles avalent leur erreur (`stock.tsx:515-516`) : un `500` affiche « 0 lot périmé » et « 0 FCFA » | 05 STK-01→04, RG-26 |
| Groupe 4 | `/dashboard/stock` | Produits | **partiel** | partiel — sous-sections en état local, aucune pagination | 05 STK-05→10 |
| Groupe 4 | `/dashboard/stock` | Lots (FEFO) | **réel** | réel — les 8 statuts existent (`commercialisable`, `en_attente_controle`, `a_evaluer`, `quarantaine`, `attente_retour`, `rejete`, `dechet`, `epuise`) et les lots bloqués restent visibles (`stock.tsx:508`) | 05 STK-11→16 · INC-13 |
| Groupe 4 | `/dashboard/stock` | Emplacements | **partiel** | **partiel** — `POST /emplacements` existe et n'est **jamais appelé** : impossible de créer un emplacement | 05 STK-17→20, STK-D04 |
| Groupe 4 | `/dashboard/stock` | Mouvements | **partiel** | **partiel** — `POST /mouvements` existe et n'est **jamais appelé** : aucun mouvement manuel possible | 05 STK-21→24 |
| Groupe 4 | `/dashboard/stock` | Réception | **partiel** | **partiel** — la check-list de 5 contrôles existe (`alerte_sanitaire_verifiee`, `emballage_intact`, `conformite_livraison`, `dates_conformes`, `chaine_froid_respectee`, `stock.tsx:518`) mais **n'est persistée nulle part** ; aucun objet `reception` n'est créé ; le téléversement du BL échoue (`POST /api/upload` → `501`) | 05 STK-25→30, STK-D05 |
| Groupe 4 | `/dashboard/stock` | Inventaires | **réel** | **réel** — cycle complet (`magasin-avance.tsx:133-177`) | 05 STK-31→35, MAG-D01 |
| Groupe 4 | `/dashboard/stock` | Péremptions | **réel** | réel — 4 paliers affichés (`a_6_mois`, `a_3_mois`, `a_1_mois`, `perimes`) | 05 STK-36→39, INC-13, INC-15 |
| Groupe 4 | `/dashboard/stock` | Quarantaine & Rappels | **partiel** | **partiel** — `POST /rappels` existe mais **ne déclenche ni quarantaine ni blocage de vente** | 05 STK-40→42, MAG-D02 |
| Groupe 4 | `/dashboard/stock` | Déchets | **partiel** | partiel — le cycle existe, le bordereau non | 05 STK-43→44, MAG-D04 |
| Groupe 4 | `/dashboard/stock` | Valorisation | **réel** | réel mais **méthode non déclarée** | 05 STK-45→46, INC-16 |
| Groupe 5 | `/dashboard/stupefiants` | Registre | **réel** | réel — 11 méthodes serveur (`StupefiantController`, 324 l.), le socle réglementaire le plus complet du dépôt | 05 STU-01→03, STU-11, STU-21 |
| Groupe 5 | `/dashboard/stupefiants` | Balance | **faux** | **dangereux** — `GET /stupefiants/balance` fonctionne (vérifié `200`) mais est enveloppé dans `.catch(() => null)` (`stupefiants.tsx:299`) : **une panne affiche une balance vide, donc « aucun écart »** | 05 STU-04→05, STU-D01, RG-26 |
| Groupe 5 | `/dashboard/stupefiants` | Ordonnancier | **partiel** | **partiel** — même repli silencieux (`stupefiants.tsx:307` → `{ data: { data: [] } }`) | 05 STU-06 |
| Groupe 5 | `/dashboard/stupefiants` | Copies | **mort** | **non outillé** — rien ne trace la copie | 05 STU-13, M-185 |
| Groupe 5 | `/dashboard/stupefiants` | Inventaire | **réel** | `inventaire` | 05 STU-08, M-181 |
| Groupe 5 | `/dashboard/stupefiants` | Armoire | **partiel** | **partiel** — repli silencieux (`stupefiants.tsx:303` → `null`) | 05 STU-07 |
| Groupe 5 | `/dashboard/stupefiants` | Écarts | **vitrine** | `ecarts` | 05 STU-14, G-80 |
| Groupe 5 | `/dashboard/stupefiants` | Destruction | **réel** | réel côté endpoint, incomplet côté validation | 05 STU-10, M-183 |
| Groupe 5 | `/dashboard/stupefiants` | Rapports | **mort** | **mort** — `GET /stupefiants/rapport` **existe et n'est jamais appelé** : la section est statique alors que l'endpoint est écrit | 05 STU-12, STU-D02, G-81→84 |
| Groupe 5 | `/dashboard/preparations` | Registre | **réel** | `registre` | 05 PRE-01, PRE-12→14 |
| Groupe 5 | `/dashboard/preparations` | Formules | **faux** | **faux** — constante locale : `{ nom: "Sirop de Tolu", compo: "Baume de Tolu 2 %, saccharose, eau purifiée", dlu: "14 jours" }` (`preparations.tsx:526`) | 05 PRE-02→03, PRE-D02 |
| Groupe 5 | `/dashboard/preparations` | Matières premières | **mort** | **absent** — rien ne relie une préparation aux lots consommés | 05 PRE-04→06, PRE-D05 |
| Groupe 5 | `/dashboard/preparations` | Contrôles | **mort** | `controles` | 05 PRE-07→08, M-189→190 |
| Groupe 5 | `/dashboard/preparations` | Étiquettes | **mort** | absent — alors que `jspdf` et `html2canvas` sont déjà en dépendances | 05 PRE-09→10, M-191 |
| Groupe 5 | `/dashboard/preparations` | Rapports | **vitrine** | `rapports` | 05 PRE-11, G-85→89 |
| Groupe 6 | `/dashboard/temperatures` | Tournée | **partiel** | **partiel** — la jauge « 85 % réalisés » est figée par `style={{ width: "85%" }}` (`temperatures.tsx:564`) | 06 TEM-03, TEM-D02 |
| Groupe 6 | `/dashboard/temperatures` | Zones | **faux** | **faux** — plages écrites **cinq fois** en dur (`2.0°C à 8.0°C`, `15.0°C à 25.0°C`, `15.0°C à 26.0°C` aux lignes 177, 227, 239, 251, 887-889) et une sixième fois dans `parametres.tsx:105-106` sous forme de chaînes | 06 TEM-01→02, TEM-D01, RG-36 |
| Groupe 6 | `/dashboard/temperatures` | Courbes | **réel** | réel — `LineChart` | 06 TEM-05, G-97 |
| Groupe 6 | `/dashboard/temperatures` | Excursions | **partiel** | **partiel** — l'exemple affiché est en dur : « Enceinte Réfrigérée · 9.8 °C (Dépassement +1.8 °C) » (`temperatures.tsx:706`) ; les 4 décisions existent dans `decisionChoisie` mais **une excursion ne bloque aucun lot** | 06 TEM-06→07, TEM-D03, TEM-D05 |
| Groupe 6 | `/dashboard/temperatures` | Rapports | **partiel** | partiel — `window.print()` direct (`temperatures.tsx:1129`), qui imprime toute l'application | 06 TEM-13→14, TEM-D04, RG-23 |
| Groupe 6 | `/dashboard/temperatures` | Capteurs | **mort** | **absent** — aucune entité capteur, aucun étalonnage, alors que `locaux.tsx:560` affiche un certificat fictif | 06 TEM-09, TEM-D06 |
| Groupe 6 | `/dashboard/locaux` | Équipements | **réel** | parc matériel | 06 LOC-01 |
| Groupe 6 | `/dashboard/locaux` | Maintenance | **partiel** | **branchable** — `suivis_documentaires` supporte déjà le type `maintenance` (`mock-backend.mjs:507`) et la table est sous RLS et trigger, mais la section ne l'utilise pas | 06 LOC-02, LOC-D05 |
| Groupe 6 | `/dashboard/locaux` | Étalonnage | **faux** | **faux** — « Certificat n° CERT-2026-042 · Organisme : METRO-BENIN · Incertitude ±0.2°C » (`locaux.tsx:560`) | 06 LOC-03→04, LOC-D03 |
| Groupe 6 | `/dashboard/locaux` | Nettoyage | **réel** | plan et registre | 06 LOC-05→06 |
| Groupe 6 | `/dashboard/locaux` | Nuisibles | **vitrine** | **vitrine** — aucune entité, aucun endpoint | 06 LOC-07, LOC-D05 |
| Groupe 6 | `/dashboard/locaux` | Conformité | **faux** | **faux** — « Score : 100% Conforme » en dur (`locaux.tsx:774`) | 06 LOC-08, LOC-D04 |
| Groupe 6 | `/dashboard/locaux` | Système & PRA | **faux** | **faux — le défaut le plus grave du volet** : `locaux.tsx:230-270` exporte un dossier PRA entièrement fictif (« Serveur autonome sur site avec réplication cloud chiffrée », « AES-256 avec hachage SHA-256 inaltérable ») et un journal des sauvegardes dont chaque résultat est écrit d'avance (`<td><strong>100% Réussie (Chiffrée)</strong></td>`, ligne 257) | 06 LOC-09→10, LOC-D01→02, **RG-35** |
| Groupe 6 | `/dashboard/auto-evaluation` | Campagne courante | **réel** | ouverture et suivi | 06 AUT-01, AUT-D05 |
| Groupe 6 | `/dashboard/auto-evaluation` | Cotation des 267 articles | **réel** | réel — contrôle serveur vérifié en direct : une valeur inattendue renvoie `422 {"message":"Cotation invalide."}` | 06 AUT-02, AUT-07, AUT-D02 |
| Groupe 6 | `/dashboard/auto-evaluation` | Génération de CAPA | **réel** | écart → action | 06 AUT-03→04, AUT-D03 |
| Groupe 6 | `/dashboard/auto-evaluation` | Score et chapitres | **réel** | réel — l'un des 6 graphiques de l'application | 03 G-21 · 06 G-99→101 |
| Groupe 6 | `/dashboard/auto-evaluation` | Rapport | **mort** | **mort** — `GET …/auto-evaluation/rapport` existe (`AutoEvaluationController::rapport`) et n'est **jamais appelé** | 06 AUT-D01, AUT-03 |
| Groupe 6 | `/dashboard/pointage` | Présence en direct | **faux** | **critique** — le scan est résolu **côté client** contre `matricule`/`id`/`code_badge` et **jamais contre `pin_code`** ; en cas d'échec, repli sur `employes[0]` puis sur `{ id: "emp-1", nom_complet: "Dr Félicien AGBO" }` (`pointage.tsx:205-211`) → **tout code inconnu pointe le premier employé** | 04 PRS-28→29, DEF-01→03 |
| Groupe 6 | `/dashboard/pointage` | Plannings & gardes | **faux** | **faux** — entièrement statique : « Dr Félicien AGBO », « Dr Sévérin BIO », « Nuit du Samedi 07/11 » (`l.668-679`) ; le bouton « Créer créneau » n'a **aucun `onClick`** | 04 PLN-01→06, DEF-18 |
| Groupe 6 | `/dashboard/pointage` | Absences & congés | **mort** | **mort** — l'état `modaleAbsence` et ses 4 champs existent, le bouton les déclenche, mais **aucun `<Dialog>` n'est rendu** (`l.108-112, 699`) ; l'état vide est en dur (`l.708`) | 04 PRS-14→19, DEF-16, INC-05 |
| Groupe 6 | `/dashboard/pointage` | Corrections d'oubli | **mort** | **mort** — la modale n'appelle **aucun endpoint** : « Signer & Valider » fait `toast.success("Correction enregistrée avec succès.")` puis ferme, la signature est jetée (`l.982-991`) ; la liste affiche une ligne statique (`l.733-741`) | 04 PRS-20→25, DEF-14, RG-14 |
| Groupe 6 | `/dashboard/pointage` | Badges & émargement | **faux** | **faux** — QR généré par un **service tiers externe** `api.qrserver.com`, charge utile non signée et rejouable, faux code-barres littéral, validité « Année 2026 » en dur, identité d'officine par défaut « PHARMACIE DE L'ÉTOILE » / « +229 21 31 10 20 », format annoncé CR80 mais rendu en 60×94 mm plié, « Imprimer planche badges » = `window.print()` | 04 BDG-01→14, BDG-D1→D9, DEF-25 |
| Groupe 6 | `/dashboard/pointage` | Rapports & heures | **faux** | **faux** — « Novembre 2026 », « 96.4% », « 412h », « 14h » en dur (`l.873-875`) ; l'export CSV est la liste brute du jour sans aucun calcul | 04 RPT-01→09, DEF-21→22, INC-03 |
| Groupe 6 | `/dashboard/pointage` | Paramètres art. 1.11 | **mort** | **mort** — deux cartes descriptives sans aucun `onClick`, alors que `tolerance_pointage_minutes` et `mode_presence_pharmacien` existent déjà en base | 04 PAR-01→06, DEF-23→24 |
| Groupe 6 | `/dashboard/personnel` | Équipe & badges QR | **réel** | `equipe` | 04 DOS-01→03, BDG-D8 |
| Groupe 6 | `/dashboard/personnel` | Dossier individuel | **partiel** | partiel — `photo_url` saisi en **texte libre** (`personnel.tsx:153`) alors que la colonne n'existe pas dans le schéma | 04 DOS-07, DOS-27, BDG-D7 |
| Groupe 6 | `/dashboard/personnel` | Ordre section B | **faux** | **faux** — « ONPB-2014-B-089 » et « 31/12/2026 » en dur (`l.235, 238, 550, 553`) ; `inscriptions_ordre` est indexé par `user_id` alors que les fiches sont des `employes.id` → **jonction impossible** | 04 DOS-08→13, INC-04, INC-08 |
| Groupe 6 | `/dashboard/personnel` | Postes & habilitations | **vitrine** | vitrine — les colonnes jsonb `habilitations` et `competences` existent et ne sont **jamais écrites** | 04 DOS-04, DOS-26 |
| Groupe 6 | `/dashboard/personnel` | Organigramme | **faux** | **faux** — « Dr Félicien AGBO » en dur (`l.625`), rendu en `style={{}}` inline | 04 DOS-14→16, INC-08 |
| Groupe 6 | `/dashboard/personnel` | Formations | **vitrine** | vitrine — alors que `suivis_documentaires/formations` existe déjà | 04 DOS-17→20 |
| Groupe 6 | `/dashboard/personnel` | Entretiens | **vitrine** | `entretiens` | 04 DOS-21→23 |
| Groupe 6 | `/dashboard/personnel` | Congés & remplacements | **faux** | **doublon** avec `pointage?tab=absences`, sans backend ni l'un ni l'autre | 04 PRS-14, INC-05 |
| Groupe 6 | `/dashboard/personnel` | Intégration & suivi médical | **partiel** | partiel — `date_visite_medicale` existe ; « 100% du personnel dispose d'un certificat médical d'aptitude » est un slogan (`l.747`) | 04 DOS-05, DOS-24→25, INC-08 |
| Groupe 6 | `/dashboard/documents` | Bibliothèque | **réel** | réel — `POST …/documents` vérifié `201`, mais `PUT …/documents/{id}` renvoie **`501`** en démo | 06 DOC-01, DOC-D04 |
| Groupe 6 | `/dashboard/documents` | Tâches | **partiel** | partiel — `approbation-document.tsx` existe | 06 DOC-10 |
| Groupe 6 | `/dashboard/documents` | Versions | **partiel** | `versions` | 06 DOC-05 |
| Groupe 6 | `/dashboard/documents` | Diffusion | **mort** | **absent** | 06 DOC-04, DOC-D07 |
| Groupe 6 | `/dashboard/documents` | Révisions | **vitrine** | `revisions` | 06 DOC-05 |
| Groupe 6 | `/dashboard/documents` | Modifications | **vitrine** | vitrine — alors que `documents` pourrait être lu depuis `audit_logs` | 06 DOC-14 |
| Groupe 6 | `/dashboard/documents` | Processus | **vitrine** | `processus` | 06 DOC-03 |
| Groupe 6 | `/dashboard/documents` | Politique | **faux** | **faux** — le bouton « Trame officielle du Rapport Annuel » télécharge un texte au taux de conformité **94.2 %** écrit dans la chaîne (`l.873`), avec toast « Trame officielle du Rapport Annuel téléchargée ! » | 06 DOC-D01, **RG-35** |
| Groupe 6 | `/dashboard/modeles` | Catalogue | **faux** | **faux — le plus gros gâchis du dépôt** : l'écran annonce « **59 modèles** » (`modeles.tsx:56, 169, 552`), `GET /api/modeles-bpd` renvoie **3 fiches** avec `contenu: null` (vérifié en direct), alors que `references/canevas/catalogue.json` contient **62 documents réels**, chacun avec son `sha256` et sa structure en `parties`, classés en 5 rubriques | 06 MOD-01→08, MOD-D01, INC-19, **RG-41** |
| Groupe 6 | `/dashboard/modeles` | Adoptions | **vitrine** | `adoptions` | 06 MOD-09 |
| Groupe 6 | `/dashboard/modeles` | Mises à jour | **vitrine** | `mises-a-jour` | 06 MOD-10 |
| Groupe 6 | `/dashboard/modeles` | Documents propres | **partiel** | `propres` | 06 MOD-11 |
| Groupe 6 | `/dashboard/non-conformites` | Kanban | **réel** | réel mais **non gardé** — le changement de colonne est un `PUT` direct, sans motif ni signature | 06 NCC-01, NCC-D03 |
| Groupe 6 | `/dashboard/non-conformites` | Liste | **réel** | réel — `GET`/`PUT` vérifiés `200` | 06 NCC-14 |
| Groupe 6 | `/dashboard/non-conformites` | Analyse des causes | **partiel** | partiel — la colonne `analyse_causes_5m` existe | 06 NCC-02 |
| Groupe 6 | `/dashboard/non-conformites` | Plan CAPA | **partiel** | partiel — colonnes `action_immediate`, `action_preventive`, `date_echeance_capa`, `responsable_action` existent | 06 NCC-03 |
| Groupe 6 | `/dashboard/non-conformites` | Efficacité | **partiel** | partiel — colonnes `efficacite_verifiee`, `conclusion_efficacite` existent mais **rien n'empêche de clôturer sans vérification** | 06 NCC-04, NCC-D04 |
| Groupe 6 | `/dashboard/non-conformites` | Statistiques | **faux** | **faux** — délai moyen affiché « **4.2 jours** » en dur (`l.787`), aucun graphique pour une section intitulée « statistiques » | 06 NCC-05, NCC-09, NCC-D01 |
| Groupe 6 | `/dashboard/echeances` | À venir et en retard | **réel** | réel | 06 ECH-05 |
| Groupe 6 | `/dashboard/echeances` | Calendrier | **réel** | réel — 3 modes `liste`, `mois`, `semaine` (`modeVue`) | 06 ECH-06 |
| Groupe 6 | `/dashboard/echeances` | Catégories | **réel** | réel — constante `CATEGORIES` | 06 ECH-12 |
| Groupe 6 | `/dashboard/echeances` | Règles | **vitrine** | vitrine — les règles de génération sont affichées mais non éditables | 06 ECH-04, ECH-D05 |
| Groupe 6 | `/dashboard/echeances` | Historique | **réel** | réel | 06 ECH-08→09 |
| Groupe 6 | `/dashboard/echeances` | Toutes | **réel** | réel | 06 ECH-11 |
| Groupe 7 | `/dashboard/comptabilite` | Tableau de bord | **faux** | **faux** — `comptabilite.tsx:337-340` contient 14 montants fictifs (`18 950 000`, `12 400 000`, `27 250 000` FCFA…), le badge `+14.2%`, le compte `701`, et `:1035` affiche « Novembre 2026 » comme période courante | 06 CPT-01→02, CPT-D01, CPT-D03 |
| Groupe 7 | `/dashboard/comptabilite` | Journaux | **partiel** | partiel — journal imprimable en `<table style="width: 100%; …">` (`l.221`) | 06 CPT-08, CPT-D08 |
| Groupe 7 | `/dashboard/comptabilite` | Saisie manuelle | **mort** | **mort** — `POST /comptabilite/ecritures` renvoie **`501`** en démonstration (vérifié) alors que `ComptabiliteController::storeEcriture` existe (`routes/api.php:257`) | 06 CPT-03, CPT-05, CPT-D04 |
| Groupe 7 | `/dashboard/comptabilite` | Plan comptable | **vitrine** | `plan_comptable` | 06 CPT-06 |
| Groupe 7 | `/dashboard/comptabilite` | Lettrage des tiers | **faux** | **faux** — taux de lettrage « **94.8 %** » en dur (`l.836`) ; aucune entité `tiers` | 06 CPT-07, CPT-D02, CPT-D09 |
| Groupe 7 | `/dashboard/comptabilite` | États financiers | **faux** | **faux** — bilan et compte de résultat entièrement fictifs | 06 CPT-01, CPT-08, CPT-15 |
| Groupe 7 | `/dashboard/journal` | Liste des entrées | **réel** | réel | 06 JRN-04 |
| Groupe 7 | `/dashboard/journal` | **Vérification d'intégrité** | **mort** | **mort** — `GET …/audit-logs/verifier-integrite` renvoie **`501`** en démonstration (vérifié) alors que `AuditController::verifierIntegrite` existe (`routes/api.php:84`) et que la table est protégée par `trg_audit_logs_tamper_defense` et `trg_audit_no_truncate` | 06 JRN-01→02, JRN-D01 |
| Groupe 7 | `/dashboard/journal` | Couverture | **mort** | **insuffisante** — seules 10 tables ont une RLS et 11 un trigger d'audit ; **30+ tables métier n'en ont aucun** | 06 JRN-03, INC-22, **RG-37** |
| Groupe 7 | `/dashboard/journal` | Mode inspecteur | **mort** | absent | 06 JRN-05, M-227 |
| Groupe 7 | `/dashboard/journal` | Export signé | **mort** | absent | 06 JRN-06, M-226 |
| Groupe 7 | `/dashboard/appareils` | Parc | **réel** | `parc` | 06 APP-02 |
| Groupe 7 | `/dashboard/appareils` | Appairage | **réel** | `appairage` | 06 APP-03 |
| Groupe 7 | `/dashboard/appareils` | Bornes | **vitrine** | vitrine — aucune borne n'est enregistrée comme équipement | 06 APP-04 · 04 RG-20 |
| Groupe 7 | `/dashboard/appareils` | Périphériques | **vitrine** | `peripheriques` | 06 APP-05→06 |
| Groupe 7 | `/dashboard/appareils` | Sessions | **partiel** | partiel — la révocation globale renvoie **`501`** | 06 APP-07, SEC-03 |
| Groupe 7 | `/dashboard/appareils` | Révocations | **mort** | **mort** — `POST /appareils-autorises/{id}/revoquer` et `/reactiver` renvoient **`501`** (vérifié) alors que les deux méthodes existent (`routes/api.php:65-66`) | 06 APP-01, APP-D01 |
| Groupe 7 | `/dashboard/appareils` | Registre | **partiel** | partiel — valeur en dur `montant_ou_detail: "14 500 FCFA"` (`l.171`), document imprimable en `<table style=…>` avec des `<div style="width: 45%">` simulant des zones de signature (`l.343-379`) | 06 APP-08, APP-D02→03 |
| Groupe 8 | `/dashboard/compte` | Profil | **mort** | **mort** — `PUT /auth/profile` renvoie **`501`** (vérifié) ; de plus `.catch(() => null)` (`l.149`) masque l'échec | 06 CMP-01, CMP-05, CMP-D01 |
| Groupe 8 | `/dashboard/compte` | Droits | **vitrine** | `droits` | 06 CMP-01, M-238 |
| Groupe 8 | `/dashboard/compte` | Officines | **vitrine** | `officines` | 06 CMP-01 |
| Groupe 8 | `/dashboard/compte` | Qualification | **vitrine** | `qualification` | 06 CMP-01 · 04 DOS-08 |
| Groupe 8 | `/dashboard/compte` | Formations | **vitrine** | `formations` | 06 CMP-01 |
| Groupe 8 | `/dashboard/compte` | Badge | **faux** | **doublon** — `compte.tsx:179-185` fabrique une seconde carte professionnelle en chaîne HTML avec `linear-gradient(135deg, #0F3B27 0%, #18AA38 100%)` et `<img src="${photoUrl}" style="width:100%; …">` | 06 CMP-03, CMP-D04, INC-27 |
| Groupe 8 | `/dashboard/compte` | Préférences | **partiel** | partiel — paliers écrits en pourcentages dans les `<option>` : « Confort tactile (+10%) », « Grande lisibilité (+20%) » (`l.1049-1050`) | 06 CMP-04, CMP-D03 |
| Groupe 8 | `/dashboard/compte` | RH | **faux** | **faux** — soldes de congés fictifs `24 jours`, `16 jours`, `100% 40 h` (`l.1128-1136`) | 06 CMP-02 · 04 PRS-18 |
| Groupe 8 | `/dashboard/compte` | Données | **vitrine** | vitrine — l'exercice des droits (`typeDemandeDonnees === "effacement"`) n'a aucun backend | 06 CMP-06→07, M-239 |
| Groupe 8 | `/dashboard/parametres` | Identité | **réel** | réel — `GET/PUT …/parametres` (vérifié `200`) | 06 PAR-02 |
| Groupe 8 | `/dashboard/parametres` | Horaires | **vitrine** | `horaires` | 06 PAR-02 |
| Groupe 8 | `/dashboard/parametres` | Documents | **vitrine** | `documents` | 06 PAR-02 · 03 RG-02 |
| Groupe 8 | `/dashboard/parametres` | Conservation | **vitrine** | `conservation` | 06 PAR-02 |
| Groupe 8 | `/dashboard/parametres` | Notifications | **vitrine** | `notifications` | 06 PAR-02 |
| Groupe 8 | `/dashboard/parametres` | Paiements | **vitrine** | vitrine — « Chèque certifié · Montant > 100 000 FCFA » en dur (`l.731`) | 06 PAR-02 |
| Groupe 8 | `/dashboard/parametres` | Fiscalité | **faux** | **faux** — `regimeFiscal = "Régime Réel (Normal)"` en état local (`l.107`) | 06 PAR-07, PAR-D03 |
| Groupe 8 | `/dashboard/parametres` | Intégrations | **faux** | **faux — faille** — `tokenMECeF = "dgi_live_sec_994829384729182374"` en clair dans un `useState` (`l.109`), avec `environnementMECeF` en état client (`l.108`) | 06 PAR-01, PAR-09, PAR-D01 · 03 RG-06 |
| Groupe 8 | `/dashboard/parametres` | Historique | **faux** | **faux** — deux entrées inventées : `HIST-01` (« mode_presence_pharmacien · Alerte simple → Blocage strict · Dr Marie AGOSSOU · 04/11/2026 à 14:30 ») et `HIST-02` (« remise_max_dispensateur · 10 % → 5 % ») aux lignes 122-123, alors que `officine_parametres` est **déjà sous trigger d'audit et RLS** : l'historique réel existe en base | 06 PAR-03, PAR-D05 |
| Groupe 8 | `/dashboard/parametres` | Règles | **partiel** | partiel — `tempFrigoMin = "2.0"` et `tempFrigoMax = "8.0"` en **chaînes** et en état local (`l.105-106`) : sixième copie des seuils de température | 06 PAR-06, TEM-02, RG-36 |
| Groupe 8 | `/dashboard/parametres` | Utilisateurs | **faux** | **faux** — 5 utilisateurs fictifs en `useState` (`l.112-118`) : « Dr Marie AGOSSOU », « Dr Jean DOSSOU », « Koffi MENSAH », « Amina BELLO », « Paul TOSSOU », avec adresses `@bestpharma.bj` — un domaine **différent** de celui des comptes réels (`@begpharma.bj`) — et un statut MFA par personne | 06 PAR-04, PAR-D04, INC-26, **RG-42** |
| Groupe 8 | `/dashboard/securite` | MFA | **réel** | réel — cycle complet : `GET /auth/mfa`, `POST /auth/mfa/demarrer`, `POST /auth/verify-mfa`, `DELETE /auth/mfa` | 06 SEC-04, SEC-D04, RG-26 |
| Groupe 8 | `/dashboard/securite` | Codes de secours | **faux** | **faux — faille** — 10 codes en clair dans un `useState` (`l.101-104`) : `8492-1049`, `3910-4820`, `5829-1940`, `2849-5019`, `4920-1849`, `9182-3849`, `1049-5829`, `6729-1948`, `3849-2019`, `5019-3829` | 06 SEC-01, SEC-D01, M-242 |
| Groupe 8 | `/dashboard/securite` | Code de signature | **faux** | **faux** — `codePin = "••••••"` : une chaîne de puces en état local (`l.107`) | 06 SEC-02, SEC-D02 · 04 RG-16 |
| Groupe 8 | `/dashboard/securite` | Mot de passe | **mort** | **mort** — `PUT /auth/password` renvoie **`501`** (vérifié) | 06 SEC-03, SEC-05 |
| Groupe 8 | `/dashboard/securite` | Sessions | **partiel** | partiel — `GET /auth/devices` et `DELETE /auth/devices/{id}` réels, `POST /auth/devices/revoke-others` **`501`** | 06 SEC-03, APP-07 |
| Groupe 8 | `/dashboard/securite` | Politique | **vitrine** | `politique` | 06 SEC-05 |
| Groupe 8 | `/dashboard/securite` | Alertes | **vitrine** | `alertes` | 06 SEC-07 |
| Groupe 8 | `/dashboard/securite` | Journal de sécurité | **vitrine** | `journal_securite` | 06 SEC-06 · JRN-10 |

## A.4 Les 33 zones « faux » — à traiter en priorité

| Route | Zone | Fait affiché qui n'existe pas | Réf. |
| --- | --- | --- | --- |
| `/dashboard` | Bandeau d'indicateurs | **faux** — `DONNEES_VENTES_HEBDO` et `DONNEES_TEMP_24H` codés en dur, `+14.2%`, `4 875 k F`, `318 ord.`, `15 330 F`, replis `4.2`/`21.4`/`98.4`, `263 / 267 critères`, `12 SOPs`, `0 litige critique` | 01 TDB-01→17 · 02 §1.2 |
| `/dashboard` | Chaîne du froid | **faux** — replis `4.2 °C`, `21.4 °C`, `98.4 %` | 06 TEM-15 |
| `/dashboard/gardes` | Garde et planning d'équipe | **faux** — « Nuit du Samedi 07/11 » et « Dr Félicien AGBO » en dur dans `pointage.tsx:678-679` | 04 PLN-05, DEF-18 |
| `/dashboard/vente` | Session de caisse | **défaut** — `VenteCaisseController@store` **crée automatiquement une session** si aucune n'est ouverte, ce qui viole CAI-01 | 01 CAI-01→08 |
| `/dashboard/facturation` | TVA et groupes fiscaux | **faux** — « TVA collectée (0%) : 0 FCFA », « 100% Automatique », « 100% Certifié », « Groupe A (0%) » | 02 §1.2 · 06 CPT-D06 |
| `/dashboard/facturation` | Paramètres e-MECeF | **faux** — `environnementMECeF` et `tokenMECeF = "dgi_live_sec_994829384729182374"` en clair côté client (`parametres.tsx:108-109`) | 06 PAR-D01, PAR-01 |
| `/dashboard/stupefiants` | Balance | **dangereux** — `GET /stupefiants/balance` fonctionne (vérifié `200`) mais est enveloppé dans `.catch(() => null)` (`stupefiants.tsx:299`) : **une panne affiche une balance vide, donc « aucun écart »** | 05 STU-04→05, STU-D01, RG-26 |
| `/dashboard/preparations` | Formules | **faux** — constante locale : `{ nom: "Sirop de Tolu", compo: "Baume de Tolu 2 %, saccharose, eau purifiée", dlu: "14 jours" }` (`preparations.tsx:526`) | 05 PRE-02→03, PRE-D02 |
| `/dashboard/temperatures` | Zones | **faux** — plages écrites **cinq fois** en dur (`2.0°C à 8.0°C`, `15.0°C à 25.0°C`, `15.0°C à 26.0°C` aux lignes 177, 227, 239, 251, 887-889) et une sixième fois dans `parametres.tsx:105-106` sous forme de chaînes | 06 TEM-01→02, TEM-D01, RG-36 |
| `/dashboard/locaux` | Étalonnage | **faux** — « Certificat n° CERT-2026-042 · Organisme : METRO-BENIN · Incertitude ±0.2°C » (`locaux.tsx:560`) | 06 LOC-03→04, LOC-D03 |
| `/dashboard/locaux` | Conformité | **faux** — « Score : 100% Conforme » en dur (`locaux.tsx:774`) | 06 LOC-08, LOC-D04 |
| `/dashboard/locaux` | Système & PRA | **faux — le défaut le plus grave du volet** : `locaux.tsx:230-270` exporte un dossier PRA entièrement fictif (« Serveur autonome sur site avec réplication cloud chiffrée », « AES-256 avec hachage SHA-256 inaltérable ») et un journal des sauvegardes dont chaque résultat est écrit d'avance (`<td><strong>100% Réussie (Chiffrée)</strong></td>`, ligne 257) | 06 LOC-09→10, LOC-D01→02, **RG-35** |
| `/dashboard/pointage` | Présence en direct | **critique** — le scan est résolu **côté client** contre `matricule`/`id`/`code_badge` et **jamais contre `pin_code`** ; en cas d'échec, repli sur `employes[0]` puis sur `{ id: "emp-1", nom_complet: "Dr Félicien AGBO" }` (`pointage.tsx:205-211`) → **tout code inconnu pointe le premier employé** | 04 PRS-28→29, DEF-01→03 |
| `/dashboard/pointage` | Plannings & gardes | **faux** — entièrement statique : « Dr Félicien AGBO », « Dr Sévérin BIO », « Nuit du Samedi 07/11 » (`l.668-679`) ; le bouton « Créer créneau » n'a **aucun `onClick`** | 04 PLN-01→06, DEF-18 |
| `/dashboard/pointage` | Badges & émargement | **faux** — QR généré par un **service tiers externe** `api.qrserver.com`, charge utile non signée et rejouable, faux code-barres littéral, validité « Année 2026 » en dur, identité d'officine par défaut « PHARMACIE DE L'ÉTOILE » / « +229 21 31 10 20 », format annoncé CR80 mais rendu en 60×94 mm plié, « Imprimer planche badges » = `window.print()` | 04 BDG-01→14, BDG-D1→D9, DEF-25 |
| `/dashboard/pointage` | Rapports & heures | **faux** — « Novembre 2026 », « 96.4% », « 412h », « 14h » en dur (`l.873-875`) ; l'export CSV est la liste brute du jour sans aucun calcul | 04 RPT-01→09, DEF-21→22, INC-03 |
| `/dashboard/personnel` | Ordre section B | **faux** — « ONPB-2014-B-089 » et « 31/12/2026 » en dur (`l.235, 238, 550, 553`) ; `inscriptions_ordre` est indexé par `user_id` alors que les fiches sont des `employes.id` → **jonction impossible** | 04 DOS-08→13, INC-04, INC-08 |
| `/dashboard/personnel` | Organigramme | **faux** — « Dr Félicien AGBO » en dur (`l.625`), rendu en `style={{}}` inline | 04 DOS-14→16, INC-08 |
| `/dashboard/personnel` | Congés & remplacements | **doublon** avec `pointage?tab=absences`, sans backend ni l'un ni l'autre | 04 PRS-14, INC-05 |
| `/dashboard/documents` | Politique | **faux** — le bouton « Trame officielle du Rapport Annuel » télécharge un texte au taux de conformité **94.2 %** écrit dans la chaîne (`l.873`), avec toast « Trame officielle du Rapport Annuel téléchargée ! » | 06 DOC-D01, **RG-35** |
| `/dashboard/modeles` | Catalogue | **faux — le plus gros gâchis du dépôt** : l'écran annonce « **59 modèles** » (`modeles.tsx:56, 169, 552`), `GET /api/modeles-bpd` renvoie **3 fiches** avec `contenu: null` (vérifié en direct), alors que `references/canevas/catalogue.json` contient **62 documents réels**, chacun avec son `sha256` et sa structure en `parties`, classés en 5 rubriques | 06 MOD-01→08, MOD-D01, INC-19, **RG-41** |
| `/dashboard/non-conformites` | Statistiques | **faux** — délai moyen affiché « **4.2 jours** » en dur (`l.787`), aucun graphique pour une section intitulée « statistiques » | 06 NCC-05, NCC-09, NCC-D01 |
| `/dashboard/comptabilite` | Tableau de bord | **faux** — `comptabilite.tsx:337-340` contient 14 montants fictifs (`18 950 000`, `12 400 000`, `27 250 000` FCFA…), le badge `+14.2%`, le compte `701`, et `:1035` affiche « Novembre 2026 » comme période courante | 06 CPT-01→02, CPT-D01, CPT-D03 |
| `/dashboard/comptabilite` | Lettrage des tiers | **faux** — taux de lettrage « **94.8 %** » en dur (`l.836`) ; aucune entité `tiers` | 06 CPT-07, CPT-D02, CPT-D09 |
| `/dashboard/comptabilite` | États financiers | **faux** — bilan et compte de résultat entièrement fictifs | 06 CPT-01, CPT-08, CPT-15 |
| `/dashboard/compte` | Badge | **doublon** — `compte.tsx:179-185` fabrique une seconde carte professionnelle en chaîne HTML avec `linear-gradient(135deg, #0F3B27 0%, #18AA38 100%)` et `<img src="${photoUrl}" style="width:100%; …">` | 06 CMP-03, CMP-D04, INC-27 |
| `/dashboard/compte` | RH | **faux** — soldes de congés fictifs `24 jours`, `16 jours`, `100% 40 h` (`l.1128-1136`) | 06 CMP-02 · 04 PRS-18 |
| `/dashboard/parametres` | Fiscalité | **faux** — `regimeFiscal = "Régime Réel (Normal)"` en état local (`l.107`) | 06 PAR-07, PAR-D03 |
| `/dashboard/parametres` | Intégrations | **faux — faille** — `tokenMECeF = "dgi_live_sec_994829384729182374"` en clair dans un `useState` (`l.109`), avec `environnementMECeF` en état client (`l.108`) | 06 PAR-01, PAR-09, PAR-D01 · 03 RG-06 |
| `/dashboard/parametres` | Historique | **faux** — deux entrées inventées : `HIST-01` (« mode_presence_pharmacien · Alerte simple → Blocage strict · Dr Marie AGOSSOU · 04/11/2026 à 14:30 ») et `HIST-02` (« remise_max_dispensateur · 10 % → 5 % ») aux lignes 122-123, alors que `officine_parametres` est **déjà sous trigger d'audit et RLS** : l'historique réel existe en base | 06 PAR-03, PAR-D05 |
| `/dashboard/parametres` | Utilisateurs | **faux** — 5 utilisateurs fictifs en `useState` (`l.112-118`) : « Dr Marie AGOSSOU », « Dr Jean DOSSOU », « Koffi MENSAH », « Amina BELLO », « Paul TOSSOU », avec adresses `@bestpharma.bj` — un domaine **différent** de celui des comptes réels (`@begpharma.bj`) — et un statut MFA par personne | 06 PAR-04, PAR-D04, INC-26, **RG-42** |
| `/dashboard/securite` | Codes de secours | **faux — faille** — 10 codes en clair dans un `useState` (`l.101-104`) : `8492-1049`, `3910-4820`, `5829-1940`, `2849-5019`, `4920-1849`, `9182-3849`, `1049-5829`, `6729-1948`, `3849-2019`, `5019-3829` | 06 SEC-01, SEC-D01, M-242 |
| `/dashboard/securite` | Code de signature | **faux** — `codePin = "••••••"` : une chaîne de puces en état local (`l.107`) | 06 SEC-02, SEC-D02 · 04 RG-16 |

→ **RG-35** (aucun document imprimable ne déclare un fait non vérifiable), **RG-42** (aucune donnée fictive d'identité ou d'accès), **RG-07** (secrets hors client). Lots **L21**, **L27**, **L30**, **L32**, **L33**.
