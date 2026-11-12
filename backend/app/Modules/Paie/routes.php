<?php

declare(strict_types=1);

use App\Modules\Paie\Controllers\PaieController;
use Illuminate\Support\Facades\Route;

// Routes API du module Paie — préfixées /api/v1/paie via PaieServiceProvider
Route::prefix('api/v1/paie')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:paie'])
    ->group(function (): void {
        Route::get('/overview', [PaieController::class, 'overview']);
        Route::post('/bootstrap-bareme', [PaieController::class, 'bootstrapBareme']);

        Route::get('/baremes', [PaieController::class, 'baremesIndex']);
        Route::post('/baremes', [PaieController::class, 'storeBareme']);

        Route::get('/variables', [PaieController::class, 'variablesIndex']);
        Route::post('/variables', [PaieController::class, 'storeVariable']);

        Route::get('/bulletins', [PaieController::class, 'bulletinsIndex']);
        Route::post('/bulletins/generate', [PaieController::class, 'generateBulletin']);
        Route::post('/bulletins/{id}/validate', [PaieController::class, 'validateBulletin']);
        Route::post('/bulletins/{id}/pay', [PaieController::class, 'markPaid']);

        Route::get('/declarations', [PaieController::class, 'declarations']);
        Route::get('/declarations/export', [PaieController::class, 'exportDeclarationsCsv']);
    });
