<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Workflow — préfixées /api/v1/workflow via ModuleServiceProvider
Route::prefix('api/v1/workflow')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:workflow'])
    ->group(function (): void {
        // TODO: endpoints Workflow (Phase: Phase 1 — Socle)
    });
