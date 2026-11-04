import http from "http";

const PORT = 8001;

// Données démo — extraites des seeders BEGPHARMA
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

const PRODUITS = [
  { id: "p1", code_cip: "6170123456789", code_interne: "BEG-001", nom_commercial: "Paracétamol 500mg", dci: "Paracétamol", forme: "Comprimé", dosage: "500mg", laboratoire: "Sanofi", tableau_substance: "sans", classe_produit: "standard", groupe_taxation: "B_TAXABLE", est_thermolabile: false, prix_public_ttc: 1500, prix_achat_moyen: 900, stock_total: 120, seuil_stock_min: 10, prochain_lot_fefo: { id: "l1", numero_lot: "LOT-2026-001", date_peremption: "2027-06-15", quantite_disponible: 45, jours_avant_peremption: 210, statut_peremption: "normal" } },
  { id: "p2", code_cip: "6170123456790", nom_commercial: "Amoxicilline 1g", dci: "Amoxicilline", forme: "Gélule", dosage: "1g", laboratoire: "GSK", tableau_substance: "liste_1", classe_produit: "liste_1", groupe_taxation: "B_TAXABLE", est_thermolabile: false, prix_public_ttc: 3200, stock_total: 8, seuil_stock_min: 10, alerte_rupture: true },
  { id: "p3", code_cip: "6170123456791", nom_commercial: "Insuline Rapide", dci: "Insuline", forme: "Injectable", dosage: "100UI/ml", laboratoire: "Novo Nordisk", tableau_substance: "sans", classe_produit: "thermolabile", est_thermolabile: true, prix_public_ttc: 12500, stock_total: 15, seuil_stock_min: 5 },
  { id: "p4", code_cip: "6170123456792", nom_commercial: "Tramadol 50mg", dci: "Tramadol", forme: "Gélule", dosage: "50mg", laboratoire: "Pfizer", tableau_substance: "stupefiant", classe_produit: "stupefiant", est_thermolabile: false, prix_public_ttc: 4500, stock_total: 30 },
  { id: "p5", code_cip: "6170123456793", nom_commercial: "Diazépam 10mg", dci: "Diazépam", forme: "Comprimé", dosage: "10mg", laboratoire: "Roche", tableau_substance: "liste_2", classe_produit: "psychotrope", est_thermolabile: false, prix_public_ttc: 2800, stock_total: 22 },
];

const LOTS = [
  { id: "l1", produit_id: "p1", numero_lot: "LOT-2026-001", date_peremption: "2027-06-15", date_reception: "2026-10-20", quantite_disponible: 45, quantite_initiale: 50, emplacement: "Réserve — Stock principal", fournisseur_nom: "CAMEG BÉNIN", bon_livraison_ref: "BL-2026-1045", statut: "en_stock", statut_detail: "commercialisable", statut_effectif: "commercialisable", est_vendable: true, jours_avant_peremption: 210, statut_peremption: "normal", produit: PRODUITS[0] },
  { id: "l2", produit_id: "p1", numero_lot: "LOT-2026-002", date_peremption: "2026-12-10", date_reception: "2026-11-01", quantite_disponible: 12, quantite_initiale: 30, emplacement: "Comptoir — Délivrance", fournisseur_nom: "UBIPHARM BÉNIN", bon_livraison_ref: "BL-2026-1046", statut: "en_stock", statut_detail: "commercialisable", statut_effectif: "commercialisable", est_vendable: true, jours_avant_peremption: 28, statut_peremption: "critique_1m", produit: PRODUITS[0] },
  { id: "l3", produit_id: "p2", numero_lot: "LOT-2026-003", date_peremption: "2026-11-30", date_reception: "2026-09-15", quantite_disponible: 8, quantite_initiale: 20, emplacement: "Réserve — Stock principal", fournisseur_nom: "CAMEG BÉNIN", bon_livraison_ref: "BL-2026-1047", statut: "quarantaine", statut_detail: "quarantaine", statut_effectif: "quarantaine", est_vendable: false, motif_quarantaine: "Rappel lot fabricant — vérification ABMed", jours_avant_peremption: 18, statut_peremption: "critique_1m", produit: PRODUITS[1] },
  { id: "l4", produit_id: "p3", numero_lot: "LOT-2026-004", date_peremption: "2027-01-20", date_reception: "2026-11-02", quantite_disponible: 15, quantite_initiale: 15, emplacement: "Réfrigérateur 2°C–8°C", fournisseur_nom: "LABOREX BÉNIN", bon_livraison_ref: "BL-2026-1048", statut: "en_stock", statut_detail: "commercialisable", statut_effectif: "commercialisable", est_vendable: true, jours_avant_peremption: 68, statut_peremption: "alerte_3m", produit: PRODUITS[2] },
];

