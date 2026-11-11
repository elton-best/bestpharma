<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Vigilance — préfixées /api/v1/vigilance via ModuleServiceProvider
Route::prefix('api/v1/vigilance')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:vigilance'])
    ->group(function (): void {
        // TODO: endpoints Vigilance (Phase: Phase 2 — Pharmacie)
    });
