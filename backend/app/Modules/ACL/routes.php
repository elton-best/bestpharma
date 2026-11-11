<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module ACL — préfixées /api/v1/acl via ModuleServiceProvider
Route::prefix('api/v1/acl')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:acl'])
    ->group(function (): void {
        // TODO: endpoints ACL (Phase: Phase 1 — Socle)
    });