const EMPLACEMENTS = [
  { id: "e1", code: "COMPTOIR", libelle: "Comptoir — Délivrance", type_zone: "comptoir", lots_count: 1 },
  { id: "e2", code: "RESERVE", libelle: "Réserve — Stock principal", type_zone: "reserve", lots_count: 2 },
  { id: "e3", code: "FRIGO", libelle: "Réfrigérateur 2°C–8°C", type_zone: "frigo", lots_count: 1 },
  { id: "e4", code: "ARMOIRE", libelle: "Armoire sécurisée — Stupéfiants & Listes", type_zone: "armoire_securisee", lots_count: 0 },
  { id: "e5", code: "ATTENTE", libelle: "Zone d'attente de contrôle", type_zone: "attente_controle", lots_count: 0 },
  { id: "e6", code: "RETOURS", libelle: "Zone des retours fournisseur", type_zone: "retours", lots_count: 0 },
  { id: "e7", code: "DECHETS", libelle: "Aire des déchets sécurisée", type_zone: "dechets", lots_count: 0 },
];

const MOUVEMENTS = [
  { id: "m1", type_mouvement: "entree_reception", quantite: 50, stock_avant: 0, stock_apres: 50, motif: "Réception conforme — commercialisable", reference_piece: "BL-2026-1045", created_at: "2026-10-20T10:00:00Z", produit: PRODUITS[0], lot: LOTS[0], auteur: { name: "Dr. Marcelle HOUNNOU" } },
  { id: "m2", type_mouvement: "vente", quantite: -5, stock_avant: 50, stock_apres: 45, motif: "Vente FEFO — lot LOT-2026-001", reference_piece: "TICKET-2026-001", created_at: "2026-11-03T14:30:00Z", produit: PRODUITS[0], lot: LOTS[0], auteur: { name: "Gervais KPADONOU" } },
  { id: "m3", type_mouvement: "changement_statut", quantite: 0, stock_avant: 8, stock_apres: 8, motif: "Statut: commercialisable → quarantaine — Rappel lot fabricant", reference_piece: "RAPPEL-2026-0001", created_at: "2026-11-02T09:00:00Z", produit: PRODUITS[1], lot: LOTS[2], auteur: { name: "Dr. Anicet ANIAMBOSSOU" } },
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
      { id: "pr1", numero_preparation: "PREP-2026-0001", nom_preparation: "Pâte à l'eau", type_preparation: "officinale", formule_detaillee: "Oxyde de zinc 20g, Talc 20g, Glycérine 20g, Eau purifiée qsp 100g", quantite_produite: "100g", conditionnement: "Pot hermétique", date_fabrication: "2026-11-01", date_limite_utilisation: "2026-12-01", patient_nom: null, prescripteur_nom: null, conforme: true, executant: { name: "Dr. Marcelle HOUNNOU" }, pharmacien_visa: { name: "Dr. Marcelle HOUNNOU" } },
      { id: "pr2", numero_preparation: "PREP-2026-0002", nom_preparation: "Sirop de Pholcodine", type_preparation: "magistrale", formule_detaillee: "Pholcodine 100mg, Saccharose, Arôme cerise, Eau purifiée qsp 200ml", quantite_produite: "200ml", conditionnement: "Flacon teinté hermétique", date_fabrication: "2026-11-03", date_limite_utilisation: "2026-11-17", patient_nom: "Enfant M. D.", prescripteur_nom: "Dr. ADJASSA", conforme: true, executant: { name: "Gervais KPADONOU" }, pharmacien_visa: null },
    ],
    total: 2
  }
};

