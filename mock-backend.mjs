import { lireEtatDemo, ecrireEtatDemo } from "./mock-data/persistance-demo.mjs";
import { fileURLToPath } from "node:url";
import { recalculerCanevas } from "./mock-data/calculs-canevas.mjs";
import http from "http";
import { readFileSync } from "node:fs";
import { randomUUID, createHash, scryptSync } from "node:crypto";
const CATALOGUE_SUIVIS = JSON.parse(readFileSync(new URL("./mock-data/catalogue-suivis.json", import.meta.url), "utf8"));
const SUIVIS_DOCUMENTAIRES = [];
const CANEVAS = JSON.parse(readFileSync(new URL("./references/canevas/catalogue.json", import.meta.url), "utf8")).canevas;
const empreinteDocumentDemo = d => createHash("sha256").update(JSON.stringify([d.contenu, d.updated_at, d.statut])).digest("hex");

const PORT = 8001;

// Données démo  :  extraites des seeders BEGPHARMA
const DEMO_USERS = {
  "promoteur@begpharma.bj": { id: "u1", name: "Dr. Anicet ANIAMBOSSOU", email: "promoteur@begpharma.bj", role: "promoteur", mfa: true, officines: ["off1","off2"] },
  "pharmacien@begpharma.bj": { id: "u2", name: "Dr. Marcelle HOUNNOU", email: "pharmacien@begpharma.bj", role: "pharmacien_titulaire", mfa: true, officines: ["off1"] },
  "dispensateur@begpharma.bj": { id: "u3", name: "Gervais KPADONOU", email: "dispensateur@begpharma.bj", role: "dispensateur", mfa: false, officines: ["off1"] },
  "agent.b@begpharma.bj": { id: "u4", name: "Utilisateur Officine B", email: "agent.b@begpharma.bj", role: "dispensateur", mfa: false, officines: ["off2"] },
};

const OFFICINES = [
  { id: "off1", nom: "Pharmacie de l'Étoile", raison_sociale: "Pharmacie de l'Étoile SARL", ville: "Cotonou", numero_licence: "BEN-OFF-2025-001", pivot: { role_code: "pharmacien_titulaire", actif: true } },
  { id: "off2", nom: "Pharmacie du Littoral", raison_sociale: "Pharmacie du Littoral SAS", ville: "Porto-Novo", numero_licence: "BEN-OFF-2025-002", pivot: { role_code: "dispensateur", actif: true } },
];

const officinesPour = user => OFFICINES.filter(o => user.officines.includes(o.id)).map(o => ({ ...o, pivot: { role_code: user.role, actif: true } }));

const PRODUITS = [
  { id: "p1", code_cip: "6170123456789", code_interne: "BEG-001", nom_commercial: "Paracétamol 500mg", dci: "Paracétamol", forme: "Comprimé", dosage: "500mg", laboratoire: "Sanofi", tableau_substance: "sans", classe_produit: "standard", groupe_taxation: "B_TAXABLE", est_thermolabile: false, prix_public_ttc: 1500, prix_achat_moyen: 900, stock_total: 120, seuil_stock_min: 10, prochain_lot_fefo: { id: "l1", numero_lot: "LOT-2026-001", date_peremption: "2027-06-15", quantite_disponible: 45, jours_avant_peremption: 210, statut_peremption: "normal" } },
  { id: "p2", code_cip: "6170123456790", nom_commercial: "Amoxicilline 1g", dci: "Amoxicilline", forme: "Gélule", dosage: "1g", laboratoire: "GSK", tableau_substance: "liste_1", classe_produit: "liste_1", groupe_taxation: "B_TAXABLE", est_thermolabile: false, prix_public_ttc: 3200, stock_total: 8, seuil_stock_min: 10, alerte_rupture: true },
  { id: "p3", code_cip: "6170123456791", nom_commercial: "Insuline Rapide", dci: "Insuline", forme: "Injectable", dosage: "100UI/ml", laboratoire: "Novo Nordisk", tableau_substance: "sans", classe_produit: "thermolabile", est_thermolabile: true, prix_public_ttc: 12500, stock_total: 15, seuil_stock_min: 5 },
  { id: "p4", code_cip: "6170123456792", nom_commercial: "Tramadol 50mg", dci: "Tramadol", forme: "Gélule", dosage: "50mg", laboratoire: "Pfizer", tableau_substance: "stupefiant", classe_produit: "stupefiant", est_thermolabile: false, prix_public_ttc: 4500, stock_total: 30 },
  { id: "p5", code_cip: "6170123456793", nom_commercial: "Diazépam 10mg", dci: "Diazépam", forme: "Comprimé", dosage: "10mg", laboratoire: "Roche", tableau_substance: "liste_2", classe_produit: "psychotrope", est_thermolabile: false, prix_public_ttc: 2800, stock_total: 22 },
];

const LOTS = [
  { id: "l1", produit_id: "p1", numero_lot: "LOT-2026-001", date_peremption: "2027-06-15", date_reception: "2026-10-20", quantite_disponible: 45, quantite_initiale: 50, emplacement: "Réserve  :  Stock principal", fournisseur_nom: "CAMEG BÉNIN", bon_livraison_ref: "BL-2026-1045", statut: "en_stock", statut_detail: "commercialisable", statut_effectif: "commercialisable", est_vendable: true, jours_avant_peremption: 210, statut_peremption: "normal", produit: PRODUITS[0] },
  { id: "l2", produit_id: "p1", numero_lot: "LOT-2026-002", date_peremption: "2026-12-10", date_reception: "2026-11-01", quantite_disponible: 12, quantite_initiale: 30, emplacement: "Comptoir  :  Délivrance", fournisseur_nom: "UBIPHARM BÉNIN", bon_livraison_ref: "BL-2026-1046", statut: "en_stock", statut_detail: "commercialisable", statut_effectif: "commercialisable", est_vendable: true, jours_avant_peremption: 28, statut_peremption: "critique_1m", produit: PRODUITS[0] },
  { id: "l3", produit_id: "p2", numero_lot: "LOT-2026-003", date_peremption: "2026-11-30", date_reception: "2026-09-15", quantite_disponible: 8, quantite_initiale: 20, emplacement: "Réserve  :  Stock principal", fournisseur_nom: "CAMEG BÉNIN", bon_livraison_ref: "BL-2026-1047", statut: "quarantaine", statut_detail: "quarantaine", statut_effectif: "quarantaine", est_vendable: false, motif_quarantaine: "Rappel lot fabricant  :  vérification ABMed", jours_avant_peremption: 18, statut_peremption: "critique_1m", produit: PRODUITS[1] },
  { id: "l4", produit_id: "p3", numero_lot: "LOT-2026-004", date_peremption: "2027-01-20", date_reception: "2026-11-02", quantite_disponible: 15, quantite_initiale: 15, emplacement: "Réfrigérateur 2°C–8°C", fournisseur_nom: "LABOREX BÉNIN", bon_livraison_ref: "BL-2026-1048", statut: "en_stock", statut_detail: "commercialisable", statut_effectif: "commercialisable", est_vendable: true, jours_avant_peremption: 68, statut_peremption: "alerte_3m", produit: PRODUITS[2] },
];

const EMPLACEMENTS = [
  { id: "e1", code: "COMPTOIR", libelle: "Comptoir  :  Délivrance", type_zone: "comptoir", lots_count: 1 },
  { id: "e2", code: "RESERVE", libelle: "Réserve  :  Stock principal", type_zone: "reserve", lots_count: 2 },
  { id: "e3", code: "FRIGO", libelle: "Réfrigérateur 2°C–8°C", type_zone: "frigo", lots_count: 1 },
  { id: "e4", code: "ARMOIRE", libelle: "Armoire sécurisée  :  Stupéfiants & Listes", type_zone: "armoire_securisee", lots_count: 0 },
  { id: "e5", code: "ATTENTE", libelle: "Zone d'attente de contrôle", type_zone: "attente_controle", lots_count: 0 },
  { id: "e6", code: "RETOURS", libelle: "Zone des retours fournisseur", type_zone: "retours", lots_count: 0 },
  { id: "e7", code: "DECHETS", libelle: "Aire des déchets sécurisée", type_zone: "dechets", lots_count: 0 },
];

const MOUVEMENTS = [
  { id: "m1", type_mouvement: "entree_reception", quantite: 50, stock_avant: 0, stock_apres: 50, motif: "Réception conforme  :  commercialisable", reference_piece: "BL-2026-1045", created_at: "2026-10-20T10:00:00Z", produit: PRODUITS[0], lot: LOTS[0], auteur: { name: "Dr. Marcelle HOUNNOU" } },
  { id: "m2", type_mouvement: "vente", quantite: -5, stock_avant: 50, stock_apres: 45, motif: "Vente FEFO  :  lot LOT-2026-001", reference_piece: "TICKET-2026-001", created_at: "2026-11-03T14:30:00Z", produit: PRODUITS[0], lot: LOTS[0], auteur: { name: "Gervais KPADONOU" } },
  { id: "m3", type_mouvement: "changement_statut", quantite: 0, stock_avant: 8, stock_apres: 8, motif: "Statut: commercialisable → quarantaine  :  Rappel lot fabricant", reference_piece: "RAPPEL-2026-0001", created_at: "2026-11-02T09:00:00Z", produit: PRODUITS[1], lot: LOTS[2], auteur: { name: "Dr. Anicet ANIAMBOSSOU" } },
];

const STUPEFIANTS = {
  data: {
    data: [
      { id: "s1", numero_ordre: 1, date_mouvement: "2026-11-01T09:00:00Z", type_mouvement: "entree_livraison", categorie: "stupefiant", quantite: 20, stock_precedent: 0, stock_nouveau: 20, reference_piece: "BL-2026-1045", tiers_nom: "CAMEG BÉNIN", prescripteur_nom: null, observations: "Entrée stock lot STUP-001 (FEFO)", produit: { nom_commercial: "Tramadol 50mg", dosage: "50mg", code_cip: "6170123456792" }, lot: { numero_lot: "STUP-001", date_peremption: "2027-03-01" }, operateur: { name: "Dr. Marcelle HOUNNOU" }, pharmacien_visa: null },
      { id: "s2", numero_ordre: 2, date_mouvement: "2026-11-03T11:00:00Z", type_mouvement: "sortie_dispensation", quantite: 5, stock_precedent: 20, stock_nouveau: 15, reference_piece: "ORD-2026-001", tiers_nom: "Patient A. K.", prescripteur_nom: "Dr. SOSSOU", observations: "Délivrance sur ordonnance", produit: { nom_commercial: "Tramadol 50mg", dosage: "50mg", code_cip: "6170123456792" }, lot: { numero_lot: "STUP-001", date_peremption: "2027-03-01" }, operateur: { name: "Gervais KPADONOU" }, pharmacien_visa: { name: "Dr. Marcelle HOUNNOU" } },
    ],
    total: 2, current_page: 1, per_page: 30
  },
  balance_produits: [
    { id: "p4", code_cip: "6170123456792", nom_commercial: "Tramadol 50mg", dosage: "50mg", stock_theorique_registre: 15, stock_physique_lots: 15, concordance_exacte: true, ecart: 0, non_vises_count: 1 },
    { id: "p5", code_cip: "6170123456793", nom_commercial: "Diazépam 10mg", dosage: "10mg", stock_theorique_registre: 0, stock_physique_lots: 0, concordance_exacte: true, ecart: 0, non_vises_count: 0 },
  ]
};

const PREPARATIONS = {
  data: {
    data: [
      { id: "pr1", numero_preparation: "PREP-2026-0001", nom_preparation: "Pâte à l'eau", type_preparation: "officinale", formule_detaillee: "Oxyde de zinc 20g, Talc 20g, Glycérine 20g, Eau purifiée qsp 100g", quantite_produite: "100g", conditionnement: "Pot hermétique", date_fabrication: "2026-11-01", date_limite_utilisation: "2026-12-01", patient_nom: null, prescripteur_nom: null, conforme: true, matieres_premieres_lots: [{ matiere: "Oxyde de zinc", lot: "MP-2026-012", fournisseur: "Cooper Bénin", quantite: "20 g", certificat: "CA-2026-014.pdf" }, { matiere: "Talc", lot: "MP-2026-009", fournisseur: "Cooper Bénin", quantite: "20 g", certificat: "CA-2026-009.pdf" }, { matiere: "Glycérine", lot: "MP-2026-021", fournisseur: "UBIPHARM", quantite: "20 g", certificat: "CA-2026-021.pdf" }], executant: { name: "Dr. Marcelle HOUNNOU" }, pharmacien_visa: { name: "Dr. Marcelle HOUNNOU" } },
      { id: "pr2", numero_preparation: "PREP-2026-0002", nom_preparation: "Sirop de Pholcodine", type_preparation: "magistrale", formule_detaillee: "Pholcodine 100mg, Saccharose, Arôme cerise, Eau purifiée qsp 200ml", quantite_produite: "200ml", conditionnement: "Flacon teinté hermétique", date_fabrication: "2026-11-03", date_limite_utilisation: "2026-11-17", patient_nom: "Enfant M. D.", prescripteur_nom: "Dr. ADJASSA", conforme: true, matieres_premieres_lots: [{ matiere: "Pholcodine", lot: "MP-2026-031", fournisseur: "LABOREX BÉNIN", quantite: "100 mg", certificat: "CA-2026-031.pdf" }, { matiere: "Saccharose", lot: "MP-2026-018", fournisseur: "CAMEG BÉNIN", quantite: "qsp 200 ml", certificat: " : " }], executant: { name: "Gervais KPADONOU" }, pharmacien_visa: null },
    ],
    total: 2
  }
};

