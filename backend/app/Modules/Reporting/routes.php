<?php

declare(strict_types=1);

use App\Modules\Reporting\Controllers\Module14ReportingController;
use Illuminate\Support\Facades\Route;

// Routes API du module Reporting — préfixées /api/v1/reporting via ModuleServiceProvider
Route::prefix('api/v1/reporting')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:reporting'])
    ->controller(Module14ReportingController::class)
    ->group(function (): void {
        Route::get('overview', 'overview');
        Route::get('metrics', 'metricsIndex');
        Route::post('metrics', 'storeMetric')->middleware('throttle:identity');
        Route::get('preferences', 'preferencesShow');
        Route::post('preferences', 'savePreferences')->middleware('throttle:identity');
        Route::get('templates', 'templatesIndex');
        Route::post('templates', 'storeTemplate')->middleware('throttle:identity');
        Route::get('runs', 'runsIndex');
        Route::post('runs', 'generateRun')->middleware('throttle:identity');
        Route::post('runs/{id}/export', 'exportRun')->whereNumber('id')->middleware('throttle:identity');
        Route::post('compare-officines', 'compareOfficines');
        Route::get('notification-jobs', 'notificationJobsIndex');
        Route::post('notification-jobs/{id}/retry', 'retryNotificationJob')->whereNumber('id')->middleware('throttle:identity');
    });
