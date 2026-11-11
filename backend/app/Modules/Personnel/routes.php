<?php

declare(strict_types=1);

use App\Modules\Personnel\Controllers\Module8PersonnelFormationController;
use Illuminate\Support\Facades\Route;

Route::prefix('api/v1/personnel')
    ->middleware(['api', 'auth:sanctum', 'tenant.context', 'module.active:personnel'])
    ->controller(Module8PersonnelFormationController::class)
    ->group(function (): void {
        Route::get('overview', 'overview');

        // Salariés & Dossiers RH
        Route::get('employees', 'employeesIndex');
        Route::post('employees', 'storeEmployee')->middleware('throttle:identity');
        Route::get('employees/{id}', 'showEmployee')->whereNumber('id');
        Route::put('employees/{id}', 'updateEmployee')->whereNumber('id')->middleware('throttle:identity');

        // Fiches de Poste
        Route::get('job-descriptions', 'jobDescriptionsIndex');
        Route::post('job-descriptions', 'storeJobDescription')->middleware('throttle:identity');
        Route::put('job-descriptions/{id}', 'updateJobDescription')->whereNumber('id')->middleware('throttle:identity');

        // Congés & Absences
        Route::get('leave-requests', 'leaveRequestsIndex');
        Route::post('leave-requests', 'storeLeaveRequest')->middleware('throttle:identity');
        Route::post('leave-requests/{id}/decision', 'decideLeaveRequest')->whereNumber('id')->middleware('throttle:identity');
        Route::get('leave-balances', 'leaveBalancesIndex');

        // Plannings & Gardes
        Route::get('shifts', 'shiftsIndex');
        Route::post('shifts', 'storeShift')->middleware('throttle:identity');
        Route::put('shifts/{id}', 'updateShift')->whereNumber('id')->middleware('throttle:identity');

        // Formations Continues
        Route::get('training-plans', 'trainingPlansIndex');
        Route::post('training-plans', 'storeTrainingPlan')->middleware('throttle:identity');
        Route::post('training-plans/{planId}/sessions', 'storeTrainingSession')->whereNumber('planId')->middleware('throttle:identity');
        Route::post('training-sessions/{sessionId}/attendances', 'recordSessionAttendance')->whereNumber('sessionId')->middleware('throttle:identity');

        // Évaluations des compétences
        Route::get('performance-reviews', 'reviewsIndex');
        Route::post('performance-reviews', 'storePerformanceReview')->middleware('throttle:identity');
    });
