<?php

use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OfficineController;
use App\Http\Controllers\Api\ParametreController;
use App\Http\Controllers\Api\SyncController;
use Illuminate\Support\Facades\Route;

// Routes publiques d'authentification
Route::post('/auth/login', [AuthController::class, 'login']);

// Routes protégées par token Sanctum
Route::middleware('auth:sanctum')->group(function () {
    // Vérification MFA (accessible avec temp_token ou token complet)
    Route::post('/auth/verify-mfa', [AuthController::class, 'verifyMfa']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/devices', [AuthController::class, 'devices']);
    Route::delete('/auth/devices/{tokenId}', [AuthController::class, 'revokeDevice']);

    // Gestion des officines (multi-tenant)
    Route::get('/officines', [OfficineController::class, 'index']);
    Route::post('/officines', [OfficineController::class, 'store']);
    Route::get('/officines/{id}', [OfficineController::class, 'show']);
    Route::put('/officines/{id}', [OfficineController::class, 'update']);

    // Paramètres d'officine
    Route::get('/officines/{officineId}/parametres', [ParametreController::class, 'index']);
    Route::put('/officines/{officineId}/parametres/{cle}', [ParametreController::class, 'update']);

    // Journal d'audit inaltérable (E0-S4)
    Route::get('/officines/{officineId}/audit-logs', [AuditController::class, 'index']);

    // File de synchronisation hors-ligne (E0-S7)
    Route::post('/sync/push', [SyncController::class, 'push']);
});
