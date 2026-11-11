# BEGPHARMA — CDC réel : interfaces, modales, graphiques et télémétrie
## Sections « Stock », « Stupéfiants & Préparations », « Qualité & BPD ABMed », « Gestion & Finance », « Compte & Officine »

Version 1.0 · 11 novembre 2026 · Troisième volet, complémentaire des deux documents précédents :

| Document | Rôle |
| --- | --- |
| *Cahier des charges des sections « Tableau de bord, Comptoir & Caisse, Groupe »* | le **quoi** fonctionnel des 6 premiers écrans |
| *CDC réel Interfaces & Télémétrie (Tableau de bord, Groupe, Comptoir & Caisse)* | le **comment visible** de ces 6 écrans (modales M-01→M-42, graphiques G-01→G-20, télémétrie) |
| **Ce document** | le **comment visible** des 18 écrans restants (modales **M-43→M-127**, graphiques **G-21→G-56**, télémétrie étendue) |
| *Cahier des charges de la section « Qualité & BPD ABMed »* | le **quoi** fonctionnel des 9 pages qualité — **fait foi**, ce document n'y ajoute que l'interface et la télémétrie |

**Périmètre — 18 écrans, 44 sous-sections** (tout ce qui suit le groupe « Comptoir & Caisse » dans `frontend/src/components/app-sidebar.tsx`) :

| Groupe | Écrans | Sous-sections |
| --- | --- | --- |
| **Stock** | `/dashboard/stock` | 11 : `vue-ensemble`, `produits`, `lots`, `emplacements`, `mouvements`, `reception`, `inventaires`, `peremptions`, `quarantaine`, `dechets`, `valorisation` |
| **Stupéfiants & Préparations** | `/dashboard/stupefiants`, `/dashboard/preparations` | 9 + 6 : `registre`, `balance`, `ordonnancier`, `copies`, `inventaire`, `armoire`, `ecarts`, `destruction`, `rapports` · `registre`, `formules`, `matieres`, `controles`, `etiquettes`, `rapports` |
| **Qualité & BPD ABMed** | `temperatures`, `locaux`, `auto-evaluation`, `pointage`, `personnel`, `documents`, `modeles`, `non-conformites`, `echeances` | 9 pages |
| **Gestion & Finance** | `comptabilite`, `journal`, `appareils` | 1 + 1 + 7 : `parc`, `appairage`, `bornes`, `peripheriques`, `sessions`, `revocations`, `registre` |
| **Compte & Officine** | `compte`, `parametres`, `securite` | 3 pages |

---

## 1. Audit de l'existant

### 1.1 Cartographie réelle

| Écran | Fichier (`routes/_authenticated/dashboard/`) | Lignes | Sous-sections | Endpoints appelés | Graphiques | Modales |
| --- | --- | --- | --- | --- | --- | --- |
| Stock | `stock.tsx` (+ `components/modules/magasin-avance.tsx` 815 l) | 2 759 | 11 | `/produits`, `/stocks` (+`?params`), `/stocks/alertes`, `/stocks/peremptions`, `/stocks/valorisation`, `/stocks/{id}/statut`, `/stocks/{id}/quarantaine`, `/stocks/{id}/lever-quarantaine`, `/emplacements`, `/mouvements`, `/inventaires` (+`/{id}`, `/lignes/{id}/compter`, `/valider`), `/rappels` (+`/{id}/cloturer`), `/dechets` (+`/{id}/detruire`) | **aucun** | 4 |
| Stupéfiants | `stupefiants.tsx` | 874 | 9 | `/produits`, `/stupefiants` (+`/{id}/viser`, `/{id}/rectificative`, `/balance`, `/ordonnancier`, `/armoire`, `/inventaire`, `/declaration-vol`, `/demande-destruction`) | **aucun** | 5 |
| Préparations | `preparations.tsx` | 746 | 6 | `/preparations` (+`/{id}/viser`) | **aucun** | 1 |
| Chaîne du froid | `temperatures.tsx` | 1 156 | — | `/officines/{id}/temperatures`, `/officines/{id}/temperatures/stats` | `LineChart` | 3 |
| Locaux & Matériel | `locaux.tsx` | 1 249 | — | `/officines/{id}/equipements`, `/officines/{id}/nettoyages` | **aucun** | 4 |
| Auto-évaluation | `auto-evaluation.tsx` | 828 | — | `/officines/{id}/auto-evaluation/campagne-courante`, `/nouvelle-complete`, `/evaluer/{id}`, `/generer-capa/{id}` | `BarChart` | 2 |
| Pointage | `pointage.tsx` (+ `modale-historique-presences.tsx`, `badge-double-face.tsx`) | 1 126 | — | `/officines/{id}/employes`, `/officines/{id}/pointages` | **aucun** | 2 |
| Personnel | `personnel.tsx` (+ `modale-profil-collaborateur.tsx`) | 959 | — | `/officines/{id}/employes` (+`/{id}`) | **aucun** | 2 |
| GED | `documents.tsx` (+ `approbation-document`, `fichiers-documentaires`, `qualification-document`, `registre-documentaire`, `imports-corpus`, `canevas-documentaires`) | 898 | — | `/officines/{id}/documents` (+`/{id}`), `/fichiers`, `/approbations`, `/imports-corpus`, `/canevas`, `/suivis-documentaires/{type}` | **aucun** | 0 (panneaux) |
| Modèles BPD | `modeles.tsx` | 561 | — | `/modeles-bpd`, `/officines/{id}/modeles-bpd/{id}/instancier`, `/officines/{id}/documents` | **aucun** | 0 |
| Non-conformités | `non-conformites.tsx` (+ `bpd-communs.tsx`) | 815 | — | `/officines/{id}/non-conformites` (+`/{id}`) | **aucun** | 0 (panneaux) |
| Échéancier | `echeances.tsx` (+ `courriels-peremption.tsx`) | 1 565 | — | `/officines/{id}/echeances`, `/echeances/{id}` | **aucun** | 3 |
| Comptabilité | `comptabilite.tsx` | 1 059 | — | `/comptabilite/journal-ventes`, `/comptabilite/clotures`, `/comptabilite/ecritures` (+`/{id}/extourne`) | `PieChart` | 2 |
| Journal d'audit | `journal.tsx` (+ `modules/administration.tsx`) | 114 | — | `/officines/{id}/audit-logs` (+`/verifier-integrite`) | **aucun** | 0 |
| Appareils | `appareils.tsx` | 1 107 | 7 | `/officines/{id}/appareils-autorises` (+`/{id}/revoquer`, `/reactiver`), `/auth/devices` (+`/{id}`, `/revoke-others`) | **aucun** | 1 |
| Mon profil | `compte.tsx` | 1 369 | — | `/auth/profile` | **aucun** | 4 |
| Paramètres | `parametres.tsx` | 1 124 | — | `/auth/me`, `/officines/{id}/parametres` (+`/{cle}`) | **aucun** | 3 |
| Sécurité & MFA | `securite.tsx` | 1 037 | — | `/auth/mfa` (+`/demarrer`), `/auth/password`, `/auth/verify-mfa`, `/auth/devices` (+`/{id}`, `/revoke-others`) | **aucun** | 3 |

**Total** : 19 352 lignes d'écrans, **3 graphiques** pour 18 écrans, **36 modales**, **0 pagination normalisée**.

### 1.2 Le mécanisme d'onglets réel — à connaître avant d'écrire du code

Les onglets de ces sections **ne sont pas** des `Tabs` Radix. Le mécanisme en place, utilisé par **18 écrans**, est :

1. La barre latérale déclare des feuilles avec un `tab` : `{ to: "/dashboard/stock", tab: "lots", label: "Lots" }` (`app-sidebar.tsx`).
2. L'écran lit le paramètre de recherche `?tab=` et pilote un **`SelecteurFiltrable`** (`components/ui/selecteur-filtrable.tsx`) alimenté par une constante locale `SECTIONS` / `SECTIONS_STUPEIANTS` / `SECTIONS_PREPARATIONS` / `SECTIONS_APPAREILS` :

```tsx
const SECTIONS = [
  { valeur: "vue-ensemble", libelle: "Vue d'ensemble", description: "…", icone: <Layers className="size-4" />, motsCles: ["accueil", …] },
  …
];
<SelecteurFiltrable options={SECTIONS} valeur={tab} onChangement={setTab}
  placeholder="Choisir une section..." recherchePlaceholder="Rechercher une section..." />
```

