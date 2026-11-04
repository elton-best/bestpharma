#!/usr/bin/env node
/**
 * Banc de compatibilité frontend ↔ backend BEGPHARMA.
 *
 * PHP n'est pas disponible dans cet environnement : ce script rejoue donc, à la
 * main, les routes de `backend/routes/api.php` telles que le frontend les
 * appelle, avec les mêmes charges utiles et les mêmes formes de réponse.
 *
 * Deux contrôles :
 *   1. contrat de routes : chaque chemin appelé par le frontend existe bien dans
 *      api.php avec le bon verbe ;
 *   2. contrat de données : chaque appel renvoie une enveloppe exploitable
 *      (`data`, `data.data` pour les paginateurs Laravel, champs attendus).
 *
 * Usage : node scripts/verifier-contrats-api.mjs [--base http://127.0.0.1:8001]
 */
import fs from "node:fs";
import path from "node:path";

const racine = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), "..");
const baseUrl = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://127.0.0.1:8001";

// ───────────────────────────────────────────────────────────────────────────
// 1. Contrat de routes : ce que le frontend appelle doit exister côté Laravel
// ───────────────────────────────────────────────────────────────────────────

const lireRoutesLaravel = () => {
  const php = fs.readFileSync(path.join(racine, "backend/routes/api.php"), "utf8");
  const routes = new Set();
  const re = /Route::(get|post|put|patch|delete)\(\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(php))) {
    const chemin = "/" + m[2].replace(/^\/+/, "").replace(/\{[^}]+\}/g, ":id");
    routes.add(`${m[1].toUpperCase()} ${chemin}`);
  }
  return routes;
};

const appelsFrontend = () => {
  const appels = new Set();
  const fichiers = [];
  const parcourir = (dossier) => {
    for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
      const complet = path.join(dossier, entree.name);
      if (entree.isDirectory()) parcourir(complet);
      // la couche de compatibilité historique a disparu : hors contrat
      else if (/\.tsx?$/.test(entree.name) && !complet.includes("integrations/supabase")) {
        fichiers.push(complet);
      }
    }
  };
  parcourir(path.join(racine, "frontend/src"));

  const re = /api\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*[`"]\/?(?:api\/)?([^`"]+)[`"]/g;
  for (const fichier of fichiers) {
    const texte = fs.readFileSync(fichier, "utf8");
    let m;
    while ((m = re.exec(texte))) {
      const brut = m[2]
        // `${q}` collé à un segment en fin d'URL = chaîne de requête optionnelle
        .replace(/(?<=[^/])\$\{[^}]*\}$/, "")
        .replace(/\$\{[^}]*\}/g, ":id")
        .split("?")[0]
        .replace(/\/$/, "");
      const chemin = "/" + brut.replace(/\{[^}]+\}/g, ":id");
      appels.add(`${m[1].toUpperCase()} ${chemin}`);
    }
  }
  return appels;
};

// ───────────────────────────────────────────────────────────────────────────
// 2. Contrat de données : on rejoue les appels et on vérifie l'enveloppe
// ───────────────────────────────────────────────────────────────────────────

/**
 * Chaque scénario décrit un appel réel du frontend et la forme attendue.
 * `verifier` reçoit le JSON renvoyé et lève une erreur si la forme ne colle pas.
 */