// ─── INVENTAIRES (STO-12)
const INVENTAIRES = {
  data: [
    {
      id: "inv1",
      reference: "INV-2026-0001",
      type: "tournant",
      zone: "Réserve  :  Stock principal",
      statut: "en_cours",
      Parametres: { double_comptage: true, comptage_aveugle: false },
      date_inventaire: "2026-11-04",
      initiateur: { name: "Dr. Marcelle HOUNNOU" },
      lignes_count: 3,
      lignes: [
        { id: "li1", produit_id: "p1", stock_lot_id: "l1", quantite_theorique: 45, quantite_comptee: 44, ecart: -1, valorisation_ecart: -900, commentaire: "Une boîte ouverte constatée", produit: { nom_commercial: "Paracétamol 500mg", code_cip: "6170123456789" }, lot: { numero_lot: "LOT-2026-001", date_peremption: "2027-06-15" } },
        { id: "li2", produit_id: "p2", stock_lot_id: "l3", quantite_theorique: 8, quantite_comptee: null, ecart: null, valorisation_ecart: null, commentaire: null, produit: { nom_commercial: "Amoxicilline 1g", code_cip: "6170123456790" }, lot: { numero_lot: "LOT-2026-003", date_peremption: "2026-11-30" } },
        { id: "li3", produit_id: "p3", stock_lot_id: "l4", quantite_theorique: 15, quantite_comptee: 15, ecart: 0, valorisation_ecart: 0, commentaire: null, produit: { nom_commercial: "Insuline Rapide", code_cip: "6170123456791" }, lot: { numero_lot: "LOT-2026-004", date_peremption: "2027-01-20" } },
      ],
    },
    {
      id: "inv0",
      reference: "INV-2026-0000",
      type: "general_annuel",
      zone: null,
      statut: "valide",
      date_inventaire: "2026-09-30",
      initiateur: { name: "Dr. Anicet ANIAMBOSSOU" },
      lignes_count: 2,
      lignes: [
        { id: "li10", produit_id: "p1", stock_lot_id: "l2", quantite_theorique: 12, quantite_comptee: 12, ecart: 0, valorisation_ecart: 0, commentaire: null, produit: { nom_commercial: "Paracétamol 500mg", code_cip: "6170123456789" }, lot: { numero_lot: "LOT-2026-002", date_peremption: "2026-12-10" } },
        { id: "li11", produit_id: "p3", stock_lot_id: "l4", quantite_theorique: 15, quantite_comptee: 15, ecart: 0, valorisation_ecart: 0, commentaire: null, produit: { nom_commercial: "Insuline Rapide", code_cip: "6170123456791" }, lot: { numero_lot: "LOT-2026-004", date_peremption: "2027-01-20" } },
      ],
    },
  ],
  total: 2,
};

// ─── AVIS DE RAPPEL (STO-14)
const RAPPELS = {
  data: [
    {
      id: "rap1",
      reference: "RAPPEL-2026-0001",
      source: "ABMed  :  Agence béninoise de régulation pharmaceutique",
      produits_concernes: "Amoxicilline 1g  :  GSK",
      lots_concernes: [{ produit_id: "p2", numero_lot: "LOT-2026-003" }],
      date_avis: "2026-11-02",
      action_requise: "Retrait immédiat de la vente, isolement en quarantaine et retour au grossiste.",
      statut: "actif",
      auteur: { name: "Dr. Anicet ANIAMBOSSOU" },
      date_cloture: null,
      preuve_cloture: null,
    },
  ],
  total: 1,
};

// ─── DÉCHETS (STO-17)
const DECHETS = {
  data: [
    {
      id: "dec1",
      reference: "DECHET-2026-0001",
      motif: "perime",
      lots_originels: [{ id: "l9", numero_lot: "LOT-2025-118", quantite: 6 }],
      quantite_totale: 6,
      valeur_perte: 5400,
      zone_stockage: "Aire des déchets sécurisée",
      statut: "en_attente_prestataire",
      prestataire_nom: "SANOFI-DÉCHETS Cotonou",
      date_destruction_prevue: "2026-11-12",
      date_destruction_reelle: null,
      constitue_par: { name: "Gervais KPADONOU" },
    },
  ],
  total: 1,
};

// ─── CAISSE & VENTES
const SESSIONS_CAISSE = [
  {
    id: "sess1",
    numero_session: "CAISSE-2026-0021",
    statut: "ouverte",
    fond_caisse_ouverture: 20000,
    fond_caisse_fermeture_reel: null,
    fond_caisse_fermeture_theorique: null,
    ecart_caisse: null,
    opened_at: "2026-11-04T07:30:00Z",
    closed_at: null,
    caissier: { id: "u3", name: "Gervais KPADONOU" },
    ventes: [],
  },
];

const VENTES = [
  {
    id: "v1",
    numero_ticket: "TICKET-2026-0142",
    date_vente: "2026-11-04T10:12:00Z",
    client_nom: "Client comptoir",
    client_ifu: null,
    mode_reglement: "especes",
    montant_total: 4500,
    montant_recu: 5000,
    monnaie_rendue: 500,
    caissier: { id: "u3", name: "Gervais KPADONOU" },
    lignes: [
      { id: "vl1", produit_id: "p1", quantite: 2, prix_unitaire_ttc: 1500, montant_ligne: 3000, produit: { nom_commercial: "Paracétamol 500mg", dosage: "500mg" } },
      { id: "vl2", produit_id: "p5", quantite: 1, prix_unitaire_ttc: 1500, montant_ligne: 1500, produit: { nom_commercial: "Diazépam 10mg", dosage: "10mg" } },
    ],
    facture_emecef: { numero_facture: "DGI-2026-001234", qr_code_data: "BEN-DGI|MECEF|2026|001234|4500" },
  },
];

const FACTURES_EMECEF = [
  {
    id: "f1",
    numero_facture: "DGI-2026-001234",
    vente_id: "v1",
    montant_total: 4500,
    regime_tva: "B_TAXABLE",
    statut_dgi: "certifiee",
    qr_code_data: "BEN-DGI|MECEF|2026|001234|4500",
    date_certification: "2026-11-04T10:12:05Z",
    vente: {
      numero_ticket: "TICKET-2026-0142",
      montant_total: 4500,
      caissier: { name: "Gervais KPADONOU" },
      lignes: [
        { id: "vl1", quantite: 2, prix_unitaire_ttc: 1500, produit: { nom_commercial: "Paracétamol 500mg" } },
      ],
    },
  },
];

const ECRITURES = [
  { id: "ec1", numero_compte: "571100", libelle_compte: "Caisse espèces", date_piece: "2026-11-04", libelle_piece: "Vente comptoir TICKET-2026-0142", debit: 4500, credit: 0 },
  { id: "ec2", numero_compte: "701000", libelle_compte: "Ventes de marchandises", date_piece: "2026-11-04", libelle_piece: "Vente comptoir TICKET-2026-0142", debit: 0, credit: 4500 },
];

// ─── DISPENSATIONS
const DISPENSATIONS = [
  {
    id: "disp1",
    officine_id: "off1",
    numero_dispensation: "DISP-2026-0007",
    type_dispensation: "ordonnance",
    patient_nom: "Adjoua KOUGBADO",
    patient_age: 34,
    patient_telephone: "+229 97 21 45 63",
    prescripteur_nom: "Dr. Sémèvo ADJOVI",
    prescripteur_titre: "Dr",
    prescripteur_centre: "CNHU-HKM Cotonou",
    montant_total: 3200,
    statut: "delivree",
    date_dispensation: "2026-11-03T09:40:00Z",
    commentaires_posologie: "Traitement au cours des repas",
    lignes: [
      { id: "dl1", produit_id: "p2", quantite: 1, posologie: "1 gélule matin et soir", duree_traitement: "7 jours", produit: { nom_commercial: "Amoxicilline 1g", dosage: "1g" } },
    ],
  },
];

// ─── PERSONNEL, QUALITÉ, ÉCHÉANCES
const EMPLOYES = [
  { id: "emp1", nom_complet: "Dr. Marcelle HOUNNOU", poste: "pharmacien_titulaire", telephone: "+229 97 45 12 30", actif: true, date_embauche: "2021-03-01", date_visite_medicale: "2026-03-12", pin_code: "1234" },
  { id: "emp2", nom_complet: "Gervais KPADONOU", poste: "dispensateur", telephone: "+229 96 22 87 41", actif: true, date_embauche: "2023-01-09", date_visite_medicale: "2026-01-20", pin_code: "2345" },
  { id: "emp3", nom_complet: "Sabine AGBODJAN", poste: "caissier", telephone: "+229 95 14 66 02", actif: true, date_embauche: "2024-06-17", date_visite_medicale: "2025-11-28", pin_code: "3456" },
  { id: "emp4", nom_complet: "Ismaël DOSSOU", poste: "agent_entretien", telephone: "+229 94 70 31 18", actif: false, date_embauche: "2022-08-02", date_visite_medicale: "2025-09-15", pin_code: "4567" },
];

const INSCRIPTIONS_ORDRE = {
  emp1: { numero_inscription: "PHB-2019-0417", statut: "a_jour" },
  emp2: { numero_inscription: "PHB-2022-1180", statut: "a_jour" },
};

const POINTAGES = [
  { id: "pt1", employe_id: "emp1", employe_nom: "Dr. Marcelle HOUNNOU", employe_poste: "pharmacien_titulaire", type: "arrivee", horodatage: "2026-11-04T07:28:00Z" },
  { id: "pt2", employe_id: "emp2", employe_nom: "Gervais KPADONOU", employe_poste: "dispensateur", type: "arrivee", horodatage: "2026-11-04T07:45:00Z" },
];

const EQUIPEMENTS = [
  { id: "eq1", code_interne: "FRIG-01", designation: "Réfrigérateur Médical Thermolabiles", categorie: "refrigerateur", marque_modele: "Dometic HC302", emplacement: "Réserve", numero_serie: "DMT-88412", periodicite_etalonnage_mois: 12, date_acquisition: "2024-01-15", date_dernier_etalonnage: "2026-01-15", certificat_ref: "CERT-ET-2026-004", statut: "en_service" },
  { id: "eq2", code_interne: "BAL-01", designation: "Balance de précision 0,01 g", categorie: "balance", marque_modele: "Sartorius Entris", emplacement: "Préparatoire", numero_serie: "SAR-55201", periodicite_etalonnage_mois: 12, date_acquisition: "2023-05-04", date_dernier_etalonnage: "2026-05-06", certificat_ref: "CERT-ET-2026-019", statut: "en_service" },
  { id: "eq3", code_interne: "THM-01", designation: "Thermomètre enregistreur", categorie: "thermometre", marque_modele: "Testo 175T3", emplacement: "Réfrigérateur", numero_serie: "TS-19482", periodicite_etalonnage_mois: 12, date_acquisition: "2025-02-11", date_dernier_etalonnage: "2026-02-11", certificat_ref: "CERT-ET-2026-027", statut: "en_service" },
];

const NETTOYAGES = [
  { id: "nt1", zone: "comptoir", frequence: "quotidien", produit_utilise: "Détergent désinfectant ANIOS", conforme: true, date_heure: "2026-11-04T18:10:00Z", agent: { name: "Ismaël DOSSOU" }, visa: { name: "Dr. Marcelle HOUNNOU" } },
  { id: "nt2", zone: "preparatoire", frequence: "quotidien", produit_utilise: "Alcool 70°", conforme: true, date_heure: "2026-11-03T18:05:00Z", agent: { name: "Ismaël DOSSOU" }, visa: null },
];

const RELEVES_TEMPERATURE = [
  { id: "rt1", zone: "refrigeree_2_8", moment: "matin", temperature: 5.2, humidite: 58, date_releve: "2026-11-04", heure_releve: "08:00:00", statut_conformite: "conforme", notes: null, agent: { name: "Gervais KPADONOU" } },
  { id: "rt2", zone: "magasin_reserve", moment: "matin", temperature: 24.1, humidite: 62, date_releve: "2026-11-04", heure_releve: "08:05:00", statut_conformite: "conforme", notes: null, agent: { name: "Gervais KPADONOU" } },
  { id: "rt3", zone: "hall_dispensation", moment: "matin", temperature: 25.4, humidite: 60, date_releve: "2026-11-04", heure_releve: "08:10:00", statut_conformite: "conforme", notes: null, agent: { name: "Gervais KPADONOU" } },
  { id: "rt4", zone: "refrigeree_2_8", moment: "soir", temperature: 9.6, humidite: 61, date_releve: "2026-11-03", heure_releve: "18:00:00", statut_conformite: "excursion_chaud", notes: "Porte laissée entrouverte", agent: { name: "Ismaël DOSSOU" } },
];

const NON_CONFORMITES = [
  { id: "nc1", numero_nc: "NC-2026-0011", titre: "Excursion de température du réfrigérateur", description: "Relevé du soir à 9,6 °C, au-delà de la plage 2–8 °C.", gravite: "majeure", processus: "5.20", source: "releve_temperature", statut: "en_cours", action_immediate: "Transfert des thermolabiles vers le réfrigérateur de secours", action_preventive: null, analyse_causes_5m: "Porte laissée entrouverte lors du rangement", responsable_action: "Dr. Marcelle HOUNNOU", date_echeance_capa: "2026-11-18", date_creation: "2026-11-04T06:40:00Z" },
  { id: "nc2", numero_nc: "NC-2026-0010", titre: "Étiquette de lot illisible en réserve", description: null, gravite: "mineure", processus: "5.12", source: "auto_evaluation", statut: "ouverte", action_immediate: null, action_preventive: null, analyse_causes_5m: null, responsable_action: null, date_echeance_capa: null, date_creation: "2026-11-02T15:15:00Z" },
  { id: "nc3", numero_nc: "NC-2026-0009", titre: "Registre de nettoyage non visé", description: null, gravite: "critique", processus: "5.20", source: "audit_interne", statut: "cloturee", action_immediate: "Visa du pharmacien rattrapé le jour même", action_preventive: "Rappel du circuit de visa à l'agent d'entretien", analyse_causes_5m: "Absence du pharmacien lors du pointage du soir", responsable_action: "Dr. Marcelle HOUNNOU", date_echeance_capa: "2026-10-30", date_creation: "2026-10-27T19:00:00Z" },
];

