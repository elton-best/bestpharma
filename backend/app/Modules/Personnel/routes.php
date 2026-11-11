<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Personnel — préfixées /api/v1/personnel via ModuleServiceProvider
Route::prefix('api/v1/personnel')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:personnel'])
    ->group(function (): void {
        // TODO: endpoints Personnel (Phase: Phase 1 — Socle)
    });
