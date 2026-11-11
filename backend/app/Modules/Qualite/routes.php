<?php

declare(strict_types=1);
use App\Modules\Qualite\Controllers\QualityActionController;
use App\Modules\Qualite\Controllers\AutoEvaluationController;
use App\Modules\Qualite\Controllers\Module4ActionController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/qualite')->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:qualite'])
    ->group(function (): void {
        Route::get('actions', [QualityActionController::class, 'index']);
        Route::post('actions', [QualityActionController::class, 'store']);
        Route::put('actions/{id}', [QualityActionController::class, 'update'])->whereNumber('id');
        Route::get('auto-evaluations', [AutoEvaluationController::class, 'index']);
        Route::prefix('actions-v2')->controller(Module4ActionController::class)->group(function (): void {
            Route::get('', 'overview');
            Route::get('plans', 'plans');
            Route::post('plans', 'createPlan')->middleware('throttle:identity');
            Route::put('plans/{id}', 'updatePlan')->whereNumber('id')->middleware('throttle:identity');
            Route::post('plans/{id}/submit', 'submitPlan')->whereNumber('id')->middleware('throttle:identity');
            Route::post('plans/{id}/decision', 'decidePlan')->whereNumber('id')->middleware('throttle:identity');
            Route::post('actions', 'createAction')->middleware('throttle:identity');
            Route::get('actions/{id}', 'show')->whereNumber('id');
            Route::put('actions/{id}', 'updateAction')->whereNumber('id')->middleware('throttle:identity');
            Route::post('actions/{id}/evidence', 'addEvidence')->whereNumber('id')->middleware('throttle:identity');
            Route::post('actions/{id}/effectiveness', 'effectiveness')->whereNumber('id')->middleware('throttle:identity');
            Route::post('actions/{id}/{transition}', 'transition')->whereNumber('id')->middleware('throttle:identity');
            Route::post('import-mission/{missionId}', 'importMissionPlan')->whereNumber('missionId')->middleware('throttle:identity');
        });
    });
