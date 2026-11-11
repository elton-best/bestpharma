<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Tresorerie — préfixées /api/v1/tresorerie via ModuleServiceProvider
Route::prefix('api/v1/tresorerie')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:tresorerie'])
    ->group(function (): void {
        // TODO: endpoints Tresorerie (Phase: Phase 3 — Gestion)
    });
