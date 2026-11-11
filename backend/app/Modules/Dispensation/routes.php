<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Dispensation — préfixées /api/v1/dispensation via ModuleServiceProvider
Route::prefix('api/v1/dispensation')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:dispensation'])
    ->group(function (): void {
        Route::get('/workspace', [\App\Modules\Dispensation\Controllers\DispensationController::class, 'index']);
        Route::post('/requests', [\App\Modules\Dispensation\Controllers\DispensationController::class, 'store']);
        Route::post('/requests/{id}/dispense', [\App\Modules\Dispensation\Controllers\DispensationController::class, 'dispense'])->whereNumber('id');
    });
