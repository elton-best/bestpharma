<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Stock — préfixées /api/v1/stock via ModuleServiceProvider
Route::prefix('api/v1/stock')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:stock'])
    ->group(function (): void {
        // TODO: endpoints Stock (Phase: Phase 2 — Pharmacie)
    });
