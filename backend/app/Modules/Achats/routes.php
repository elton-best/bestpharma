<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Achats — préfixées /api/v1/achats via ModuleServiceProvider
Route::prefix('api/v1/achats')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:achats'])
    ->group(function (): void {
        // TODO: endpoints Achats (Phase: Phase 2 — Pharmacie)
    });