function sendJson(res, status, data) {
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
  console.log(`[MOCK] ${method} ${path}`);

  // AUTH — login
  if (path === "/api/auth/login" && method === "POST") {
    const body = await parseBody(req);
    const user = DEMO_USERS[body.email];
    if (!user || body.password !== "Begpharma2026!") {
      return sendJson(res, 401, { message: "Identifiants invalides" });
    }
    if (user.mfa) {
      return sendJson(res, 200, { mfa_required: true, temp_token: "temp-demo-" + user.id, message: "Code TOTP requis (démo: 123456 ou app JBSWY3DPEHPK3PXP)" });
    }
    return sendJson(res, 200, { token: "demo-token-" + user.id, user: { id: user.id, name: user.name, email: user.email, mfa_enabled: user.mfa }, officines: OFFICINES.filter(o => user.officines.includes(o.id)) });
  }
  if (path === "/api/auth/verify-mfa" && method === "POST") {
    const body = await parseBody(req);
    // accept any 6-digit code in demo, or 123456
    const tempToken = req.headers.authorization?.replace("Bearer ", "") || body.temp_token;
    // find user by temp token
    const user = Object.values(DEMO_USERS).find(u => tempToken?.includes(u.id)) || DEMO_USERS["promoteur@begpharma.bj"];
    return sendJson(res, 200, { token: "demo-token-" + user.id, user: { id: user.id, name: user.name, email: user.email, mfa_enabled: true }, officines: OFFICINES.filter(o => user.officines.includes(o.id)) });
  }
  if (path === "/api/auth/register" && method === "POST") {
    return sendJson(res, 201, { message: "Inscription réussie", token: "demo-token-new", user: { id: "new", name: "Nouveau", email: "new@begpharma.bj" }, officines: [OFFICINES[0]] });
  }
  if (path === "/api/auth/me" && method === "GET") {
    const auth = req.headers.authorization || "";
    const uid = auth.includes("u1") ? "u1" : auth.includes("u2") ? "u2" : auth.includes("u3") ? "u3" : "u1";
    const user = Object.values(DEMO_USERS).find(u => u.id === uid) || DEMO_USERS["promoteur@begpharma.bj"];
    return sendJson(res, 200, { user: { id: user.id, name: user.name, email: user.email, telephone: "+229 97 00 00 01" }, officines: OFFICINES.filter(o => user.officines.includes(o.id)) });
  }
  if (path === "/api/auth/logout" && method === "POST") {
    return sendJson(res, 200, { message: "Déconnecté" });
  }
  if (path === "/api/auth/devices" && method === "GET") {
    return sendJson(res, 200, { data: [{ id: "d1", libelle: "Chrome · Windows", derniere_activite: new Date().toISOString(), actif: true }] });
  }

  // OFFICINES
  if (path === "/api/officines" && method === "GET") {
    return sendJson(res, 200, { data: OFFICINES });
  }

  // PRODUITS
  if (path === "/api/produits" && method === "GET") {
    return sendJson(res, 200, { status: "success", data: PRODUITS });
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
    let filtered = [...LOTS];
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
    const newLot = { id: "l" + Date.now(), produit_id: b.produit_id, numero_lot: b.numero_lot, date_peremption: b.date_peremption, quantite_disponible: b.quantite, quantite_initiale: b.quantite, emplacement: b.emplacement || "Réserve", fournisseur_nom: b.fournisseur_nom, bon_livraison_ref: b.bon_livraison_ref, statut: b.controles_reception && Object.values(b.controles_reception).every(Boolean) ? "en_stock" : "quarantaine", statut_detail: b.controles_reception && Object.values(b.controles_reception).every(Boolean) ? "commercialisable" : "en_attente_controle", statut_effectif: b.controles_reception && Object.values(b.controles_reception).every(Boolean) ? "commercialisable" : "en_attente_controle", est_vendable: !!(b.controles_reception && Object.values(b.controles_reception).every(Boolean)), jours_avant_peremption: Math.floor((new Date(b.date_peremption) - new Date())/86400000), statut_peremption: "normal", produit: prod, prix_achat_unitaire: b.prix_achat_unitaire || 900 };
    LOTS.push(newLot);
    MOUVEMENTS.unshift({ id: "m"+Date.now(), type_mouvement: "entree_reception", quantite: b.quantite, stock_avant: 0, stock_apres: b.quantite, motif: "Réception contrôlée", reference_piece: b.bon_livraison_ref, created_at: new Date().toISOString(), produit: prod, lot: newLot, auteur: { name: "Démo" } });
    return sendJson(res, 201, { status: "success", message: `Lot ${newLot.numero_lot} réceptionné — FEFO appliqué`, data: newLot });
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
  if (path === "/api/stocks/peremptions" && method === "GET") {
    const now = new Date();
    const a1 = LOTS.filter(l => { const d=new Date(l.date_peremption); const diff=(d-now)/86400000; return diff>=0 && diff<=30; });
    const a3 = LOTS.filter(l => { const d=new Date(l.date_peremption); const diff=(d-now)/86400000; return diff>30 && diff<=90; });
    const a6 = LOTS.filter(l => { const d=new Date(l.date_peremption); const diff=(d-now)/86400000; return diff>90 && diff<=180; });
    return sendJson(res, 200, { status: "success", data: { a_1_mois: a1, a_3_mois: a3, a_6_mois: a6, perimes: [] } });
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
    return sendJson(res, 201, { status: "success", message: `Ligne #${String(newNum).padStart(4,"0")} inscrite — immuable après visa`, data: newM });
  }
  if (path.match(/^\/api\/stupefiants\/[^\/]+\/viser$/) && method === "POST") {
    const id = path.split("/")[3];
    const m = STUPEFIANTS.data.data.find(x=> x.id===id);
    if (m) { m.pharmacien_visa = { name: "Dr. Marcelle HOUNNOU" }; m.date_visa = new Date().toISOString(); return sendJson(res, 200, { status: "success", message: "Visa apposé — ligne verrouillée", data: m }); }
    // try s id is after /stupefiants/inventaire etc — already handled
    return sendJson(res, 404, { message: "Non trouvé" });
  }
  if (path.match(/^\/api\/stupefiants\/[^\/]+\/rectificative$/) && method === "POST") {
    return sendJson(res, 201, { status: "success", message: "Rectificative créée", data: { id: "rect"+Date.now() } });
  }
  if (path === "/api/stupefiants/inventaire" && method === "POST") {
    return sendJson(res, 201, { status: "success", alerte_ecart: false, message: "Concordance parfaite", data: null });
  }
  if (path === "/api/stupefiants/declaration-vol" && method === "POST") {
    return sendJson(res, 201, { status: "success", message: "Déclaration enregistrée — alerte promoteur SMS/push", data: {} });
  }
  if (path === "/api/stupefiants/demande-destruction" && method === "POST") {
    return sendJson(res, 201, { status: "success", message: "Destruction enregistrée — PV à signer", data: {} });
  }

  // PREPARATIONS
  if (path === "/api/preparations" && method === "GET") {
    return sendJson(res, 200, PREPARATIONS);
  }
  if (path === "/api/preparations" && method === "POST") {
    const b = await parseBody(req);
    const newPrep = { id: "pr"+Date.now(), numero_preparation: `PREP-2026-${String(PREPARATIONS.data.data.length+1).padStart(4,"0")}`, nom_preparation: b.nom_preparation, type_preparation: b.type_preparation, formule_detaillee: b.formule_detaillee, quantite_produite: b.quantite_produite, conditionnement: b.conditionnement, date_fabrication: b.date_fabrication, date_limite_utilisation: b.date_limite_utilisation, patient_nom: b.patient_nom, prescripteur_nom: b.prescripteur_nom, conforme: true, controles_effectues: b.controles_effectues, executant: { name: "Démo" }, pharmacien_visa: null };
    PREPARATIONS.data.data.unshift(newPrep);
    return sendJson(res, 201, { status: "success", message: `Préparation ${newPrep.numero_preparation} inscrite`, data: newPrep });
  }
  if (path.match(/^\/api\/preparations\/[^\/]+\/viser$/) && method === "POST") {
    const id = path.split("/")[3];
    const p = PREPARATIONS.data.data.find(x=> x.id===id);
    if (p) { p.pharmacien_visa = { name: "Dr. Marcelle HOUNNOU" }; return sendJson(res, 200, { status: "success", message: "Libérée & visée", data: p }); }
    return sendJson(res, 404, { message: "Non trouvé" });
  }

  // INVENTAIRES etc — mock empty
  if (path === "/api/inventaires" && method === "GET") return sendJson(res, 200, { status: "success", data: { data: [], total: 0 } });
  if (path === "/api/inventaires" && method === "POST") return sendJson(res, 201, { status: "success", message: "Inventaire créé", data: { id: "inv1", reference: "INV-2026-0001" } });
  if (path === "/api/rappels" && method === "GET") return sendJson(res, 200, { status: "success", data: { data: [] } });
  if (path === "/api/rappels" && method === "POST") return sendJson(res, 201, { status: "success", message: "Rappel bloqué", data: {} });
  if (path === "/api/dechets" && method === "GET") return sendJson(res, 200, { status: "success", data: { data: [] } });
  if (path === "/api/dechets" && method === "POST") return sendJson(res, 201, { status: "success", message: "Lot déchet constitué", data: {} });

  // DIVERS
  if (path.startsWith("/api/")) {
    console.log("Mock fallback for", path);
    return sendJson(res, 200, { status: "success", data: [], message: "Mock fallback — démo" });
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Not found mock" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[MOCK BEGPHARMA] Backend démo écoute sur http://0.0.0.0:${PORT} — login Begpharma2026! / TOTP JBSWY3DPEHPK3PXP (code démo 123456)`);
});
