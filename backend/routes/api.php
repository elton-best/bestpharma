<?php

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
use App\Http\Controllers\Api\ReleveTemperatureController;
use App\Http\Controllers\Api\StockLotController;
use App\Http\Controllers\Api\StupefiantController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\EcheanceController;
use App\Http\Controllers\Api\VenteCaisseController;
use Illuminate\Support\Facades\Route;

// Routes publiques d'authentification
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

// Routes protégées par token Sanctum
Route::middleware('auth:sanctum')->group(function () {
    // Authentification, MFA TOTP et appareils (E0-S3)
    Route::post('/auth/verify-mfa', [AuthController::class, 'verifyMfa']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/devices', [AuthController::class, 'devices']);
    Route::delete('/auth/devices/{tokenId}', [AuthController::class, 'revokeDevice']);

    // Gestion des officines (multi-tenant E0-S2)
    Route::get('/officines', [OfficineController::class, 'index']);
    Route::post('/officines', [OfficineController::class, 'store']);
    Route::get('/officines/{id}', [OfficineController::class, 'show']);
    Route::put('/officines/{id}', [OfficineController::class, 'update']);

    // Paramètres d'officine (E0-S5)
    Route::get('/officines/{officineId}/parametres', [ParametreController::class, 'index']);
    Route::put('/officines/{officineId}/parametres/{cle}', [ParametreController::class, 'update']);

    // Journal d'audit inaltérable (E0-S4)
    Route::get('/officines/{officineId}/audit-logs', [AuditController::class, 'index']);

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
    Route::post('/officines/{officineId}/pointages', [PointageController::class, 'store']);

    // Non-conformités et CAPA 5M (BPD1-F09)
    Route::get('/officines/{officineId}/non-conformites', [NonConformiteController::class, 'index']);
    Route::post('/officines/{officineId}/non-conformites', [NonConformiteController::class, 'store']);
    Route::put('/officines/{officineId}/non-conformites/{id}', [NonConformiteController::class, 'update']);

    // Échéances réglementaires
    Route::get('/officines/{officineId}/echeances', [EcheanceController::class, 'index']);
    Route::post('/officines/{officineId}/echeances', [EcheanceController::class, 'store']);
    Route::get('/echeances', [EcheanceController::class, 'indexGlobal']);
    Route::post('/echeances', [EcheanceController::class, 'store']);
    Route::put('/echeances/{id}', [EcheanceController::class, 'update']);
    Route::patch('/echeances/{id}', [EcheanceController::class, 'update']);
    Route::delete('/echeances/{id}', [EcheanceController::class, 'destroy']);

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

    // Gestion des Stocks & Règle FEFO (BPD5-F08 & STK-02)
    Route::get('/stocks', [StockLotController::class, 'index']);
    Route::post('/stocks', [StockLotController::class, 'store']);
    Route::post('/stocks/{id}/quarantaine', [StockLotController::class, 'miseEnQuarantaine']);
    Route::post('/stocks/{id}/lever-quarantaine', [StockLotController::class, 'leverQuarantaine']);

    // Dispensations / Délivrances Ordonnances & Conseil (BPD Chapitre 5 & LOT-1.3)
    Route::get('/dispensations', [DispensationController::class, 'index']);
    Route::post('/dispensations', [DispensationController::class, 'store']);
    Route::post('/dispensations/{id}/viser', [DispensationController::class, 'viser']);

    // Registre Officiel des Stupéfiants & Substances Vénéneuses (BPD-3 & Art 7.15 à 7.20)
    Route::get('/stupefiants', [StupefiantController::class, 'index']);
    Route::post('/stupefiants/{id}/viser', [StupefiantController::class, 'viser']);

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
    Route::get('/comptabilite/clotures', [ComptabiliteController::class, 'cloturesCaisse']);
});
