<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
use App\Modules\VentesCaisse\Controllers\VentesCaisseController;
// Routes API du module VentesCaisse — préfixées /api/v1/ventescaisse via ModuleServiceProvider
Route::prefix('api/v1/ventescaisse')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:ventescaisse'])
    ->group(function (): void {
        Route::post('/sessions', [VentesCaisseController::class, 'open']);
        Route::get('/sessions/active', [VentesCaisseController::class, 'active']);
        Route::get('/sales', [VentesCaisseController::class, 'sales']);
        Route::get('/cash-movements', [VentesCaisseController::class, 'cashMovements']);
        Route::post('/cash-movements', [VentesCaisseController::class, 'storeCashMovement']);
        Route::get('/catalog', [VentesCaisseController::class, 'catalog']);
        Route::put('/catalog/{product}/price', [VentesCaisseController::class, 'setPrice']);
        Route::post('/sessions/{session}/close', [VentesCaisseController::class, 'close']);
        Route::post('/sales', [VentesCaisseController::class, 'sell']);
    });