const scenarios = [
  {
    nom: "Connexion",
    methode: "POST",
    chemin: "/api/auth/login",
    corps: { email: "pharmacien@begpharma.bj", password: "Begpharma2026!" },
    verifier: (j) => {
      if (!j.mfa_required && !j.token) throw new Error("ni token ni mfa_required");
      if (j.mfa_required && !j.temp_token) throw new Error("mfa_required sans temp_token");
    },
  },
  {
    nom: "Profil courant",
    methode: "GET",
    chemin: "/api/auth/me",
    verifier: (j) => {
      if (!j.user?.id) throw new Error("user.id manquant");
      if (!Array.isArray(j.officines) || j.officines.length === 0) throw new Error("officines vide");
    },
  },
  {
    nom: "Officines",
    methode: "GET",
    chemin: "/api/officines",
    // le contexte d'officine consomme un tableau brut (id, nom, pivot.role_code)
    verifier: (j) => {
      attendreTableau(j, null);
      if (!j[0]?.pivot?.role_code) throw new Error("pivot.role_code manquant");
    },
  },
  {
    nom: "Catalogue produits",
    methode: "GET",
    chemin: "/api/produits",
    verifier: (j) => {
      attendreTableau(j, "data");
      const p = j.data[0];
      for (const cle of ["id", "nom_commercial", "prix_public_ttc", "stock_total"]) {
        if (p[cle] === undefined) throw new Error(`produit sans ${cle}`);
      }
    },
  },
  {
    nom: "Lots FEFO",
    methode: "GET",
    chemin: "/api/stocks",
    verifier: (j) => {
      attendreTableau(j, "data");
      if (!j.stats || j.stats.total_lots_actifs === undefined) throw new Error("stats de péremption manquantes");
      const l = j.data[0];
      for (const cle of ["id", "numero_lot", "date_peremption", "quantite_disponible", "produit"]) {
        if (l[cle] === undefined) throw new Error(`lot sans ${cle}`);
      }
    },
  },
  {
    nom: "Réception d'un lot (contrôles OK)",
    methode: "POST",
    chemin: "/api/stocks",
    corps: {
      produit_id: "p1",
      numero_lot: "LOT-AUDIT-001",
      date_peremption: "2027-12-31",
      quantite: 10,
      fournisseur_nom: "CAMEG BÉNIN",
      bon_livraison_ref: "BL-AUDIT-001",
      emplacement: "Réserve — Stock principal",
      controles_reception: {
        alerte_sanitaire_verifiee: true,
        emballage_intact: true,
        conformite_livraison: true,
        dates_conformes: true,
        chaine_froid_respectee: true,
      },
    },
    verifier: (j) => {
      if (!j.data?.numero_lot) throw new Error("lot réceptionné non renvoyé");
      if (j.data.est_vendable !== true) throw new Error("contrôles complets mais lot non vendable");
    },
  },
  {
    nom: "Réception d'un lot (contrôles incomplets)",
    methode: "POST",
    chemin: "/api/stocks",
    corps: {
      produit_id: "p1",
      numero_lot: "LOT-AUDIT-002",
      date_peremption: "2027-12-31",
      quantite: 5,
      fournisseur_nom: "CAMEG BÉNIN",
      bon_livraison_ref: "BL-AUDIT-002",
      controles_reception: { alerte_sanitaire_verifiee: true },
    },
    verifier: (j) => {
      if (j.data.est_vendable !== false) throw new Error("contrôles incomplets mais lot vendable");
    },
  },
  {
    nom: "Changement de statut",
    methode: "PUT",
    chemin: "/api/stocks/:id/statut",
    resoudreId: "lot",
    corps: { statut: "quarantaine", motif: "Audit de conformité" },
    verifier: (j) => {
      if (j.data.statut_effectif !== "quarantaine" && j.data.statut_detail !== "quarantaine") {
        throw new Error("statut non appliqué");
      }
    },
  },
  {
    nom: "Alerte magasin",
    methode: "GET",
    chemin: "/api/stocks/alertes",
    verifier: (j) => {
      if (j.data.ruptures === undefined) throw new Error("ruptures manquant");
    },
  },
  {
    nom: "Valorisation",
    methode: "GET",
    chemin: "/api/stocks/valorisation",
    verifier: (j) => {
      if (typeof j.data.total !== "number") throw new Error("total manquant");
      attendreTableau(j.data, "par_produit");
    },
  },
  {
    nom: "Péremptions",
    methode: "GET",
    chemin: "/api/stocks/peremptions",
    verifier: (j) => {
      for (const cle of ["a_1_mois", "a_3_mois", "a_6_mois", "perimes"]) {
        if (!Array.isArray(j.data[cle])) throw new Error(`${cle} n'est pas un tableau`);
      }
    },
  },
  {
    nom: "Emplacements",
    methode: "GET",
    chemin: "/api/emplacements",
    verifier: (j) => attendreTableau(j, "data"),
  },
  {
    nom: "Journal des mouvements",
    methode: "GET",
    chemin: "/api/mouvements",
    verifier: (j) => {
      const lignes = j.data?.data ?? j.data;
      if (!Array.isArray(lignes)) throw new Error("ni data.data ni data");
    },
  },
  {
    nom: "Inventaires (liste)",
    methode: "GET",
    chemin: "/api/inventaires",
    verifier: (j) => attendreTableau(j.data ?? {}, "data"),
  },
  {
    nom: "Inventaire (détail + lignes)",
    methode: "GET",
    chemin: "/api/inventaires/:inv",
    resoudreId: "inventaire",
    verifier: (j) => {
      if (!Array.isArray(j.data?.lignes)) throw new Error("lignes manquantes");
      const l = j.data.lignes[0];
      if (!l) throw new Error("aucune ligne dans l'inventaire");
      for (const cle of ["id", "quantite_theorique", "produit"]) {
        if (l[cle] === undefined) throw new Error(`ligne sans ${cle}`);
      }
    },
  },
  {
    nom: "Compter une ligne d'inventaire",
    methode: "POST",
    chemin: "/api/inventaires/:inv/lignes/:ligne/compter",
    resoudreId: "ligneInventaire",
    corps: { quantite_comptee: 3, commentaire: "Comptage d'audit" },
    verifier: (j) => {
      if (j.data.quantite_comptee !== 3) throw new Error("quantité comptée non enregistrée");
      if (j.data.ecart === undefined) throw new Error("écart non calculé");
    },
  },
  {
    nom: "Créer une campagne d'inventaire",
    methode: "POST",
    chemin: "/api/inventaires",
    corps: { type: "tournant", zone: "Réserve — Stock principal", date_inventaire: "2026-11-04", double_comptage: true, comptage_aveugle: false },
    verifier: (j) => {
      if (!j.data?.reference) throw new Error("référence manquante");
    },
  },
  {
    nom: "Rappels (liste)",
    methode: "GET",
    chemin: "/api/rappels",
    verifier: (j) => attendreTableau(j.data ?? {}, "data"),
  },
  {
    nom: "Saisir un avis de rappel",
    methode: "POST",
    chemin: "/api/rappels",
    corps: {
      source: "Audit ABMed",
      produits_concernes: "Paracétamol 500mg",
      lots_concernes: [{ numero_lot: "LOT-AUDIT-001" }],
      date_avis: "2026-11-04",
      action_requise: "Retrait immédiat",
    },
    verifier: (j) => {
      if (!j.data?.reference) throw new Error("référence manquante");
      if (j.lots_bloques === 0) throw new Error("aucun lot bloqué alors que le numéro existe");
    },
  },
  {
    nom: "Déchets (liste)",
    methode: "GET",
    chemin: "/api/dechets",
    verifier: (j) => attendreTableau(j.data ?? {}, "data"),
  },
  {
    nom: "Lots non vendables (pour constituer un déchet)",
    methode: "GET",
    chemin: "/api/stocks?vendable=false",
    verifier: (j) => attendreTableau(j, "data"),
  },
  {
    nom: "Constituer un lot de déchets",
    methode: "POST",
    chemin: "/api/dechets",
    corps: { motif: "perime", lots_ids: [":lotId"], prestataire_nom: "Prestataire d'audit", date_destruction_prevue: "2026-12-01" },
    verifier: (j) => {
      if (!j.data?.reference) throw new Error("référence manquante");
      if (j.data.valeur_perte === undefined) throw new Error("perte non valorisée");
    },
  },
  {
    nom: "Préparations (liste)",
    methode: "GET",
    chemin: "/api/preparations",
    verifier: (j) => attendreTableau(j.data ?? {}, "data"),
  },
  {
    nom: "Créer une préparation avec matières premières",
    methode: "POST",
    chemin: "/api/preparations",
    corps: {
      nom_preparation: "Préparation d'audit",
      type_preparation: "magistrale",
      formule_detaillee: "Talc 20 g, eau qsp 100 g",
      matieres_premieres_lots: [{ matiere: "Talc", lot: "MP-AUDIT", fournisseur: "Cooper", quantite: "20 g" }],
      quantite_produite: "100 g",
      conditionnement: "Pot hermétique",
      date_fabrication: "2026-11-04",
      date_limite_utilisation: "2026-12-04",
      controles_effectues: "Aspect conforme",
      conforme: true,
    },
    verifier: (j) => {
      if (!j.data?.numero_preparation) throw new Error("numéro de préparation manquant");
    },
  },
  {
    nom: "Registre stupéfiants",
    methode: "GET",
    chemin: "/api/stupefiants",
    verifier: (j) => {
      if (!j.data || !Array.isArray(j.data.data)) throw new Error("data.data manquant");
      if (!Array.isArray(j.balance_produits)) throw new Error("balance_produits manquante");
    },
  },
  {
    nom: "Balance stupéfiants",
    methode: "GET",
    chemin: "/api/stupefiants/balance",
    verifier: (j) => {
      if (!j.data) throw new Error("data manquant");
    },
  },
  {
    nom: "Ordonnancier",
    methode: "GET",
    chemin: "/api/stupefiants/ordonnancier",
    verifier: (j) => attendreTableau(j.data ?? {}, "data"),
  },
  {
    nom: "Armoire sécurisée",
    methode: "GET",
    chemin: "/api/stupefiants/armoire",
    verifier: (j) => {
      if (!j.data) throw new Error("data manquant");
    },
  },
  {
    nom: "Mouvement manuel stupéfiant",
    methode: "POST",
    chemin: "/api/stupefiants",
    corps: {
      produit_id: "p4",
      type_mouvement: "ajustement_inventaire",
      quantite: 1,
      reference_piece: "PV-AUDIT-001",
      observations: "Audit",
    },
    verifier: (j) => {
      if (!j.data?.numero_ordre) throw new Error("numéro d'ordre manquant");
    },
  },
  {
    nom: "Inventaire stupéfiants",
    methode: "POST",
    chemin: "/api/stupefiants/inventaire",
    corps: { produit_id: "p4", quantite_physique: 14, commentaire: "Audit" },
    verifier: (j) => {
      if (!j.data) throw new Error("data manquant");
    },
  },
  {
    nom: "Session de caisse active",
    methode: "GET",
    chemin: "/api/caisse/session-active",
    verifier: (j) => {
      if (!("data" in j)) throw new Error("data manquant");
    },
  },
  {
    nom: "Ouvrir la caisse",
    // une seule session ouverte à la fois : on clôture celle du passage précédent
    avant: async () => {
      const etat = await requete("GET", "/api/caisse/session-active");
      if (etat.data) {
        await requete("POST", `/api/caisse/session/${etat.data.id}/fermer`, {
          fond_caisse_fermeture_reel: etat.data.fond_caisse_ouverture,
        });
      }
    },
    methode: "POST",
    chemin: "/api/caisse/ouvrir",
    corps: { fond_caisse_ouverture: 20000 },
    verifier: (j) => {
      if (!j.data?.numero_session) throw new Error("numéro de session manquant");
      if (j.data.statut !== "ouverte") throw new Error("session non ouverte");
    },
  },
  {
    nom: "Encaisser une vente",
    methode: "POST",
    chemin: "/api/caisse/ventes",
    corps: {
      client_nom: "Client Audit",
      client_ifu: null,
      mode_reglement: "especes",
      montant_recu: 5000,
      mobile_operateur: null,
      mobile_telephone: null,
      lignes: [{ produit_id: "p1", quantite: 2 }],
    },
    verifier: (j) => {
      if (!j.data?.numero_ticket) throw new Error("numéro de ticket manquant");
      if (!j.data.facture_emecef && !j.data.factureEmecef) throw new Error("facture e-MECeF manquante");
    },
  },
  {
    nom: "Fermer la caisse",
    methode: "POST",
    chemin: "/api/caisse/session/:session/fermer",
    resoudreId: "session",
    corps: { fond_caisse_fermeture_reel: 21000, notes_cloture: "Clôture d'audit" },
    verifier: (j) => {
      if (j.data?.statut !== "fermee") throw new Error("session non fermée");
      if (j.data.ecart_caisse === undefined) throw new Error("écart de caisse non calculé");
    },
  },
  {
    nom: "Factures e-MECeF",
    methode: "GET",
    chemin: "/api/facturation/emecef",
    verifier: (j) => attendreTableau(j.data ?? {}, "data"),
  },
  {
    nom: "Journal comptable",
    methode: "GET",
    chemin: "/api/comptabilite/journal-ventes",
    verifier: (j) => {
      attendreTableau(j.data ?? {}, "data");
      if (!Array.isArray(j.balance)) throw new Error("balance des comptes manquante");
    },
  },
  {
    nom: "Clôtures de caisse",
    methode: "GET",
    chemin: "/api/comptabilite/clotures",
    verifier: (j) => attendreTableau(j.data ?? {}, "data"),
  },
  {
    nom: "Dispensations",
    methode: "GET",
    chemin: "/api/dispensations",
    verifier: (j) => attendreTableau(j.data ?? {}, "data"),
  },
  {
    nom: "Créer une dispensation",
    methode: "POST",
    chemin: "/api/dispensations",
    corps: {
      type_dispensation: "ordonnance",
      patient_nom: "Patient Audit",
      patient_age: 32,
      patient_telephone: "+22997000000",
      prescripteur_nom: "Dr Audit",
      prescripteur_titre: "Dr",
      prescripteur_centre: "CNHU",
      commentaires_posologie: "Audit",
      lignes: [{ produit_id: "p1", quantite: 1, posologie: "1 cp matin", duree_traitement: "5 jours" }],
    },
    verifier: (j) => {
      if (!j.data?.numero_dispensation) throw new Error("numéro de dispensation manquant");
    },
  },
  {
    nom: "Documents",
    methode: "GET",
    chemin: "/api/officines/:officine/documents",
    verifier: (j) => attendreTableau(j, null),
  },
  {
    nom: "Employés",
    methode: "GET",
    chemin: "/api/officines/:officine/employes",
    verifier: (j) => {
      if (!Array.isArray(j.employes)) throw new Error("employes manquant");
      if (!j.inscriptions_ordre || typeof j.inscriptions_ordre !== "object") {
        throw new Error("inscriptions_ordre manquant");
      }
    },
  },
  {
    nom: "Pointages du jour",
    methode: "GET",
    chemin: "/api/officines/:officine/pointages",
    verifier: (j) => {
      if (!Array.isArray(j.pointages)) throw new Error("pointages manquant");
      if (j.pharmacien_present === undefined) throw new Error("pharmacien_present manquant");
      if (!Array.isArray(j.pharmaciens_sur_place)) throw new Error("pharmaciens_sur_place manquant");
    },
  },
  {
    nom: "Équipements",
    methode: "GET",
    chemin: "/api/officines/:officine/equipements",
    verifier: (j) => attendreTableau(j, null),
  },
  {
    nom: "Nettoyages",
    methode: "GET",
    chemin: "/api/officines/:officine/nettoyages",
    verifier: (j) => {
      if (!j.data && !Array.isArray(j)) throw new Error("ni data ni tableau");
    },
  },
  {
    nom: "Températures",
    methode: "GET",
    chemin: "/api/officines/:officine/temperatures",
    verifier: (j) => attendreTableau(j.data ?? j, null) || attendreTableau(j, "data"),
  },
  {
    nom: "Statistiques températures",
    methode: "GET",
    chemin: "/api/officines/:officine/temperatures/stats",
    verifier: (j) => {
      const d = j.data ?? j;
      if (!d.zones) throw new Error("zones manquantes");
      const zone = d.zones["refrigeree_2_8"];
      if (!zone) throw new Error("zone réfrigérée absente");
      if (zone.statut_actuel === undefined) throw new Error("statut_actuel manquant");
      if (!d.historique_30j || d.historique_30j.taux_conformite === undefined) {
        throw new Error("historique_30j manquant");
      }
    },
  },
  {
    nom: "Non-conformités",
    methode: "GET",
    chemin: "/api/officines/:officine/non-conformites",
    verifier: (j) => attendreTableau(j, null),
  },
  {
    nom: "Campagne d'auto-évaluation",
    methode: "GET",
    chemin: "/api/officines/:officine/auto-evaluation/campagne-courante",
    verifier: (j) => {
      const d = j.data ?? j;
      if (!Array.isArray(d.evaluations)) throw new Error("evaluations manquant");
      if (d.statistiques?.score_global === undefined) throw new Error("statistiques.score_global manquant");
      if (!Array.isArray(d.synthese_chapitres)) throw new Error("synthese_chapitres manquant");
    },
  },
  {
    nom: "Modèles BPD",
    methode: "GET",
    chemin: "/api/modeles-bpd",
    verifier: (j) => attendreTableau(j, null),
  },
  {
    nom: "Échéances",
    methode: "GET",
    chemin: "/api/echeances?officine_id=:officine",
    verifier: (j) => attendreTableau(j, null),
  },
  {
    nom: "Journal d'audit",
    methode: "GET",
    chemin: "/api/audit-logs",
    verifier: (j) => {
      if (!Array.isArray(j.data)) throw new Error("data (paginateur) manquant");
    },
  },
  {
    nom: "Paramètres d'officine",
    methode: "GET",
    chemin: "/api/officines/:officine/parametres",
    verifier: (j) => attendreTableau(j, null),
  },
  {
    nom: "Appareils connectés",
    methode: "GET",
    chemin: "/api/auth/devices",
    verifier: (j) => {
      if (!Array.isArray(j.devices)) throw new Error("devices manquant");
    },
  },
];

