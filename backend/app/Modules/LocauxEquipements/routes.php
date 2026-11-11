<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module LocauxEquipements — préfixées /api/v1/locauxequipements via ModuleServiceProvider
Route::prefix('api/v1/locauxequipements')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:locauxequipements'])
    ->group(function (): void {
        Route::get('temperatures', [\App\Modules\LocauxEquipements\Controllers\TemperatureController::class, 'index']);
        Route::post('temperatures', [\App\Modules\LocauxEquipements\Controllers\TemperatureController::class, 'store'])->middleware('throttle:identity');
        Route::post('temperatures/import', [\App\Modules\LocauxEquipements\Controllers\TemperatureController::class, 'import'])->middleware('throttle:identity');
        Route::get('temperatures/stats', [\App\Modules\LocauxEquipements\Controllers\TemperatureController::class, 'stats']);
    });
