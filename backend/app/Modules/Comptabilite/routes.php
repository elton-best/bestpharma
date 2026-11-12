<?php

declare(strict_types=1);

use App\Modules\Comptabilite\Controllers\ComptabiliteController;
use Illuminate\Support\Facades\Route;

// Routes API du module Comptabilite — préfixées /api/v1/comptabilite via ComptabiliteServiceProvider
Route::prefix('api/v1/comptabilite')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:comptabilite'])
    ->group(function (): void {
        Route::get('/overview', [ComptabiliteController::class, 'overview']);
        Route::post('/bootstrap', [ComptabiliteController::class, 'bootstrapPlan']);
        Route::post('/sync-operations', [ComptabiliteController::class, 'syncOperations']);

        Route::get('/exercices', [ComptabiliteController::class, 'exercicesIndex']);
        Route::post('/exercices', [ComptabiliteController::class, 'storeExercice']);
        Route::post('/exercices/{id}/close', [ComptabiliteController::class, 'closeExercice']);

        Route::get('/comptes', [ComptabiliteController::class, 'comptesIndex']);
        Route::post('/comptes', [ComptabiliteController::class, 'storeCompte']);

        Route::get('/journaux', [ComptabiliteController::class, 'journauxIndex']);
        Route::post('/journaux', [ComptabiliteController::class, 'storeJournal']);

        Route::get('/ecritures', [ComptabiliteController::class, 'ecrituresIndex']);
        Route::post('/ecritures', [ComptabiliteController::class, 'storeEcriture']);
        Route::post('/ecritures/{id}/validate', [ComptabiliteController::class, 'validateEcriture']);

        Route::get('/grand-livre', [ComptabiliteController::class, 'grandLivre']);
        Route::get('/balance', [ComptabiliteController::class, 'balance']);
        Route::get('/balance/export', [ComptabiliteController::class, 'exportBalanceCsv']);
    });
