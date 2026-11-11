<?php

declare(strict_types=1);

use App\Modules\LocauxEquipements\Controllers\Module9EquipementLocauxController;
use App\Modules\LocauxEquipements\Controllers\TemperatureController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/locauxequipements')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:locauxequipements'])
    ->group(function (): void {
        // Températures (Module existant)
        Route::get('temperatures', [TemperatureController::class, 'index']);
        Route::post('temperatures', [TemperatureController::class, 'store'])->middleware('throttle:identity');
        Route::post('temperatures/import', [TemperatureController::class, 'import'])->middleware('throttle:identity');
        Route::get('temperatures/stats', [TemperatureController::class, 'stats']);

        // Module 09 : Équipements & Locaux
        Route::controller(Module9EquipementLocauxController::class)->group(function (): void {
            Route::get('overview', 'overview');

            // Emplacements / Zones
            Route::get('locations', 'locationsIndex');
            Route::post('locations', 'storeLocation')->middleware('throttle:identity');

            // Inventaire Équipements
            Route::get('equipments', 'equipmentsIndex');
            Route::post('equipments', 'storeEquipment')->middleware('throttle:identity');
            Route::get('equipments/{id}', 'showEquipment')->whereNumber('id');
            Route::put('equipments/{id}', 'updateEquipment')->whereNumber('id')->middleware('throttle:identity');

            // Mise en service (Commissioning)
            Route::post('equipments/{id}/commissioning', 'storeCommissioningTest')->whereNumber('id')->middleware('throttle:identity');

            // Maintenance & Étalonnage
            Route::get('maintenance-plans', 'maintenancePlansIndex');
            Route::post('maintenance-plans', 'storeMaintenancePlan')->middleware('throttle:identity');
            Route::get('maintenance-events', 'maintenanceEventsIndex');
            Route::post('maintenance-events', 'storeMaintenanceEvent')->middleware('throttle:identity');
            Route::post('maintenance-events/{id}/verify', 'verifyMaintenanceEvent')->whereNumber('id')->middleware('throttle:identity');

            // Tests Groupe Électrogène
            Route::get('generator-tests', 'generatorTestsIndex');
            Route::post('generator-tests', 'storeGeneratorTest')->middleware('throttle:identity');

            // Nettoyage & Hygiène
            Route::get('cleaning-plans', 'cleaningPlansIndex');
            Route::post('cleaning-plans', 'storeCleaningPlan')->middleware('throttle:identity');
            Route::get('cleaning-occurrences', 'cleaningOccurrencesIndex');
            Route::post('cleaning-occurrences', 'storeCleaningOccurrence')->middleware('throttle:identity');
            Route::post('cleaning-occurrences/{id}/verify', 'verifyCleaningOccurrence')->whereNumber('id')->middleware('throttle:identity');

            // Retrait & Mise hors service
            Route::get('withdrawals', 'withdrawalsIndex');
            Route::post('withdrawals', 'requestWithdrawal')->middleware('throttle:identity');
            Route::post('withdrawals/{id}/decision', 'decideWithdrawal')->whereNumber('id')->middleware('throttle:identity');
        });
    });
