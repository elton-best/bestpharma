<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Catalogue — préfixées /api/v1/catalogue via ModuleServiceProvider
Route::prefix('api/v1/catalogue')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:catalogue'])
    ->group(function (): void {
        // TODO: endpoints Catalogue (Phase: Phase 2 — Pharmacie)
    });