3. Le rendu est conditionné par `tab === "…"`, plus des **sous-sections en état local** (`sousSectionProduit`, `SousSectionLot`, `SousSectionEmplacement`, `SousSectionMouvement`).

**Conséquences normatives** :

| Réf. | Règle |
| --- | --- |
| TAB-01 | Conserver `SelecteurFiltrable` comme sélecteur de section : c'est le composant testé (`ui-magasin.test.tsx`, `resilience-affichage.test.tsx`) et accessible |
| TAB-02 | Toute section doit être **lien profond** : `/dashboard/stock?tab=peremptions&seuil=1m`. Le `tab` vient de l'URL, jamais d'un état local seul |
| TAB-03 | Les **sous-sections** doivent remonter dans l'URL (`?tab=produits&filtre=rupture`) pour être partageables et conservées au rechargement |
| TAB-04 | Chaque entrée de `SECTIONS` conserve `valeur`, `libelle`, `description`, `icone`, `motsCles` (la recherche plein texte du sélecteur s'appuie sur `motsCles`) |
| TAB-05 | Ajouter `validateSearch` à la route pour typer et valider `tab` (une valeur inconnue replie sur la section par défaut, sans écran blanc) |
| TAB-06 | Les 3 écrans du comptoir (caisse, dispensation, facturation) spécifiés avec des onglets dans le document frère doivent adopter **le même mécanisme**, pas Radix Tabs — une seule logique de navigation dans toute l'application |

### 1.3 Valeurs codées en dur — relevé exhaustif

Même règle que le volet précédent : **aucune valeur affichée ne doit être inventée**. Voici ce qu'il faut remplacer, avec la source réelle.

| # | Fichier : ligne | Valeur fictive | Source réelle | Prio. |
| --- | --- | --- | --- | --- |
| D-01 | `comptabilite.tsx:337-340` | `+14.2%`, `18 950 000 FCFA`, « Cumul exercice 2026 (Compte 701) » | `GET /comptabilite/etats?exercice=…` → total du compte 701 et variation N-1 | P1 |
| D-02 | `comptabilite.tsx` (bilan actif/passif) | 13 montants : `12 400 000`, `7 450 000`, `205 000`, `1 250 000`, `3 700 000`, `8 500 000`, `11 300 000`, `27 250 000`, `15 000 000` FCFA… | balance générale agrégée par compte SYSCOHADA | P1 |
| D-03 | `comptabilite.tsx:836` | `94.8 %` « Taux de Lettrage Automatique » | `metrique taux_lettrage` calculée depuis les écritures lettrées | P1 |
| D-04 | `comptabilite.tsx:1035` | « Novembre 2026 » figé | période courante (`Africa/Porto-Novo`) + sélecteur de période | P1 |
| D-05 | `locaux.tsx:~230-270` | **Journal des sauvegardes entièrement statique** en `<table>` HTML : « Ce jour 03:00 », « RPO < 24h », `100% Réussie (Chiffrée)`, avec `style={{ color: "#0F3B27" }}` inline | `GET /officines/{id}/sauvegardes` (à créer) — art. 4.34 et 4.35 exigent un journal visible dans l'application | P1 |
| D-06 | `locaux.tsx` | « Score : 100% Conforme » | score réel calculé depuis les check-lists locaux/5M | P1 |
| D-07 | `temperatures.tsx:567` | `85% réalisés` (jauge de complétude) | `completure_releves_temp` = réalisés / prévus sur la période | P1 |
| D-08 | `temperatures.tsx:706` | « Enceinte Réfrigérée · 9.8 °C (Dépassement +1.8 °C) » en dur dans le bloc d'excursion | dernière excursion réelle (`/temperatures?hors_seuil=1`) ; si aucune → « Aucune excursion sur la période » | P1 |
| D-09 | `pointage.tsx:873-875` | « Mois en cours : Novembre 2026 », `96.4%`, `412h`, `14h` | `GET /officines/{id}/pointages/stats?mois=…` → `taux_ponctualite`, `heures_travaillees`, `heures_supplementaires` | P1 |
| D-10 | `non-conformites.tsx:787` | `4.2 jours` « Délai moyen de clôture », et `0 %` | `delai_moyen_cloture_nc` et `taux_efficacite_capa` calculés | P1 |
| D-11 | `compte.tsx:1128-1136` | `24 jours`, `16 jours`, `100 % (40 h)` (congés / formation) | dossier de l'agent : droits à congés, solde, heures de formation | P2 |
| D-12 | `compte.tsx:1098-1099` | « Octobre 2026 », « Septembre 2026 » figés | historique réel des périodes | P2 |
| D-13 | `personnel.tsx:553`, `documents.tsx:846` | « exercice 2026 » figé | exercice courant paramétrable | P2 |
| D-14 | `securite.tsx:101-104` | **10 codes de secours MFA générés en dur dans un `useState`** | codes générés serveur à l'enrôlement, affichés **une seule fois**, hachés en base, régénérables | **P1 sécurité** |
| D-15 | `parametres.tsx:109` | **`tokenMECeF = "dgi_live_sec_994829384729182374"` en clair dans un `useState`** | secret stocké chiffré côté serveur, jamais renvoyé au client ; l'UI affiche un état (« configuré / non configuré ») et permet la rotation | **P1 sécurité** |
| D-16 | `parametres.tsx:107` | « Régime Réel (Normal) » en état local initial | valeur lue des paramètres d'officine | P2 |
| D-17 | `stock.tsx` | résidus de palette hors charte (`text-emerald-600`, `text-blue-600`, `text-amber-600`) | tokens de la charte (§1.5 du volet précédent) | P2 |

**À ne pas traiter comme des faux** (libellés réglementaires légitimes) : seuils `≥80% Conforme / 50–79% Vigilance / <50% Critique` (`auto-evaluation.tsx`), tranches de péremption `6/3/1 mois`, `TVA 18% (Groupe B)`, `Thermolabiles 2–8 °C`, planchers de conservation `3/5/10/40 ans` (`parametres.tsx`), périodicité des échéances, mentions de codification (`GAD-EN-010 : conservation 10 ans`).

### 1.4 Incohérences structurelles

| Réf. | Constat | Décision |
| --- | --- | --- |
| I-07 | `<table>` HTML brut dans **18 fichiers** (231 `<td>`), sans tri, sans en-tête accessible, avec `style={{}}` inline dans `locaux.tsx` et `temperatures.tsx` | Migrer vers `@/components/ui/table` + un composant partagé `TableauRegistre` (tri, pagination 25, état vide, export, colonnes responsives en cartes < 640 px) |
| I-08 | **3 graphiques** pour 18 écrans alors que 12 écrans exigent une visualisation (voir §4) | Ajouter les graphiques G-21 à G-52 |
| I-09 | Registres longs sans pagination visible (ordonnancier stupéfiants, journal d'audit, échéancier, grand-livre) | Pagination serveur par 25 avec curseur, compteur total affiché, conservation des filtres dans l'URL |
| I-10 | `documents.tsx` et `non-conformites.tsx` n'ont **aucune** `<Dialog>` : les fiches s'affichent en panneaux inline | Acceptable pour la GED (lecture/rédaction longue), mais les **actions de validation** (approbation, clôture, signature) doivent passer par une modale dédiée avec `SignatureAgent` |
| I-11 | Palette mélangée : charte verte dominante mais résidus `emerald-*`, `blue-*`, `amber-*`, `slate-*` | Unifier sur les tokens (Annexe A du volet précédent) ; les couleurs sémantiques restent : critique `#FF7036`, avertissement ambre, information `#BFF2F0` |
| I-12 | La **réception de livraison** n'existe pas comme entité : l'onglet crée un lot (`POST /stocks`) + un mouvement, sans objet `reception` ni rattachement du bon de livraison au-delà du fichier | Créer `receptions` + `lignes_reception` (§6.2) : la réception est une pièce source au sens d'INT-03 et porte la température à réception \[BPD5-F05\] |
| I-13 | Codes de secours MFA et jeton e-MECeF présents côté client | Voir D-14, D-15 : secret serveur, affichage unique, rotation tracée |
| I-14 | `journal.tsx` fait 114 lignes et délègue tout à `modules/administration.tsx` (bien), mais les autres journaux (stupéfiants, préparations, appareils) sont inline | Factoriser les registres inaltérables dans `modules/registre-inalterable.tsx` (colonnes, verrou, mention de conservation, export) |
| I-15 | Aucune ancre `data-tour` en dehors du tableau de bord | Ajouter les ancres de l'Annexe B pour le guide intégré et les tests |

---

## 2. Spécification d'interface

### 2.1 Stock — `/dashboard/stock` (11 sections)

#### 2.1.1 `?tab=vue-ensemble`

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ « Vue d'ensemble du Stock & Magasin »                    (période ▾) [Actualiser] │
└──────────────────────────────────────────────────────────────────────────────────┘
┌ Valeur du stock ┐┌ Références ┐┌ Ruptures ┐┌ Péremptions ┐┌ Quarantaine ┐┌ Dormants ┐
│ 4 850 000 F     ││ 142        ││ {6}      ││ 6/3/1 mois  ││ {2 lots}    ││ {8}      │
│ ▧ jauge vs N-1  ││ dont 18 %  ││ valeur   ││ valeur      ││ valeur      ││ valeur   │
└─────────────────┘└────────────┘└──────────┘└─────────────┘└─────────────┘└──────────┘
┌── Alertes du jour ──────────────────────────────────┐ ┌── Répartition du capital ──┐
│ ▸ CRITIQUE 2 lots périment à < 30 jours (187 000 F) │ │ ▧ Pareto ABC (BarChart)    │
│ ▸ IMPORTANT 6 références en rupture                 │ │ ◔ Par classe réglementaire │
│ ▸ RAPPEL ABMed lot LOT-2026-014 — 3 boîtes concernées│ │ ◔ Par emplacement         │
│                                        [Traiter →]  │ └────────────────────────────┘
└─────────────────────────────────────────────────────┘
┌── Derniers mouvements ─────────────────────────────┐ ┌── Tâches en attente ───────┐
│ ▤ date · type · produit · lot · qté · pièce · auteur│ │ ▤ inventaire en cours      │
│                                                     │ │ ▤ réceptions à contrôler   │
│                                                     │ │ ▤ retours fournisseur      │
└─────────────────────────────────────────────────────┘ └────────────────────────────┘
```

| KPI | Métrique (§5.1) | Cible |
| --- | --- | --- |
| Valeur du stock | `valeur_stock` | `/stocks/valorisation` |
| Références | `nb_references`, `part_sous_minimum` | `/produits` |
| Ruptures | `nb_ruptures`, `valeur_rupture` | `/stocks/alertes` |
| Péremptions | `peremptions_6_3_1`, `valeur_exposee_peremption` | `/stocks/peremptions` |
| Quarantaine | `nb_lots_quarantaine`, `valeur_quarantaine` | `/stocks?statut=quarantaine` |
| Dormants | `nb_dormants`, `valeur_dormants` | `/mouvements` + `/stocks` |

#### 2.1.2 Les 10 autres sections

| Section | Zones réelles à conserver | À ajouter | Endpoints |
| --- | --- | --- | --- |
| `produits` | filtre `SelecteurFiltrable` (tous / ruptures / thermolabiles / stupéfiants / taxable B) + tableau catalogue + création de produit | tri par colonne, recherche < 500 ms, import CSV du catalogue, fiche produit en tiroir, seuils mini/maxi éditables, historique des prix | `/produits`, `POST /produits`, `POST /produits/import` |
| `lots` | tableau des lots (numéro, péremption, quantité, emplacement, fournisseur, statut), sous-sections locales | **graphe de vie du lot** (réception → mouvements → solde), choix du lot FEFO, changement de statut avec motif, sous-section dans l'URL | `/stocks`, `/stocks/{id}/statut` |
| `emplacements` | plan des emplacements, création | vue plan interactif (magasin, réserve, enceinte 2-8 °C, armoire stupéfiants), capacité, taux d'occupation, affectation des thermolabiles contrainte à une enceinte | `/emplacements` |
| `mouvements` | journal des mouvements avec type et pièce source | filtres (type, période, produit, auteur), contre-passation (jamais de suppression), export, lien vers la pièce | `/mouvements` |
| `reception` | 4 KPI, assistant de réception, `ZoneDepot` pour BL/facture, check-list (`alerte_sanitaire_verifiee`, `emballage_intact`, `conformite_livraison`, `dates_conformes`) avec références BPD5-F05 / APP-03 / STO-05 | **entité `reception`** : fournisseur et agrément vérifié, rapprochement commande/BL/facture, écart de prix signalé, **température à réception** pour les thermolabiles, scan par lot, décision (accepter / refuser partiel / quarantaine) | `POST /receptions` (nouveau), `/receptions/{id}/lignes`, `/receptions/{id}/valider` |
| `inventaires` | campagnes, comptage par ligne, validation (`magasin-avance.tsx`) | écart par ligne avec motif, comptage à l'aveugle, inventaire tournant par emplacement, PV d'inventaire signé et exporté, écriture d'ajustement | `/inventaires`, `/inventaires/{id}/lignes/{lid}/compter`, `/inventaires/{id}/valider` |
| `peremptions` | tranches 6/3/1 mois, courriels de péremption (`courriels-peremption.tsx`) | valeur exposée par tranche, plan d'écoulement (promotion, transfert inter-officines), retrait physique validé par scan, passage automatique en `non_vendable` à J-0, alertes J-180/J-90/J-30/J-1 | `/stocks/peremptions`, `/stocks/alertes-peremption` |
| `quarantaine` | lots isolés et rappels sanitaires (`RappelsStock`) | saisie d'un avis de rappel avec **blocage automatique et immédiat** des lots correspondants à la caisse et à la dispensation, quantités retrouvées / manquantes, PV de destruction, suivi du rappel jusqu'à clôture | `/rappels`, `/rappels/{id}/cloturer`, `/stocks/{id}/quarantaine` |
| `dechets` | constitution de lots de déchets, destruction (`DechetsStock`) | catégories (périmés, rappelés, retours, emballages), prestataire agréé, PV et certificat téléversés, sortie de stock et écriture comptable, conservation 10 ans | `/dechets`, `/dechets/{id}/detruire` |
| `valorisation` | valorisation financière et analyse ABC | **graphiques** (Pareto ABC, valeur par classe, rotation), méthode de valorisation paramétrable (PAMP), comparaison avec l'inventaire, export pour la comptabilité | `/stocks/valorisation` |

#### 2.1.3 Modales du Stock

| Réf. | Modale | Champs | Règles |
| --- | --- | --- | --- |
| M-43 | Nouveau produit au catalogue | code interne, CIP, nom, DCI, forme, dosage, laboratoire, classe réglementaire, groupe de taxation, TVA, prix achat/vente, seuils mini/maxi, thermolabile | unicité CIP ; classe réglementaire conditionne la vente sur ordonnance |
| M-44 | Réception d'une livraison | fournisseur (+ contrôle d'agrément et de validité), n° BL, facture, date, température à réception, lignes scannées, check-list, décision | fournisseur non agréé ou agrément expiré → commande impossible \[art. 5.6\] |
| M-45 | Contrôle d'un lot à réception | numéro de lot, péremption, quantité, état des emballages, conformité, emplacement cible | thermolabile → emplacement enceinte 2-8 °C uniquement \[BPD5-F10\] |
| M-46 | Changement de statut d'un lot | statut cible, motif obligatoire, pièce jointe, signature | statuts : `commercialisable`, `en_attente_controle`, `quarantaine`, `non_vendable`, `reserve`, `detruit` |
| M-47 | Mise en quarantaine | motif, origine (rappel, excursion, retour, suspicion), portée (lot / produit / emplacement), notification | effet immédiat à la caisse et à la dispensation |
| M-48 | Saisie d'un avis de rappel | source (ABMed, laboratoire, grossiste), produit, lots, date, action demandée, pièce jointe | blocage automatique des lots correspondants |
| M-49 | Campagne d'inventaire | périmètre (global / emplacement / famille), type (comptable / tournant), date, équipes, comptage à l'aveugle | une seule campagne ouverte par périmètre |
| M-50 | Comptage d'une ligne | lot, quantité théorique (masquée si à l'aveugle), quantité comptée, écart, motif | écart → ajustement validé par le pharmacien |
| M-51 | Validation d'inventaire (PV) | synthèse des écarts, valeur de démarque, signature, observations | PV inaltérable, export PDF |
| M-52 | Constitution d'un lot de déchets | origine, produits, quantités, catégorie, contenant, prestataire | aucune remise en circuit possible |
| M-53 | Destruction de déchets | date, prestataire, PV, certificat, témoin, signature | sortie de stock + écriture comptable |
| M-54 | Transfert d'emplacement | lot, origine, destination, quantité, motif | mouvement tracé, jamais de suppression |
| M-55 | Contre-passation d'un mouvement | mouvement d'origine, motif, signature | INT-01 : un mouvement n'est jamais supprimé |
| M-56 | Import du catalogue / du stock initial | dépôt du fichier, association des colonnes, aperçu (lignes valides / invalides), confirmation | rien n'est écrit avant confirmation ; rapport d'erreurs téléchargeable |

#### 2.1.4 Graphiques du Stock

| Réf. | Graphique | Type | Séries |
| --- | --- | --- | --- |
| G-21 | Pareto ABC de la valorisation | `ComposedChart` (barres valeur cumulée + ligne % cumulé) | classes A/B/C, seuils 80/15/5 paramétrables |
| G-22 | Valeur du stock sur 30 jours | `AreaChart` | valeur au PAMP + ligne de référence N-1 |
| G-23 | Pyramide des péremptions | `BarChart` horizontal empilé | tranches > 6 mois, 6-3, 3-1, < 1 mois, périmés |
| G-24 | Rotation des références | `ScatterChart` | X : valeur du stock, Y : rotation ; taille = CA |
| G-25 | Mouvements par type et par jour | `BarChart` empilé | entrées, ventes, retours, casse, destruction, ajustement |
| G-26 | Taux d'occupation des emplacements | `BarChart` horizontal | par emplacement, capacité vs occupé |
| G-27 | Écarts d'inventaire par campagne | `BarChart` divergent | écarts positifs / négatifs en valeur |

### 2.2 Stupéfiants — `/dashboard/stupefiants` (9 sections)

| Section | Interface attendue | Endpoints | Particularité |
| --- | --- | --- | --- |
| `registre` | registre spécial des substances vénéneuses (Tableau B) : n° d'ordre chronologique **inaltérable**, date, type de mouvement, produit, lot, quantité, stock précédent, stock nouveau, référence de pièce, tiers, prescripteur, opérateur, visa pharmacien, observations | `/stupefiants`, `/{id}/viser`, `/{id}/rectificative` | aucune modification après visa : correction par **écriture rectificative liée** avec motif \[art. 3.8, INT-02\] |
| `balance` | balance permanente par produit : stock théorique, stock physique, écart, alerte | `/stupefiants/balance` | écart ≠ 0 → alerte critique immédiate au titulaire \[RG-D08\] |
| `ordonnancier` | journal chronologique des délivrances sur ordonnance : date, patient, prescripteur, produit, quantité, lot, n° d'ordonnance | `/stupefiants/ordonnancier` | conservation 10 ans, export PDF avec cartouche |
| `copies` | copies d'ordonnances téléversées, rattachées à la délivrance | `/officines/{id}/upload` + rattachement | conservation **3 ans** \[NF-08\] ; aperçu sans téléchargement libre |
| `inventaire` | inventaire périodique : périodicité paramétrable, comptage, écart, signature des deux compteurs | `/stupefiants/inventaire` | double signature obligatoire |
| `armoire` | contenu de l'armoire sécurisée par emplacement et par lot | `/stupefiants/armoire` | armoire fermée à clé, accès tracé |
| `ecarts` | écarts, vols et pertes : déclaration officielle, autorité alertée, suite donnée | `/stupefiants/declaration-vol` | déclaration immédiate, alerte critique au promoteur et aux autorités |
| `destruction` | demandes de destruction : produits périmés, prestataire, PV, témoin | `/stupefiants/demande-destruction` | sortie du registre avec visa |
| `rapports` | rapports mensuels et annuels signés, exports réglementaires | `/stupefiants/rapport` | cartouche : code, version, date d'édition, signature |

Modales : **M-57** Entrée de stupéfiant (livraison) · **M-58** Sortie / délivrance (rattachée à une dispensation validée) · **M-59** Visa du pharmacien (`SignatureAgent`) · **M-60** Écriture rectificative (motif, référence à la ligne corrigée) · **M-61** Inventaire (double compteur, écarts) · **M-62** Déclaration de vol ou perte (date, produit, quantité, circonstances, autorité informée, récépissé) · **M-63** Demande de destruction · **M-64** Rapport mensuel (période, signature, export).

Graphiques : **G-28** Balance permanente par produit (`LineChart` entrées/sorties/solde) · **G-29** Consommation mensuelle par produit (`BarChart`) · **G-30** Écarts d'inventaire sur 12 mois (`BarChart` divergent, cible 0).

### 2.3 Préparations magistrales — `/dashboard/preparations` (6 sections)

| Section | Interface attendue |
| --- | --- |
| `registre` | registre des préparations : n° d'ordre, date, type (magistrale / officinale), formule, quantité, patient ou stock, préparateur, visa pharmacien, péremption, conditions de conservation |
| `formules` | bibliothèque de formules validées par le titulaire : composition, mode opératoire, précautions, durée de conservation, version |
| `matieres` | matières premières : fiche, lot, fournisseur, péremption, quantité, statut ; consommation déstockée du stock général |
| `controles` | contrôles de la préparation : aspect, pH, masse, étiquetage, conformité ; résultat signé ; non-conformité → NC/CAPA |
| `etiquettes` | génération d'étiquettes : nom, composition, posologie, n° de préparation, date, péremption, mentions légales, code-barres |
| `rapports` | rapports périodiques et exports du registre |

Modales : **M-65** Nouvelle préparation · **M-66** Ajout d'une formule à la bibliothèque · **M-67** Réception d'une matière première · **M-68** Contrôle d'une préparation · **M-69** Visa pharmacien · **M-70** Étiquette (aperçu et impression).

Graphiques : **G-31** Préparations par mois et par type (`BarChart`) · **G-32** Taux de conformité des contrôles (`RadialBar` jauge).

### 2.4 Qualité & BPD ABMed — 9 pages

Le **fonctionnel fait foi** dans *Cahier des charges de la section « Qualité & BPD ABMed »* (TEM, LOC, AUT, POI, PER, DOC, MOD, NCC, ECH). Ce qui suit précise l'interface réelle et ce qu'il faut y ajouter.

| Page | Existe déjà | À ajouter en interface | Graphiques | Modales |
| --- | --- | --- | --- | --- |
| `temperatures` | tournées du jour, deux registres codifiés (GAC-EN-001, GAC-EN-002), courbe `LineChart`, zones et seuils, bloc d'excursion | complétude **réelle** (D-07), excursion **réelle** (D-08), saisie rapide < 15 s, QR par enceinte, décision du pharmacien après excursion, capteurs connectés (P3) | G-33 courbes multi-zones 24 h / 30 j avec `ReferenceArea` · G-34 complétude des relevés par zone (`BarChart`) · G-35 historique des excursions (`ScatterChart`) | M-71 relevé · M-72 décision après excursion · M-73 incident technique · M-74 rapport mensuel signé |
| `locaux` | équipements, maintenance, étalonnage, nettoyage, nuisibles (3D), incendie/extincteurs, **journal des sauvegardes statique** | journal des sauvegardes **réel** (D-05) avec test de restauration, carnet de vie matériel, plan de nettoyage avec check-list illustrée, score de conformité réel (D-06) | G-36 échéances de maintenance/étalonnage (`BarChart` par mois) · G-37 conformité des check-lists locaux (`RadialBar`) · G-38 succès des sauvegardes sur 30 jours (`BarChart`) | M-75 fiche équipement · M-76 maintenance/étalonnage · M-77 check-list de nettoyage · M-78 intervention nuisibles · M-79 contrôle extincteur · M-80 sauvegarde et test PRA |
| `auto-evaluation` | campagne courante, cotation par article, génération de CAPA, rapport annuel, `BarChart` par chapitre | navigation par chapitre et par article avec preuve rattachée, comparaison de campagnes, évaluation assistée par les données (AE-03), export du rapport d'auto-inspection | G-39 radar des 10 chapitres · G-40 évolution du score par campagne (`LineChart`) · G-41 répartition des cotations (`PieChart` conforme / écart mineur / majeur / NA) | M-81 nouvelle campagne · M-82 cotation d'un article (preuve, commentaire) · M-83 génération de CAPA · M-84 rapport d'auto-inspection |
| `pointage` | borne tablette H24 (scan badge ou PIN), tableau des mouvements, historique | statistiques **réelles** (D-09), contrôle anti-fraude (badge + code, géolocalisation optionnelle), règle du pharmacien présent paramétrable, planning | G-45 présences par jour et par agent (`BarChart` empilé) · G-46 heures travaillées vs planning (`LineChart`) · G-47 taux de ponctualité mensuel (`RadialBar`) | M-85 pointage manuel justifié · M-86 historique des présences (existe : `modale-historique-presences`) · M-87 badge double face (existe : `badge-double-face`) · M-88 correction de pointage |
| `personnel` | dossiers, attestation d'inscription à l'Ordre, habilitations, formations, profil collaborateur | échéances d'inscription à l'Ordre reliées à l'échéancier, grille de compétences par poste, plan de formation et réalisations, évaluations | G-48 effectif par fonction (`PieChart`) · G-49 formations réalisées vs planifiées (`BarChart`) · G-50 échéances des inscriptions à l'Ordre (`BarChart` J-90/J-30) | M-89 dossier collaborateur (existe : `modale-profil-collaborateur`) · M-90 inscription à l'Ordre · M-91 habilitation · M-92 formation · M-93 demande d'absence |
| `documents` | GED complète : cartouche, rédaction structurée, approbation, fichiers, qualification, registres documentaires, imports de corpus, canevas | fil d'approbation visible (rédacteur → vérificateur → approbateur), diffusion avec accusé de lecture, mention « Copie non contrôlée » à l'impression, documents à réviser en tête | G-51 documents par statut et par processus (`BarChart` empilé) | M-94 approbation (`approbation-document` existe) · M-95 diffusion · M-96 révision / nouvelle version |
| `modeles` | bibliothèque des modèles types BPD, instanciation, informations du modèle | recherche par processus et par code, correspondance modèle ↔ page de l'application, compteur d'instanciation | — | instanciation (panneau existant) |
| `non-conformites` | fiche d'enregistrement complète en 5 parties (description, action immédiate, causes 5M/5 Pourquoi, CAPA, efficacité), cartouche de suivi | indicateurs **réels** (D-10), vue tableau des NC ouvertes par porteur et échéance, alerte de dépassement | G-42 NC par chapitre et par gravité (`BarChart` empilé) · G-43 délai de clôture (`LineChart`) · G-44 efficacité des CAPA (`PieChart`) | M-97 création de NC (existe : `BoutonCreerNC` de `bpd-communs`) · M-98 action CAPA · M-99 vérification d'efficacité · M-100 clôture |
| `echeances` | calendrier, catégories, report avec motif, clôture avec preuve, exports, courriels de péremption | vue mensuelle et liste, rappels J-30/J-7/J, échéances réglementaires **non reportables**, iCal | (calendrier maison, pas recharts) | M-101 nouvelle échéance · M-102 clôture avec preuve · M-103 report motivé · M-104 règles de rappel |

> **Note de numérotation** : les modales M-94 à M-104 prolongent l'inventaire global au-delà de M-96 annoncé en tête ; l'inventaire complet de ce volet est **M-43 → M-127** (85 modales, dont 34 pour les 9 pages qualité).

### 2.5 Gestion & Finance — 3 pages

| Page | Existe | À ajouter | Graphiques | Modales |
| --- | --- | --- | --- | --- |
| `comptabilite` | journal des ventes, balance, grand-livre, bilan actif/passif SYSCOHADA, clôtures de caisse, écritures et extournes, `PieChart` | **tous les états doivent être calculés** (D-01 à D-04), sélecteur d'exercice et de période, piste d'audit écriture → pièce source, liasse fiscale DGI, rapprochement bancaire par import de relevé, TVA déclarée vs recalculée | G-52 résultat mensuel (`BarChart` produits/charges) · G-53 répartition des charges (`PieChart`, existe à brancher) · G-54 TVA collectée / déductible (`BarChart`) · G-55 trésorerie 30 jours (`LineChart`) | M-105 écriture manuelle · M-106 extourne (existe) · M-107 clôture de période · M-108 import de relevé bancaire · M-109 génération de la liasse |
| `journal` | journal d'audit filtrable, vérification d'intégrité SHA-256, résumé lisible (`resumeJournal`), état vide explicite | filtres enregistrés, export horodaté, alerte si la vérification d'intégrité échoue, vue « mode inspecteur » en lecture seule | — | M-110 détail d'une ligne d'audit · M-111 ouverture d'un accès inspecteur (durée limitée, journalisée) |
| `appareils` | 7 sections : parc, appairage, bornes de pointage H24, postes de caisse et périphériques (imprimante e-MECeF, scanner, tiroir-caisse), sessions actives, révocations et arbitrage, registre d'audit BPD4-F12 | état réel des périphériques (dernier contact, file d'arbitrage des opérations mises à l'écart), révocation d'urgence en un geste, journal des appairages | G-56 appareils par type et statut (`BarChart`) | M-112 enrôlement d'un appareil · M-113 révocation · M-114 arbitrage d'une opération en conflit |

### 2.6 Compte & Officine — 3 pages

| Page | Existe | À ajouter | Modales |
| --- | --- | --- | --- |
| `compte` | profil, rôle, préférences (dont taille d'interface « Confort tactile +10 % » / « Grande lisibilité +20 % »), demandes de droits supplémentaires et leur suivi, congés et formation | valeurs réelles des congés et formations (D-11, D-12), historique des modifications du profil, export de mes données (droit d'accès \[DP-05\]), préférences de notification reliées à TDB-13 | M-115 modification du profil · M-116 demande de droits · M-117 demande d'absence · M-118 export de mes données |
| `parametres` | fiche d'identité officielle de l'officine, horaires d'ouverture, service de garde, seuils métrologiques, clés d'API et identifiant machine e-MECeF, imports initiaux (catalogue, clients, fournisseurs), durées de conservation (3/5/10/40 ans) | **retirer le jeton e-MECeF du client** (D-15) : état « configuré / non configuré » + rotation tracée ; versionnement de chaque paramètre avec date d'effet ; historique des modifications ; contrôle de cohérence (un seuil ne peut pas contredire le Guide) | M-119 modification d'un paramètre (avec motif et date d'effet) · M-120 rotation d'un secret · M-121 import initial · M-122 historique d'un paramètre |
| `securite` | MFA (état, enrôlement, vérification), codes de secours, mot de passe, sessions et appareils, autorisation nominative d'accès au système informatisé, comptes à régulariser | **codes de secours générés serveur, affichés une fois** (D-14) ; politique de mot de passe visible ; verrouillage après essais ; journal des connexions ; autorisation d'accès signée et archivée (art. 4.32, 4.33) | M-123 enrôlement MFA (QR + codes) · M-124 régénération des codes de secours · M-125 changement de mot de passe · M-126 révocation de session · M-127 autorisation nominative d'accès |

---

## 3. Télémétrie de ces sections

Les principes, l'architecture, le format des événements, les règles de collecte et le modèle de données sont définis dans le volet précédent (§5.1, §5.3 à §5.8). **Ce qui suit complète les dictionnaires**, sans les répéter.

### 3.1 Métriques métier supplémentaires

| Code | Définition | Formule | Source | Alerte |
| --- | --- | --- | --- | --- |
| `valeur_rupture` | CA perdu estimé | Σ (ventes moyennes/j × marge unitaire) sur références en rupture, sur 30 j | `stocks_lots`, `ventes_caisse` | toute rupture critique |
| `part_sous_minimum` | Références sous seuil | COUNT produits `stock < seuil_min` / `nb_references` | `produits`, `stocks_lots` | > 10 % |
| `nb_lots_quarantaine` · `valeur_quarantaine` | Immobilisation | COUNT et Σ valeur des lots en `quarantaine` ou `non_vendable` | `stocks_lots` | lot en quarantaine > 30 j |
| `taux_rotation_stock` | Dynamisme | `ca_ht / valeur_stock` (12 mois glissants) | calculé | < seuil paramétré |
| `delai_moyen_reception` | Efficacité réception | moyenne(`mise_en_stock_at − reception_at`) | `receptions` | > 24 h |
| `taux_conformite_reception` | Qualité fournisseur | réceptions sans écart / réceptions | `receptions` | < 95 % |
| `ecarts_inventaire` | Fiabilité du stock | Σ \|quantité comptée − théorique\| et valeur de démarque | `lignes_inventaire` | démarque > seuil |
| `nb_rappels_actifs` · `lots_bloques` | Réaction sanitaire | COUNT rappels non clôturés et lots bloqués | `avis_rappels` | rappel > 7 j sans clôture |
| `balance_stupefiants_ecart` | Intégrité du registre | Σ \|stock physique − stock théorique\| par produit | `/stupefiants/balance` | **tout écart ≠ 0** (critique) |
| `taux_visa_stupefiants` | Conformité du visa | lignes visées / lignes du registre | `registre_stupefiants` | < 100 % |
| `delai_visa_stupefiants` | Réactivité | moyenne(`date_visa − created_at`) | idem | > 24 h |
| `taux_conformite_preparations` | Qualité officinale | contrôles conformes / contrôles | `registre_preparations` | < 100 % |
| `nb_excursions` · `delai_decision_excursion` | Chaîne du froid | COUNT hors seuil ; moyenne(`decision_at − alerte_at`) | `releves_temperature` | décision > 4 h |
| `taux_sauvegardes_reussies` | Continuité (art. 4.34) | sauvegardes réussies / planifiées sur 30 j | `sauvegardes` | **< 100 %** (critique) |
| `delai_test_pra` | Test de restauration | jours depuis le dernier test réussi | `sauvegardes` | > 90 j |
| `taux_checklists_locaux` | Hygiène | check-lists réalisées / planifiées | `nettoyage_registre` | < 100 % |
| `score_bpd` · `score_bpd_chapitre` | Conformité au Guide | Σ cotations / Σ articles applicables | `evaluations_articles` | baisse > 5 points |
| `delai_moyen_cloture_nc` | Réactivité qualité | moyenne(`cloturee_at − ouverte_at`) | `non_conformites` | > échéance paramétrée |
| `taux_efficacite_capa` | Efficacité des actions | CAPA vérifiées efficaces / CAPA clôturées | `non_conformites` | < 80 % |
| `nc_en_retard` | Dérive qualité | COUNT NC dont l'échéance d'action est dépassée | idem | > 0 |
| `documents_a_reviser` | Maîtrise documentaire | COUNT documents dont la révision est échue | `documents` | > 0 |
| `taux_diffusion_documents` | Diffusion | accusés de lecture / destinataires | `documents` | < 100 % sur un document en vigueur |
| `formations_realisees` | Compétences | réalisées / planifiées sur l'exercice | `employes`, plan de formation | retard |
| `inscriptions_ordre_a_echeance` | Ordre des pharmaciens | COUNT inscriptions expirant à 90/30 j | `inscriptions_ordre` | toute échéance < 30 j |
| `taux_ponctualite` | Ponctualité | pointages à l'heure / pointages | `pointages` | < seuil |
| `heures_sans_pharmacien` | Conformité art. 1.11 | minutes d'ouverture sans pharmacien pointé | `pointages` | **> 0** (critique) |
| `echeances_en_retard` | Veille réglementaire | COUNT échéances dépassées non clôturées | `echeances` | toute échéance réglementaire |
| `resultat_exercice` · `resultat_mois` | Performance | Σ produits − Σ charges (SYSCOHADA) | `ecritures_syscohada` | résultat négatif |
| `taux_lettrage` · `delai_moyen_lettrage` | Qualité comptable | écritures lettrées / écritures lettrables | idem | < 90 % |
| `tva_declaree_vs_recalculee` | Cohérence fiscale | TVA déclarée − TVA recalculée des reçus | `factures_emecef`, déclarations | écart > 1 % \[FIS-06\] |
| `journal_audit_integre` | Inaltérabilité | résultat de `verifier-integrite` (0/1) | `audit_logs` | **0** (critique) |
| `nb_appareils_autorises` · `sessions_actives` | Surface d'exposition | COUNT appareils actifs, sessions actives | `appareils_autorises`, tokens | appareil inconnu |
| `taux_mfa_active` | Sécurité des rôles réglementaires | comptes soumis au MFA et activés / comptes soumis | `users` | < 100 % |
| `tentatives_connexion_echouees` | Menace | COUNT par compte et par jour | journal de connexion | > 5 / jour |
| `operations_en_conflit` | Synchronisation | COUNT opérations marquées `conflit` | outbox / `sync` | > 0 |

### 3.2 Événements d'usage supplémentaires

| Événement | Déclencheur | Propriétés spécifiques |
| --- | --- | --- |
| `stock.section.ouverte` | changement de `?tab=` | `section`, `sous_section`, `origine` (`sidebar`/`selecteur`/`lien`) |
| `stock.produit.recherche` | fin de debounce | `nb_resultats`, `duree_ms`, `terme_hache` |
| `stock.lot.statut_change` | validation de M-46/M-47 | `lot_id`, `statut_avant`, `statut_apres`, `motif`, `signature` |
| `stock.reception.enregistree` | validation de M-44 | `reception_id`, `fournisseur_id`, `nb_lignes`, `temperature_reception`, `ecarts` |
| `stock.reception.refusee` | décision de refus | `motif`, `nb_lignes_refusees` |
| `stock.inventaire.compte` | comptage d'une ligne | `campagne_id`, `ligne_id`, `ecart`, `a_l_aveugle` |
| `stock.inventaire.valide` | PV signé | `campagne_id`, `demarque_valeur`, `duree_campagne_h` |
| `stock.rappel.saisi` | avis de rappel | `source`, `nb_lots_bloques`, `quantite_bloquee` |
| `stock.dechet.detruit` | destruction | `categorie`, `quantite`, `prestataire`, `pv_present` |
| `stock.valorisation.exportee` | export | `format`, `methode`, `periode` |
| `stup.ligne.ecrite` | entrée ou sortie au registre | `type_mouvement`, `produit_id`, `quantite` (pas le patient) |
| `stup.lignee.visee` | visa pharmacien | `delai_ms`, `rectificative` |
| `stup.balance.consultee` | ouverture de la balance | `ecart_detecte` |
| `stup.vol.declare` | déclaration | `produit_id`, `quantite`, `autorite_informee` |
| `prep.preparation.enregistree` | nouvelle préparation | `type`, `nb_matieres`, `peremption` |
| `prep.controle.valide` | contrôle | `conforme`, `nc_creee` |
| `qua.releve.saisi` | relevé de température | `zone`, `valeur`, `hors_seuil`, `duree_saisie_ms`, `source` (`manuel`/`qr`/`capteur`) |
| `qua.excursion.declaree` | détection | `zone`, `duree_min`, `produits_concernes`, `nc_creee` |
| `qua.excursion.decidee` | décision du pharmacien | `decision`, `delai_ms` |
| `qua.article.cote` | cotation d'un article | `chapitre`, `article`, `cotation`, `preuve`, `duree_ms` |
| `qua.capa.generee` | génération depuis un écart | `evaluation_id`, `nc_id` |
| `qua.pointage.badge` | badge ou PIN | `sens`, `poste`, `methode`, `duree_ms` |
| `qua.document.approuve` | approbation | `document_code`, `etape`, `signature` |
| `qua.document.imprime` | impression | `document_code`, `copie_non_controlee` |
| `qua.echeance.cloturee` | clôture avec preuve | `echeance_id`, `retard_jours`, `preuve` |
| `cpt.ecriture.creee` | écriture manuelle | `journal`, `piece`, `debit`, `credit` |
| `cpt.ecriture.extournee` | extourne | `ecriture_id`, `motif` |
| `cpt.etat.exporte` | export | `etat` (`balance`/`grand_livre`/`bilan`/`liasse`), `periode`, `format` |
| `adm.audit.verifie` | vérification d'intégrité | `resultat`, `nb_lignes`, `duree_ms` |
| `adm.appareil.enrole` / `adm.appareil.revoque` | gestion du parc | `appareil_id`, `type`, `motif` |
| `adm.conflit.arbitre` | arbitrage d'une opération | `operation_id`, `decision` |
| `cpte.profil.modifie` | mise à jour | `champs_modifies` (noms, pas valeurs) |
| `cpte.parametre.modifie` | paramètre d'officine | `cle`, `date_effet`, `motif`, `version` |
| `cpte.parametre.consulte` | lecture d'un paramètre sensible | `cle` |
| `sec.mfa.enrole` / `sec.mfa.active` / `sec.mfa.desactive` | cycle MFA | `methode` |
| `sec.codes_secours.regeneres` | régénération | `nb_codes` (jamais les codes) |
| `sec.session.revoquee` | révocation | `appareil_id`, `portee` (`une`/`autres`/`toutes`) |
| `sec.connexion.echouee` | échec d'authentification | `cause` (`mot_de_passe`/`mfa`), `tentative_n` |

**Règle spécifique à ces sections** : les événements des registres réglementaires (stupéfiants, préparations, journal d'audit) **ne remplacent jamais** l'écriture au registre ni l'audit ; ils mesurent l'usage. Aucun événement ne transporte : nom de patient, numéro d'ordonnance, valeur de secret, code de secours, code MFA, contenu de relevé bancaire.

### 3.3 Télémétrie technique propre à ces sections

| Mesure | Seuil | Pourquoi |
| --- | --- | --- |
| `tech.audit.integrite` | échec = critique | preuve d'inaltérabilité (NF-06, NF-07) |
| `tech.sauvegarde.statut`, `tech.sauvegarde.duree_ms`, `tech.pra.test` | échec = critique | art. 4.34, 4.35 |
| `tech.sync.conflits`, `tech.sync.taille_file` | file > 50 = alerte | E0-S7 |
| `tech.import.statut` (catalogue, relevé, corpus) | taux d'échec | qualité des données |
| `perf.chargement_registre_ms` | < 1 500 ms | registres paginés |
| `perf.recherche_stock_ms` | < 500 ms | NF-01 appliqué au magasin |
| `perf.generation_rapport_ms` | < 10 s (sinon file asynchrone) | rapports mensuels, liasse |
| `tech.generation_pdf.echec` | toute occurrence | états financiers, PV, rapports signés |

### 3.4 Restitution

| Métriques | Restituées dans |
| --- | --- |
| Stock (`valeur_stock`, ruptures, péremptions, quarantaine, dormants, rotation) | Stock `vue-ensemble`, tableau de bord TDB-05, consolidation CGL-01 |
| Stupéfiants (balance, visa, écarts) | Stupéfiants `balance`, tableau de bord TDB-06, alerte critique |
| Qualité (score, NC, températures, documents, formations, échéances) | tableau de bord TDB-06, `auto-evaluation`, `non-conformites`, rapport d'auto-inspection |
| Pointage et personnel | tableau de bord TDB-07, `pointage`, `personnel` |
| Finance (résultat, TVA, lettrage) | tableau de bord TDB-09, `comptabilite` |
| Sécurité et exploitation (MFA, appareils, audit, sauvegardes, conflits) | `securite`, `appareils`, `journal`, onglet Exploitation du tableau de bord |

---

## 4. Exigences transverses propres à ces sections

| Réf. | Exigence |
| --- | --- |
| RG-01 | **Registre inaltérable** : tout registre (stupéfiants, préparations, mouvements, journal d'audit, ordonnancier, PV d'inventaire) est en append-only ; l'UI n'offre **aucun** bouton de modification ou de suppression ; la correction passe par une écriture rectificative liée avec motif |
| RG-02 | **Verrou de conservation** : la durée (3 / 5 / 10 / 40 ans) est affichée dans le cartouche de chaque registre et empêche toute purge dans l'interface \[NF-08\] |
| RG-03 | **Cartouche réglementaire** : tout état imprimé ou exporté porte le code du document (ex. `GAC-EN-002`), la version, la date d'édition, l'officine, la période et la signature ; toute impression d'un document diffusé porte « Copie non contrôlée » |
| RG-04 | **Mode inspecteur** : vue en lecture seule, filtrée par période, registre ou chapitre, ouverte pour une durée limitée et journalisée \[BPD-C08\] ; aucune donnée de paie ni de comptabilité |
| RG-05 | **Signature par code personnel** : composant partagé `SignatureAgent` pour toute validation (visa stupéfiants, PV d'inventaire, décision après excursion, approbation documentaire, clôture de NC, extourne) ; horodatage serveur ; 3 essais puis verrouillage |
| RG-06 | **Non-conformité en un clic** : `BoutonCreerNC` (déjà dans `modules/bpd-communs.tsx`) disponible depuis tout écart constaté (excursion, lot non conforme, équipement non étalonné, sauvegarde échouée, écart d'inventaire, contrôle de préparation non conforme) \[BPD-C05\] |
| RG-07 | **Secrets hors client** : aucun jeton, mot de passe, code MFA ou code de secours n'est stocké ni affiché durablement côté client ; l'UI montre un état et permet la rotation (D-14, D-15) |
| RG-08 | **Pagination et filtres dans l'URL** : tout registre long est paginé serveur (25 lignes) avec filtres et page conservés dans l'URL (TAB-02, TAB-03) |
| RG-09 | **Exports systématiques** : PDF, Excel, CSV via `@/lib/export-utils` ; chaque export est journalisé \[NF-12\] |
| RG-10 | **Tableaux accessibles** : migration vers `@/components/ui/table` (I-07) avec en-têtes `<th scope="col">`, tri clavier, et repli en cartes empilées sous 640 px |
| RG-11 | **Données de santé** : les registres patient (ordonnancier, délivrances) sont réservés aux rôles habilités ; toute lecture est journalisée \[AC-02, DP-03\] ; le promoteur ne voit que des agrégats \[DP-06\] |
| RG-12 | **Paramétrable, jamais codé en dur** : seuils, périodicités, durées de conservation, régimes fiscaux, taux, planchers et libellés réglementaires viennent des paramètres d'officine versionnés |

---

## 5. Critères d'acceptation

### 5.1 Interface

- [ ] Les 44 sous-sections sont accessibles par lien profond (`?tab=…&…`) et reproductibles après rechargement.
- [ ] `grep -rn "96.4%\|4.2 jours\|85% réalisés\|94.8 %\|18 950 000\|100% Réussie\|dgi_live_sec_\|8492-1049"` renvoie **zéro** résultat dans `src/`.
- [ ] Le journal des sauvegardes, les états financiers, les statistiques de pointage, les indicateurs de NC et la complétude des relevés proviennent du serveur.
- [ ] Aucun `<table>` HTML brut ne subsiste : tous passent par `TableauRegistre`.
- [ ] Les 36 graphiques (G-21 à G-56) rendent avec des données réelles, ont un état vide explicite et un équivalent textuel.
- [ ] Les registres affichent leur cartouche (code, version, conservation) et n'offrent aucune action de modification.

### 5.2 Sécurité

- [ ] Les codes de secours MFA sont générés serveur, affichés une seule fois, hachés en base, et régénérables (M-124).
- [ ] Le jeton e-MECeF n'apparaît nulle part dans une réponse API ni dans le code client ; l'écran affiche « Configuré » et permet la rotation tracée.
- [ ] Une révocation d'appareil prend effet immédiatement et apparaît dans le registre d'audit.
- [ ] Le mode inspecteur est en lecture seule, borné dans le temps, et journalisé.

### 5.3 Télémétrie

- [ ] Toutes les métriques du §3.1 sont servies par un endpoint, calculées serveur, avec `null` quand la donnée manque.
- [ ] Les événements du §3.2 sont émis, batchés, idempotents, et rejoués après une coupure sans doublon.
- [ ] Un test automatisé vérifie qu'aucun payload de télémétrie ne contient de donnée de santé ni de secret.
- [ ] Un écart de balance stupéfiants et un échec de vérification d'intégrité lèvent une alerte critique dans le tableau de bord.

---

## 6. Plan de livraison (suite des lots L1–L7)

| Lot | Contenu | Dépendances |
| --- | --- | --- |
| **L8 — Fondations registres** | `TableauRegistre` (I-07), `RegistreInalterable` (I-14), `SignatureAgent`, cartouches, pagination et filtres dans l'URL (TAB-02/03), `validateSearch` | L1 |
| **L9 — Stock réel** | entité `receptions` (I-12), M-43 à M-56, G-21 à G-27, import de catalogue, écarts d'inventaire et PV, rappels avec blocage automatique | L8, socle stock existant |
| **L10 — Stupéfiants et préparations** | balance temps réel, écritures rectificatives, double signature d'inventaire, déclaration de vol, M-57 à M-70, G-28 à G-32 | L8, L9 (lots) |
| **L11 — Qualité réelle** | suppression des D-05 à D-10, journal des sauvegardes réel, M-71 à M-104, G-33 à G-51, mode inspecteur | L8, CDC Qualité (fait foi) |
| **L12 — Finance réelle** | états SYSCOHADA calculés, sélecteur d'exercice, piste d'audit, liasse DGI, rapprochement bancaire, M-105 à M-109, G-52 à G-55 | L3 (caisse), L5 (facturation) |
| **L13 — Sécurité et compte** | secrets hors client (D-14, D-15), codes de secours serveur, rotation, journal des connexions, préférences réelles, M-110 à M-127 | L8 |
| **L14 — Télémétrie de ces sections** | métriques du §3.1, événements du §3.2, télémétrie technique du §3.3, restitution §3.4, tests de non-fuite | L2, L9 à L13 |

---

## Annexe A — Cartographie section → endpoint (aide à l'implémentation)

| Section | Endpoints existants | Endpoints à créer |
| --- | --- | --- |
| `stock/vue-ensemble` | `/stocks/alertes`, `/stocks/peremptions`, `/stocks/valorisation` | `/dashboard/synthese` (bloc stock) |
| `stock/produits` | `/produits` | `/produits/import`, `/produits/{id}/historique-prix` |
| `stock/lots` | `/stocks`, `/stocks/{id}/statut` | `/stocks/{id}/vie-du-lot` |
| `stock/emplacements` | `/emplacements` | `/emplacements/{id}/occupation` |
| `stock/mouvements` | `/mouvements` | `/mouvements/{id}/contre-passation` |
| `stock/reception` | `POST /stocks`, `POST /mouvements`, `/upload` | `/receptions`, `/receptions/{id}/lignes`, `/receptions/{id}/valider`, `/receptions/{id}/refuser` |
| `stock/inventaires` | `/inventaires` (+ compter, valider) | `/inventaires/{id}/pv` |
| `stock/peremptions` | `/stocks/peremptions`, `/stocks/alertes-peremption` | `/stocks/peremptions/plan-ecoulement` |
| `stock/quarantaine` | `/rappels`, `/stocks/{id}/quarantaine` | `/rappels/{id}/lots-concernes` |
| `stock/dechets` | `/dechets` (+ détruire) | `/dechets/{id}/pv` |
| `stock/valorisation` | `/stocks/valorisation` | `/stocks/valorisation/abc` |
| `stupefiants/*` | `/stupefiants` (+ 9 routes) | `/stupefiants/{id}/rectificatives` (historique) |
| `preparations/*` | `/preparations` (+ viser) | `/preparations/formules`, `/preparations/matieres`, `/preparations/{id}/controles`, `/preparations/{id}/etiquette` |
| `temperatures` | `/officines/{id}/temperatures` (+ stats) | `/officines/{id}/temperatures/{id}/decision`, `/temperatures/csv` (existe) |
| `locaux` | `/officines/{id}/equipements`, `/nettoyages` | `/officines/{id}/sauvegardes`, `/equipements/{id}/maintenance`, `/equipements/{id}/etalonnage`, `/nuisibles`, `/extincteurs` |
| `auto-evaluation` | 4 routes existantes | `/auto-evaluation/campagnes` (historique), `/auto-evaluation/comparaison` |
| `pointage` | `/officines/{id}/pointages` (+ actif, prise) | `/officines/{id}/pointages/stats`, `/pointages/{id}/correction` |
| `personnel` | `/officines/{id}/employes` (+`/{id}`) | `/employes/{id}/inscriptions-ordre`, `/employes/{id}/formations`, `/employes/{id}/habilitations` |
| `documents` | `/documents`, `/fichiers`, `/approbations`, `/imports-corpus`, `/canevas`, `/suivis-documentaires` | `/documents/{id}/diffusion`, `/documents/a-reviser` |
| `modeles` | `/modeles-bpd`, `/instancier` | — |
| `non-conformites` | `/officines/{id}/non-conformites` (+`/{id}`) | `/non-conformites/{id}/actions`, `/non-conformites/{id}/efficacite`, `/non-conformites/indicateurs` |
| `echeances` | `/officines/{id}/echeances`, `/echeances/{id}`, `/echeances/ical` | `/echeances/{id}/cloturer` |
| `comptabilite` | `/comptabilite/journal-ventes`, `/clotures`, `/ecritures` (+ extourne) | `/comptabilite/balance`, `/comptabilite/grand-livre`, `/comptabilite/bilan`, `/comptabilite/liasse`, `/comptabilite/rapprochement-bancaire`, `/comptabilite/tva` |
| `journal` | `/officines/{id}/audit-logs` (+ verifier-integrite) | `/audit-logs/acces-inspecteur` |
| `appareils` | `/officines/{id}/appareils-autorises` (+ revoquer/reactiver), `/auth/devices` | `/appareils-autorises/{id}/etat`, `/conflits` (file d'arbitrage) |
| `compte` | `/auth/profile` | `/auth/mes-donnees` (export), `/auth/demandes-droits` |
| `parametres` | `/officines/{id}/parametres` (+`/{cle}`) | `/parametres/{cle}/historique`, `/secrets/rotation` |
| `securite` | `/auth/mfa` (+ demarrer), `/auth/password`, `/auth/verify-mfa`, `/auth/devices` | `/auth/mfa/codes-secours` (génération), `/auth/connexions` (journal) |

## Annexe B — Ancres de test et de guide

| Ancres | Écran |
| --- | --- |
| `data-tour="stock-alertes"` · `data-tour="stock-valorisation"` · `data-tour="stock-peremptions"` | Stock |
| `data-testid="stock-section-<tab>"` · `data-testid="stock-lot-<id>"` · `data-testid="stock-reception-assistant"` | Stock |
| `data-testid="stup-registre"` · `data-testid="stup-balance"` · `data-testid="stup-visa"` | Stupéfiants |
| `data-testid="prep-registre"` · `data-testid="prep-controle"` | Préparations |
| `data-tour="temp-courbe"` · `data-tour="temp-excursion"` · `data-testid="temp-releve-saisie"` | Chaîne du froid |
| `data-testid="loc-sauvegardes"` · `data-testid="loc-equipements"` | Locaux & Matériel |
| `data-tour="aut-score"` · `data-tour="aut-chapitres"` · `data-testid="aut-article-<ref>"` | Auto-évaluation |
| `data-testid="poi-borne"` · `data-testid="poi-badge"` · `data-testid="poi-stats"` | Pointage |
| `data-testid="per-dossier"` · `data-testid="per-ordre"` | Personnel |
| `data-testid="doc-cartouche"` · `data-testid="doc-approbation"` | GED |
| `data-testid="nc-fiche"` · `data-testid="nc-capa"` · `data-testid="nc-indicateurs"` | Non-conformités |
| `data-testid="ech-calendrier"` · `data-testid="ech-cloture"` | Échéancier |
| `data-testid="cpt-bilan"` · `data-testid="cpt-balance"` · `data-testid="cpt-liasse"` | Comptabilité |
| `data-testid="adm-audit-integrite"` | Journal d'audit |
| `data-testid="app-parc"` · `data-testid="app-conflits"` | Appareils |
| `data-testid="cpte-profil"` · `data-testid="par-parametre-<cle>"` · `data-testid="par-secret-etat"` | Compte / Paramètres |
| `data-testid="sec-mfa"` · `data-testid="sec-codes-secours"` · `data-testid="sec-sessions"` | Sécurité |

## Annexe C — Check-list rapide par groupe

```
Stock           [ ] 11 sections en lien profond  [ ] entité réception  [ ] M-43…M-56  [ ] G-21…G-27
                [ ] FEFO visible partout  [ ] rappels bloquants  [ ] PV d'inventaire signé  [ ] zéro valeur fictive
Stupéfiants     [ ] 9 sections  [ ] registre inaltérable + rectificatives  [ ] balance temps réel  [ ] double signature
                [ ] M-57…M-64  [ ] G-28…G-30  [ ] conservation 10 ans affichée  [ ] copies 3 ans
Préparations    [ ] 6 sections  [ ] M-65…M-70  [ ] G-31, G-32  [ ] contrôles → NC
Qualité (9)     [ ] CDC Qualité respecté  [ ] D-05…D-10 supprimés  [ ] M-71…M-104  [ ] G-33…G-51
                [ ] sauvegardes réelles  [ ] mode inspecteur  [ ] signature par code personnel
Finance         [ ] états calculés  [ ] D-01…D-04 supprimés  [ ] piste d'audit  [ ] liasse DGI
                [ ] M-105…M-109  [ ] G-52…G-55  [ ] TVA déclarée vs recalculée
Compte/Officine [ ] D-11…D-16 traités  [ ] secrets hors client  [ ] codes de secours serveur
                [ ] M-110…M-127  [ ] paramètres versionnés avec date d'effet
Transversal     [ ] TableauRegistre partout  [ ] pagination + filtres dans l'URL  [ ] charte unifiée
                [ ] télémétrie §3  [ ] exports journalisés  [ ] fixtures et tests à jour  [ ] 360/820/1440 px
```
