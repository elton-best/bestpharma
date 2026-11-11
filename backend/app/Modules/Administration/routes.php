<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Administration — préfixées /api/v1/administration via ModuleServiceProvider
Route::prefix('api/v1/administration')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:administration'])
    ->group(function (): void {
        // TODO: endpoints Administration (Phase: Phase 1 — Socle)
    });
