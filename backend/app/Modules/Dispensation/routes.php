<?php
declare(strict_types=1);
use App\Modules\Dispensation\Controllers\Module12DispensationVenteController;
use Illuminate\Support\Facades\Route;

// Routes API du module Dispensation — préfixées /api/v1/dispensation via ModuleServiceProvider
Route::prefix('api/v1/dispensation')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:dispensation'])
    ->group(function (): void {
        Route::get('/workspace', [\App\Modules\Dispensation\Controllers\DispensationController::class, 'index']);
        Route::post('/requests', [\App\Modules\Dispensation\Controllers\DispensationController::class, 'store']);
        Route::post('/requests/{id}/dispense', [\App\Modules\Dispensation\Controllers\DispensationController::class, 'dispense'])->whereNumber('id');

        // Module 12 : Dispensation & Vente (CDC 12)
        Route::controller(Module12DispensationVenteController::class)->group(function (): void {
            Route::get('overview', 'overview');
            Route::get('sales', 'salesIndex');
            Route::post('sales', 'storeSale')->middleware('throttle:identity');
            Route::post('sales/{id}/review', 'reviewSale')->whereNumber('id')->middleware('throttle:identity');
            Route::post('sales/{id}/confirm', 'confirmSale')->whereNumber('id')->middleware('throttle:identity');
            Route::get('returns', 'returnsIndex');
            Route::post('returns', 'storeReturn')->middleware('throttle:identity');
            Route::post('returns/{id}/evaluate', 'evaluateReturn')->whereNumber('id')->middleware('throttle:identity');
            Route::get('credits', 'creditsIndex');
            Route::get('safety-reports', 'safetyReportsIndex');
            Route::post('safety-reports', 'storeSafetyReport')->middleware('throttle:identity');
        });
    });
