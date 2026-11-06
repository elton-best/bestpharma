<?php

use App\Http\Controllers\Api\AppareilAutoriseController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AutoEvaluationController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\EmployeController;
use App\Http\Controllers\Api\EquipementController;
use App\Http\Controllers\Api\ModeleBpdController;
use App\Http\Controllers\Api\NettoyageController;
use App\Http\Controllers\Api\NonConformiteController;
use App\Http\Controllers\Api\OfficineController;
use App\Http\Controllers\Api\ParametreController;
use App\Http\Controllers\Api\PointageController;
use App\Http\Controllers\Api\CaisseSessionController;
use App\Http\Controllers\Api\ComptabiliteController;
use App\Http\Controllers\Api\DispensationController;
use App\Http\Controllers\Api\PreparationController;
use App\Http\Controllers\Api\ProduitController;
use App\Http\Controllers\Api\AvisRappelController;
use App\Http\Controllers\Api\DechetController;
use App\Http\Controllers\Api\EmplacementController;
use App\Http\Controllers\Api\InventaireController;
use App\Http\Controllers\Api\MouvementStockController;
use App\Http\Controllers\Api\ReleveTemperatureController;
use App\Http\Controllers\Api\StockLotController;
use App\Http\Controllers\Api\StupefiantController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\EcheanceController;
use App\Http\Controllers\Api\UploadController;
use App\Http\Controllers\Api\VenteCaisseController;
use Illuminate\Support\Facades\Route;

// Routes publiques d'authentification
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

