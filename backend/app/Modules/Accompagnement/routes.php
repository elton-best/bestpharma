<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
use App\Modules\Accompagnement\Controllers\OfflineSyncController;
// Routes API du module Accompagnement — préfixées /api/v1/accompagnement via ModuleServiceProvider
Route::prefix('api/v1/accompagnement')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:accompagnement'])
    ->group(function (): void {
        Route::post('sync/push', [OfflineSyncController::class, 'push'])->middleware('throttle:identity');
    });
