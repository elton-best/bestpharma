<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Comptabilite — préfixées /api/v1/comptabilite via ModuleServiceProvider
Route::prefix('api/v1/comptabilite')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:comptabilite'])
    ->group(function (): void {
        // TODO: endpoints Comptabilite (Phase: Phase 3 — Gestion)
    });
