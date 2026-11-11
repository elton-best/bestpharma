<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Reporting — préfixées /api/v1/reporting via ModuleServiceProvider
Route::prefix('api/v1/reporting')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:reporting'])
    ->group(function (): void {
        // TODO: endpoints Reporting (Phase: Transverse)
    });