const GUIDE_COMPLET = JSON.parse(readFileSync(new URL("./references/abmed/extraction/articles-a-relire.json", import.meta.url), "utf8"));
const TITRES_CHAPITRES = ["Système de management de la qualité", "Personnel", "Documentation", "Locaux et équipements", "Approvisionnement", "Sous-traitance", "Dispensation", "Gestion des retours, réclamations, retraits et rappels de lots", "Destruction des déchets pharmaceutiques", "Auto-inspection et audit interne"];
const PROCESSUS_CHAPITRES = ["TAM", "GAR", "QAM", "GAR", "GAC", "TAM", "GAD", "GAD", "GAC", "QAM"];
const CHAPITRES_BPD = TITRES_CHAPITRES.map((titre, i) => ({ numero: i + 1, titre, processus: PROCESSUS_CHAPITRES[i], total_articles: GUIDE_COMPLET.repartition[i + 1] }));
function nouvelleGrilleComplete(officine) {
  const evaluations = GUIDE_COMPLET.articles.map((a, i) => ({ id: `ev${i + 1}`, article_numero: a.numero, article_libelle: a.texte_extrait,
    chapitre_numero: a.chapitre, chapitre_titre: TITRES_CHAPITRES[a.chapitre - 1], processus: PROCESSUS_CHAPITRES[a.chapitre - 1],
    cotation: "non_evalue", preuve: null, commentaire: null, non_conformite: null }));
  return { mode_demo: true, referentiel_complet: true, texte_a_relire: true, campagne: { id: "ae-" + officine, titre: "Auto-évaluation complète", annee: 2026, statut: "en_cours", score_global: 0, date_debut: "2026-11-06" }, evaluations, statistiques: {}, synthese_chapitres: [] };
}
function recalculerGrille(grille) {
  const e = grille.evaluations;
  const count = (c, list = e) => list.filter(a => a.cotation === c).length;
  const score = list => { const applicables = list.filter(a => !["non_evalue", "non_applicable"].includes(a.cotation)); return applicables.length ? Math.round((count("conforme", applicables) + count("ecart_mineur", applicables) * .5) / applicables.length * 1000) / 10 : 0; };
  grille.statistiques = { total_articles: e.length, score_global: score(e), total_conformes: count("conforme"), total_ecarts_mineurs: count("ecart_mineur"), total_ecarts_majeurs: count("ecart_majeur"), total_non_applicables: count("non_applicable"), total_non_evalues: count("non_evalue") };
  grille.campagne.score_global = score(e);
  grille.synthese_chapitres = CHAPITRES_BPD.map(ch => { const list = e.filter(a => a.chapitre_numero === ch.numero); return { ...ch, evalues: list.filter(a => a.cotation !== "non_evalue").length, conformes: count("conforme", list), ecarts_mineurs: count("ecart_mineur", list), ecarts_majeurs: count("ecart_majeur", list), score_chapitre: score(list) }; });
}
const GRILLES_COMPLETES = new Map();

const MODELES_BPD = [
  { id: "mod1", code_document: "BPD10-F01", titre: "Fiche de fonction du pharmacien titulaire", type_document: "procédure", categorie: "personnel", processus: "01", indice_revision: "02", redacteur_nom: "Dr. Anicet ANIAMBOSSOU", contenu: null },
  { id: "mod2", code_document: "BPD10-F07", titre: "Fiche de non-conformité et plan CAPA", type_document: "enregistrement", categorie: "qualité", processus: "06", indice_revision: "03", redacteur_nom: "Dr. Marcelle HOUNNOU", contenu: null },
  { id: "mod3", code_document: "BPD10-F12", titre: "Registre des relevés de température", type_document: "enregistrement", categorie: "locaux", processus: "05", indice_revision: "01", redacteur_nom: "Gervais KPADONOU", contenu: null },
];

const DOCUMENTS = [
  { id: "doc1", code_document: "PRO-001", titre: "Procédure de réception des lots et contrôles", type_doc: "procedure", processus: "05", statut: "valide", version: 3, approbateur_nom: "Dr. Marcelle HOUNNOU", approuve_le: "2026-09-12", updated_at: "2026-09-12T10:00:00Z" },
  { id: "doc2", code_document: "ENR-014", titre: "Registre de nettoyage des locaux", type_doc: "enregistrement", processus: "05", statut: "en_attente_validation", version: 1, approbateur_nom: null, approuve_le: null, updated_at: "2026-11-02T16:20:00Z" },
  { id: "doc3", code_document: "PRO-008", titre: "Procédure de gestion des rappels de lots", type_doc: "procedure", processus: "09", statut: "brouillon", version: 1, approbateur_nom: null, approuve_le: null, updated_at: "2026-10-28T09:30:00Z" },
];

const ECHEANCES = [
  { id: "ech1", titre: "Renouvellement de la licence d'exploitation", categorie: "reglementaire", date_echeance: "2026-11-20", fait: false },
  { id: "ech2", titre: "Étalonnage annuel du réfrigérateur", categorie: "equipement", date_echeance: "2026-11-10", fait: false },
  { id: "ech3", titre: "Visite médicale de Sabine AGBODJAN", categorie: "personnel", date_echeance: "2026-12-05", fait: false },
  { id: "ech4", titre: "Formation annuelle BPD de l'équipe", categorie: "formation", date_echeance: "2026-10-30", fait: true },
];

const PARAMETRES = [
  { id: "par1", cle: "fuseau_horaire", libelle: "Fuseau horaire", type: "texte", valeur: "Africa/Porto-Novo", unite: null, description: "Fuseau horaire officiel du Bénin", version: 1, updated_at: "2026-10-01T08:00:00Z" },
  { id: "par2", cle: "devise", libelle: "Devise", type: "texte", valeur: "XOF", unite: null, description: "Devise en francs CFA sans décimale", version: 1, updated_at: "2026-10-01T08:00:00Z" },
  { id: "par3", cle: "delai_inactivite_minutes", libelle: "Verrouillage après inactivité", type: "nombre", valeur: 15, unite: "minutes", description: "Verrouillage automatique après inactivité", version: 2, updated_at: "2026-10-22T14:10:00Z" },
  { id: "par4", cle: "tolerance_pointage_minutes", libelle: "Tolérance de pointage", type: "nombre", valeur: 10, unite: "minutes", description: "Retard toléré avant signalement", version: 1, updated_at: "2026-10-01T08:00:00Z" },
  { id: "par5", cle: "mode_presence_pharmacien", libelle: "Absence de pharmacien", type: "texte", valeur: "alerte", unite: null, description: "Comportement en cas d'absence de pharmacien : alerte ou blocage", version: 1, updated_at: "2026-10-01T08:00:00Z" },
  { id: "par6", cle: "conservation_registres_ans", libelle: "Conservation des registres", type: "nombre", valeur: 10, unite: "ans", description: "Durée minimale de conservation légale", version: 1, updated_at: "2026-10-01T08:00:00Z" },
  { id: "par7", cle: "alerte_stock_minimum", libelle: "Alerte stock minimum", type: "booleen", valeur: true, unite: null, description: "Notifier le pharmacien dès qu'un produit passe sous son seuil", version: 1, updated_at: "2026-10-01T08:00:00Z" },
];

const APPAREILS = [
  { id: "dev1", name: "Chrome · Windows", is_current: true, last_used_at: "2026-11-04T09:40:00Z", created_at: "2026-10-01T08:00:00Z" },
  { id: "dev2", name: "Safari · iOS", is_current: false, last_used_at: "2026-11-02T17:20:00Z", created_at: "2026-09-18T11:05:00Z" },
];

const AUDIT_LOGS = [
  { id: 41, table_name: "stocks_lots", table_libelle: "Lot de stock", record_id: "l3", action: "UPDATE", user_id: "u1", user_email: "promoteur@begpharma.bj", old_data: { statut_detail: "commercialisable" }, new_data: { statut_detail: "quarantaine" }, ip_address: "197.234.10.12", server_timestamp: "2026-11-02T09:00:00Z" },
  { id: 40, table_name: "officine_parametres", table_libelle: "Paramètres de l'officine", record_id: "par3", action: "UPDATE", user_id: "u1", user_email: "promoteur@begpharma.bj", old_data: { valeur: 30 }, new_data: { valeur: 15 }, ip_address: "197.234.10.12", server_timestamp: "2026-10-22T14:10:00Z" },
  { id: 39, table_name: "documents", table_libelle: "Document qualité", record_id: "doc1", action: "UPDATE", user_id: "u2", user_email: "pharmacien@begpharma.bj", old_data: { statut: "en_attente_validation" }, new_data: { statut: "valide" }, ip_address: "197.234.10.45", server_timestamp: "2026-09-12T10:00:00Z" },
  { id: 38, table_name: "lots_dechets", table_libelle: "Lot de déchets", record_id: "dec1", action: "INSERT", user_id: "u3", user_email: "dispensateur@begpharma.bj", old_data: null, new_data: { reference: "DECHET-2026-0001", statut: "en_attente_prestataire" }, ip_address: "197.234.10.47", server_timestamp: "2026-10-30T16:45:00Z" },
  { id: 37, table_name: "echeances", table_libelle: "Échéance", record_id: "ech4", action: "UPDATE", user_id: "u2", user_email: "pharmacien@begpharma.bj", old_data: { fait: false }, new_data: { fait: true }, ip_address: "197.234.10.45", server_timestamp: "2026-10-30T12:00:00Z" },
];

/** Journal d'audit filtrable (table, action, période) au format paginateur Laravel. */
function filtrerJournal(url) {
  let lignes = [...AUDIT_LOGS];
  const table = url.searchParams.get("table_name");
  const action = url.searchParams.get("action");
  const depuis = url.searchParams.get("date_from");
  const jusqua = url.searchParams.get("date_to");
  if (table) lignes = lignes.filter((l) => l.table_name === table);
  if (action) lignes = lignes.filter((l) => l.action === action.toUpperCase());
  if (depuis) lignes = lignes.filter((l) => l.server_timestamp >= depuis);
  if (jusqua) lignes = lignes.filter((l) => l.server_timestamp <= jusqua);
  return paginer(lignes, url.searchParams.get("page") || 1, url.searchParams.get("per_page") || 50);
}

function sendJson(res, status, data) {
  if (status >= 200 && status < 300 && !["GET", "HEAD", "OPTIONS"].includes(res.req?.method)) {
    try { conserverDemo(); }
    catch (e) { console.error("Conservation locale de démonstration impossible", e); status = 503; data = {message: "L’enregistrement local de l’aperçu n’a pas pu être confirmé. Réessayez avant de fermer la page."}; }
  }
  if (status >= 400) console.warn(`[MOCK] Réponse ${status} : ${(res.req?.url || "").split("?")[0]}`);
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise(resolve => {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); }
    });
  });
}

/** Utilisateur démo correspondant au jeton porteur (défaut : promoteur). */
function utilisateurCourant(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  return Object.values(DEMO_USERS).find(u => token === "demo-token-" + u.id);
}

const OFFICINE_COURANTE = OFFICINES[0];

/** Paginateur Laravel minimal. */
function paginer(lignes, page = 1, parPage = 30) {
  const debut = (page - 1) * parPage;
  return {
    current_page: Number(page),
    data: lignes.slice(debut, debut + parPage),
    first_page_url: `http://localhost:${PORT}/?page=1`,
    from: lignes.length ? debut + 1 : null,
    last_page: Math.max(1, Math.ceil(lignes.length / parPage)),
    per_page: parPage,
    to: Math.min(debut + parPage, lignes.length),
    total: lignes.length,
  };
}

