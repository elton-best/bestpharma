<?php

declare(strict_types=1);

use App\Modules\Achats\Controllers\Module10PrestataireFournisseurController;
use Illuminate\Support\Facades\Route;

// Routes API du module Achats — préfixées /api/v1/achats via ModuleServiceProvider
Route::prefix('api/v1/achats')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:achats'])
    ->controller(Module10PrestataireFournisseurController::class)
    ->group(function (): void {
        Route::get('overview', 'overview');

        // Fournisseurs & Contacts
        Route::get('suppliers', 'suppliersIndex');
        Route::post('suppliers', 'storeSupplier')->middleware('throttle:identity');
        Route::get('suppliers/{id}', 'showSupplier')->whereNumber('id');
        Route::put('suppliers/{id}', 'updateSupplier')->whereNumber('id')->middleware('throttle:identity');

        // Sélections & Devis
        Route::get('selections', 'selectionsIndex');
        Route::post('selections', 'storeSelection')->middleware('throttle:identity');
        Route::post('selections/{id}/validate', 'validateSelection')->whereNumber('id')->middleware('throttle:identity');

        // Évaluations
        Route::get('evaluation-templates', 'evaluationTemplatesIndex');
        Route::get('evaluations', 'evaluationsIndex');
        Route::post('evaluations', 'storeEvaluation')->middleware('throttle:identity');

        // Réclamations & Litiges
        Route::get('complaints', 'complaintsIndex');
        Route::post('complaints', 'storeComplaint')->middleware('throttle:identity');
        Route::post('complaints/{id}/resolve', 'resolveComplaint')->whereNumber('id')->middleware('throttle:identity');

        // Contrats & Échéances
        Route::get('contracts', 'contractsIndex');
        Route::post('contracts', 'storeContract')->middleware('throttle:identity');
    });
