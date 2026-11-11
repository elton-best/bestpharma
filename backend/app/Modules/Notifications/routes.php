<?php
declare(strict_types=1);
use Illuminate\Support\Facades\Route;
// Routes API du module Notifications — préfixées /api/v1/notifications via ModuleServiceProvider
Route::prefix('api/v1/notifications')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:notifications'])
    ->group(function (): void {
        // TODO: endpoints Notifications (Phase: Transverse)
    });
