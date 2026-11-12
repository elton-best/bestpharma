# BEGPHARMA — CDC réel : interfaces, modales, graphiques et télémétrie

**Périmètre** : les 6 écrans qui précèdent la section Stock dans la barre latérale — **Tableau de bord**, **Consolidation Groupe**, **Pharmacies de Garde**, et le groupe **Comptoir & Caisse** (**Caisse POS Tactile e-MECeF**, **Dispensation & Ordonnances**, **Facturation DGI**).

Version 1.0 · 11 novembre 2026 · Complément opérationnel du *Cahier des charges des sections « Tableau de bord, Comptoir & Caisse, Groupe »*. Ce document décrit **l'interface réelle** (relevée dans le code et à l'écran), **l'interface cible** (wireframes), **les modales**, **les graphiques** et **la télémétrie** (métriques métier, événements d'usage, télémétrie technique).

> **Volet suivant** : *CDC réel Interfaces & Télémétrie (Stock, Stupéfiants, Qualité, Finance, Compte)* couvre les 18 écrans restants de la barre latérale et prolonge les inventaires de ce document (modales M-43→M-127, graphiques G-21→G-56, métriques et événements supplémentaires).

> **Comment l'utiliser** : le document frère fixe le *quoi* fonctionnel (références TDB/CAI/VTE/FPX/DSP/FDG/CGL/GRD, règles de gestion, critères d'acceptation). Celui-ci fixe le *comment visible* : chaque zone, chaque modale, chaque graphe, chaque métrique, avec sa formule et son endpoint. Les deux sont à lire ensemble ; en cas de divergence, la règle de gestion du document frère l'emporte.

---

## 1. Relevé de l'existant (audit d'interface)

### 1.1 Cartographie réelle des 6 écrans

| Écran | Fichier | Lignes | Zones réelles aujourd'hui | Design system employé |
| --- | --- | --- | --- | --- |
| Tableau de bord | `frontend/src/components/tableau-de-bord.tsx` (+ `routes/_authenticated/dashboard/index.tsx`) | 615 + 260 | Bandeau présence pharmacien · 4 cartes métriques · 2 graphiques · 3 accès rapides | **Charte verte** (`#0F3B27`, `rounded-3xl`, `font-display`) |
| Consolidation Groupe | `routes/_authenticated/dashboard/consolidation.tsx` | 564 | En-tête + Actualiser · 4 cartes KPI · tableau comparatif · suivi des transferts · modale transfert | **Charte verte** |
| Pharmacies de Garde | `routes/_authenticated/dashboard/gardes.tsx` | 416 | En-tête + 2 boutons · cartes de gardes · modale déclaration | **Charte verte** |
| Caisse POS Tactile | `routes/_authenticated/dashboard/vente.tsx` | 893 | En-tête + session · alerte caisse fermée · grille 12 colonnes (catalogue 7/12, ticket 5/12) · 3 modales | **Slate / emerald** (`text-slate-900`, `bg-emerald-600`) |
| Dispensation & Ordonnances | `routes/_authenticated/dashboard/dispensation.tsx` | 639 | En-tête + bouton · 3 cartes · ordonnancier · modale nouvelle dispensation | **Slate / emerald** |
| Facturation DGI | `routes/_authenticated/dashboard/facturation.tsx` | 434 | En-tête + badge · 3 cartes fiscales · journal des factures · modale détail | **Slate / emerald** |

### 1.2 Ce qui est réel et ce qui est codé en dur — relevé exhaustif

**Règle** : toute valeur affichée doit provenir du serveur. Le tableau ci-dessous liste les valeurs fictives à remplacer, avec la source réelle à brancher. C'est le cœur du chantier « télémétrie ».

| Écran | Emplacement | Valeur codée en dur | Source réelle à brancher | Réf. |
| --- | --- | --- | --- | --- |
| Tableau de bord | `DONNEES_VENTES_HEBDO` (constante, 7 jours) | `Lun 520000 … Sam 980000` + `ord` | `GET /dashboard/synthese` → `activite.courbe_journaliere[]` (CA et ordonnances par jour, 7 derniers jours) | TDB-03 |
| Tableau de bord | `DONNEES_TEMP_24H` (constante, 9 points) | `frigo 4.1…4.2`, `ambiant 21.0…21.4` | `GET /officines/{id}/temperatures?periode=24h` (relevés réels) — le graphe existe déjà côté `/dashboard/temperatures` | TDB-06 |
| Tableau de bord | Ratios du graphe ventes | `CA Global 4 875 k F`, `Ordonnances 318 ord.`, `Panier Moyen 15 330 F` | synthèse : `activite.ca_ttc`, `activite.nb_ordonnances`, `activite.panier_moyen` | TDB-03 |
| Tableau de bord | Badge de variation | `+14.2%` | synthèse : `activite.comparaisons.semaine_precedente` (signe et couleur calculés) | TDB-03 |
| Tableau de bord | Pied du graphe ventes | `Pic : Samedi (980 000 FCFA)`, `Scellé DGI Certifié` | synthèse : `activite.pic` ; le libellé DGI doit refléter le taux de certification réel (`/facturation/emecef`) | TDB-03, FDG-14 |
| Tableau de bord | Carte « Frigo Vaccins » | repli `4.2` si mesure absente + `Sonde continue active` | `/officines/{id}/temperatures/stats` → `zones.refrigeree_2_8.temp_actuelle` ; si `null` → « Mesure manquante » + alerte | TDB-17 |
| Tableau de bord | Carte « Magasin Réserve » | repli `21.4` + `Ambiance régulée` | idem `zones.magasin_reserve.temp_actuelle` | TDB-17 |
| Tableau de bord | Carte « Conformité BPD » | repli `98.4` + `263 / 267 critères` | `/officines/{id}/auto-evaluation/campagne-courante` → `statistiques.score_global`, `statistiques.exigences_evaluees` | TDB-06 |
| Tableau de bord | Carte « Qualité & CAPA » | repli `12 SOPs validées`, `0 litige critique en cours` | `/officines/{id}/documents` (déjà appelé) et `/officines/{id}/non-conformites` ; le texte « 0 litige » doit être calculé | TDB-06 |
| Tableau de bord | Légende thermique | `Frigo Vaccins (4.2°C)`, `Réserve Magasin (21.4°C)` en dur dans la légende | valeurs issues des mesures, ou légende sans valeur | TDB-17 |
| Tableau de bord | Badge présence | `Présences actives ({… ?? 1})` : repli à 1 | `/officines/{id}/pointages/actif` → `pointages_actifs.length`, afficher 0 si vide | TDB-07 |
| Caisse POS | Panneau TVA | `TVA collectée (0%) : 0 FCFA` figé | calcul par ligne depuis `produit.groupe_taxation` et `taux_tva` ; afficher le taux réel du groupe B (18 %) | VTE-04 |
| Dispensation | Carte « Règle FEFO » | `100% Automatique` | indicateur réel : part des lignes délivrées sur le lot FEFO proposé sans substitution justifiée | DSP-12 |
| Facturation | Carte « Taux de Certification » | `100% Certifié` | `factures` : `nb_certifiees / nb_total` sur la période, avec les statuts `en_attente` et `echouee` | FDG-14 |
| Facturation | Carte « Taux Médicaments » | `Groupe A (0%)` | répartition réelle A/B calculée depuis les lignes de factures | FDG-04 |
| Facturation | Aperçu du reçu | `Total HT (Groupe A - 0%)` et `Total TVA (0%)` figés | totaux A et B recalculés, cohérents avec la chaîne du QR | FDG-04 |

### 1.3 Incohérences d'interface à corriger

| # | Constat | Décision |
| --- | --- | --- |
| I-01 | Deux design systems coexistent : charte verte (tableau de bord, consolidation, gardes) et slate/emerald (caisse, dispensation, facturation) | **Unifier sur la charte verte** (§1.4). Les trois écrans du comptoir sont à migrer : mêmes tokens, mêmes `rounded-2xl/3xl`, mêmes boutons |
| I-02 | Le titre du tableau de bord est dans `index.tsx` (« Bonjour … ») et les blocs dans `tableau-de-bord.tsx` | Conserver la séparation, mais déplacer les blocs dans des composants de `components/modules/` (§4) pour pouvoir les tester unitairement |
| I-03 | La carte « Stock par Lots (FEFO) » des accès rapides pointe vers la section Stock (hors périmètre) | Conserver le lien, mais l'indicateur d'appel doit venir de la synthèse (lecture seule, pas de modification de la page Stock) |
| I-04 | `imprimerFicheOfficielle()` est appelé avec du HTML reconstruit à la main dans `vente.tsx` et `facturation.tsx` | Factoriser dans `components/modules/recu-normalise.tsx` : une seule source de vérité du reçu (aperçu écran = aperçu imprimé) |
| I-05 | Les tableaux (ordonnancier, journal des factures, comparatif) n'ont ni tri ni pagination visible | Ajouter tri par colonne, pagination par 25, et état vide illustré (§6) |
| I-06 | Aucune trace de l'horodatage des données affichées | Chaque bloc porte « à jour à HH:MM » ; le tableau de bord affiche l'horodatage de la synthèse |

### 1.4 Charte graphique cible (tokens relevés dans l'existant)

| Rôle | Valeur | Usage |
| --- | --- | --- |
| Vert institutionnel | `#023010` / `#0F3B27` | Titres, boutons primaires, fonds d'icône |
| Vert d'action | `#18AA38` | Hover des boutons primaires, état actif |
| Accent vif | `#92FF5F` | Texte sur fond vert foncé, points actifs des courbes |
| Bordures / fonds clairs | `#CFF1D2`, `#CFE3D5`, `#E8F5EB`, `#F7F9F7` | Cartes, séparateurs, fonds de bloc |
| Texte | `#1F2420` (principal), `#5C6660` / `#475C50` (secondaire) | Corps, libellés |
| Alerte | `#FF7036` (critique), ambre `amber-50/300` (avertissement), `red-600` (destructif) | États |
| Information | `#BFF2F0` | Pastilles neutres (ex. thermomètre) |
| Formes | `rounded-2xl` (cartes secondaires), `rounded-3xl` (cartes principales), `rounded-xl` (boutons) | — |
| Typographie | titres `font-display font-black tracking-tight`, corps `font-sans`, chiffres techniques `font-mono` | — |
| Tailles tactiles | `h-11` (44 px) minimum, `h-12` (48 px) sur mobile | \[NF-10\] |

