<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
use App\Modules\Tenancy\Controllers\AuthorizedDeviceController;
// Routes API du module Tenancy — préfixées /api/v1/tenancy via ModuleServiceProvider
Route::prefix('api/v1/tenancy')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:tenancy'])
    ->group(function (): void {
        Route::get('/devices', [AuthorizedDeviceController::class, 'index']);
        Route::post('/devices', [AuthorizedDeviceController::class, 'store']);
        Route::post('/devices/{device}/revoke', [AuthorizedDeviceController::class, 'revoke']);
        Route::post('/devices/{device}/reactivate', [AuthorizedDeviceController::class, 'reactivate']);
    });
