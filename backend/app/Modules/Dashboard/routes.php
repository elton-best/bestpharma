<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Dashboard — préfixées /api/v1/dashboard via ModuleServiceProvider
Route::prefix('api/v1/dashboard')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:dashboard'])
    ->group(function (): void {
        // TODO: endpoints Dashboard (Phase: Transverse)
    });
