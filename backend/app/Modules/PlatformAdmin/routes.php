<?php

declare(strict_types=1);

use App\Modules\PlatformAdmin\Controllers\Module15AdministrationSaasController;
use Illuminate\Support\Facades\Route;

// Routes API du module PlatformAdmin — préfixées /api/v1/platformadmin via ModuleServiceProvider
Route::prefix('api/v1/platformadmin')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:platformadmin'])
    ->controller(Module15AdministrationSaasController::class)
    ->group(function (): void {
        Route::get('overview', 'overview');
        Route::get('plans', 'plansIndex');
        Route::post('plans', 'storePlan')->middleware('throttle:identity');
        Route::get('subscriptions', 'subscriptionsIndex');
        Route::post('subscriptions', 'storeSubscription')->middleware('throttle:identity');
        Route::post('subscriptions/{id}/state', 'suspendSubscription')->whereNumber('id')->middleware('throttle:identity');
        Route::get('tickets', 'ticketsIndex');
        Route::post('tickets', 'storeTicket')->middleware('throttle:identity');
        Route::get('support-access-requests', 'accessRequestsIndex');
        Route::post('support-access-requests/{id}/decision', 'decideAccessRequest')->whereNumber('id')->middleware('throttle:identity');
        Route::get('settings', 'settingsIndex');
        Route::post('settings', 'saveSetting')->middleware('throttle:identity');
        Route::get('audit-events', 'auditEventsIndex');
    });

// Endpoints support-agent & webhook vérifiés sans appartenance tenant obligatoire
Route::prefix('api/v1/platformadmin')
    ->middleware(['api', 'auth:sanctum'])
    ->controller(Module15AdministrationSaasController::class)
    ->group(function (): void {
        Route::post('billing-webhook', 'billingWebhook');
        Route::post('support-access-requests', 'storeAccessRequest')->middleware('throttle:identity');
        Route::get('support-workspace/{officineId}', 'supportReadWorkspace')->whereNumber('officineId');
    });
