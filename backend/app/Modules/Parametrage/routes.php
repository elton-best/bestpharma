<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Parametrage — préfixées /api/v1/parametrage via ModuleServiceProvider
Route::prefix('api/v1/parametrage')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:parametrage'])
    ->group(function (): void {
        // TODO: endpoints Parametrage (Phase: Phase 1 — Socle)
    });
