<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Paie — préfixées /api/v1/paie via ModuleServiceProvider
Route::prefix('api/v1/paie')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:paie'])
    ->group(function (): void {
        // TODO: endpoints Paie (Phase: Phase 3 — Gestion)
    });
