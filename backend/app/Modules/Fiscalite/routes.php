<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Fiscalite — préfixées /api/v1/fiscalite via ModuleServiceProvider
Route::prefix('api/v1/fiscalite')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:fiscalite'])
    ->group(function (): void {
        // TODO: endpoints Fiscalite (Phase: Phase 3 — Gestion)
    });
