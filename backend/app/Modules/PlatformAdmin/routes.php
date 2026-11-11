<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module PlatformAdmin — préfixées /api/v1/platformadmin via ModuleServiceProvider
Route::prefix('api/v1/platformadmin')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:platformadmin'])
    ->group(function (): void {
        // TODO: endpoints PlatformAdmin (Phase: Phase 1 — Socle)
    });
