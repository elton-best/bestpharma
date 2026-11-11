<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Users — préfixées /api/v1/users via ModuleServiceProvider
Route::prefix('api/v1/users')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:users'])
    ->group(function (): void {
        // TODO: endpoints Users (Phase: Phase 1 — Socle)
    });