// Routes protégées par token Sanctum
Route::middleware('auth:sanctum')->group(function () {
    // Téléversement de fichiers et pièces jointes (BPD)
    Route::post('/upload', [UploadController::class, 'upload']);
    Route::post('/officines/{officineId}/upload', [UploadController::class, 'upload']);
    Route::post('/officines/{officineId}/temperatures/csv', [UploadController::class, 'uploadCsvTemperatures']);

    // Authentification, MFA TOTP et appareils (E0-S3)
    Route::post('/auth/verify-mfa', [AuthController::class, 'verifyMfa']);
    Route::get('/auth/mfa', [AuthController::class, 'etatMfa']);
    Route::post('/auth/mfa/demarrer', [AuthController::class, 'demarrerMfa']);
    Route::delete('/auth/mfa', [AuthController::class, 'desactiverMfa']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::put('/auth/password', [AuthController::class, 'updatePassword']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/devices', [AuthController::class, 'devices']);
    Route::delete('/auth/devices/{tokenId}', [AuthController::class, 'revokeDevice']);
    Route::post('/auth/devices/revoke-others', [AuthController::class, 'revokeOtherDevices']);

    // Appareils autorisés et bornes (APP-01 à APP-13)
    Route::get('/officines/{officineId}/appareils-autorises', [AppareilAutoriseController::class, 'index']);
    Route::get('/appareils-autorises', [AppareilAutoriseController::class, 'index']);
    Route::post('/officines/{officineId}/appareils-autorises', [AppareilAutoriseController::class, 'store']);
    Route::post('/appareils-autorises', [AppareilAutoriseController::class, 'store']);
    Route::post('/appareils-autorises/{id}/revoquer', [AppareilAutoriseController::class, 'revoquer']);
    Route::post('/appareils-autorises/{id}/reactiver', [AppareilAutoriseController::class, 'reactiver']);
    Route::delete('/appareils-autorises/{id}', [AppareilAutoriseController::class, 'destroy']);

    // Gestion des officines (multi-tenant E0-S2)
    Route::get('/officines', [OfficineController::class, 'index']);
    Route::post('/officines', [OfficineController::class, 'store']);
    Route::get('/officines/{id}', [OfficineController::class, 'show']);
    Route::put('/officines/{id}', [OfficineController::class, 'update']);
    // Rattachement de l'utilisateur courant comme promoteur d'une officine qu'il vient de créer
    Route::post('/officines/{id}/rattacher', [OfficineController::class, 'rattacher']);

    // Paramètres d'officine (E0-S5)
    Route::get('/officines/{officineId}/parametres', [ParametreController::class, 'index']);
    Route::put('/officines/{officineId}/parametres/{cle}', [ParametreController::class, 'update']);
    Route::put('/officines/{officineId}/parametres', [ParametreController::class, 'updateLot']);

    // Journal d'audit inaltérable (E0-S4)
    Route::get('/officines/{officineId}/audit-logs', [AuditController::class, 'index']);
    Route::get('/officines/{officineId}/audit-logs/verifier-integrite', [AuditController::class, 'verifierIntegrite']);
    Route::get('/audit-logs/verifier-integrite', [AuditController::class, 'verifierIntegrite']);

    // File de synchronisation hors-ligne (E0-S7)
    Route::post('/sync/push', [SyncController::class, 'push']);

    // ==========================================
    // PARTIE 1 : MODULE BPD SOCLE (LOT 1.1)
    // ==========================================

    // GED et documents qualité (BPD-1 & BPD-3)
    Route::get('/officines/{officineId}/documents', [DocumentController::class, 'index']);
    Route::post('/officines/{officineId}/documents', [DocumentController::class, 'store']);
    Route::get('/officines/{officineId}/documents/{id}', [DocumentController::class, 'show']);
    Route::put('/officines/{officineId}/documents/{id}', [DocumentController::class, 'update']);

    // Bibliothèque des modèles BPD types de l'ABMed (BPD-C02)
    Route::get('/modeles-bpd', [ModeleBpdController::class, 'index']);
    Route::post('/officines/{officineId}/modeles-bpd/{modeleId}/instancier', [ModeleBpdController::class, 'instancier']);

    // Dossiers RH et compétences du personnel (BPD-2)
    Route::get('/officines/{officineId}/employes', [EmployeController::class, 'index']);
    Route::post('/officines/{officineId}/employes', [EmployeController::class, 'store']);
    Route::put('/officines/{officineId}/employes/{id}', [EmployeController::class, 'update']);

    // Pointage par badge & Présence obligatoire du pharmacien (BPD-C09 & art. 1.11)
    Route::get('/officines/{officineId}/pointages', [PointageController::class, 'index']);
    Route::get('/officines/{officineId}/pointages/actif', [PointageController::class, 'actif']);
    Route::post('/officines/{officineId}/pointages/prise', [PointageController::class, 'prise']);
    Route::post('/officines/{officineId}/pointages', [PointageController::class, 'store']);

    // Non-conformités et CAPA 5M (BPD1-F09)
    Route::get('/officines/{officineId}/non-conformites', [NonConformiteController::class, 'index']);
    Route::post('/officines/{officineId}/non-conformites', [NonConformiteController::class, 'store']);
    Route::put('/officines/{officineId}/non-conformites/{id}', [NonConformiteController::class, 'update']);

    // Échéances réglementaires
    Route::get('/officines/{officineId}/echeances', [EcheanceController::class, 'index']);
    Route::post('/officines/{officineId}/echeances', [EcheanceController::class, 'store']);
    Route::get('/officines/{officineId}/echeances/ical', [EcheanceController::class, 'exportIcal']);
    Route::get('/echeances', [EcheanceController::class, 'indexGlobal']);
    Route::post('/echeances', [EcheanceController::class, 'store']);
    Route::put('/echeances/{id}', [EcheanceController::class, 'update']);
    Route::patch('/echeances/{id}', [EcheanceController::class, 'update']);
    Route::delete('/echeances/{id}', [EcheanceController::class, 'destroy']);
    // Journal d'audit inaltérable (E0-S4)
    Route::get('/officines/{officineId}/audit-logs', [AuditController::class, 'index']);
    Route::get('/audit-logs', [AuditController::class, 'index']);

    // ==========================================
    // PARTIE 2 : CONSERVATION, LOCAUX & AUTO-ÉVALUATION (LOTS 1.2 & 1.5)
    // ==========================================

    // Températures & Chaîne du Froid (BPD4-F04 & BPD4-F05)
    Route::get('/officines/{officineId}/temperatures', [ReleveTemperatureController::class, 'index']);
    Route::post('/officines/{officineId}/temperatures', [ReleveTemperatureController::class, 'store']);
    Route::get('/officines/{officineId}/temperatures/stats', [ReleveTemperatureController::class, 'stats']);

    // Équipements & Étalonnages (BPD4-F01 à F03)
    Route::get('/officines/{officineId}/equipements', [EquipementController::class, 'index']);
    Route::post('/officines/{officineId}/equipements', [EquipementController::class, 'store']);

    // Plan de Nettoyage & Bio-nettoyage (BPD4-F07)
    Route::get('/officines/{officineId}/nettoyages', [NettoyageController::class, 'index']);
    Route::post('/officines/{officineId}/nettoyages', [NettoyageController::class, 'store']);

    // Auto-évaluation & Audit Interne 267 articles (BPD-10 & 4.0.1)
    Route::get('/officines/{officineId}/auto-evaluation/campagne-courante', [AutoEvaluationController::class, 'campagneCourante']);
    Route::put('/officines/{officineId}/auto-evaluation/evaluer/{evaluationId}', [AutoEvaluationController::class, 'evaluerArticle']);
    Route::post('/officines/{officineId}/auto-evaluation/generer-capa/{evaluationId}', [AutoEvaluationController::class, 'genererCapa']);
    Route::get('/officines/{officineId}/auto-evaluation/rapport', [AutoEvaluationController::class, 'rapport']);

    // ==========================================
    // PARTIE 3 : DISPENSATION, GESTION DES STOCKS (FEFO) & REGISTRES OFFICIELS (LOTS 1.3 & 1.4)
    // ==========================================

    // Catalogue Produits
    Route::get('/produits', [ProduitController::class, 'index']);
    Route::post('/produits', [ProduitController::class, 'store']);

    // Gestion des Stocks & Règle FEFO (BPD5-F08 & STK-02) — Section Magasin & Stocks v1.0
    Route::get('/stocks', [StockLotController::class, 'index']);
    Route::post('/stocks', [StockLotController::class, 'store']);
    Route::post('/stocks/{id}/quarantaine', [StockLotController::class, 'miseEnQuarantaine']);
    Route::post('/stocks/{id}/lever-quarantaine', [StockLotController::class, 'leverQuarantaine']);
    Route::put('/stocks/{id}/statut', [StockLotController::class, 'changerStatut']);
    Route::get('/stocks/peremptions', [StockLotController::class, 'peremptions']);
    Route::get('/stocks/valorisation', [StockLotController::class, 'valorisation']);
    Route::get('/stocks/alertes', [StockLotController::class, 'alertes']);

    // Emplacements & Zones (STO-04)
    Route::get('/emplacements', [EmplacementController::class, 'index']);
    Route::post('/emplacements', [EmplacementController::class, 'store']);
    Route::get('/emplacements/{id}', [EmplacementController::class, 'show']);

    // Mouvements de stock — Journal (STO-09)
    Route::get('/mouvements', [MouvementStockController::class, 'index']);
    Route::post('/mouvements', [MouvementStockController::class, 'store']);

    // Inventaires tournant & général (STO-12)
    Route::get('/inventaires', [InventaireController::class, 'index']);
    Route::post('/inventaires', [InventaireController::class, 'store']);
    Route::get('/inventaires/{id}', [InventaireController::class, 'show']);
    Route::post('/inventaires/{inventaireId}/lignes/{ligneId}/compter', [InventaireController::class, 'compter']);
    Route::post('/inventaires/{id}/valider', [InventaireController::class, 'valider']);

    // Rappels de lots (STO-14)
    Route::get('/rappels', [AvisRappelController::class, 'index']);
    Route::post('/rappels', [AvisRappelController::class, 'store']);
    Route::post('/rappels/{id}/cloturer', [AvisRappelController::class, 'cloturer']);

    // Déchets & Destruction (STO-17)
    Route::get('/dechets', [DechetController::class, 'index']);
    Route::post('/dechets', [DechetController::class, 'store']);
    Route::post('/dechets/{id}/detruire', [DechetController::class, 'detruire']);

    // Dispensations / Délivrances Ordonnances & Conseil (BPD Chapitre 5 & LOT-1.3)
    Route::get('/dispensations', [DispensationController::class, 'index']);
    Route::post('/dispensations', [DispensationController::class, 'store']);
    Route::post('/dispensations/{id}/viser', [DispensationController::class, 'viser']);

    // Registre Officiel des Stupéfiants & Substances Vénéneuses (BPD-3 & Art 7.15 à 7.20) — STU complet 9 onglets
    Route::get('/stupefiants', [StupefiantController::class, 'index']);
    Route::post('/stupefiants', [StupefiantController::class, 'store']);
    Route::post('/stupefiants/{id}/viser', [StupefiantController::class, 'viser']);
    Route::post('/stupefiants/{id}/rectificative', [StupefiantController::class, 'rectificative']);
    Route::get('/stupefiants/balance', [StupefiantController::class, 'balance']);
    Route::get('/stupefiants/ordonnancier', [StupefiantController::class, 'ordonnancier']);
    Route::get('/stupefiants/armoire', [StupefiantController::class, 'armoire']);
    Route::post('/stupefiants/inventaire', [StupefiantController::class, 'inventaire']);
    Route::post('/stupefiants/declaration-vol', [StupefiantController::class, 'declarationVol']);
    Route::post('/stupefiants/demande-destruction', [StupefiantController::class, 'demandeDestruction']);
    Route::get('/stupefiants/rapport', [StupefiantController::class, 'rapport']);

    // Registre Officiel des Préparations Magistrales et Officinales (BPD Chapitre 6 & POI-03)
    Route::get('/preparations', [PreparationController::class, 'index']);
    Route::post('/preparations', [PreparationController::class, 'store']);
    Route::post('/preparations/{id}/viser', [PreparationController::class, 'viser']);

    // ==========================================
    // PARTIE 4 : CAISSE POS, FACTURATION DGI E-MECEF, FEEXPAY & SYSCOHADA
    // ==========================================

    // Sessions de caisse & Clôtures X/Z
    Route::get('/caisse/session-active', [CaisseSessionController::class, 'sessionActive']);
    Route::post('/caisse/ouvrir', [CaisseSessionController::class, 'ouvrir']);
    Route::get('/caisse/session/{id}/ticket-x', [CaisseSessionController::class, 'ticketX']);
    Route::post('/caisse/session/{id}/fermer', [CaisseSessionController::class, 'fermer']);

    // Ventes comptoir & Encaissement POS
    Route::get('/caisse/ventes', [VenteCaisseController::class, 'index']);
    Route::post('/caisse/ventes', [VenteCaisseController::class, 'store']);

    // Facturation normalisée DGI e-MECeF
    Route::get('/facturation/emecef', [ComptabiliteController::class, 'facturesEmecef']);

    // Comptabilité & Clôtures SYSCOHADA
    Route::get('/comptabilite/journal-ventes', [ComptabiliteController::class, 'journalVentes']);
    Route::post('/comptabilite/ecritures', [ComptabiliteController::class, 'storeEcriture']);
    Route::post('/comptabilite/ecritures/{id}/extourne', [ComptabiliteController::class, 'extourneEcriture']);
    Route::get('/comptabilite/clotures', [ComptabiliteController::class, 'cloturesCaisse']);
});