Palette de séries pour les graphiques (ordre d'utilisation, accessible sur fond blanc) :

| Rang | Couleur | Usage type |
| --- | --- | --- |
| 1 | `#0F3B27` | série principale (CA, température frigo) |
| 2 | `#18AA38` | série secondaire (encaissements, objectif atteint) |
| 3 | `#92FF5F` | mise en avant, point actif |
| 4 | `#FF7036` | série d'alerte (ambiant, écart, excursion) |
| 5 | `#BFF2F0` | série neutre / comparaison |
| 6 | `#475C50` | série tertiaire, texte d'axe |

Fonds de grille `#E5ECE7`, `strokeDasharray="3 3"`, axe X `#CFF1D2`, tooltip fond `#0F3B27` texte blanc `rounded-16` label `#92FF5F` (conforme à l'existant).

---

## 2. Spécification d'interface par écran

Convention des wireframes : `┌ ┐ └ ┘` = carte, `[ ]` = bouton, `( )` = champ, `{ }` = badge, `▤` = tableau, `▧` = graphique. Les libellés entre « » sont les libellés exacts attendus en français.

### 2.1 Tableau de bord — `/dashboard`

#### 2.1.1 Interface cible (desktop ≥ 1024 px)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ « Bonjour, Dr. Anicet ANIAMBOSSOU »              [+ Nouvelle officine] [Actualiser]│
│ Pharmacie de l'Étoile · Porto-Novo · Promoteur   Synthèse à jour à 08:12 {Hors ligne?}│
└──────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────┐
│ {Conforme} Présence Pharmaceutique Conforme (Art. 1.11)   [Présences actives (5) →]│
│  ou {Attention} « Alerte : Aucun pharmacien diplômé pointé »  [Pointer ma présence] │
└──────────────────────────────────────────────────────────────────────────────────┘
┌── Centre d'alertes (TDB-02) ─────────────────────────────────────────────────────┐
│ {3 critiques} {5 importants} {2 informations}              [Tout voir →] [Réglages]│
│ ▸ 08:02 CRITIQUE  Écart de caisse −1 500 F · Gervais K.      [Voir le ticket Z]     │
│ ▸ 07:45 IMPORTANT 2 lots périment à moins de 30 jours        [Voir les péremptions] │
└──────────────────────────────────────────────────────────────────────────────────┘
┌── Activité du jour ────────────────────────────────┐ ┌── Caisse & trésorerie ─────┐
│ ▧ CA par heure (AreaChart)                          │ │ Session CAISSE-2026-0021   │
│ CA 145 000 F {+8,4 % vs hier}  Tickets 24           │ │ Fond 50 000 · Espèces 62 000│
│ Panier moyen 6 042 F · Marge brute 31 200 F         │ │ MM 71 000 · Carte 12 000   │
│ ◔ Répartition par mode de paiement (PieChart)       │ │ Écart dernière clôture −1500│
│ [Ouvrir la caisse] [Voir les tickets]               │ │ {2} paiements en attente   │
└─────────────────────────────────────────────────────┘ └────────────────────────────┘
┌── Stock ───────────────┐ ┌── Qualité & BPD ────────┐ ┌── Personnel ───────────────┐
│ Valeur 4 850 000 F     │ │ Score BPD 96,5 %        │ │ Présents 5 · Retards 1     │
│ Ruptures {6}           │ │ NC ouvertes {2}         │ │ Absents 2                  │
│ Sous minimum {11}      │ │ Températures 2/2        │ │ Pharmacien présent {Oui}   │
│ Péremptions 6/3/1 mois │ │ Documents à réviser {3} │ │ Heures sup. du mois 12,5   │
│ ▧ barre empilée        │ │ ▧ radar par chapitre    │ │ [Voir le pointage]         │
└────────────────────────┘ └─────────────────────────┘ └────────────────────────────┘
┌── Anti-fraude (par caissier) ──────────────────────┐ ┌── Compta & fiscalité ──────┐
│ ▤ caissier · annulations · remises · retours ·     │ │ Résultat du mois 1 240 000 F│
│   écarts · ventes hors horaires {niveau}           │ │ TVA estimée 386 000 F       │
│                                                    │ │ Échéances : TVA 20/11 …     │
└────────────────────────────────────────────────────┘ └────────────────────────────┘
┌── Actions du promoteur (TDB-11) ─────────────────────────────────────────────────┐
│ [Approuver 1 annulation] [Valider 1 commande] [Valider 1 destruction] [Résumés]  │
└──────────────────────────────────────────────────────────────────────────────────┘
┌── Accès rapides ─────────────────────────────────────────────────────────────────┐
│ [Caisse POS Tactile →] [Dispensation & Ordonnances →] [Facturation DGI →]        │
│ [Stock par Lots (FEFO) →] [Audit 267 Arts BPD →] [Consolidation Groupe →]        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### 2.1.2 Zones, composants et données

| Zone | Composant cible | Données (endpoint) | Rafraîchissement | Rôles |
| --- | --- | --- | --- | --- |
| En-tête | `index.tsx` (existant) + `GrilleKpi` | `useOfficine()`, `GET /dashboard/synthese` | 60 s | tous |
| Bandeau présence | existant, à conserver | `GET /officines/{id}/pointages/actif` | 30 s | tous (action « pointer » : pharmaciens) |
| Centre d'alertes | `components/modules/centre-alertes.tsx` | `GET /dashboard/alertes` | 60 s + push | tous (filtré par rôle) |
| Activité du jour | `GrilleKpi` + `GrapheCaHoraire` | synthèse `activite` | 60 s | tous |
| Caisse & trésorerie | `GrilleKpi` | synthèse `caisse` + `/caisse/session-active` | 30 s | promoteur, pharmacien, caissier, comptable |
| Stock | `GrilleKpi` + `GraphePeremptions` | synthèse `stock`, `/stocks/alertes`, `/stocks/peremptions`, `/stocks/valorisation` | 5 min | tous sauf données sensibles |
| Qualité & BPD | `GrilleKpi` + `RadarChapitres` | synthèse `qualite`, endpoints existants | 5 min | tous |
| Personnel | `GrilleKpi` | synthèse `personnel`, `/officines/{id}/employes` | 60 s | promoteur, pharmacien, RMQ, comptable |
| Achats & fournisseurs | `GrilleKpi` | synthèse `achats` | 5 min | promoteur, pharmacien, magasinier, comptable |
| Comptabilité & fiscalité | `GrilleKpi` | synthèse `comptabilite`, `/comptabilite/journal-ventes` | 15 min | promoteur, comptable |
| Anti-fraude | `TableauSynthese` | synthèse `anti_fraude` | 5 min | promoteur, pharmacien |
| Actions du promoteur | `ActionsRapides` | endpoints des pages cibles | à la demande | promoteur, pharmacien |
| Accès rapides | cartes-liens existantes | — | — | selon droits |

#### 2.1.3 Responsive

| Largeur | Comportement |
| --- | --- |
| ≥ 1280 px | 4 colonnes pour les KPI, graphiques en 2 colonnes |
| 1024–1279 px | 3 colonnes KPI, graphiques en 2 colonnes |
| 768–1023 px | 2 colonnes KPI, graphiques empilés pleine largeur |
| < 768 px | 1 colonne, centre d'alertes replié sur 3 lignes avec « Tout voir », accès rapides en grille 2×3, `h-12` partout |

#### 2.1.4 États

- **Chargement** : `Skeleton` par bloc (jamais un squelette unique pour toute la page).
- **Vide** : « Aucune vente enregistrée aujourd'hui » + bouton « Ouvrir la caisse » ; « Aucun pharmacien pointé » (état critique, pas un état vide).
- **Erreur d'une source** : le bloc affiche « Indisponible — source en panne » avec bouton « Réessayer » ; les autres blocs restent affichés (aucun écran d'erreur global).
- **Hors-ligne** : bandeau « Données de 08:12 — hors ligne » + désactivation des actions de validation.

### 2.2 Consolidation Groupe — `/dashboard/consolidation`

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ « Consolidation Groupe Multi-Officines » {Promoteur}   (période ▾)  [Actualiser]  │
└──────────────────────────────────────────────────────────────────────────────────┘
┌ CA Groupe du Jour ┐ ┌ Valeur Stock Global ┐ ┌ Péremptions < 30j ┐ ┌ Écarts & NC ┐
│ 290 000 F {+6 %}  │ │ 9 700 000 F         │ │ 2 {critique}      │ │ 0           │
│ Mois : 7 640 000 F│ │ prix d'achat moyen  │ │ à écouler/transf. │ │ réseau      │
└───────────────────┘ └─────────────────────┘ └───────────────────┘ └─────────────┘
┌── Tableau comparatif des officines ──────────────────────────────────────────────┐
│ ▤ Officine | Ville & Licence | Pharmacien (1.11) | CA jour | Stock | Score BPD |  │
│            Péremptions < 30j | Actions [Bascule] [Transfert]                     │
│  (tri par colonne, classement ▾ par indicateur)                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
┌── Comparaison graphique ───────────────────────┐ ┌── Opportunités de transfert ──┐
│ ▧ BarChart groupé CA par officine (jour/mois)  │ │ ▤ produit · lot · source →    │
│ ▧ LineChart évolution 30 jours par officine    │ │   destination · qté · motif   │
└────────────────────────────────────────────────┘ │ [Initier le transfert]        │
┌── Suivi des transferts ────────────────────────┐ └───────────────────────────────┘
│ ▤ N° | Origine → Destination | Produits & lots | Statut | [Valider réception]    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

| Élément | Spécification |
| --- | --- |
| Sélecteur de période | `jour` / `semaine` / `mois` / `année` + comparaison avec la période précédente (case à cocher) |
| Classement | liste déroulante « Classer par » : CA jour, CA mois, marge, valeur stock, score BPD, ruptures, péremptions ; le tableau se retri et affiche l'écart au meilleur |
| Présence pharmacien | pastille verte « Présent sur place » avec le nom, orange « Aucun pointé » → cliquable vers `/dashboard/pointage` |
| Bascule d'officine | bouton par ligne ; confirme l'officine active dans la barre d'état ; rechargement des caches de l'officine cible |
| Accès | réservé aux utilisateurs rattachés à ≥ 2 officines ; sinon entrée de menu masquée et 403 côté API |
| Export | PDF et Excel du comparatif + des transferts, avec période et date d'édition |

### 2.3 Pharmacies de Garde — `/dashboard/gardes`

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ « Pharmacies de Garde (Bénin) »        [Imprimer pour Vitrine] [Déclarer une Garde]│
│ (commune ▾) (date ▾) (statut ▾)                            (recherche quartier)  │
└──────────────────────────────────────────────────────────────────────────────────┘
┌── Garde en cours ────────────────────────────────────────────────────────────────┐
│ {En cours} Pharmacie de l'Étoile · Cotonou · Quartier Ganhi · 08:00 → 08:00      │
│ [Appeler l'officine] [Itinéraire] [Voir la déclaration]                          │
└──────────────────────────────────────────────────────────────────────────────────┘
┌── Calendrier du mois (P2) ───────────────────────────────────────────────────────┐
│ ▦ novembre 2026 : pastilles par jour, garde de l'officine en vert foncé          │
└──────────────────────────────────────────────────────────────────────────────────┘
┌── Gardes à venir ────────────────┐ ┌── Gardes passées ───────────────────────────┐
│ cartes (officine, commune,       │ │ ▤ date · officine · commune · observations  │
│ quartier, téléphone, période,    │ │                            [Exporter CSV]   │
│ observations) [Appeler]          │ └─────────────────────────────────────────────┘
└──────────────────────────────────┘
```

| Élément | Spécification |
| --- | --- |
| Carte de garde | nom, commune, quartier / repère, téléphone d'urgence cliquable (`tel:`), période, statut (`À venir`, `En cours`, `Passée`), observations |
| Affiche vitrine | PDF A4 portrait : titre, période, liste des officines de garde avec commune et téléphone, logo officine, date d'édition, mention « Affiche générée le JJ/MM/AAAA à HH:MM » |
| Recherche | par commune (liste issue des gardes déclarées), quartier (texte libre), date, statut |
| Calendrier | vue mensuelle, clic sur un jour → liste des gardes du jour ; glisser-déposer d'une garde interne avec motif obligatoire (journalisé) |
| Notification | rappel à l'équipe à J-1 de la garde de l'officine ; alerte si aucune garde déclarée sur une période attendue |
| Droits | déclaration : promoteur, pharmacien, RMQ ; suppression : promoteur uniquement avec motif ; lecture : tous |

### 2.4 Caisse POS Tactile e-MECeF — `/dashboard/vente`

#### 2.4.1 Interface cible (poste de comptoir, ≥ 1024 px)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ « Caisse POS Tactile & Mobile Money » {e-MECeF}                                   │
│ {Session CAISSE-2026-0021 · Gervais K. · fond 50 000 F · 14 tickets · 145 000 F}  │
│ [Ticket X] [Mouvements de caisse] [Cahier Mobile Money] [Clôturer la caisse (Z)]  │
│ {Hors ligne : 2 tickets en file}                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
┌── Catalogue (7/12) ──────────────────────────────┐ ┌── Ticket comptoir (5/12) ───┐
│ (🔍 nom, DCI ou code-barres)  [📷 Scanner]        │ │ Client (nom) · IFU (facult.)│
│ {classe ▾} {TVA ▾} {en stock uniquement}         │ │ ▤ ligne · lot FEFO · qté ·  │
│ ▦ tuiles produit : nom, dosage, prix, stock,      │ │   PU · remise · total · [×] │
│   {liste I} {stup} {2-8 °C} {péremption proche}   │ │ [+ Remise] [Vider le ticket]│
│   (clic = ajoute 1 ; appui long = quantité)       │ │ [Mettre en attente] {3 paniers}│
│ ▤ résultats de recherche (Entrée = ajoute)        │ ├─────────────────────────────┤
│ « 142 références actives »                        │ │ Articles exonérés (A) 12 000│
└───────────────────────────────────────────────────┘ │ Articles taxables (B)  8 000│
                                                      │ TVA collectée 18 %     1 440│
                                                      │ Remise              −    500│
                                                      │ « NET À PAYER »       18 940│
                                                      ├─────────────────────────────┤
                                                      │ Mode : ( ) Espèces ( ) MM    │
                                                      │        ( ) Carte ( ) Mixte   │
                                                      │ ( ) Crédit ( ) Prise en charge│
                                                      │ Montant reçu ( ) 20 000      │
                                                      │ « Monnaie à rendre » 1 060   │
                                                      │ [💳 FeexPay] [Valider la vente]│
                                                      └─────────────────────────────┘
```

#### 2.4.2 Spécifications du poste de vente

| Élément | Spécification |
| --- | --- |
| Recherche | champ unique, `autoFocus`, debounce 200 ms, résultats < 500 ms sur 20 000 références \[NF-01\] ; recherche par nom commercial, DCI, code interne, code-barres (CIP) ; `Entrée` ajoute le premier résultat |
| Scan | bouton « Scanner » (caméra via `getUserMedia`) et support douchette (saisie clavier + `Entrée`) ; un code inconnu ouvre « Produit non référencé » avec création rapide réservée au pharmacien |
| Tuiles produit | grille `grid-cols-2 md:grid-cols-3 xl:grid-cols-4`, hauteur ≥ 96 px ; affichent nom, dosage, prix TTC, stock disponible, badges réglementaires ; grisées si non vendables avec le motif au survol |
| Badges produit | `{Liste I}` `{Liste II}` `{Stupéfiant}` `{Thermolabile 2-8 °C}` `{Péremption < 30 j}` `{Rupture}` `{Surveillance}` |
| Panier | chaque ligne affiche le **lot FEFO retenu** (numéro + péremption) ; clic sur le lot → modale de choix d'un autre lot avec justification obligatoire |
| Remises | remise par ligne et remise globale en FCFA ou % ; au-delà du plafond du rôle → modale de validation pharmacien avec motif |
| Totaux | ventilation groupe A / groupe B, TVA par taux, remise, net à payer ; **recalculés serveur** à la validation |
| Règlement | espèces (montant reçu, monnaie), Mobile Money (panneau FeexPay), carte, chèque, crédit client, prise en charge organisme, mixte (ventilation par mode) |
| Validation | bouton `h-12` pleine largeur, désactivé tant que : panier vide, session fermée, montant reçu insuffisant, produit interdit, paiement non confirmé |
| Après validation | modale de succès avec reçu, [Imprimer], [Envoyer par SMS/WhatsApp/e-mail], [Nouvelle vente] ; le panier se vide, le focus revient sur la recherche |
| Raccourcis clavier | `F2` règlement · `F4` mise en attente · `F8` annulation de la ligne sélectionnée · `Échap` ferme la modale · `+`/`-` quantité |
| Hors-ligne | bandeau permanent avec le compteur de la file ; les ventes espèces sont acceptées avec reçu provisoire « Certification DGI en attente de synchronisation » |

### 2.5 Dispensation & Ordonnances — `/dashboard/dispensation`

#### 2.5.1 Onglets

`Nouveau parcours` · `Ordonnancier` · `Conseils et ventes libres` · `Interventions pharmaceutiques` · `Dossiers patients` · `Vigilances` · `Erreurs et écarts`

#### 2.5.2 Assistant de dispensation (7 étapes, composant `AssistantDispensation`)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ① Accueil  ② Ordonnance  ③ Analyse réglementaire  ④ Analyse pharmaceutique       │
│ ⑤ Décision pharmacien  ⑥ Collecte & scan  ⑦ Délivrance & conseil                 │
│                                                     {Étape 3 sur 7} {Entretien confidentiel}│
└──────────────────────────────────────────────────────────────────────────────────┘
┌── Étape 3 : Analyse réglementaire (art. 7.19) ───────────────────────────────────┐
│ Ordonnance de : Dr. HOUNSA · CNHU · 08/11/2026 · validité 3 mois {Conforme}      │
│ ▤ item | attendu | constat | ( ) Conforme ( ) Non conforme ( ) N/A | commentaire │
│   Authenticité du support …          Type de prescription (liste I) …            │
│   Qualité du prescripteur …          Durée de prescription …                     │
│ Résultat global : « Conforme » obligatoire pour continuer                        │
│                                                    [Retour] [Valider l'analyse]  │
└──────────────────────────────────────────────────────────────────────────────────┘
┌── Étape 4 : Analyse pharmaceutique ──────────────────────────────────────────────┐
│ {BLOQUANTE} Interaction Amoxicilline + Méthotrexate — [Détail] [Motif du pharmacien]│
│ {Attention} Redondance de principe actif (2 lignes) — [Accepter] [Ignorer + motif]│
│ {Information} Posologie usuelle différente — [Voir la fiche]                     │
│ Dossier patient : allergie pénicilline {Oui} · poids 68 kg · grossesse {Non renseigné}│
└──────────────────────────────────────────────────────────────────────────────────┘
┌── Étape 6 : Collecte & contrôle par scan ────────────────────────────────────────┐
│ ▤ produit prescrit | lot FEFO proposé | scanné | péremption | intégrité | conservation│
│   Amoxicilline 1g  LOT-2026-014  ✓  12/2026  [✓] [✓] [✓]                        │
│ {Refusé} Tramadol 50mg : lot en quarantaine — rappel ABMed du 05/11 [Lot alternatif]│
└──────────────────────────────────────────────────────────────────────────────────┘
┌── Étape 7 : Délivrance, conseil & enregistrements ───────────────────────────────┐
│ ▤ conseil par médicament : indication · administration · précautions · conservation│
│ [Imprimer le plan de posologie] [Imprimer les étiquettes] [Timbre officine]      │
│ (✓) Compréhension vérifiée  (✓) Documents remis  [Signature pharmacien]          │
│ [Envoyer à la caisse] [Terminer sans encaisser]                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

| Élément | Spécification |
| --- | --- |
| Barre d'étapes | 7 puces numérotées, étape courante en vert foncé, étapes validées cochées, étapes bloquées grisées ; non cliquable vers l'avant tant que l'étape courante n'est pas conforme |
| Progression sauvegardée | un parcours interrompu est repris à la dernière étape (état local + brouillon serveur) ; liste « Parcours en cours » en tête de l'onglet |
| Entretien confidentiel | interrupteur en tête d'assistant : masque le motif et les produits sur tout écran partagé, désactive l'impression automatique \[art. 7.45\] |
| Alertes pharmaceutiques | trois niveaux : `information` (bleu neutre), `attention` (ambre), `bloquante` (rouge, action obligatoire) ; chaque acceptation/rejet exige un motif et est journalisée |
| Signature | modale `SignatureAgent` : code personnel (masqué par défaut), nom affiché, horodatage serveur après validation ; 3 essais puis verrouillage |
| Envoi à la caisse | crée la dispensation validée et bascule sur `/dashboard/vente?dispensation=<id>` avec le panier prérempli et verrouillé (les lignes sur ordonnance ne sont plus modifiables sans retour au parcours) |
| Ordonnancier | tableau : n°, date, patient, prescripteur, produits et lots, montant, dispensateur, visa pharmacien, statut ; filtres période / type / visa manquant ; export PDF et Excel |
| Indicateurs en tête | 4 cartes : dispensations du jour, part avec intervention pharmaceutique, alertes ignorées, erreurs déclarées — **valeurs réelles** issues de `/dispensations/indicateurs` |

### 2.6 Facturation DGI e-MECeF — `/dashboard/facturation`

#### 2.6.1 Onglets

`Registre des factures` · `Compteurs et certification` · `Vérification d'un reçu` · `Paramètres fiscaux` · `Rapprochement et exports`

#### 2.6.2 Interface cible

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ « Facturation Normalisée DGI e-MECeF » {Législation fiscale béninoise}            │
│ (période ▾) (type ▾ FV/EV) (statut ▾) (client / IFU) (montant)   [Exporter CSV]  │
└──────────────────────────────────────────────────────────────────────────────────┘
┌ Factures FV ┐┌ Factures EV ┐┌ Taux de certification ┐┌ TVA collectée ┐┌ File d'attente ┐
│ 1 235       ││ 12          ││ 99,4 % {2 échecs}      ││ 386 000 F    ││ {3} à recertifier│
│ compteur    ││ compteur    ││ ▧ jauge                ││ A 0 % / B 18%││ [Relancer]      │
└─────────────┘└─────────────┘└────────────────────────┘└──────────────┘└─────────────────┘
┌── Journal des factures normalisées ──────────────────────────────────────────────┐
│ ▤ N° facture DGI | Date & heure | Client & IFU | TTC | NIM | Code e-MECeF | Statut│
│   | Actions [Voir] [Imprimer] [Avoir] [Écritures]                                │
└──────────────────────────────────────────────────────────────────────────────────┘
┌── Compteurs et intégrité de la séquence ─────────────────────────────────────────┐
│ ▧ LineChart : factures émises par heure  ·  tableau des trous de séquence         │
│ Dernier compteur FV 1235 · EV 12 · global 1247 · {Aucun trou détecté}            │
└──────────────────────────────────────────────────────────────────────────────────┘
```

| Élément | Spécification |
| --- | --- |
| Statuts affichés | `certifiee` (vert), `en_attente` (ambre), `echouee` (rouge), `annulee` (gris barré) ; filtre par statut |
| Code e-MECeF | affiché tronqué `A1B2…F9` avec bouton « copier la valeur intégrale » (journalisé) |
| QR | miniature cliquable → agrandissement imprimable ; la chaîne encodée est visible en `font-mono` pour contrôle |
| Détail d'une facture | modale : lignes avec groupe de taxation, totaux A et B, TVA par taux, ticket d'origine, session de caisse, écritures SYSCOHADA liées, historique des vérifications |
| Avoir | bouton sur chaque facture certifiée → modale avec motif, validation pharmacien/comptable, génération d'une facture `EV` liée |
| Vérification d'un reçu | scan du QR ou saisie du code ; réponse : facture trouvée (avec officine, date, montant, statut) ou « Reçu introuvable ou non conforme » ; chaque vérification journalisée |
| Rapprochement | tableau des écarts du jour : facture sans ticket, ticket sans facture, montant divergent, TVA divergente ; export ; alerte si un écart subsiste à la clôture |
| Paramètres fiscaux | IFU, NIM, régime d'imposition, taux et groupes, mentions légales ; historique des versions avec date d'effet ; accès promoteur et comptable uniquement |

---

## 3. Inventaire des modales

### 3.1 Modales existantes (à conserver, à harmoniser)

| # | Écran | Modale | Déclencheur | Contenu réel aujourd'hui |
| --- | --- | --- | --- | --- |
| M-01 | Tableau de bord | Création d'officine | `+ Nouvelle officine` | `ModaleFiche` 2 colonnes : identité (nom, ville) + « Après la création » (3 étapes) |
| M-02 | Caisse | Ticket de vente réussi | validation d'une vente | reçu (officine, ticket, facture DGI, client, lignes, total, reçu/rendu), [Imprimer Ticket], [Fermer] |
| M-03 | Caisse | Ouverture de session | `Ouvrir une session de caisse` | fond d'ouverture, rappel « une seule session à la fois », journalisation |
| M-04 | Caisse | Clôture Z | `Clôturer la caisse (Z)` | fond d'ouverture, encaissé espèces, espèces théoriques, fond réel, écart, notes |
| M-05 | Dispensation | Nouvelle dispensation | `Nouvelle Dispensation Ordonnance` | patient (nom, téléphone), prescription (médecin, établissement), lignes produits avec lot FEFO, posologie, total, [Annuler]/[Valider] |
| M-06 | Facturation | Détail de facture | `Voir Ticket` | reçu fiscal complet, QR, code e-MECeF, [Imprimer Ticket Fiscal] |
| M-07 | Consolidation | Confirmation de transfert | `Initier transfert` | origine, cible, produit, lot, quantité, motif |
| M-08 | Gardes | Déclaration d'une période de garde | `Déclarer une Garde` | officine, commune, quartier, téléphone, début, fin, observations |

### 3.2 Modales à ajouter

| # | Écran | Modale | Déclencheur | Champs | Actions | Règles |
| --- | --- | --- | --- | --- | --- | --- |
| M-09 | Tableau de bord | Détail d'un indicateur | clic sur un KPI | période, décomposition, top contributeurs, lien vers la pièce | [Ouvrir la page] [Exporter] | forage limité aux droits \[DSH-12\] |
| M-10 | Tableau de bord | Réglage des alertes | `Réglages` du centre d'alertes | par type : niveau, canaux (push/SMS/e-mail/WhatsApp), plage horaire, destinataires | [Enregistrer] | promoteur uniquement, versionné |
| M-11 | Tableau de bord | Approbation d'une annulation | action du centre d'alertes | ticket, motif du caissier, code personnel du validateur | [Approuver] [Refuser] | RG-C04, signature |
| M-12 | Tableau de bord | Résumé quotidien | `Résumés` | heure d'envoi, canaux, aperçu du dernier résumé, historique des envois | [Envoyer maintenant] [Modifier l'heure] | DSH-11 |
| M-13 | Caisse | Mouvement de caisse | `Mouvements de caisse` | type (entrée/sortie), catégorie, montant, motif, pièce jointe | [Enregistrer] | CAI-06, inaltérable |
| M-14 | Caisse | Ticket X | `Ticket X` | compteurs par mode, CA, espèces théoriques, depuis l'ouverture | [Imprimer] | POS-11, non destructif |
| M-15 | Caisse | Règlement FeexPay | `FeexPay` | opérateur (MTN/Moov/Celtiis), numéro masqué, montant, QR, statut temps réel, compte à rebours | [Renvoyer la demande] [Annuler] [Changer de mode] | FPX-01 à FPX-03, polling 15 s |
| M-16 | Caisse | Remise au-delà du seuil | saisie d'une remise hors plafond | remise demandée, plafond du rôle, motif, code personnel du validateur | [Valider la remise] | RG-C03 |
| M-17 | Caisse | Annulation d'un ticket | ticket → `Annuler` | motif (liste + libre), code personnel, portée (ticket entier ou ligne) | [Annuler le ticket] | RG-C04, contre-passation |
| M-18 | Caisse | Avoir / retour client | ticket → `Avoir` | lignes reprises, motif, type de produit (médicament = pas de retour en stock), validation | [Émettre l'avoir] | VTE-07, RG-C07, facture `EV` |
| M-19 | Caisse | Envoi du reçu | modale ticket → `Envoyer` | canal (SMS/WhatsApp/e-mail), destinataire, aperçu | [Envoyer] | CAI-04, journalisé |
| M-20 | Caisse | Choix d'un autre lot | clic sur le lot d'une ligne | lots disponibles (péremption, stock, statut), justification obligatoire | [Utiliser ce lot] | RG-D02, art. 5.8 |
| M-21 | Caisse | Paniers en attente | `Mettre en attente` / `{n paniers}` | liste des paniers avec nom, ancienneté, total | [Reprendre] [Supprimer] | VTE-09 |
| M-22 | Caisse | Prise en charge organisme | mode « Prise en charge » | organisme, n° de bon, part organisme, part patient, pièce téléversée | [Appliquer] | VTE-05 |
| M-23 | Caisse | Crédit client | mode « Crédit » | client, plafond, encours, échéance, autorisation | [Accorder] | VTE-06, RG-C08 |
| M-24 | Dispensation | Patient (recherche/création) | étape 1 | identité, date de naissance, sexe, poids, taille, téléphone, mandataire, allergies, terrain, consentement DP | [Sélectionner] [Créer] | DSP-01 à DSP-03, DP-01 |
| M-25 | Dispensation | Ordonnance (photo/scan) | étape 2 | dépôt glisser-déposer, prescripteur, date, validité, produits prescrits | [Analyser l'ordonnance] | DSP-04, ≤ 10 Mo, SHA-256 |
| M-26 | Dispensation | Détail d'une alerte | clic sur une alerte | produit, type, gravité, source, contre-indication, alternative proposée, motif du pharmacien | [Accepter] [Ignorer avec motif] | DSP-06, RG-D05, RG-D07 |
| M-27 | Dispensation | Décision du pharmacien | étape 5 | décision (délivrer/surseoir/modifier/refuser), motif, code personnel, notification au prescripteur | [Signer la décision] | DSP-08, signature |
| M-28 | Dispensation | Intervention pharmaceutique | décision « modifier » | type d'IP, description, prescripteur contacté (mode, date, réponse), résultat | [Enregistrer] [Envoyer le PDF] | DSP-09 |
| M-29 | Dispensation | Substitution | ligne substituée | produit initial, produit substitué, accord du prescripteur ou urgence, justification | [Valider la substitution] | DSP-10, compréhension obligatoire |
| M-30 | Dispensation | Scan d'une boîte | étape 6 | code-barres lu, lot, péremption, intégrité, conservation, photo | [Conformer] [Refuser la boîte] | DSP-12 |
| M-31 | Dispensation | Conseil et plan de posologie | étape 7 | fiche conseil par produit, posologie, documents remis, compréhension vérifiée | [Imprimer] [Enregistrer] | DSP-16, DSP-18 |
| M-32 | Dispensation | Erreur de délivrance | onglet « Erreurs » | déclarant, type (achat/délivrance/prescription), produit, lot, patient, gravité, causes, mesures | [Déclarer] [Créer la NC liée] | DSP-19, BPD-C05 |
| M-33 | Dispensation | Notification de vigilance | onglet « Vigilances » | type (pharmaco/matério/réacto/hémovigilance), patient (initiales, âge, sexe), produit, lot, dates, description, gravité, caractère inattendu, évolution, notificateur | [Enregistrer] [Transmettre à l'ABMed] | DSP-26, DSP-27 |
| M-34 | Dispensation | Parcours hors prescription | onglet « Conseils » | pour qui, symptômes, durée, traitements en cours, état physiopathologique, issue, risque d'usage détourné | [Conseiller] [Orienter] [Refuser] | DSP-20 |
| M-35 | Facturation | Avoir (EV) | registre → `Avoir` | facture d'origine, lignes, motif, validation | [Émettre la facture d'avoir] | FDG-06 |
| M-36 | Facturation | Vérification d'un reçu | onglet dédié | scan QR ou code e-MECeF | [Vérifier] | FDG-08, journalisé |
| M-37 | Facturation | Paramètres fiscaux | onglet dédié | IFU, NIM, régime, taux, groupes, mentions légales, date d'effet | [Enregistrer la version] | FDG-09, promoteur/comptable |
| M-38 | Facturation | Relance de certification | file d'attente | facture, erreur, tentative | [Relancer] | FDG-07 |
| M-39 | Consolidation | Écart à la réception | transfert → `Valider réception` | quantité attendue, quantité reçue, écart, motif, pièces | [Clôturer avec écart] | CGL-07 |
| M-40 | Consolidation | Alerte groupe | clic sur une alerte | officine, niveau, source, pièce | [Traiter] | CGL-10 |
| M-41 | Gardes | Report d'une garde | calendrier (glisser-déposer) | nouvelle période, motif | [Reporter] | GRD-04, journalisé |
| M-42 | Tous | Signature par code personnel | toute validation sensible | code personnel (masqué), nom, acte, horodatage | [Signer] | composant partagé `SignatureAgent` |

**Règles communes aux modales** : largeur `sm:max-w-lg` (simple), `sm:max-w-2xl` (fiche 2 colonnes), `sm:max-w-4xl` (assistants) ; sur mobile < 640 px, basculer en `Drawer`/`Sheet` plein écran avec actions en bas (`h-12`) ; fermeture par `Échap` et clic hors zone **sauf** si des données non enregistrées sont présentes (confirmation alors) ; un refus serveur ne ferme pas la modale et affiche le motif ; aucun bouton destructif en position primaire (rouge à droite, confirmation explicite).

---

## 4. Inventaire des graphiques

| # | Écran | Graphique | Type `recharts` | Séries / axes | Interactions | Source |
| --- | --- | --- | --- | --- | --- | --- |
| G-01 | Tableau de bord | CA du jour par heure | `AreaChart` + dégradé `#92FF5F`→`#CFF1D2` | X : heures 8→20 ; Y : FCFA (format `145k`) ; série `ca` | survol → tooltip CA + tickets ; clic sur un point → M-09 filtré sur l'heure | synthèse `activite.courbe_horaire` |
| G-02 | Tableau de bord | Répartition par mode de paiement | `PieChart` (ou `RadialBar`) | parts : espèces, Mobile Money, carte, crédit, prise en charge ; couleurs palette §1.4 | clic sur une part → tickets filtrés par mode | synthèse `activite.par_mode_reglement` |
| G-03 | Tableau de bord | Télémétrie thermique 24 h | `LineChart` + `ReferenceArea` 2–8 °C + `ReferenceLine` 25 °C | X : heures ; Y : 0–28 °C ; séries `frigo` (`#0F3B27`), `ambiant` (`#FF7036`) | survol → valeur et heure ; clic → `/dashboard/temperatures` | `/officines/{id}/temperatures?periode=24h` |
| G-04 | Tableau de bord | Péremptions 6/3/1 mois | `BarChart` empilé horizontal | X : FCFA (valeur exposée) ; Y : 3 tranches ; couleur selon criticité | clic → `/dashboard/stock?tab=peremptions&seuil=…` | synthèse `stock.peremptions` |
| G-05 | Tableau de bord | Conformité BPD par chapitre | `RadarChart` | 10 chapitres du Guide ; axe 0–100 % | survol → score et nombre d'articles ; clic → `/dashboard/auto-evaluation` | synthèse `qualite.score_par_chapitre` |
| G-06 | Tableau de bord | Tendance CA 7 jours | `ComposedChart` (barres CA + ligne ordonnances) | X : jours ; Y gauche FCFA, Y droite ordonnances | survol ; clic → détail du jour | synthèse `activite.courbe_journaliere` |
| G-07 | Tableau de bord | Présence du personnel | `BarChart` empilé | présents / retards / absents par jour (7 j) | clic → `/dashboard/pointage` | synthèse `personnel.historique` |
| G-08 | Tableau de bord | Écarts de caisse | `BarChart` divergent | X : jours ; Y : écart en FCFA (positif/négatif) ; seuil en `ReferenceLine` | clic → M-14 de la session concernée | synthèse `caisse.historique_ecarts` |
| G-09 | Caisse | Encaissements de la session par mode | `BarChart` horizontal | modes ; FCFA ; comparaison théorique/réel | impression dans le ticket X | `/caisse/session/{id}/ticket-x` |
| G-10 | Caisse | Rythme de vente de la session | `LineChart` | X : heures ; Y : tickets et CA | — | `/caisse/session/{id}/ticket-x` |
| G-11 | Dispensation | Indicateurs de dispensation | `BarChart` groupé | ordonnances, avec IP, refus, alertes ignorées, erreurs | période sélectionnable | `/dispensations/indicateurs` |
| G-12 | Dispensation | Délai moyen de dispensation | `LineChart` | X : jours ; Y : minutes ; cible en `ReferenceLine` | — | `/dispensations/indicateurs` |
| G-13 | Dispensation | Répartition des interventions par type | `PieChart` | substitution, posologie, refus, interaction, redondance, contre-indication | clic → liste des IP | `/dispensations/interventions` |
| G-14 | Facturation | Factures émises par heure | `BarChart` | X : heures ; Y : nombre ; empilé par statut | clic → registre filtré | `/facturation/emecef/stats` |
| G-15 | Facturation | Taux de certification | jauge (`RadialBarChart`) | 0–100 % ; seuil d'alerte < 99 % | clic → file de recertification | `/facturation/emecef/stats` |
| G-16 | Facturation | TVA collectée par taux | `BarChart` | A 0 %, B 18 %, autres taux paramétrés | — | `/facturation/emecef/stats` |
| G-17 | Consolidation | CA par officine | `BarChart` groupé | X : officines ; Y : FCFA ; 2 séries (jour, mois) | clic sur une barre → bascule d'officine | `/promoteur/consolidation` |
| G-18 | Consolidation | Évolution 30 jours par officine | `LineChart` multi-séries | X : jours ; Y : FCFA ; une couleur par officine | légende cliquable (masquer une officine) | `/promoteur/consolidation?periode=mois` |
| G-19 | Consolidation | Classement par indicateur | `BarChart` horizontal trié | indicateur choisi ; écart au meilleur affiché | sélecteur d'indicateur | `/promoteur/classement` |
| G-20 | Gardes | Occupation des gardes du mois | calendrier (`▦` maison, pas recharts) | pastilles par jour | clic sur un jour → gardes du jour | `/gardes/calendrier` |

**Règles communes aux graphiques** : hauteur fixe (`h-60` desktop, `h-48` mobile) dans un `ResponsiveContainer` ; `tooltip` au format français (FCFA sans décimale, dates JJ/MM) ; axe Y jamais tronqué à une valeur arbitraire ; **état vide explicite** (« Aucune mesure sur la période ») et jamais de courbe plate à zéro silencieuse ; `aria-label` et tableau de données équivalent accessible (bouton « Voir les données ») ; aucune donnée nominative de patient dans un graphique \[DP-06\].

---

## 5. Télémétrie

### 5.1 Vocabulaire et architecture

Trois familles, collectées séparément :

| Famille | Contenu | Destinataire | Exemple |
| --- | --- | --- | --- |
| **Métriques métier** | indicateurs agrégés calculés par le serveur (CA, écarts, scores, taux) | tableau de bord, consolidation, rapports | `ca_ttc_jour = 145000` |
| **Événements d'usage** | actions de l'utilisateur dans l'interface, horodatées | amélioration produit, contrôle anti-fraude, preuve d'usage | `caisse.ticket.valide` |
| **Télémétrie technique** | performance, erreurs, réseau, hors-ligne, intégrité | exploitation, NF-01/NF-02, support | `perf.temps_reponse_ms = 380` |

**Principe directeur** : la télémétrie ne duplique jamais l'audit réglementaire. Le journal d'audit (`audit_logs`, append-only) reste la preuve légale ; la télémétrie d'usage est une mesure d'exploitation et de pilotage, **pseudonymisée et sans donnée de santé** \[DP-04\].

Architecture :

```
┌ Écran React ──┐   ┌ useQuery / synthèse ──┐   ┌ GET /dashboard/synthese ─┐
│ instrumentation│→ │ cache TanStack Query  │ ← │ agrégats serveur (SQL)   │
└───────┬───────┘   └───────────────────────┘   └──────────────────────────┘
        │ evenements (batch, 5 s ou 20 événements)
        ▼
┌ POST /telemetrie/evenements ─┐   ┌ tables : evenements_usage (append-only) ┐
│ validation + horodatage      │ → │          metriques_horodatees           │
│ serveur + officine + rôle    │   │          telemetrie_technique           │
└──────────────────────────────┘   └─────────────────────────────────────────┘
```

### 5.2 Dictionnaire des métriques métier

Format : `code` — définition — **formule** — source — granularité — seuil d'alerte.

| Code | Définition | Formule | Source | Granularité | Alerte |
| --- | --- | --- | --- | --- | --- |
| `ca_ttc` | Chiffre d'affaires encaissé | Σ `ventes.montant_net_ttc` où `statut = payee` | `ventes_caisse` | heure, jour, mois, officine | — |
| `ca_ht` | CA hors taxes | Σ `montant_brut_ht` | idem | jour | — |
| `tva_collectee` | TVA collectée | Σ `montant_tva` | idem | jour, mois | écart > 1 % avec la TVA recalculée \[FIS-06\] |
| `nb_tickets` | Nombre de tickets | COUNT `ventes_caisse` | idem | heure, jour | — |
| `panier_moyen` | Panier moyen | `ca_ttc / nb_tickets` | calculé | jour | — |
| `marge_brute` | Marge brute | Σ (`prix_unitaire_ttc − prix_achat_moyen`) × `quantite` | `lignes_vente` + `produits` | jour, mois | marge < 0 |
| `part_modes_reglement` | Répartition des encaissements | Σ montant par mode / `ca_ttc` | `reglements` | jour | — |
| `taux_annulation` | Part des tickets annulés | tickets `annulee` / tickets émis | `ventes_caisse` | jour, caissier | > seuil paramétré \[DSH-08\] |
| `montant_remises` | Remises accordées | Σ `montant_remise` | `ventes_caisse` | jour, caissier | > plafond |
| `ecart_caisse` | Écart de caisse | `fond_reel − (fond_ouverture + encaisse_especes + Σ mouvements)` | `sessions_caisse` | session | \|écart\| > seuil |
| `taux_certification_dgi` | Fiabilité fiscale | factures `certifiee` / factures émises | `factures_emecef` | jour | < 100 % |
| `trous_sequence_dgi` | Intégrité de la numérotation | COUNT numéros réservés non aboutis | `factures_emecef` | jour | > 0 |
| `delai_moyen_certification` | Latence fiscale | moyenne(`date_certification − created_at` vente) | jointure | jour | > 5 min |
| `delai_moyen_dispensation` | Productivité comptoir | moyenne(`date_validation − date_ouverture` parcours) | `dispensations` | jour | > cible paramétrée |
| `taux_ip` | Part d'ordonnances avec intervention | IP / ordonnances analysées | `interventions_pharmaceutiques` | jour, mois | — |
| `taux_alertes_ignores` | Vigilance de l'analyse | alertes ignorées / alertes émises | `analyses_pharmaceutiques` | jour, pharmacien | > seuil |
| `taux_substitution` | Usage de la substitution | substitutions / lignes délivrées | `lignes_dispensation` | mois | — |
| `nb_erreurs_delivrance` | Sécurité du circuit | COUNT déclarations | `erreurs_delivrance` | mois | toute occurrence |
| `nb_vigilances` | Pharmacovigilance | COUNT notifications par type et gravité | `notifications_vigilance` | mois | grave non transmise > délai |
| `score_bpd` | Conformité au Guide | Σ cotations / Σ articles applicables (Conforme 1 · Écart mineur 0,5 · Majeur 0) | `evaluations_articles` | campagne | baisse > 5 points |
| `completure_releves_temp` | Chaîne du froid | relevés réalisés / relevés prévus | `releves_temperature` | jour | < 100 % |
| `nb_excursions` | Excursions thermiques | COUNT hors seuil | `releves_temperature` | jour | toute occurrence |
| `valeur_stock` | Capital marchandises | Σ `quantite_disponible × prix_achat_moyen` | `stocks_lots` | jour | — |
| `valeur_exposee_peremption` | Risque péremption | Σ valeur des lots à 6/3/1 mois | `stocks_lots` | jour | tranche 1 mois > seuil |
| `nb_ruptures` | Disponibilité | COUNT produits avec `quantite_disponible = 0` | `stocks_lots` | jour | toute rupture critique |
| `rotation_stock` | Dynamisme | `ca_ht / valeur_stock` | calculé | mois | — |
| `produits_dormants` | Immobilité | COUNT produits sans mouvement depuis N jours (N paramétrable) | `mouvements_stock` | mois | — |
| `taux_pharmacien_present` | Conformité art. 1.11 | minutes avec pharmacien pointé / minutes d'ouverture | `pointages` | jour | < 100 % |
| `tx_feexpay_succes` | Fiabilité du paiement mobile | transactions `successful` / initiées | `paiements_feexpay` | jour | < 90 % |
| `delai_moyen_feexpay` | Latence d'encaissement | moyenne(`confirmed_at − created_at`) | idem | jour | > 90 s |
| `ecarts_rapprochement_feexpay` | Réconciliation | COUNT écarts du rapprochement quotidien | rapprochement | jour | > 0 |
| `ca_groupe` | Consolidation | Σ `ca_ttc` des officines rattachées | agrégat | jour, mois | — |
| `nb_transferts_inter_officines` | Mutualisation | COUNT transferts par statut | `transferts_inter_officines` | mois | transfert non réceptionné > 48 h |

**Règles de calcul** : montants en FCFA entiers ; toute moyenne est pondérée (jamais une moyenne de moyennes) ; une période sans donnée renvoie `null` et non `0` ; les métriques sont calculées **serveur** (SQL agrégé), jamais dans le navigateur ; chaque métrique est horodatée et stockée dans `metriques_horodatees` pour permettre l'historique et les comparaisons.

### 5.3 Plan d'instrumentation — événements d'usage

**Convention de nommage** : `<domaine>.<objet>.<action>` en minuscules, points comme séparateurs, verbe au participe passé pour un fait établi. Exemples : `caisse.ticket.valide`, `dispensation.analyse.terminee`, `tdb.indicateur.clic`.

**Propriétés communes à tout événement** (ajoutées automatiquement par le client) :

```jsonc
{
  "evenement": "caisse.ticket.valide",
  "horodatage_client": "2026-11-11T08:12:44.318+01:00",
  "horodatage_serveur": null,           // posé par l'API
  "officine_id": "off1",
  "utilisateur_id": "u2",               // pseudonyme interne, jamais l'identité complète
  "role": "caissier",
  "appareil_id": "ap-9f3…",             // issu de lib/appareil.ts
  "session_id": "sess-navig-…",         // rotation à chaque connexion
  "route": "/dashboard/vente",
  "version_app": "1.4.0",
  "en_ligne": true,
  "duree_ms": 1840                      // si l'événement mesure une durée
}
```

**Événements à instrumenter, par écran** :

| Événement | Déclencheur | Propriétés spécifiques | Usage |
| --- | --- | --- | --- |
| `tdb.synthese.chargee` | réception de `/dashboard/synthese` | `duree_ms`, `nb_blocs_indisponibles`, `periode` | perf, détection de sources en panne |
| `tdb.indicateur.clic` | clic sur un KPI | `indicateur`, `valeur`, `cible` | forage réel, priorisation |
| `tdb.alerte.action` | clic sur l'action d'une alerte | `alerte_id`, `niveau`, `type` | efficacité des alertes |
| `tdb.bloc.masque` | personnalisation | `bloc`, `visible` | TDB-15 |
| `cgl.officine.bascule` | bascule de site | `officine_source`, `officine_cible` | usage multi-sites |
| `cgl.classement.change` | changement d'indicateur | `indicateur` | CGL-03 |
| `cgl.transfert.initie` | modale transfert validée | `transfert_id`, `produit_id`, `quantite`, `motif` | CGL-06 |
| `cgl.transfert.receptionne` | réception | `transfert_id`, `ecart`, `duree_transit_h` | CGL-07 |
| `grd.garde.declaree` | déclaration | `garde_id`, `commune`, `duree_h` | GRD-02 |
| `grd.affiche.generee` | export vitrine | `periode`, `format` | GRD-05 |
| `caisse.session.ouverte` | ouverture | `session_id`, `fond_caisse` | CAI-01 |
| `caisse.recherche.produit` | fin de debounce | `terme_masque`, `nb_resultats`, `duree_ms`, `mode` (`saisie`/`scan`) | **NF-01** |
| `caisse.produit.refuse` | ajout d'un produit interdit | `motif` (`perime`/`quarantaine`/`rappelle`/`ordonnance_requise`/`rupture`), `produit_id` | O4, RG-D02 |
| `caisse.panier.modifie` | quantité, remise, lot | `action`, `ligne` | ergonomie |
| `caisse.remise.demandee` | saisie d'une remise | `montant`, `pourcentage`, `dans_plafond` | RG-C03 |
| `caisse.remise.validee` | validation par un responsable | `validateur_role`, `motif_present` | anti-fraude |
| `caisse.ticket.valide` | vente acceptée | `ticket`, `montant_ttc`, `nb_lignes`, `modes[]`, `duree_ms`, `lot_fefo_respecte` | **NF-02**, O3 |
| `caisse.ticket.refuse` | échec de validation | `code_erreur`, `message` | support |
| `caisse.ticket.annule` | annulation | `ticket`, `motif`, `validateur_role` | DSH-08 |
| `caisse.avoir.emis` | avoir | `ticket_origine`, `montant`, `retour_stock` | VTE-07 |
| `caisse.paiement.feexpay.initie` | demande envoyée | `reference`, `operateur`, `montant` | FPX-01 |
| `caisse.paiement.feexpay.statut` | chaque changement | `reference`, `statut`, `duree_ms` | FPX-02, `tx_feexpay_succes` |
| `caisse.recu.envoye` | envoi SMS/WhatsApp/e-mail | `canal`, `ticket` | CAI-04 |
| `caisse.session.cloturee` | ticket Z | `session_id`, `ecart`, `motif_ecart`, `duree_session_h` | CAI-05 |
| `caisse.horsligne.operation` | ajout à l'outbox | `type`, `client_op_id`, `nb_en_file` | CAI-07 |
| `caisse.horsligne.conflit` | rejet serveur | `client_op_id`, `motif` | §1.5 du document frère |
| `disp.parcours.ouvert` | nouvel assistant | `type` (`ordonnance`/`hors_prescription`), `dispensation_id` | DSP |
| `disp.etape.terminee` | fin de chaque étape | `etape` (1→7), `duree_ms`, `conforme` | goulets d'étranglement |
| `disp.ordonnance.televersee` | dépôt du fichier | `taille_octets`, `format`, `duree_ms` | DSP-04 |
| `disp.alerte.pharmaceutique` | alerte émise | `niveau`, `type`, `produit_id` | DSP-06 |
| `disp.alerte.ignoree` | rejet motivé | `niveau`, `motif_present`, `role` | RG-D07 |
| `disp.decision.signee` | validation pharmacien | `decision`, `duree_analyse_ms` | DSP-08 |
| `disp.scan.box` | contrôle d'une boîte | `accepte`, `motif_refus`, `lot` | DSP-12 |
| `disp.conseil.enregistre` | conseil tracé | `nb_produits`, `documents_remis`, `comprehension_verifiee` | DSP-16, DSP-18 |
| `disp.ip.creee` | intervention | `type_ip`, `prescripteur_contacte` | DSP-09 |
| `disp.vigilance.notifiee` | notification | `type_vigilance`, `gravite`, `pretransmise` | DSP-26 |
| `disp.erreur.declaree` | erreur de délivrance | `type`, `gravite`, `nc_creee` | DSP-19 |
| `fdg.facture.consultee` | ouverture du détail | `numero_facture` (pas le montant) | FDG-01 |
| `fdg.recu.verifie` | vérification d'un reçu | `resultat` (`conforme`/`inconnu`/`altere`), `methode` (`qr`/`saisie`) | FDG-08 |
| `fdg.registre.exporte` | export | `format`, `periode`, `nb_lignes` | NF-12 |
| `fdg.certification.echouee` | échec | `numero`, `erreur` | FDG-07 |
| `com.impression.recu` | impression | `origine`, `duplicata` | traçabilité |

**Règles d'instrumentation** :

1. Aucun événement ne transporte de donnée de santé, de nom de patient, de numéro d'ordonnance, de montant nominatif lié à un patient, ni de terme de recherche brut identifiant \[DP-03, DP-04\]. Le terme de recherche produit est haché ou tronqué.
2. Envoi par lots : 20 événements ou 5 secondes, `navigator.sendBeacon` en priorité (survie à la fermeture d'onglet), repli `fetch keepalive`.
3. Hors-ligne : les événements sont mis en file dans IndexedDB (même base Dexie que l'outbox, table séparée `telemetrie`) et rejoués à la reconnexion avec `horodatage_client` conservé.
4. Échec d'envoi : **jamais** de blocage de l'action métier, jamais de `toast` d'erreur ; 3 tentatives puis abandon tracé localement.
5. Déduplication : chaque événement porte un `evenement_id` UUID ; le serveur ignore les doublons.
6. Aucun cookie tiers, aucun service externe sans décision explicite (le hook `lovable-error-reporting.ts` n'agit que dans l'éditeur Lovable et reste inactif en production).

### 5.4 Télémétrie technique

| Famille | Mesures | Seuil | Implémentation |
| --- | --- | --- | --- |
| Performance API | `perf.recherche_produit_ms` | < 500 ms \[NF-01\] | mesure autour de l'appel `/produits` |
| Performance API | `perf.validation_vente_ms` | < 2 000 ms \[NF-02\] | mesure autour de `POST /caisse/ventes` |
| Performance API | `perf.chargement_synthese_ms` | < 1 500 ms | `GET /dashboard/synthese` |
| Web Vitals | `perf.lcp`, `perf.inp`, `perf.cls` | LCP < 2,5 s, INP < 200 ms, CLS < 0,1 | `PerformanceObserver` dans `__root.tsx` |
| Réseau | `tech.requete.echec` | taux < 1 % | wrapper `api-client` : statut, endpoint, durée |
| Erreurs | `tech.erreur.front` | toute occurrence | `lib/error-capture.ts` (déjà présent) + `reportLovableError` + envoi vers `POST /telemetrie/erreurs` |
| Erreurs | `tech.erreur.render` | toute occurrence | `ErrorBoundary` de route → `ErreurRubrique` + rapport |
| Hors-ligne | `tech.horsligne.duree_ms`, `tech.file.taille`, `tech.conflit` | file > 50 opérations = alerte | `use-en-ligne` + outbox |
| Intégrité | `tech.audit.verifie` | échec = critique | `GET /officines/{id}/audit-logs/verifier-integrite` planifié |
| Sauvegarde | `tech.sauvegarde.statut` | échec = critique \[art. 4.34\] | job serveur |
| Usage | `tech.session.verrouillee` | — | `use-inactivite` (15 min) |

### 5.5 Collecte, stockage, rétention

| Objet | Stockage | Rétention | Accès |
| --- | --- | --- | --- |
| `evenements_usage` | PostgreSQL, append-only, RLS par officine | 13 mois glissants, puis agrégats mensuels conservés | promoteur (son officine), administrateur BEG (agrégé, sans identité) |
| `metriques_horodatees` | PostgreSQL, série temporelle agrégée | 5 ans | tous rôles selon la métrique |
| `telemetrie_technique` | PostgreSQL ou journal applicatif | 90 jours | administrateur BEG, support |
| Erreurs front | journal serveur | 90 jours | support |
| `audit_logs` (rappel) | PostgreSQL, trigger inaltérable | selon la pièce (3/5/10/40 ans) \[NF-08\] | rôles habilités |

**Règles** : la télémétrie n'est jamais une preuve réglementaire (c'est le rôle d'`audit_logs`) ; elle ne contient ni donnée de santé ni secret ; elle est désactivable par officine (paramètre `telemetrie.usage_active`) sans effet sur l'audit ni sur les métriques métier ; tout accès à la télémétrie d'usage est lui-même journalisé.

### 5.6 Restitution et alertes

| Vue | Contenu | Destinataire |
| --- | --- | --- |
| Tableau de bord (bloc alertes) | alertes métier issues des métriques avec seuils dépassés | tous rôles, filtré |
| Tableau de bord (bloc anti-fraude) | `taux_annulation`, `montant_remises`, `ecart_caisse`, `ventes_hors_horaires` par caissier | promoteur, pharmacien |
| Consolidation Groupe | comparatif et classement des métriques par officine | promoteur |
| Facturation (onglet compteurs) | `taux_certification_dgi`, `trous_sequence_dgi`, `delai_moyen_certification` | promoteur, comptable |
| Page technique (nouvelle, `/dashboard/securite` onglet « Exploitation ») | Web Vitals, erreurs, hors-ligne, intégrité d'audit, sauvegardes | promoteur, administrateur BEG |
| Résumé quotidien | synthèse des métriques de la veille + points d'attention | promoteur (DSH-11) |

**Niveaux d'alerte** (rappel §9.2 du cahier d'origine) : critique → push + SMS ; important → push ; information → dans l'application. Chaque métrique du dictionnaire déclare son seuil et son niveau ; les seuils sont des paramètres d'officine versionnés.

### 5.7 Contrats API de télémétrie

```
GET  /api/dashboard/synthese?periode=jour&comparaison=1     → agrégats métier (§2.1)
GET  /api/dashboard/alertes?niveau=critique                 → file d'alertes
GET  /api/dashboard/metriques?codes=ca_ttc,ecart_caisse&debut=…&fin=…&granularite=jour
GET  /api/telemetrie/usage?evenement=caisse.ticket.valide&debut=…&fin=…  (promoteur/admin)
POST /api/telemetrie/evenements      → { "evenements": [ … ] }  (batch, idempotent par evenement_id)
POST /api/telemetrie/technique       → { "mesures": [ … ] }
POST /api/telemetrie/erreurs         → { "message", "stack", "route", "composant", "contexte" }
GET  /api/facturation/emecef/stats   → compteurs, taux, délais, trous de séquence
GET  /api/dispensations/indicateurs  → indicateurs DSP-30
GET  /api/caisse/session/{id}/ticket-x (existant, étendu avec l'historique horaire)
```

Réponse type de `POST /telemetrie/evenements` :

```jsonc
{ "status": "success", "data": { "recus": 18, "doublons": 2, "rejetes": 0 } }
```

### 5.8 Modèle de données

```sql
evenements_usage (
  id uuid pk, officine_id uuid, utilisateur_id uuid null, role text,
  evenement text, evenements_id uuid unique,        -- idempotence
  proprietes jsonb, horodatage_client timestamptz, horodatage_serveur timestamptz default now(),
  route text, appareil_id text, session_nav text, version_app text, en_ligne boolean
)  -- append-only, index (officine_id, evenement, horodatage_serveur)

metriques_horodatees (
  id uuid pk, officine_id uuid, code text, valeur numeric, unite text,
  periode text, debut timestamptz, fin timestamptz, calcule_le timestamptz,
  unique (officine_id, code, periode, debut)
)

telemetrie_technique (
  id uuid pk, officine_id uuid null, categorie text, mesure text,
  valeur numeric, contexte jsonb, horodatage timestamptz
)
```

RLS activée sur les trois tables avec `user_officines()` ; triggers d'audit sur `metriques_horodatees` uniquement (les deux autres sont append-only par trigger, comme `audit_logs`).

---

## 6. Exigences transverses d'interface

| Réf. | Exigence |
| --- | --- |
| UI-01 | Unifier les 6 écrans sur la charte verte (§1.4) ; aucun `slate-*` / `emerald-*` résiduel |
| UI-02 | Chaque bloc affiche son horodatage de fraîcheur ; la page affiche l'horodatage de la synthèse |
| UI-03 | Quatre états systématiques : chargement (`Skeleton` par bloc), vide (message + action), erreur (motif + « Réessayer »), succès |
| UI-04 | Aucune valeur codée en dur (§1.2) : une donnée absente affiche « Non renseigné » ou « Mesure manquante » |
| UI-05 | Tableaux : tri par colonne, pagination 25 lignes, filtres persistés dans l'URL (`?tab=`, `?periode=`), export disponible |
| UI-06 | Formulaires : libellé visible, aide contextuelle, erreur sous le champ, validation au `blur` puis à la soumission, `Enter` soumet, focus rendu à l'ouverture d'une modale |
| UI-07 | Accessibilité : contrastes AA, `aria-label` sur toute icône seule, navigation clavier intégrale, focus visible, annonces `aria-live` pour les alertes critiques et les statuts de paiement |
| UI-08 | Mobile < 640 px : modales en tiroir plein écran, boutons `h-12`, tableaux en cartes empilées, pas de débordement horizontal |
| UI-09 | Impression : le reçu, l'affiche de garde et les registres ont une feuille de style dédiée (80 mm pour le ticket, A4 pour les registres) |
| UI-10 | Droit à l'erreur : toute action destructrice demande une confirmation explicite avec le nom de l'objet (numéro de ticket, période de garde) |
| UI-11 | Cohérence des libellés : un même concept a un seul libellé dans toute l'application (« ticket », jamais « vente » et « ticket » alternativement ; « dispensation », jamais « délivrance » pour l'acte complet) |
| UI-12 | Guide intégré : conserver les ancres `data-tour` (`metric-presence`, `chart-sales`, `chart-temp`, `caisse-link`, `user-profile`) et en ajouter pour les nouveaux blocs (`centre-alertes`, `bloc-caisse`, `bloc-stock`, `assistant-dispensation`) |

---

## 7. Critères d'acceptation

### 7.1 Interface

- [ ] Les 6 écrans utilisent la même charte : aucune classe `slate-*` ou `emerald-*` ne subsiste (vérifiable par `grep`).
- [ ] Aucun littéral de démonstration ne subsiste : `grep -n "DONNEES_VENTES_HEBDO\|DONNEES_TEMP_24H\|4 875\|318 ord\|15 330\|+14.2%\|263 / 267\|100% Certifié\|100% Automatique"` renvoie zéro résultat dans `src/`.
- [ ] Couper une source (fixture absent) affiche « Indisponible » sur le bloc concerné et laisse les autres blocs fonctionnels.
- [ ] Chaque écran est utilisable à 360 px, 820 px et 1440 px sans débordement ; les cibles tactiles mesurent ≥ 44 px (≥ 48 px sur mobile).
- [ ] Toutes les modales de la §3 existent, s'ouvrent au clavier, se ferment à `Échap`, et ne se ferment pas après un refus serveur.
- [ ] Tous les graphiques de la §4 rendent avec des données réelles, ont un état vide explicite et un équivalent textuel accessible.

### 7.2 Télémétrie

- [ ] `GET /dashboard/synthese` renvoie toutes les métriques du dictionnaire (§5.2) utilisées par les écrans, avec `null` quand la donnée manque.
- [ ] Chaque métrique affichée est recalculable : la formule du dictionnaire et la requête SQL correspondent au résultat affiché.
- [ ] Les événements de la §5.3 sont émis au bon déclencheur, par lots, avec les propriétés communes, et sans donnée de santé (test automatisé de non-fuite sur les payloads).
- [ ] Une coupure réseau met les événements en file et les rejoue à la reconnexion sans doublon (`evenements_id` unique).
- [ ] `perf.validation_vente_ms` est mesuré et visible dans l'onglet Exploitation ; une vente dépassant 2 s est signalée.
- [ ] Une erreur front est capturée (`error-capture.ts`), affichée dans `ErreurRubrique` et transmise à `POST /telemetrie/erreurs` sans bloquer l'utilisateur.
- [ ] La télémétrie d'usage est désactivable par paramètre d'officine ; l'audit réglementaire continue de fonctionner.
- [ ] Le journal d'audit reste la seule preuve réglementaire : aucune modification d'un enregistrement validé n'est possible via la télémétrie.

---

## 8. Plan de livraison

| Lot | Contenu | Livrables visibles |
| --- | --- | --- |
| **L1 — Tokens et composants** | Unification de la charte (UI-01), `GrilleKpi`, `CentreAlertes`, `SignatureAgent`, `RecuNormalise`, `BlocHorsLigne`, états vides/erreurs normalisés | Les 6 écrans ont le même aspect ; aucune régression fonctionnelle |
| **L2 — Télémétrie métier** | `GET /dashboard/synthese`, `metriques_horodatees`, dictionnaire §5.2 implémenté, suppression de toutes les valeurs codées en dur | Tableau de bord 100 % réel ; graphiques G-01 à G-08 |
| **L3 — Caisse complète** | M-13 à M-23, G-09/G-10, événements `caisse.*`, mouvements de caisse, ticket X, FeexPay réel | Poste de vente conforme §2.4 |
| **L4 — Dispensation** | Assistant 7 étapes, M-24 à M-34, G-11 à G-13, événements `disp.*` | Parcours BPD-7 complet |
| **L5 — Facturation** | Onglets §2.6, M-35 à M-38, G-14 à G-16, événements `fdg.*`, file de recertification | Registre fiscal complet |
| **L6 — Groupe et gardes** | §2.2, §2.3, M-39 à M-41, G-17 à G-20 | Consolidation et gardes conformes |
| **L7 — Télémétrie technique** | Web Vitals, erreurs, hors-ligne, intégrité, onglet Exploitation, `POST /telemetrie/*` | Pilotage de la performance et du support |

Chaque lot respecte la définition du fini du document frère (§0.5), y compris la mise à jour de `frontend/src/test/reponses-demo.json` et des tests `ecrans-demo`.

---

## Annexe A — Tokens CSS à ajouter dans `frontend/src/styles.css`

```css
:root {
  --bp-vert-fonce: #023010;      --bp-vert-profond: #0F3B27;
  --bp-vert-action: #18AA38;     --bp-vert-accent: #92FF5F;
  --bp-bordure: #CFF1D2;         --bp-bordure-douce: #CFE3D5;
  --bp-fond-fiche: #F7F9F7;      --bp-fond-pastille: #E8F5EB;
  --bp-texte: #1F2420;           --bp-texte-secondaire: #5C6660;
  --bp-texte-doux: #475C50;      --bp-alerte: #FF7036;
  --bp-info: #BFF2F0;            --bp-grille: #E5ECE7;
  --bp-serie-1: #0F3B27;  --bp-serie-2: #18AA38;  --bp-serie-3: #92FF5F;
  --bp-serie-4: #FF7036;  --bp-serie-5: #BFF2F0;  --bp-serie-6: #475C50;
  --bp-rayon-carte: 1.5rem;      --bp-rayon-bouton: 0.75rem;
  --bp-hauteur-tactile: 2.75rem; --bp-hauteur-tactile-mobile: 3rem;
}
```

## Annexe B — Ancres de test et de guide

| Ancre | Écran | Usage |
| --- | --- | --- |
| `data-tour="metric-presence"` | tableau de bord | existant |
| `data-tour="chart-sales"`, `data-tour="chart-temp"` | tableau de bord | existant, à rebaptiser `chart-ca-jour` et `chart-telemetrie-thermique` |
| `data-tour="centre-alertes"` | tableau de bord | nouveau |
| `data-tour="bloc-caisse"`, `data-tour="bloc-stock"`, `data-tour="bloc-qualite"`, `data-tour="bloc-personnel"` | tableau de bord | nouveau |
| `data-testid="pos-recherche"`, `data-testid="pos-panier"`, `data-testid="pos-reglement"`, `data-testid="pos-valider"` | caisse | nouveau (tests) |
| `data-testid="disp-stepper"`, `data-testid="disp-etape-<n>"`, `data-testid="disp-alerte-<niveau>"` | dispensation | nouveau |
| `data-testid="fdg-registre"`, `data-testid="fdg-compteurs"`, `data-testid="fdg-verification"` | facturation | nouveau |

## Annexe C — Check-list rapide par écran

```
Tableau de bord   [ ] synthèse réelle  [ ] alertes  [ ] 8 blocs  [ ] G-01…G-08  [ ] M-09…M-12  [ ] événements tdb.*
Consolidation     [ ] période + classement  [ ] G-17…G-19  [ ] M-39, M-40  [ ] export  [ ] événements cgl.*
Gardes            [ ] garde en cours  [ ] filtres  [ ] calendrier  [ ] affiche PDF  [ ] M-41  [ ] événements grd.*
Caisse POS        [ ] session  [ ] scan  [ ] remises  [ ] modes + mixte  [ ] FeexPay  [ ] avoir/annulation
                  [ ] mouvements  [ ] X/Z  [ ] hors-ligne  [ ] G-09, G-10  [ ] M-13…M-23  [ ] événements caisse.*
Dispensation      [ ] 7 étapes  [ ] analyses  [ ] décision signée  [ ] scan  [ ] registres  [ ] conseil
                  [ ] IP  [ ] vigilances  [ ] erreurs  [ ] G-11…G-13  [ ] M-24…M-34  [ ] événements disp.*
Facturation       [ ] 5 onglets  [ ] FV/EV  [ ] compteurs  [ ] vérification  [ ] paramètres  [ ] rapprochement
                  [ ] G-14…G-16  [ ] M-35…M-38  [ ] événements fdg.*
Transversal       [ ] charte unifiée  [ ] zéro valeur codée en dur  [ ] états  [ ] accessibilité  [ ] 360/820/1440 px
                  [ ] télémétrie par lots + hors-ligne  [ ] fixtures et tests à jour
```