// Conservation locale de l’aperçu uniquement, sans valeur de conservation réglementaire.
const FICHIER_DEMO = fileURLToPath(new URL('./.demo-state/session.json', import.meta.url));
const etatDemo = lireEtatDemo(FICHIER_DEMO);
if (etatDemo) {
  for (const u of etatDemo.utilisateurs) DEMO_USERS[u.email] = u;
  OFFICINES.splice(0, OFFICINES.length, ...etatDemo.officines);
  DOCUMENTS.push(...etatDemo.documents);
}
function conserverDemo() {
  ecrireEtatDemo(FICHIER_DEMO, {utilisateurs: Object.values(DEMO_USERS), officines: OFFICINES, documents: DOCUMENTS.filter(d => d.mode_demo)});
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    });
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;
  const officineEvaluation = path.match(/^\/api\/officines\/([^/]+)\/auto-evaluation\//)?.[1];
  let AUTO_EVALUATION;
  if (officineEvaluation) {
    const token = (req.headers.authorization || "").replace(/^Bearer /, "");
    const utilisateur = Object.values(DEMO_USERS).find(u => token === "demo-token-" + u.id);
    if (!utilisateur) return sendJson(res, 401, { message: "Connexion requise." });
    if (!utilisateur.officines.includes(officineEvaluation)) return sendJson(res, 403, { message: "Officine non autorisée." });
    if (method !== "GET" && !["promoteur", "pharmacien_titulaire", "pharmacien_adjoint", "rmq"].includes(utilisateur.role)) return sendJson(res, 403, { message: "Modification réservée aux responsables habilités." });
    if (!GRILLES_COMPLETES.has(officineEvaluation)) GRILLES_COMPLETES.set(officineEvaluation, nouvelleGrilleComplete(officineEvaluation));
    AUTO_EVALUATION = GRILLES_COMPLETES.get(officineEvaluation);
    recalculerGrille(AUTO_EVALUATION);
    if (path.endsWith("/nouvelle-complete") && method === "POST") return sendJson(res, 201, { id: AUTO_EVALUATION.campagne.id });
  }

  console.log(`[MOCK] ${method} ${path}`);

  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/canevas(?:\/([a-f0-9]+)(\/documents)?)?$/);
    if (m) {
      const token = (req.headers.authorization || "").replace(/^Bearer /, "");
      const u = Object.values(DEMO_USERS).find(u => token === "demo-token-" + u.id);
      if (!u) return sendJson(res, 401, { message: "Connexion requise." });
      if (!u.officines.includes(m[1])) return sendJson(res, 403, { message: "Officine non autorisée." });
      if (!m[2] && method === "GET") return sendJson(res, 200, CANEVAS.map(({ id, titre, rubrique, fichier, sha256, usage, format }) => ({ id, titre, rubrique, fichier, sha256, usage, format })));
      const c = CANEVAS.find(c => c.id === m[2]);
      if (!c) return sendJson(res, 404, { message: "Canevas introuvable." });
      if (!m[3] && method === "GET") return sendJson(res, 200, c);
      if (m[3] && method === "POST") {
        if (c.usage === "reference") return sendJson(res, 422, {message: "Ce document annoté est une référence à consulter, pas un formulaire à remplir."});
        if (!["promoteur", "pharmacien_titulaire", "pharmacien_adjoint", "rmq"].includes(u.role)) return sendJson(res, 403, { message: "Création réservée aux responsables habilités." });
        const b = await parseBody(req);
        if (!b.valeurs || typeof b.valeurs !== "object" || Array.isArray(b.valeurs) || !["TAM", "QAM", "GAD", "GAC", "GAR"].includes(b.processus) || !["procedure", "enregistrement", "fiche_poste"].includes(b.type_doc)) return sendJson(res, 422, { message: "Vérifiez la nature, le processus et les zones du canevas." });
        const cles = new Set();
        const visiter = blocs => blocs.forEach(bloc => { if (bloc.type === "paragraphe") cles.add(bloc.cle); else bloc.lignes.forEach(l => l.forEach(cell => { cles.add(cell.cle); visiter(cell.imbriques || []); })); });
        c.parties.forEach(p => visiter(p.blocs));
        if (Object.entries(b.valeurs).some(([k, v]) => !cles.has(k) || typeof v !== "string" || v.length > 30000)) return sendJson(res, 422, { message: "Zone du canevas invalide." });
        const doc = { id: randomUUID(), officine_id: m[1], titre: c.titre, code_document: "CAN-" + randomUUID().slice(0, 8), type_doc: b.type_doc, processus: b.processus,
          contenu: JSON.stringify({ schema: "begpharma.canevas-rempli.v1", canevas: c, valeurs: recalculerCanevas(c, b.valeurs) }), statut: "brouillon", version: 1, indice_revision: 0, redacteur_nom: u.name, updated_at: new Date().toISOString(), mode_demo: true };
        doc.empreinte_contenu = empreinteDocumentDemo(doc);
        DOCUMENTS.unshift(doc); return sendJson(res, 201, doc);
      }
    }
  }
  if (path.startsWith("/api/") && !["/api/auth/login", "/api/auth/register", "/api/auth/verify-mfa", "/api/demo/access"].includes(path) && !utilisateurCourant(req)) return sendJson(res, 401, {message: "Reconnectez-vous pour ouvrir votre espace de travail."});
  const jour = new Date().toLocaleDateString("sv-SE", {timeZone: "Africa/Porto-Novo"});
  for (const l of LOTS) {
    l.jours_avant_peremption = Math.round((Date.parse(l.date_peremption) - Date.parse(jour))/86400000);
    l.est_vendable = (l.statut_detail || (l.statut === "en_stock" ? "commercialisable" : l.statut)) === "commercialisable" && l.quantite_disponible > 0 && l.date_peremption > jour;
    l.statut_peremption = l.jours_avant_peremption <= 0 ? "perime" : l.jours_avant_peremption <= 30 ? "critique_1m" : l.jours_avant_peremption <= 90 ? "alerte_3m" : l.jours_avant_peremption <= 180 ? "attention_6m" : "normal";
  }
  for (const p of PRODUITS) {
    const lots = LOTS.filter(l => l.produit_id === p.id && l.est_vendable).sort((a,b) => a.date_peremption.localeCompare(b.date_peremption));
    p.stock_total = lots.reduce((n,l) => n + l.quantite_disponible, 0);
    p.prochain_lot_fefo = lots.length ? { id: lots[0].id, numero_lot: lots[0].numero_lot, date_peremption: lots[0].date_peremption, quantite_disponible: lots[0].quantite_disponible, jours_avant_peremption: lots[0].jours_avant_peremption, statut_peremption: lots[0].statut_peremption } : null;
  }
  if (/^\/api\/officines\/[^/]+\/documents(?:\/|$)/.test(path)) {
    const token = (req.headers.authorization || "").replace(/^Bearer /, "");
    const utilisateur = Object.values(DEMO_USERS).find(u => token === "demo-token-" + u.id);
    if (!utilisateur) return sendJson(res, 401, { message: "Connexion requise." });
    if (!utilisateur.officines.includes(path.split("/")[3])) return sendJson(res, 403, { message: "Officine non autorisée." });
    if (method !== "GET" && !["promoteur", "pharmacien_titulaire", "pharmacien_adjoint", "rmq"].includes(utilisateur.role)) return sendJson(res, 403, { message: "Modification réservée aux responsables habilités." });
  }
  // AUTH  :  login
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/suivis-documentaires\/(formations|maintenance)(?:\/(definition|[a-f0-9-]+))?$/);
    if (m) {
      const token = (req.headers.authorization || "").replace(/^Bearer /, "");
      const utilisateur = Object.values(DEMO_USERS).find(u => token === "demo-token-" + u.id);
      if (!utilisateur) return sendJson(res, 401, { message: "Connexion requise." });
      if (!utilisateur.officines.includes(m[1])) return sendJson(res, 403, { message: "Officine non autorisée." });
      const definition = CATALOGUE_SUIVIS[m[2]];
      const ecrire = ["promoteur", "pharmacien_titulaire", "pharmacien_adjoint", "rmq"].includes(utilisateur.role);
      if (m[3] === "definition" && method === "GET") return sendJson(res, 200, {
        ...definition, peut_ecrire: ecrire, mode_demo: true,
        equipements: m[2] === "maintenance" && m[1] === "off1" ? EQUIPEMENTS.map(e => ({ id: e.id, designation: e.designation, code_interne: e.code_interne })) : [],
      });
      if (!m[3] && method === "GET") {
        let lignes = SUIVIS_DOCUMENTAIRES.filter(r => r.officine_id === m[1] && r.type === m[2]);
        const annee = url.searchParams.get("annee"), statut = url.searchParams.get("statut"), q = url.searchParams.get("q");
        if (annee) lignes = lignes.filter(r => String(r.donnees[definition.champ_date] || "").startsWith(annee + "-"));
        if (statut) lignes = lignes.filter(r => r.statut === statut);
        if (q) lignes = lignes.filter(r => String(r.donnees[definition.champ_titre] || "").toLowerCase().includes(q.toLowerCase()));
        return sendJson(res, 200, paginer(lignes, Number(url.searchParams.get("page")) || 1, 25));
      }
      if (method === "POST" || method === "PUT") {
        if (!ecrire) return sendJson(res, 403, { message: "Modification réservée aux responsables habilités." });
        const b = await parseBody(req);
        if (!["planifie", "realise", "annule"].includes(b.statut) || !b.donnees) return sendJson(res, 422, { message: "État et champs du formulaire requis." });
        if (Array.isArray(b.donnees) || typeof b.donnees !== "object") return sendJson(res, 422, { message: "Formulaire invalide." });
        const cles = [...definition.champs.map(c => c.cle), "motif_annulation"];
        if (Object.keys(b.donnees).some(c => !cles.includes(c))) return sendJson(res, 422, { message: "Un champ du formulaire n’est pas autorisé." });
        for (const champ of definition.champs) {
          const v = b.donnees[champ.cle];
          if (v != null && (typeof v !== "string" || v.length > 5000)) return sendJson(res, 422, { message: `Champ invalide : ${champ.libelle}.` });
          if (v && champ.type === "date" && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v)) return sendJson(res, 422, { message: `Date invalide : ${champ.libelle}.` });
          if ((champ.obligatoire || (champ.obligatoire_realise && b.statut === "realise")) && !String(b.donnees[champ.cle] || "").trim()) {
            return sendJson(res, 422, { message: `Champ requis : ${champ.libelle}.` });
          }
        }
        if (b.statut === "annule" && !b.donnees.motif_annulation) return sendJson(res, 422, { message: "Motif d’annulation requis." });
        const aujourdHui = new Date().toLocaleDateString("sv-SE", { timeZone: "Africa/Porto-Novo" });
        const d = b.donnees;
        if ((d.date_realisation && d.date_realisation > aujourdHui) || (d.date_fin_prevue && d.date_fin_prevue < d.date_debut_prevue) || (d.date_prochaine_intervention && d.date_prochaine_intervention < (d.date_realisation || d.date_prevue))) return sendJson(res, 422, { message: "Vérifiez l’ordre chronologique et la date de réalisation." });
        const donnees = Object.fromEntries([...definition.champs.map(c => c.cle), "motif_annulation"].filter(c => b.donnees[c]).map(c => [c, b.donnees[c]]));
        if (m[2] === "maintenance") {
          const e = EQUIPEMENTS.find(e => e.id === donnees.equipement_id);
          if (m[1] !== "off1" || !e) return sendJson(res, 422, { message: "Équipement de cette officine requis." });
          donnees.equipement_nom = e.designation;
        }
        if (method === "POST" && !m[3]) {
          const r = { id: randomUUID(), officine_id: m[1], type: m[2], statut: b.statut, revision: 1, donnees, source: definition.source, created_at: new Date().toISOString(), motif_modification: null };
          SUIVIS_DOCUMENTAIRES.unshift(r);
          return sendJson(res, 201, r);
        }
        const r = SUIVIS_DOCUMENTAIRES.find(r => r.id === m[3] && r.officine_id === m[1] && r.type === m[2]);
        if (!r) return sendJson(res, 404, { message: "Suivi introuvable." });
        if (r.revision !== b.revision) return sendJson(res, 409, { message: "Cette fiche a changé. Rechargez le registre." });
        if (!b.motif_modification || b.motif_modification.trim().length < 5) return sendJson(res, 422, { message: "Motif de correction requis." });
        if (r.statut !== "planifie" && r.statut !== b.statut) return sendJson(res, 409, { message: "L’état final est conservé." });
        Object.assign(r, { statut: b.statut, donnees, revision: r.revision + 1, motif_modification: b.motif_modification });
        return sendJson(res, 200, r);
      }
    }
  }
  if (path === "/api/demo/access" && method === "GET") {
    return sendJson(res, 200, {
      demonstration: true,
      password: "Begpharma2026!",
      code_mfa: "123456",
      comptes: Object.values(DEMO_USERS).filter(u => !u.passwordHash).map(u => ({ email: u.email, nom: u.name,
        role: ({ promoteur: "Promoteur", pharmacien_titulaire: "Pharmacien titulaire", dispensateur: "Dispensateur" })[u.role] || "Équipe officinale" })),
    });
  }
  if (path === "/api/auth/login" && method === "POST") {
    const body = await parseBody(req);
    const user = DEMO_USERS[body.email];
    if (!user || (user.passwordHash ? scryptSync(String(body.password), user.passwordSalt, 32).toString("hex") !== user.passwordHash : body.password !== "Begpharma2026!")) {
      return sendJson(res, 401, { message: "Identifiants invalides" });
    }
    if (user.mfa) {
      return sendJson(res, 200, { mfa_required: true, temp_token: "temp-demo-" + user.id, message: "Code TOTP requis (démo: 123456 ou app JBSWY3DPEHPK3PXP)" });
    }
    return sendJson(res, 200, { token: "demo-token-" + user.id, user: { id: user.id, name: user.name, email: user.email, mfa_enabled: user.mfa }, officines: officinesPour(user) });
  }
  if (path === "/api/auth/verify-mfa" && method === "POST") {
    const body = await parseBody(req);
    // accept any 6-digit code in demo, or 123456
    const tempToken = req.headers.authorization?.replace("Bearer ", "") || body.temp_token;
    // find user by temp token
    const user = Object.values(DEMO_USERS).find(u => tempToken === "temp-demo-" + u.id);
    if (!user || body.code !== "123456") return sendJson(res, 401, { message: "Code de démonstration incorrect." });
    return sendJson(res, 200, { token: "demo-token-" + user.id, user: { id: user.id, name: user.name, email: user.email, mfa_enabled: true }, officines: officinesPour(user) });
  }
  if (path === "/api/auth/register" && method === "POST") {
    const b = await parseBody(req);
    if (!b.name || !/^.+@.+\..+$/.test(b.email || "") || String(b.password || "").length < 8 || DEMO_USERS[b.email]) return sendJson(res, 422, {message: "Vérifiez le nom, l’adresse de courriel et le mot de passe. Cette adresse doit être disponible."});
    const salt = randomUUID();
    const user = { id: randomUUID(), name: b.name, email: b.email, mfa: false, role: "promoteur", officines: [], passwordSalt: salt, passwordHash: scryptSync(b.password, salt, 32).toString("hex") };
    DEMO_USERS[b.email] = user;
    return sendJson(res, 201, {message: "Compte temporaire de démonstration créé.", token: "demo-token-" + user.id, user: {id: user.id, name: user.name, email: user.email, mfa_enabled: false}, officines: []});
  }
  if (path === "/api/auth/me" && method === "GET") {
    const user = utilisateurCourant(req);
    return sendJson(res, 200, {
      user: { id: user.id, name: user.name, email: user.email, telephone: "+229 97 00 00 01", mfa_enabled: user.mfa, last_activity_at: new Date().toISOString() },
      officines: officinesPour(user),
    });
  }
  if (path === "/api/auth/logout" && method === "POST") {
    return sendJson(res, 200, { message: "Déconnecté" });
  }
  if (path === "/api/auth/devices" && method === "GET") {
    return sendJson(res, 200, { devices: APPAREILS });
  }
  {
    const m = path.match(/^\/api\/auth\/devices\/([^/]+)$/);
    if (m && method === "DELETE") {
      const i = APPAREILS.findIndex(a => a.id === m[1]);
      if (i === -1) return sendJson(res, 404, { message: "Appareil introuvable." });
      APPAREILS.splice(i, 1);
      return sendJson(res, 200, { message: "Session révoquée avec succès." });
    }
  }
  if (path === "/api/auth/mfa" && method === "GET") {
    const user = utilisateurCourant(req);
    return sendJson(res, 200, {
      mfa_enabled: user.mfa,
      mfa_secret_present: user.mfa,
      mfa_required: ["promoteur", "pharmacien_titulaire"].includes(user.role),
      devices: APPAREILS.length,
      derniere_activite: new Date().toISOString(),
    });
  }
  if (path === "/api/auth/mfa/demarrer" && method === "POST") {
    const secret = "JBSWY3DPEHPK3PXP";
    return sendJson(res, 200, {
      secret,
      otpauth_url: `otpauth://totp/BEGPHARMA:${utilisateurCourant(req).email}?secret=${secret}&issuer=BEGPHARMA`,
      qr_code_url: "https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=demo",
      message: "Scannez le QR code puis saisissez le code affiché (démo : 123456).",
    });
  }
  if (path === "/api/auth/mfa" && method === "DELETE") {
    return sendJson(res, 200, { message: "Double authentification désactivée.", mfa_enabled: false });
  }

  // OFFICINES
  if (path === "/api/officines" && method === "GET") {
    const user = utilisateurCourant(req);
    return sendJson(res, 200, officinesPour(user));
  }
  if (path === "/api/officines" && method === "POST") {
    const b = await parseBody(req);
    const officine = {
      id: "off" + (OFFICINES.length + 1),
      nom: b.nom,
      raison_sociale: b.raison_sociale || `${b.nom} SARL`,
      ville: b.ville || "Cotonou",
      adresse: b.adresse || "Cotonou",
      telephone: b.telephone || "+229 00 00 00 00",
      numero_licence: b.numero_licence || `BEN-OFF-2026-${900 + OFFICINES.length}`,
      pivot: { role_code: "promoteur", actif: true },
    };
    OFFICINES.push(officine);
    utilisateurCourant(req).officines.push(officine.id);
    for (const p of PARAMETRES) {
      p.officine_id = officine.id;
    }
    return sendJson(res, 201, officine);
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)$/);
    if (m && method === "GET") {
      const off = OFFICINES.find(o => o.id === m[1]);
      return off ? sendJson(res, 200, off) : sendJson(res, 404, { message: "Officine introuvable" });
    }
    if (m && method === "PUT") {
      const off = OFFICINES.find(o => o.id === m[1]);
      if (!off) return sendJson(res, 404, { message: "Officine introuvable" });
      Object.assign(off, await parseBody(req));
      return sendJson(res, 200, off);
    }
    if (m && method === "POST" && path.endsWith("/rattacher")) { /* géré plus bas */ }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/rattacher$/);
    if (m && method === "POST") {
      const off = OFFICINES.find(o => o.id === m[1]);
      if (!off) return sendJson(res, 404, { message: "Officine introuvable" });
      const user = utilisateurCourant(req);
      if (!user.officines.includes(off.id)) user.officines.push(off.id);
      return sendJson(res, 200, { message: "Officine rattachée à votre compte.", officine: off });
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/parametres$/);
    if (m && method === "GET") return sendJson(res, 200, PARAMETRES);
    if (m && method === "PUT") {
      const b = await parseBody(req);
      for (const entree of b.parametres || []) {
        const param = PARAMETRES.find(p => p.cle === entree.cle);
        if (!param) continue;
        param.valeur = entree.valeur;
        param.version += 1;
        param.updated_at = new Date().toISOString();
      }
      return sendJson(res, 200, { message: "Paramètres enregistrés.", parametres: PARAMETRES });
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/parametres\/([^/]+)$/);
    if (m && method === "PUT") {
      const b = await parseBody(req);
      const param = PARAMETRES.find(p => p.cle === decodeURIComponent(m[2]));
      if (!param) return sendJson(res, 404, { message: "Paramètre introuvable" });
      param.valeur = b.valeur;
      if (b.description) param.description = b.description;
      param.version += 1;
      param.updated_at = new Date().toISOString();
      return sendJson(res, 200, param);
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/audit-logs$/);
    if (m && method === "GET") return sendJson(res, 200, filtrerJournal(url));
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/echeances$/);
    if (m && method === "GET") return sendJson(res, 200, ECHEANCES);
    if (m && method === "POST") {
      const b = await parseBody(req);
      const echeance = { id: "ech" + (ECHEANCES.length + 1), fait: false, archived: false, ...b };
      ECHEANCES.push(echeance);
      return sendJson(res, 201, echeance);
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/employes$/);
    if (m && method === "GET") return sendJson(res, 200, { employes: EMPLOYES, inscriptions_ordre: INSCRIPTIONS_ORDRE });
    if (m && method === "POST") {
      const b = await parseBody(req);
      const employe = { id: "emp" + (EMPLOYES.length + 1), actif: true, ...b };
      EMPLOYES.push(employe);
      return sendJson(res, 201, employe);
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/employes\/([^/]+)$/);
    if (m && method === "PUT") {
      const b = await parseBody(req);
      const employe = EMPLOYES.find(e => e.id === m[2]);
      if (!employe) return sendJson(res, 404, { message: "Employé introuvable" });
      Object.assign(employe, b);
      return sendJson(res, 200, employe);
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/pointages$/);
    if (m && method === "GET") {
      return sendJson(res, 200, {
        pointages: POINTAGES,
        pharmacien_present: true,
        pharmaciens_sur_place: ["Dr. Marcelle HOUNNOU"],
        statut_reglementaire: "CONFORME_BPD",
        message: "Présence pharmaceutique continue assurée.",
      });
    }
    if (m && method === "POST") {
      const b = await parseBody(req);
      const employe = EMPLOYES.find(e => e.id === b.employe_id);
      const pointage = {
        id: "pt" + (POINTAGES.length + 1),
        employe_id: b.employe_id,
        employe_nom: employe?.nom_complet || "Employé",
        employe_poste: employe?.poste || "dispensateur",
        type: b.type,
        horodatage: new Date().toISOString(),
      };
      POINTAGES.unshift(pointage);
      return sendJson(res, 201, { message: "Pointage enregistré avec succès.", pointage_id: pointage.id, pharmacien_present: true });
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/pointages\/actif$/);
    if (m && method === "GET") {
      const actifs = POINTAGES.filter(p => p.type === "arrivee");
      return sendJson(res, 200, {
        pharmacien_present: actifs.some(p => String(p.employe_poste || "").includes("pharmacien")),
        pharmaciens_sur_place: actifs
          .filter(p => String(p.employe_poste || "").includes("pharmacien"))
          .map(p => p.employe_nom),
        presence: {
          pharmacien_present: actifs.some(p => String(p.employe_poste || "").includes("pharmacien")),
          pharmaciens: actifs
            .filter(p => String(p.employe_poste || "").includes("pharmacien"))
            .map(p => p.employe_nom),
        },
        pointages_actifs: actifs,
      });
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/pointages\/prise$/);
    if (m && method === "POST") {
      const b = await parseBody(req);
      const pharmacien = EMPLOYES.find(e => String(e.poste || "").startsWith("pharmacien"));
      const employe = pharmacien || EMPLOYES[0];
      const pointage = {
        id: "pt" + (POINTAGES.length + 1),
        employe_id: employe?.id || "emp1",
        employe_nom: employe?.nom_complet || "Pharmacien titulaire",
        employe_poste: employe?.poste || "pharmacien_titulaire",
        type: "arrivee",
        horodatage: new Date().toISOString(),
      };
      POINTAGES.unshift(pointage);
      console.log("Pointage de prise de service:", pointage.employe_nom, b.poste || "");
      return sendJson(res, 201, {
        message: "Pointage de prise de service enregistré.",
        pointage_id: pointage.id,
        pharmacien_present: true,
        pointage,
      });
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/equipements$/);
    if (m && method === "GET") return sendJson(res, 200, EQUIPEMENTS);
    if (m && method === "POST") {
      const b = await parseBody(req);
      const equipement = { id: "eq" + (EQUIPEMENTS.length + 1), statut: "en_service", ...b };
      EQUIPEMENTS.push(equipement);
      return sendJson(res, 201, equipement);
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/nettoyages$/);
    if (m && method === "GET") return sendJson(res, 200, paginer(NETTOYAGES));
    if (m && method === "POST") {
      const b = await parseBody(req);
      const nettoyage = {
        id: "nt" + (NETTOYAGES.length + 1),
        ...b,
        conforme: b.conforme !== false,
        date_heure: new Date().toISOString(),
        agent: { name: utilisateurCourant(req).name },
        visa: null,
      };
      NETTOYAGES.unshift(nettoyage);
      return sendJson(res, 201, nettoyage);
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/temperatures$/);
    if (m && method === "GET") return sendJson(res, 200, paginer(RELEVES_TEMPERATURE));
    if (m && method === "POST") {
      const b = await parseBody(req);
      const excursion = Number(b.temperature) < 2 || Number(b.temperature) > 8;
      const releve = {
        id: "rt" + (RELEVES_TEMPERATURE.length + 1),
        ...b,
        statut_conformite: excursion ? "excursion_chaud" : "conforme",
        agent: { name: utilisateurCourant(req).name },
      };
      RELEVES_TEMPERATURE.unshift(releve);
      return sendJson(res, 201, {
        releve,
        alerte_excursion: excursion,
        message: excursion ? "ATTENTION : excursion de température détectée." : "Relevé enregistré.",
      });
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/temperatures\/stats$/);
    if (m && method === "GET") {
      const zones = {};
      for (const code of ["refrigeree_2_8", "magasin_reserve", "hall_dispensation"]) {
        const duJour = RELEVES_TEMPERATURE.filter(r => r.zone === code && r.date_releve === "2026-11-04");
        const dernier = duJour[0];
        zones[code] = {
          matin_fait: duJour.some(r => r.moment === "matin"),
          soir_fait: duJour.some(r => r.moment === "soir"),
          dernier_releve: dernier || null,
          statut_actuel: dernier ? dernier.statut_conformite : "en_attente",
          temp_actuelle: dernier ? dernier.temperature : null,
        };
      }
      return sendJson(res, 200, {
        date: "2026-11-04",
        zones,
        historique_30j: { total_releves: 58, total_excursions: 1, taux_conformite: 98.3 },
      });
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/non-conformites$/);
    if (m && method === "GET") return sendJson(res, 200, NON_CONFORMITES);
    if (m && method === "POST") {
      const b = await parseBody(req);
      const nc = {
        id: "nc" + (NON_CONFORMITES.length + 1),
        numero_nc: `NC-2026-${String(NON_CONFORMITES.length + 12).padStart(4, "0")}`,
        statut: "ouverte",
        date_creation: new Date().toISOString(),
        ...b,
      };
      NON_CONFORMITES.unshift(nc);
      return sendJson(res, 201, nc);
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/non-conformites\/([^/]+)$/);
    if (m && method === "PUT") {
      const b = await parseBody(req);
      const nc = NON_CONFORMITES.find(n => n.id === m[2]);
      if (!nc) return sendJson(res, 404, { message: "Non-conformité introuvable" });
      Object.assign(nc, b);
      return sendJson(res, 200, nc);
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/auto-evaluation\/campagne-courante$/);
    if (m && method === "GET") return sendJson(res, 200, AUTO_EVALUATION);
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/auto-evaluation\/evaluer\/([^/]+)$/);
    if (m && method === "PUT") {
      const b = await parseBody(req);
      const evaluation = AUTO_EVALUATION.evaluations.find(e => e.id === m[2]);
      if (!evaluation) return sendJson(res, 404, { message: "Article introuvable" });
      if (!["conforme", "ecart_mineur", "ecart_majeur", "non_applicable", "non_evalue"].includes(b.cotation)) return sendJson(res, 422, { message: "Cotation invalide." });
      Object.assign(evaluation, { cotation: b.cotation, ...(b.preuve != null ? { preuve: b.preuve } : {}), ...(b.commentaire != null ? { commentaire: b.commentaire } : {}) });
      recalculerGrille(AUTO_EVALUATION);
      const notees = AUTO_EVALUATION.evaluations.filter(e => e.cotation && e.cotation !== "non_evalue");
      const conformesPondere = notees.filter(e => e.cotation === "conforme").length + notees.filter(e => e.cotation === "ecart_mineur").length * 0.5;
      const score = AUTO_EVALUATION.statistiques.score_global;
      AUTO_EVALUATION.statistiques.score_global = score;
      return sendJson(res, 200, { evaluation, nouveau_score_global: score });
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/auto-evaluation\/generer-capa\/([^/]+)$/);
    if (m && method === "POST") {
      const evaluation = AUTO_EVALUATION.evaluations.find(e => e.id === m[2]);
      if (!evaluation) return sendJson(res, 404, { message: "Article introuvable." });
      const b = await parseBody(req);
      if (!b.action_corrective?.trim()) return sendJson(res, 422, { message: "Action corrective requise." });
      if (evaluation.non_conformite) return sendJson(res, 409, { message: "Une action est déjà liée." });
      const nc = {
        id: "nc" + (NON_CONFORMITES.length + 1),
        numero_nc: `NC-2026-${String(NON_CONFORMITES.length + 12).padStart(4, "0")}`,
        titre: `Écart BPD sur l'article ${evaluation?.article_numero ?? ""}`.trim(),
        action_corrective: b.action_corrective, analyse_causes_5m: b.cause_principale ?? null,
        gravite: "majeure",
        processus: "06",
        source: "auto_evaluation",
        statut: "ouverte",
        date_creation: new Date().toISOString(),
      };
      NON_CONFORMITES.unshift(nc);
      evaluation.non_conformite = nc;
      evaluation.non_conformite_id = nc.id;
      return sendJson(res, 201, {
        evaluation,
        non_conformite: nc,
        message: `Fiche Non-Conformité et plan CAPA créés pour l'article ${evaluation?.article_numero ?? ""}.`,
      });
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/auto-evaluation\/rapport$/);
    if (m && method === "GET") {
      return sendJson(res, 200, {
        campagne: AUTO_EVALUATION.campagne,
        officine: OFFICINE_COURANTE,
        date_generation: new Date().toISOString(),
        score_global: AUTO_EVALUATION.statistiques.score_global,
        synthese_statuts: AUTO_EVALUATION.statistiques,
        synthese_chapitres: CHAPITRES_BPD,
        actions_correctives_requises: NON_CONFORMITES.filter(n => n.statut !== "cloturee").length,
      });
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/documents$/);
    if (m && method === "GET") {
      let docs = DOCUMENTS.filter(d => (d.officine_id || "off1") === m[1]);
      if (url.searchParams.get("statut") && url.searchParams.get("statut") !== "tous") {
        docs = docs.filter(d => d.statut === url.searchParams.get("statut"));
      }
      return sendJson(res, 200, docs);
    }
    if (m && method === "POST") {
      const b = await parseBody(req);
      const doc = {
        id: "doc" + (DOCUMENTS.length + 1),
        code_document: b.code_document || `DOC-${String(DOCUMENTS.length + 1).padStart(3, "0")}`,
        statut: "brouillon",
        version: 1,
        updated_at: new Date().toISOString(),
        ...b,
      };
      DOCUMENTS.unshift(doc);
      return sendJson(res, 201, doc);
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/documents\/([^/]+)\/approbations$/);
    if (m && method === "GET") return sendJson(res, 503, {
      message: "Historique vérifiable indisponible sur le serveur de démonstration. Connectez Laravel.",
    });
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/documents\/([^/]+)$/);
    if (m && method === "GET") {
      const doc = DOCUMENTS.find(d => d.id === m[2] && (d.officine_id || "off1") === m[1]);
      return doc ? sendJson(res, 200, doc) : sendJson(res, 404, { message: "Document introuvable." });
    }
    if (m && method === "PUT") {
      const b = await parseBody(req);
      if (b.statut === "valide" || b.password !== undefined) return sendJson(res, 503, {
        message: "L’approbation sécurisée nécessite Laravel. Aucun mot de passe ni preuve d’approbation n’est conservé par la démonstration.",
      });
      const doc = DOCUMENTS.find(d => d.id === m[2] && (d.officine_id || "off1") === m[1]);
      if (!doc) return sendJson(res, 404, { message: "Document introuvable" });
      if (b.empreinte_edition && b.empreinte_edition !== doc.empreinte_contenu) return sendJson(res, 409, { message: "Ce document a changé. Rechargez-le avant de reprendre les modifications." });
      if (b.contenu !== undefined) {
        let ancien; try { ancien = JSON.parse(doc.contenu || ""); } catch {}
        if (ancien?.schema === "begpharma.canevas-rempli.v1") {
          let nouveau; try { nouveau = JSON.parse(b.contenu); } catch {}
          if (!b.empreinte_edition || !nouveau?.valeurs || Array.isArray(nouveau.valeurs) || nouveau.schema !== ancien.schema || JSON.stringify(nouveau.canevas) !== JSON.stringify(ancien.canevas)) return sendJson(res, 422, {message: "La structure du modèle doit être conservée. Rechargez le document."});
          const cles = new Set();
          const visiter = blocs => blocs.forEach(x => { if (x.type === "paragraphe") cles.add(x.cle); else x.lignes.forEach(l => l.forEach(c => { cles.add(c.cle); visiter(c.imbriques || []); })); });
          ancien.canevas.parties.forEach(p => visiter(p.blocs));
          if (Object.entries(nouveau.valeurs).some(([k,v]) => !cles.has(k) || typeof v !== "string" || v.length > 30000)) return sendJson(res, 422, {message:"Zone de saisie invalide."});
          nouveau.valeurs = recalculerCanevas(ancien.canevas, nouveau.valeurs); b.contenu = JSON.stringify(nouveau);
        }
      }
      for (const cle of ["titre", "contenu", "type_doc", "processus", "statut", "motif_refus"]) {
        if (b[cle] !== undefined) doc[cle] = b[cle];
      }
      doc.version = (doc.version || 1) + 1;
      doc.updated_at = new Date().toISOString();
      if (doc.mode_demo) doc.empreinte_contenu = empreinteDocumentDemo(doc);
      return sendJson(res, 200, doc);
    }
  }
  {
    const m = path.match(/^\/api\/officines\/([^/]+)\/modeles-bpd\/([^/]+)\/instancier$/);
    if (m && method === "POST") {
      const modele = MODELES_BPD.find(x => x.id === m[2]);
      if (!modele) return sendJson(res, 404, { message: "Modèle introuvable" });
      const doc = {
        id: "doc" + (DOCUMENTS.length + 1),
        code_document: modele.code_document,
        titre: modele.titre,
        type_doc: modele.type_document,
        processus: modele.processus,
        statut: "brouillon",
        version: 1,
        updated_at: new Date().toISOString(),
      };
      DOCUMENTS.unshift(doc);
      return sendJson(res, 201, { message: "Modèle BPD instancié en brouillon avec succès.", document: doc });
    }
  }

  // PRODUITS
  if (path === "/api/produits" && method === "GET") {
    return sendJson(res, 200, { status: "success", data: url.searchParams.get("vendables") === "1" ? PRODUITS.filter(p => p.stock_total > 0) : PRODUITS });
  }
  if (path === "/api/produits" && method === "POST") {
    const b = await parseBody(req);
    const newProd = { id: "p" + Date.now(), ...b, stock_total: 0, prix_public_ttc: parseFloat(b.prix_public_ttc) || 0 };
    PRODUITS.push(newProd);
    return sendJson(res, 201, { status: "success", message: "Produit ajouté", data: newProd });
  }

  // STOCKS
  if (path === "/api/stocks" && method === "GET") {
    const alerte = url.searchParams.get("alerte");
    const q = url.searchParams.get("q")?.toLowerCase();
    const statut = url.searchParams.get("statut");
    const vendable = url.searchParams.get("vendable");
    let filtered = [...LOTS];
    if (statut) {
      const demandes = statut.split(",").map((x) => x.trim());
      filtered = filtered.filter((l) => demandes.includes(l.statut_detail) || demandes.includes(l.statut_effectif) || demandes.includes(l.statut));
    } else if (vendable !== null) {
      const veutVendable = vendable === "true" || vendable === "1";
      filtered = veutVendable
        ? filtered.filter((l) => l.est_vendable && l.quantite_disponible > 0)
        : filtered.filter((l) => !l.est_vendable || l.quantite_disponible <= 0 || ["dechet", "epuise"].includes(l.statut_effectif));
    }
    if (q) filtered = filtered.filter(l => l.numero_lot.toLowerCase().includes(q) || l.produit.nom_commercial.toLowerCase().includes(q));
    if (alerte === "perime") filtered = filtered.filter(l => l.jours_avant_peremption < 0);
    if (alerte === "critique_1m") filtered = filtered.filter(l => l.jours_avant_peremption >= 0 && l.jours_avant_peremption <= 30);
    if (alerte === "alerte_3m") filtered = filtered.filter(l => l.jours_avant_peremption > 30 && l.jours_avant_peremption <= 90);
    filtered.sort((a,b) => new Date(a.date_peremption) - new Date(b.date_peremption));
    return sendJson(res, 200, { status: "success", data: filtered, stats: { perimes: 0, critiques_1m: 1, alertes_3m: 1, total_lots_actifs: 3, valorisation_totale: LOTS.reduce((s,l)=> s + l.quantite_disponible * (l.produit.prix_achat_moyen || 900), 0) } });
  }
  if (path === "/api/stocks" && method === "POST") {
    const b = await parseBody(req);
    const prod = PRODUITS.find(p => p.id === b.produit_id) || PRODUITS[0];
    // Un lot n'est commercialisable que si tous les contrôles renseignés sont conformes
    // ET que la batterie de contrôles réglementaires est complète.
    const controlesAttendus = ["alerte_sanitaire_verifiee", "emballage_intact", "conformite_livraison", "dates_conformes", "chaine_froid_respectee"];
    const controles = b.controles_reception || {};
    const lotConforme =
      controlesAttendus.every((cle) => controles[cle] === true) &&
      Object.values(controles).every((v) => v === true || v === null || v === undefined);
    const newLot = { id: "l" + Date.now(), produit_id: b.produit_id, numero_lot: b.numero_lot, date_peremption: b.date_peremption, quantite_disponible: b.quantite, quantite_initiale: b.quantite, emplacement: b.emplacement || "Réserve", fournisseur_nom: b.fournisseur_nom, bon_livraison_ref: b.bon_livraison_ref, statut: lotConforme ? "en_stock" : "quarantaine", statut_detail: lotConforme ? "commercialisable" : "en_attente_controle", statut_effectif: lotConforme ? "commercialisable" : "en_attente_controle", est_vendable: lotConforme, motif_quarantaine: lotConforme ? null : "Contrôles de réception incomplets : lot isolé en quarantaine", jours_avant_peremption: Math.floor((new Date(b.date_peremption) - new Date())/86400000), statut_peremption: "normal", produit: prod, prix_achat_unitaire: b.prix_achat_unitaire || 900 };
    LOTS.push(newLot);
    MOUVEMENTS.unshift({ id: "m"+Date.now(), type_mouvement: "entree_reception", quantite: b.quantite, stock_avant: 0, stock_apres: b.quantite, motif: "Réception contrôlée", reference_piece: b.bon_livraison_ref, created_at: new Date().toISOString(), produit: prod, lot: newLot, auteur: { name: "Démo" } });
    return sendJson(res, 201, { status: "success", message: `Lot ${newLot.numero_lot} réceptionné  :  FEFO appliqué`, data: newLot });
  }
  if (path.match(/^\/api\/stocks\/[^\/]+\/quarantaine$/) && method === "POST") {
    const id = path.split("/")[3];
    const lot = LOTS.find(l => l.id === id);
    if (lot) { lot.statut = "quarantaine"; lot.statut_detail = "quarantaine"; lot.statut_effectif = "quarantaine"; lot.est_vendable = false; return sendJson(res, 200, { status: "success", message: `Lot ${lot.numero_lot} en quarantaine`, data: lot }); }
    return sendJson(res, 404, { message: "Lot non trouvé" });
  }
  if (path.match(/^\/api\/stocks\/[^\/]+\/lever-quarantaine$/) && method === "POST") {
    const id = path.split("/")[3];
    const lot = LOTS.find(l => l.id === id);
    if (lot) { lot.statut = "en_stock"; lot.statut_detail = "commercialisable"; lot.statut_effectif = "commercialisable"; lot.est_vendable = true; return sendJson(res, 200, { status: "success", message: `Lot ${lot.numero_lot} réintégré`, data: lot }); }
    return sendJson(res, 404, { message: "Lot non trouvé" });
  }
  if (path.match(/^\/api\/stocks\/[^\/]+\/statut$/) && method === "PUT") {
    const id = path.split("/")[3];
    const b = await parseBody(req);
    const lot = LOTS.find(l => l.id === id);
    if (lot) { lot.statut_detail = b.statut; lot.statut_effectif = b.statut; lot.est_vendable = b.statut === "commercialisable"; lot.motif_statut = b.motif; return sendJson(res, 200, { status: "success", message: `Lot ${lot.numero_lot} → ${b.statut}`, data: lot }); }
    return sendJson(res, 404, { message: "Lot non trouvé" });
  }
  if (path === "/api/stocks/alertes-peremption" && method === "GET") return sendJson(res, 200, {mode_demo: true, courriel_configure: false, seuils_jours: [90,45,10,1], envois: {}});
  if (path === "/api/stocks/peremptions" && method === "GET") {
    const now = new Date();
    const a1 = LOTS.filter(l => { const d=new Date(l.date_peremption); const diff=(d-now)/86400000; return l.jours_avant_peremption>0 && l.jours_avant_peremption<=30; });
    const a3 = LOTS.filter(l => { const d=new Date(l.date_peremption); const diff=(d-now)/86400000; return diff>30 && diff<=90; });
    const a6 = LOTS.filter(l => { const d=new Date(l.date_peremption); const diff=(d-now)/86400000; return diff>90 && diff<=180; });
    return sendJson(res, 200, { status: "success", data: { a_1_mois: a1, a_3_mois: a3, a_6_mois: a6, perimes: LOTS.filter(l => l.jours_avant_peremption <= 0 && l.quantite_disponible > 0) } });
  }
  if (path === "/api/stocks/valorisation" && method === "GET") {
    return sendJson(res, 200, { status: "success", data: { total: LOTS.reduce((s,l)=> s + l.quantite_disponible*900,0), par_produit: PRODUITS.map(p=>({ produit:p, quantite: LOTS.filter(l=>l.produit_id===p.id).reduce((s,l)=>s+l.quantite_disponible,0), valeur: LOTS.filter(l=>l.produit_id===p.id).reduce((s,l)=>s+l.quantite_disponible*900,0), cmp: 900 })) } });
  }
  if (path === "/api/stocks/alertes" && method === "GET") {
    return sendJson(res, 200, { status: "success", data: { ruptures: 1, lots_bloques: 1, perimes: 0, rappels_actifs: 0 } });
  }

  // EMPLACEMENTS
  if (path === "/api/emplacements" && method === "GET") {
    return sendJson(res, 200, { status: "success", data: EMPLACEMENTS });
  }

  // MOUVEMENTS
  if (path === "/api/mouvements" && method === "GET") {
    return sendJson(res, 200, { status: "success", data: { data: MOUVEMENTS } });
  }
  if (path === "/api/mouvements" && method === "POST") {
    return sendJson(res, 201, { status: "success", message: "Mouvement enregistré", data: MOUVEMENTS[0] });
  }

  // STUPEFIANTS
  if (path === "/api/stupefiants" && method === "GET") {
    // check for subroutes
    return sendJson(res, 200, STUPEFIANTS);
  }
  if (path === "/api/stupefiants/balance" && method === "GET") {
    return sendJson(res, 200, { status: "success", data: { date: new Date().toISOString().slice(0,10), par_produit: STUPEFIANTS.balance_produits, total_lignes: 2 } });
  }
  if (path === "/api/stupefiants/ordonnancier" && method === "GET") {
    return sendJson(res, 200, { status: "success", data: { data: STUPEFIANTS.data.data.filter(m=> m.type_mouvement==="sortie_dispensation"), conservation: "10 ans" } });
  }
  if (path === "/api/stupefiants/armoire" && method === "GET") {
    return sendJson(res, 200, { status: "success", data: { contenu: [], lots_stupefiants: LOTS.filter(l=> l.produit.tableau_substance==="stupefiant"), exigence: "Armoire fermée à clé" } });
  }
  if (path === "/api/stupefiants/rapport" && method === "GET") {
    return sendJson(res, 200, { status: "success", data: { periode: ["2026-11-01","2026-11-04"], total_mouvements: 2, entrees: 20, sorties: 5 } });
  }
  if (path === "/api/stupefiants" && method === "POST") {
    const b = await parseBody(req);
    const prod = PRODUITS.find(p=> p.id===b.produit_id) || PRODUITS[3];
    const newNum = Math.max(...STUPEFIANTS.data.data.map(m=> m.numero_ordre),0)+1;
    const newM = { id: "s"+Date.now(), numero_ordre: newNum, date_mouvement: new Date().toISOString(), type_mouvement: b.type_mouvement, quantite: b.quantite, stock_precedent: 15, stock_nouveau: b.type_mouvement==="entree_livraison" ? 15+b.quantite : 15-b.quantite, reference_piece: b.reference_piece, tiers_nom: b.tiers_nom, patient_nom: b.patient_nom, prescripteur_nom: b.prescripteur_nom, observations: b.observations, produit: { nom_commercial: prod.nom_commercial, dosage: prod.dosage, code_cip: prod.code_cip }, lot: { numero_lot: "STUP-002", date_peremption: "2027-06-01" }, operateur: { name: "Démo" }, pharmacien_visa: null };
    STUPEFIANTS.data.data.unshift(newM);
    return sendJson(res, 201, { status: "success", message: `Ligne #${String(newNum).padStart(4,"0")} inscrite  :  immuable après visa`, data: newM });
  }
  if (path.match(/^\/api\/stupefiants\/[^\/]+\/viser$/) && method === "POST") {
    const id = path.split("/")[3];
    const m = STUPEFIANTS.data.data.find(x=> x.id===id);
    if (m) { m.pharmacien_visa = { name: "Dr. Marcelle HOUNNOU" }; m.date_visa = new Date().toISOString(); return sendJson(res, 200, { status: "success", message: "Visa apposé  :  ligne verrouillée", data: m }); }
    // try s id is after /stupefiants/inventaire etc  :  already handled
    return sendJson(res, 404, { message: "Non trouvé" });
  }
  if (path.match(/^\/api\/stupefiants\/[^\/]+\/rectificative$/) && method === "POST") {
    return sendJson(res, 201, { status: "success", message: "Rectificative créée", data: { id: "rect"+Date.now() } });
  }
  if (path === "/api/stupefiants/inventaire" && method === "POST") {
    const b = await parseBody(req);
    const ligne = (STUPEFIANTS.balance_produits || []).find((x) => x.id === b.produit_id);
    const theorique = ligne ? ligne.stock_theorique_registre : 0;
    const physique = Number(b.quantite_physique ?? theorique);
    const ecart = physique - theorique;

    if (ligne) {
      ligne.stock_physique_lots = physique;
      ligne.ecart = ecart;
      ligne.concordance_exacte = ecart === 0;
    }

    return sendJson(res, 201, {
      status: "success",
      alerte_ecart: ecart !== 0,
      message: ecart === 0
        ? "Concordance parfaite entre le registre et le comptage physique."
        : `Écart de ${ecart} unité(s) constaté : une fiche de non-conformité doit être ouverte.`,
      data: { produit_id: b.produit_id, stock_theorique: theorique, quantite_physique: physique, ecart, date_inventaire: new Date().toISOString() },
    });
  }
  if (path === "/api/stupefiants/declaration-vol" && method === "POST") {
    return sendJson(res, 201, { status: "success", message: "Déclaration enregistrée  :  alerte promoteur SMS/push", data: {} });
  }
  if (path === "/api/stupefiants/demande-destruction" && method === "POST") {
    return sendJson(res, 201, { status: "success", message: "Destruction enregistrée  :  PV à signer", data: {} });
  }

  // PREPARATIONS
  if (path === "/api/preparations" && method === "GET") {
    return sendJson(res, 200, PREPARATIONS);
  }
  if (path === "/api/preparations" && method === "POST") {
    const b = await parseBody(req);
    const newPrep = { id: "pr"+Date.now(), numero_preparation: `PREP-2026-${String(PREPARATIONS.data.data.length+1).padStart(4,"0")}`, nom_preparation: b.nom_preparation, type_preparation: b.type_preparation, formule_detaillee: b.formule_detaillee, quantite_produite: b.quantite_produite, conditionnement: b.conditionnement, date_fabrication: b.date_fabrication, date_limite_utilisation: b.date_limite_utilisation, patient_nom: b.patient_nom, prescripteur_nom: b.prescripteur_nom, conforme: true, controles_effectues: b.controles_effectues, executant: { name: "Démo" }, pharmacien_visa: null, matieres_premieres_lots: b.matieres_premieres_lots };
    PREPARATIONS.data.data.unshift(newPrep);
    return sendJson(res, 201, { status: "success", message: `Préparation ${newPrep.numero_preparation} inscrite`, data: newPrep });
  }
  if (path.match(/^\/api\/preparations\/[^\/]+\/viser$/) && method === "POST") {
    const id = path.split("/")[3];
    const p = PREPARATIONS.data.data.find(x=> x.id===id);
    if (p) { p.pharmacien_visa = { name: "Dr. Marcelle HOUNNOU" }; return sendJson(res, 200, { status: "success", message: "Libérée & visée", data: p }); }
    return sendJson(res, 404, { message: "Non trouvé" });
  }

  // INVENTAIRES (STO-12)
  if (path === "/api/inventaires" && method === "GET") {
    return sendJson(res, 200, { status: "success", data: { data: INVENTAIRES.data, total: INVENTAIRES.total } });
  }
  if (path === "/api/inventaires" && method === "POST") {
    const b = await parseBody(req);
    const numero = INVENTAIRES.data.length + 1;
    const inventaire = {
      id: "inv" + Date.now(),
      reference: `INV-2026-${String(numero).padStart(4, "0")}`,
      type: b.type || "tournant",
      zone: b.zone || null,
      statut: "brouillon",
      date_inventaire: b.date_inventaire || new Date().toISOString().slice(0, 10),
      initiateur: { name: "Dr. Marcelle HOUNNOU" },
      lignes_count: 0,
      lignes: [],
    };
    INVENTAIRES.data.unshift(inventaire);
    INVENTAIRES.total += 1;
    return sendJson(res, 201, { status: "success", message: `Inventaire ${inventaire.reference} créé`, data: inventaire });
  }
  {
    const m = path.match(/^\/api\/inventaires\/([^\/]+)$/);
    if (m && method === "GET") {
      const inv = INVENTAIRES.data.find((i) => i.id === m[1]);
      if (!inv) return sendJson(res, 404, { message: "Inventaire non trouvé" });
      return sendJson(res, 200, { status: "success", data: inv });
    }
  }
  {
    const m = path.match(/^\/api\/inventaires\/([^\/]+)\/lignes\/([^\/]+)\/compter$/);
    if (m && method === "POST") {
      const inv = INVENTAIRES.data.find((i) => i.id === m[1]);
      if (!inv) return sendJson(res, 404, { message: "Inventaire non trouvé" });
      if (!["en_cours", "brouillon"].includes(inv.statut)) return sendJson(res, 422, { message: "Inventaire non modifiable à ce stade" });
      const b = await parseBody(req);
      const ligne = inv.lignes.find((l) => l.id === m[2]);
      if (!ligne) return sendJson(res, 404, { message: "Ligne non trouvée" });
      const comptee = Number(b.quantite_comptee);
      ligne.quantite_comptee = comptee;
      ligne.ecart = comptee - ligne.quantite_theorique;
      ligne.valorisation_ecart = ligne.ecart * 900;
      if (b.commentaire) ligne.commentaire = b.commentaire;
      return sendJson(res, 200, { status: "success", message: "Comptage enregistré", data: ligne });
    }
  }
  {
    const m = path.match(/^\/api\/inventaires\/([^\/]+)\/valider$/);
    if (m && method === "POST") {
      const inv = INVENTAIRES.data.find((i) => i.id === m[1]);
      if (!inv) return sendJson(res, 404, { message: "Inventaire non trouvé" });
      if (inv.lignes.some((l) => l.quantite_comptee === null || l.quantite_comptee === undefined)) {
        return sendJson(res, 422, { message: "Toutes les lignes doivent être comptées avant validation" });
      }
      inv.statut = "valide";
      const ecarts = inv.lignes.filter((l) => l.ecart);
      return sendJson(res, 200, {
        status: "success",
        message: `Inventaire ${inv.reference} validé  :  ${ecarts.length} ajustement(s) appliqué(s)`,
        data: inv,
      });
    }
  }

  // AVIS DE RAPPEL (STO-14)
  if (path === "/api/rappels" && method === "GET") {
    return sendJson(res, 200, { status: "success", data: { data: RAPPELS.data, total: RAPPELS.total } });
  }
  if (path === "/api/rappels" && method === "POST") {
    const b = await parseBody(req);
    const numero = RAPPELS.data.length + 1;
    const rappel = {
      id: "rap" + Date.now(),
      reference: `RAPPEL-2026-${String(numero).padStart(4, "0")}`,
      source: b.source,
      produits_concernes: b.produits_concernes,
      lots_concernes: b.lots_concernes || [],
      date_avis: b.date_avis,
      action_requise: b.action_requise,
      statut: "actif",
      auteur: { name: "Dr. Marcelle HOUNNOU" },
      date_cloture: null,
      preuve_cloture: null,
    };
    RAPPELS.data.unshift(rappel);
    RAPPELS.total += 1;
    // Blocage immédiat des lots concernés
    let bloques = 0;
    for (const lc of rappel.lots_concernes) {
      if (!lc?.numero_lot) continue;
      for (const lot of LOTS) {
        if (lot.numero_lot !== lc.numero_lot) continue;
        lot.statut = "quarantaine";
        lot.statut_detail = "quarantaine";
        lot.statut_effectif = "quarantaine";
        lot.est_vendable = false;
        lot.motif_statut = `Rappel ${rappel.reference}  :  ${rappel.source}`;
        MOUVEMENTS.unshift({
          id: "m" + Date.now() + bloques,
          type_mouvement: "changement_statut",
          quantite: 0,
          stock_avant: lot.quantite_disponible,
          stock_apres: lot.quantite_disponible,
          motif: `Blocage automatique  :  rappel ${rappel.reference}`,
          reference_piece: rappel.reference,
          created_at: new Date().toISOString(),
          produit: lot.produit,
          lot,
          auteur: { name: "Dr. Marcelle HOUNNOU" },
        });
        bloques += 1;
      }
    }
    return sendJson(res, 201, {
      status: "success",
      message: bloques > 0
        ? `Avis enregistré  :  ${bloques} lot(s) bloqué(s) immédiatement`
        : "Avis enregistré  :  aucun lot de cette officine ne correspond aux numéros saisis",
      data: rappel,
      lots_bloques: bloques,
    });
  }
  {
    const m = path.match(/^\/api\/rappels\/([^\/]+)\/cloturer$/);
    if (m && method === "POST") {
      const rappel = RAPPELS.data.find((r) => r.id === m[1]);
      if (!rappel) return sendJson(res, 404, { message: "Avis non trouvé" });
      const b = await parseBody(req);
      if (!b.preuve_cloture) return sendJson(res, 422, { message: "La preuve de clôture est obligatoire" });
      rappel.statut = "cloture";
      rappel.date_cloture = new Date().toISOString();
      rappel.preuve_cloture = b.preuve_cloture;
      return sendJson(res, 200, { status: "success", message: `Rappel ${rappel.reference} clôturé`, data: rappel });
    }
  }

  // DÉCHETS (STO-17)
  if (path === "/api/dechets" && method === "GET") {
    return sendJson(res, 200, { status: "success", data: { data: DECHETS.data, total: DECHETS.total } });
  }
  if (path === "/api/dechets" && method === "POST") {
    const b = await parseBody(req);
    if (!b.lots_ids || b.lots_ids.length === 0) {
      return sendJson(res, 422, { message: "Sélectionnez au moins un lot à détruire" });
    }
    const concernes = LOTS.filter((l) => b.lots_ids.includes(l.id));
    if (concernes.length === 0) return sendJson(res, 404, { message: "Aucun lot trouvé" });
    const quantite = concernes.reduce((s, l) => s + l.quantite_disponible, 0);
    const valeur = concernes.reduce((s, l) => s + l.quantite_disponible * 900, 0);
    const numero = DECHETS.data.length + 1;
    const dechet = {
      id: "dec" + Date.now(),
      reference: `DECHET-2026-${String(numero).padStart(4, "0")}`,
      motif: b.motif,
      lots_originels: concernes.map((l) => ({ id: l.id, numero_lot: l.numero_lot, quantite: l.quantite_disponible })),
      quantite_totale: quantite,
      valeur_perte: valeur,
      zone_stockage: "Aire des déchets sécurisée",
      statut: b.prestataire_nom ? "en_attente_prestataire" : "constitue",
      prestataire_nom: b.prestataire_nom || null,
      date_destruction_prevue: b.date_destruction_prevue || null,
      date_destruction_reelle: null,
      constitue_par: { name: "Gervais KPADONOU" },
    };
    DECHETS.data.unshift(dechet);
    DECHETS.total += 1;
    for (const lot of concernes) {
      MOUVEMENTS.unshift({
        id: "m" + Date.now() + lot.id,
        type_mouvement: "destruction",
        quantite: -lot.quantite_disponible,
        stock_avant: lot.quantite_disponible,
        stock_apres: 0,
        motif: `Sortie vers déchet  :  ${b.motif}`,
        reference_piece: dechet.reference,
        created_at: new Date().toISOString(),
        produit: lot.produit,
        lot,
        auteur: { name: "Gervais KPADONOU" },
      });
      lot.statut = "retire";
      lot.statut_detail = "dechet";
      lot.statut_effectif = "dechet";
      lot.est_vendable = false;
      lot.quantite_disponible = 0;
    }
    return sendJson(res, 201, {
      status: "success",
      message: `Lot de déchets ${dechet.reference} constitué  :  perte de ${valeur.toLocaleString("fr-FR")} FCFA enregistrée`,
      data: dechet,
    });
  }
  {
    const m = path.match(/^\/api\/dechets\/([^\/]+)\/detruire$/);
    if (m && method === "POST") {
      const dechet = DECHETS.data.find((d) => d.id === m[1]);
      if (!dechet) return sendJson(res, 404, { message: "Lot de déchets non trouvé" });
      dechet.statut = "detruit";
      dechet.date_destruction_reelle = new Date().toISOString().slice(0, 10);
      return sendJson(res, 200, { status: "success", message: `Destruction ${dechet.reference} validée  :  procès-verbal à archiver dix ans`, data: dechet });
    }
  }

  // ─── CAISSE
  if (path === "/api/caisse/session-active" && method === "GET") {
    const session = SESSIONS_CAISSE.find(s => s.statut === "ouverte") || null;
    if (session) session.ventes = VENTES;
    return sendJson(res, 200, { status: "success", data: session });
  }
  if (path === "/api/caisse/ouvrir" && method === "POST") {
    const b = await parseBody(req);
    if (b.fond_caisse_ouverture === undefined || Number(b.fond_caisse_ouverture) < 0) {
      return sendJson(res, 422, { message: "Le fond de caisse d'ouverture est obligatoire.", errors: { fond_caisse_ouverture: ["Champ obligatoire."] } });
    }
    const ouverte = SESSIONS_CAISSE.find(s => s.statut === "ouverte");
    if (ouverte) {
      return sendJson(res, 422, { message: "Une session de caisse est déjà ouverte." });
    }
    const session = {
      id: "sess" + (SESSIONS_CAISSE.length + 1),
      numero_session: `CAISSE-2026-${String(20 + SESSIONS_CAISSE.length).padStart(4, "0")}`,
      statut: "ouverte",
      fond_caisse_ouverture: Number(b.fond_caisse_ouverture),
      fond_caisse_fermeture_reel: null,
      fond_caisse_fermeture_theorique: null,
      ecart_caisse: null,
      opened_at: new Date().toISOString(),
      closed_at: null,
      caissier: { id: utilisateurCourant(req).id, name: utilisateurCourant(req).name },
      ventes: [],
    };
    SESSIONS_CAISSE.unshift(session);
    return sendJson(res, 201, { status: "success", message: "Session de caisse ouverte.", data: session });
  }
  {
    const m = path.match(/^\/api\/caisse\/session\/([^/]+)\/fermer$/);
    if (m && method === "POST") {
      const b = await parseBody(req);
      const session = SESSIONS_CAISSE.find(s => s.id === m[1]);
      if (!session) return sendJson(res, 404, { message: "Session de caisse introuvable." });
      if (session.statut === "fermee") {
        return sendJson(res, 422, { message: "Cette session de caisse est déjà fermée." });
      }
      if (b.fond_caisse_fermeture_reel === undefined || Number(b.fond_caisse_fermeture_reel) < 0) {
        return sendJson(res, 422, { message: "Le fond de caisse réel est obligatoire.", errors: { fond_caisse_fermeture_reel: ["Champ obligatoire."] } });
      }
      const encaisse = VENTES.filter(v => v.mode_reglement === "especes").reduce((t, v) => t + v.montant_total, 0);
      session.statut = "fermee";
      session.fond_caisse_fermeture_reel = Number(b.fond_caisse_fermeture_reel);
      session.fond_caisse_fermeture_theorique = session.fond_caisse_ouverture + encaisse;
      session.ecart_caisse = session.fond_caisse_fermeture_reel - session.fond_caisse_fermeture_theorique;
      session.closed_at = new Date().toISOString();
      session.notes_cloture = b.notes_cloture || null;
      return sendJson(res, 200, { status: "success", message: "Session de caisse fermée.", data: session });
    }
  }
  {
    const m = path.match(/^\/api\/caisse\/session\/([^/]+)\/ticket-x$/);
    if (m && method === "GET") {
      const session = SESSIONS_CAISSE.find(s => s.id === m[1]);
      if (!session) return sendJson(res, 404, { message: "Session de caisse introuvable." });
      const somme = (mode) => VENTES.filter(v => v.mode_reglement === mode).reduce((t, v) => t + v.montant_total, 0);
      return sendJson(res, 200, {
        type_rapport: "TICKET_X_INTERMEDIAIRE",
        data: {
          session,
          nombre_ventes: VENTES.length,
          chiffre_affaires_total: VENTES.reduce((t, v) => t + v.montant_total, 0),
          especes_theoriques: session.fond_caisse_ouverture + somme("especes"),
          mobile_money: somme("mobile_money"),
          carte_bancaire: somme("carte"),
        },
      });
    }
  }
  if (path === "/api/caisse/ventes" && method === "POST") {
    const b = await parseBody(req);
    const besoins = new Map();
    for (const ligne of b.lignes || []) {
      if (!Number.isInteger(ligne.quantite) || ligne.quantite <= 0) return sendJson(res, 422, {message: "La quantité doit être un entier positif."});
      besoins.set(ligne.produit_id, (besoins.get(ligne.produit_id) || 0) + ligne.quantite);
    }
    for (const [id, besoin] of besoins) {
      if (LOTS.filter(l => l.produit_id === id && l.est_vendable).reduce((n,l) => n + l.quantite_disponible, 0) < besoin) return sendJson(res, 422, {message: "Stock vendable insuffisant : les lots périmés et isolés sont exclus."});
    }

    if (!b.lignes || !b.lignes.length) {
      return sendJson(res, 422, { message: "La vente doit comporter au moins une ligne.", errors: { lignes: ["Champ obligatoire."] } });
    }
    const session = SESSIONS_CAISSE.find(s => s.statut === "ouverte");
    if (!session) {
      return sendJson(res, 422, { message: "Aucune session de caisse ouverte : ouvrez la caisse avant d'encaisser." });
    }
    const lignes = b.lignes.map((l, i) => {
      const produit = PRODUITS.find(p => p.id === l.produit_id) || PRODUITS[0];
      const prix = produit.prix_public_ttc || 0;
      return {
        id: `vl${VENTES.length}${i}`,
        produit_id: produit.id,
        quantite: l.quantite,
        prix_unitaire_ttc: prix,
        montant_ligne: prix * l.quantite,
        produit: { nom_commercial: produit.nom_commercial, dosage: produit.dosage },
      };
    });
    const total = lignes.reduce((t, l) => t + l.montant_ligne, 0);
    const numero = `TICKET-2026-${String(143 + VENTES.length).padStart(4, "0")}`;
    const vente = {
      id: "v" + (VENTES.length + 1),
      numero_ticket: numero,
      date_vente: new Date().toISOString(),
      client_nom: b.client_nom || "Client comptoir",
      client_ifu: b.client_ifu || null,
      mode_reglement: b.mode_reglement,
      montant_total: total,
      montant_recu: b.montant_recu ?? total,
      monnaie_rendue: Math.max(0, (b.montant_recu ?? total) - total),
      caissier: { id: utilisateurCourant(req).id, name: utilisateurCourant(req).name },
      lignes,
      facture_emecef: {
        numero_facture: `DGI-2026-${String(1235 + VENTES.length).padStart(6, "0")}`,
        qr_code_data: `BEN-DGI|MECEF|2026|${numero}|${total}`,
      },
    };
    for (const [id, besoin] of besoins) {
      let restant = besoin;
      for (const lot of LOTS.filter(l => l.produit_id === id && l.est_vendable).sort((a,b) => a.date_peremption.localeCompare(b.date_peremption))) {
        const q = Math.min(restant, lot.quantite_disponible); lot.quantite_disponible -= q; restant -= q; if (!restant) break;
      }
    }
    VENTES.unshift(vente);
    session.ventes = VENTES;
    FACTURES_EMECEF.unshift({
      id: "f" + (FACTURES_EMECEF.length + 1),
      numero_facture: vente.facture_emecef.numero_facture,
      vente_id: vente.id,
      montant_total: total,
      regime_tva: "B_TAXABLE",
      statut_dgi: "certifiee",
      qr_code_data: vente.facture_emecef.qr_code_data,
      date_certification: new Date().toISOString(),
      vente,
    });
    ECRITURES.unshift(
      { id: "ec" + (ECRITURES.length + 1), numero_compte: "571100", libelle_compte: "Caisse espèces", date_piece: vente.date_vente.slice(0, 10), libelle_piece: `Vente comptoir ${numero}`, debit: total, credit: 0 },
      { id: "ec" + (ECRITURES.length + 2), numero_compte: "701000", libelle_compte: "Ventes de marchandises", date_piece: vente.date_vente.slice(0, 10), libelle_piece: `Vente comptoir ${numero}`, debit: 0, credit: total },
    );
    return sendJson(res, 201, {
      status: "success",
      message: `Vente encaissée  :  ticket ${numero}`,
      data: vente,
    });
  }

  // ─── FACTURATION & COMPTABILITÉ
  if (path === "/api/facturation/emecef" && method === "GET") {
    return sendJson(res, 200, { status: "success", data: paginer(FACTURES_EMECEF, 1, 25) });
  }
  if (path === "/api/comptabilite/journal-ventes" && method === "GET") {
    const comptes = {};
    for (const e of ECRITURES) {
      const c = (comptes[e.numero_compte] ||= { numero_compte: e.numero_compte, libelle_compte: e.libelle_compte, total_debit: 0, total_credit: 0 });
      c.total_debit += e.debit;
      c.total_credit += e.credit;
    }
    return sendJson(res, 200, { status: "success", data: paginer(ECRITURES), balance: Object.values(comptes) });
  }
  if (path === "/api/comptabilite/clotures" && method === "GET") {
    const fermees = SESSIONS_CAISSE.filter(s => s.statut === "fermee");
    return sendJson(res, 200, { status: "success", data: paginer(fermees, 1, 20) });
  }

  // ─── DISPENSATIONS
  if (path === "/api/dispensations" && method === "GET") {
    return sendJson(res, 200, { status: "success", data: paginer(DISPENSATIONS) });
  }
  if (/^\/api\/dispensations\/[^/]+\/viser$/.test(path) && method === "POST") {
    const token = (req.headers.authorization || "").replace(/^Bearer /, "");
    const user = Object.values(DEMO_USERS).find(u => token === "demo-token-" + u.id);
    if (!user) return sendJson(res, 401, { message: "Connexion requise." });
    if (!["pharmacien_titulaire", "pharmacien_adjoint", "promoteur"].includes(user.role)) return sendJson(res, 403, { message: "Visa réservé au pharmacien habilité." });
    const ligne = DISPENSATIONS.find(d => d.id === path.split("/")[3] && user.officines.includes(d.officine_id));
    if (!ligne) return sendJson(res, 404, { message: "Dispensation introuvable." });
    ligne.pharmacien_id = user.id;
    ligne.pharmacien = { id: user.id, name: user.name };
    return sendJson(res, 200, { status: "success", mode_demo: true, message: "Visa de démonstration enregistré.", data: ligne });
  }
  if (path === "/api/dispensations" && method === "POST") {
    const b = await parseBody(req);
    const besoins = new Map();
    for (const ligne of b.lignes || []) {
      if (!Number.isInteger(ligne.quantite) || ligne.quantite <= 0) return sendJson(res, 422, {message: "La quantité doit être un entier positif."});
      besoins.set(ligne.produit_id, (besoins.get(ligne.produit_id) || 0) + ligne.quantite);
    }
    for (const [id, besoin] of besoins) {
      if (LOTS.filter(l => l.produit_id === id && l.est_vendable).reduce((n,l) => n + l.quantite_disponible, 0) < besoin) return sendJson(res, 422, {message: "Stock vendable insuffisant : les lots périmés et isolés sont exclus."});
    }

    if (!b.patient_nom) {
      return sendJson(res, 422, { message: "Le nom du patient est obligatoire.", errors: { patient_nom: ["Champ obligatoire."] } });
    }
    if (!b.lignes || !b.lignes.length) {
      return sendJson(res, 422, { message: "La dispensation doit comporter au moins une ligne.", errors: { lignes: ["Champ obligatoire."] } });
    }
    const lignes = b.lignes.map((l, i) => {
      const produit = PRODUITS.find(p => p.id === l.produit_id) || PRODUITS[0];
      return {
        id: `dl${DISPENSATIONS.length}${i}`,
        produit_id: produit.id,
        quantite: l.quantite,
        posologie: l.posologie || null,
        duree_traitement: l.duree_traitement || null,
        produit: { nom_commercial: produit.nom_commercial, dosage: produit.dosage },
      };
    });
    const dispensation = {
      id: "disp" + (DISPENSATIONS.length + 1),
      numero_dispensation: `DISP-2026-${String(8 + DISPENSATIONS.length).padStart(4, "0")}`,
      ...b,
      officine_id: "off1",
      lignes,
      montant_total: lignes.reduce((t, l) => t + (PRODUITS.find(p => p.id === l.produit_id)?.prix_public_ttc || 0) * l.quantite, 0),
      statut: "delivree",
      date_dispensation: new Date().toISOString(),
    };
    for (const [id, besoin] of besoins) {
      let restant = besoin;
      for (const lot of LOTS.filter(l => l.produit_id === id && l.est_vendable).sort((a,b) => a.date_peremption.localeCompare(b.date_peremption))) {
        const q = Math.min(restant, lot.quantite_disponible); lot.quantite_disponible -= q; restant -= q; if (!restant) break;
      }
    }
    DISPENSATIONS.unshift(dispensation);
    return sendJson(res, 201, { status: "success", message: `Dispensation ${dispensation.numero_dispensation} enregistrée.`, data: dispensation });
  }

  // ─── MODÈLES BPD
  if (path === "/api/modeles-bpd" && method === "GET") {
    return sendJson(res, 200, MODELES_BPD);
  }

  // ─── ÉCHÉANCES
  if (path === "/api/echeances" && method === "GET") {
    return sendJson(res, 200, ECHEANCES.filter(e => !e.archived));
  }
  {
    const m = path.match(/^\/api\/echeances\/([^/]+)$/);
    if (m && method === "PUT") {
      const echeance = ECHEANCES.find(e => e.id === m[1]);
      if (!echeance) return sendJson(res, 404, { message: "Échéance introuvable" });
      Object.assign(echeance, await parseBody(req));
      return sendJson(res, 200, echeance);
    }
    if (m && method === "DELETE") {
      const echeance = ECHEANCES.find(e => e.id === m[1]);
      if (!echeance) return sendJson(res, 404, { message: "Échéance introuvable" });
      echeance.archived = true;
      return sendJson(res, 200, { message: "Échéance archivée." });
    }
  }

  // ─── JOURNAL D'AUDIT
  if (path === "/api/audit-logs" && method === "GET") {
    return sendJson(res, 200, filtrerJournal(url));
  }

  // DIVERS  :  une route it non implémentée doit se voir tout de suite, pas
  // renvoyer un tableau vide qui laisse croire que l'écran fonctionne.
  if (path.startsWith("/api/")) {
    console.error(`[MOCK] route non implémentée : ${method} ${path}`);
    return sendJson(res, 501, {
      status: "error",
      message: `Route de démonstration absente du mock : ${method} ${path}`,
    });
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Not found mock" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[MOCK BEGPHARMA] Backend démo écoute sur http://0.0.0.0:${PORT}  :  login Begpharma2026! / TOTP JBSWY3DPEHPK3PXP (code démo 123456)`);
});