function attendreTableau(objet, cle) {
  const cible = cle ? objet?.[cle] : objet;
  if (!Array.isArray(cible)) throw new Error(`tableau attendu dans ${cle ?? "la racine"}`);
}

// ───────────────────────────────────────────────────────────────────────────
// Exécution
// ───────────────────────────────────────────────────────────────────────────

const routesLaravel = lireRoutesLaravel();
const appels = appelsFrontend();

console.log("──── Contrat de routes ────");
let routesKo = 0;
for (const appel of [...appels].sort()) {
  const [verbe, chemin] = appel.split(" ");
  const correspond = [...routesLaravel].some((r) => {
    const [rv, rc] = r.split(" ");
    return rv === verbe && rc === chemin;
  });
  if (!correspond) {
    routesKo += 1;
    console.log(`  ✗ ${appel} — route absente de api.php`);
  }
}
console.log(
  routesKo === 0
    ? `  ✓ ${appels.size} appels du frontend couverts par api.php`
    : `  ${routesKo} appel(s) sans route backend`,
);

const requete = async (methode, chemin, corps, jeton) => {
  const res = await fetch(`${baseUrl}${chemin}`, {
    method: methode,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const texte = await res.text();
  let json;
  try {
    json = texte ? JSON.parse(texte) : null;
  } catch {
    throw new Error(`réponse non JSON (${res.status}) : ${texte.slice(0, 120)}`);
  }
  if (!res.ok) throw new Error(`${res.status} — ${json?.message ?? texte.slice(0, 120)}`);
  return json;
};

const contexte = { officine: "off1" };

console.log("\n──── Contrat de données (rejeu des appels réels) ────");
let ok = 0;
const echecs = [];

for (const scenario of scenarios) {
  try {
    let chemin = scenario.chemin;
    // remplacements d'identifiants connus
    chemin = chemin.replace(":officine", contexte.officine);

    if (scenario.resoudreId === "lot") chemin = chemin.replace(":id", contexte.lotId ?? "l1");
    if (scenario.resoudreId === "inventaire") chemin = chemin.replace(":inv", contexte.inventaireId ?? "inv1");
    if (scenario.resoudreId === "ligneInventaire") {
      chemin = chemin.replace(":inv", contexte.inventaireId ?? "inv1").replace(":ligne", contexte.ligneId ?? "li2");
    }
    if (scenario.resoudreId === "session") chemin = chemin.replace(":session", contexte.sessionId ?? "sess1");

    let corps = scenario.corps;
    if (corps && JSON.stringify(corps).includes(":lotId")) {
      corps = JSON.parse(JSON.stringify(corps).replaceAll(":lotId", contexte.lotId ?? "l1"));
    }

    if (scenario.avant) await scenario.avant();
    const json = await requete(scenario.methode, chemin, corps);
    scenario.verifier(json);

    // mémorise les identifiants utiles aux scénarios suivants
    if (scenario.nom === "Lots FEFO") contexte.lotId = json.data?.[0]?.id;
    if (scenario.nom === "Inventaires (liste)") {
      // on travaille sur une campagne ouverte et déjà alimentée en lignes
      const ouverts = (json.data?.data ?? []).filter((i) => i.statut === "en_cours" && i.lignes_count > 0);
      contexte.inventaireId = (ouverts[0] ?? json.data?.data?.[0])?.id;
    }
    if (scenario.nom === "Inventaire (détail + lignes)") {
      // une ligne encore non comptée, pour démontrer la saisie
      const aCompter = (json.data?.lignes ?? []).find((l) => l.quantite_comptee === null);
      contexte.ligneId = (aCompter ?? json.data?.lignes?.[0])?.id;
    }
    if (scenario.nom === "Ouvrir la caisse") contexte.sessionId = json.data?.id;

    ok += 1;
    console.log(`  ✓ ${scenario.nom}`);
  } catch (erreur) {
    echecs.push({ scenario: scenario.nom, message: erreur.message });
    console.log(`  ✗ ${scenario.nom} — ${erreur.message}`);
  }
}

console.log(
  `\n──── Bilan ────\n  routes : ${appels.size - routesKo}/${appels.size}` +
    `\n  données : ${ok}/${scenarios.length}`,
);

if (echecs.length || routesKo) process.exitCode = 1;
