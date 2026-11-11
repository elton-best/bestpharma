<?php

declare(strict_types=1);
use App\Modules\Qualite\Controllers\QualityActionController;
use App\Modules\Qualite\Controllers\AutoEvaluationController;
use App\Modules\Qualite\Controllers\Module4ActionController;
use App\Modules\Qualite\Controllers\Module5InspectionController;
use App\Modules\Qualite\Controllers\Module6NonconformiteController;
use App\Modules\Qualite\Controllers\Module7RisqueContinuiteController;
use App\Modules\Personnel\Controllers\Module8PersonnelFormationController;
use App\Modules\LocauxEquipements\Controllers\Module9EquipementLocauxController;
use App\Modules\Achats\Controllers\Module10PrestataireFournisseurController;
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

        // Module 05: Auto-inspections et Conformité BPD ABMed
        Route::prefix('inspections')->controller(Module5InspectionController::class)->group(function (): void {
            Route::get('overview', 'overview');
            Route::get('programs', 'programs');
            Route::post('programs', 'createProgram')->middleware('throttle:identity');
            Route::get('', 'index');
            Route::post('', 'store')->middleware('throttle:identity');
            Route::get('{id}', 'show')->whereNumber('id');
            Route::put('{id}', 'update')->whereNumber('id')->middleware('throttle:identity');
            Route::post('{id}/transition/{transition}', 'transition')->whereNumber('id')->middleware('throttle:identity');
            Route::post('{id}/responses', 'saveResponses')->whereNumber('id')->middleware('throttle:identity');
            Route::post('{id}/report', 'submitReport')->whereNumber('id')->middleware('throttle:identity');
            Route::post('{id}/sign', 'signReport')->whereNumber('id')->middleware('throttle:identity');
            Route::post('{id}/actions', 'createAction')->whereNumber('id')->middleware('throttle:identity');
            Route::post('{id}/evaluate-inspector', 'evaluateInspector')->whereNumber('id')->middleware('throttle:identity');
        });

        // Module 06: Non-conformités, Réclamations et Traitement CAPA
        Route::prefix('nonconformites')->controller(Module6NonconformiteController::class)->group(function (): void {
            Route::get('overview', 'overview');
            // Réclamations
            Route::get('complaints', 'complaintsIndex');
            Route::post('complaints', 'createComplaint')->middleware('throttle:identity');
            Route::get('complaints/{id}', 'showComplaint')->whereNumber('id');
            Route::put('complaints/{id}', 'updateComplaint')->whereNumber('id')->middleware('throttle:identity');
            Route::post('complaints/{id}/responses', 'addComplaintResponse')->whereNumber('id')->middleware('throttle:identity');
            Route::post('complaints/{id}/create-nc', 'createNcFromComplaint')->whereNumber('id')->middleware('throttle:identity');
            Route::post('complaints/{id}/close', 'closeComplaint')->whereNumber('id')->middleware('throttle:identity');
            // Non-conformités & Écarts
            Route::get('nc', 'ncIndex');
            Route::post('nc', 'createNc')->middleware('throttle:identity');
            Route::get('nc/{id}', 'showNc')->whereNumber('id');
            Route::put('nc/{id}', 'updateNc')->whereNumber('id')->middleware('throttle:identity');
            Route::post('nc/{id}/root-cause', 'saveRootCause')->whereNumber('id')->middleware('throttle:identity');
            Route::post('nc/{id}/actions', 'createCapaAction')->whereNumber('id')->middleware('throttle:identity');
            Route::post('nc/{id}/effectiveness', 'reviewEffectiveness')->whereNumber('id')->middleware('throttle:identity');
            Route::post('nc/{id}/close', 'closeNc')->whereNumber('id')->middleware('throttle:identity');
        });

        // Module 07: Gestion des Risques, Opportunités & Continuité d'Activité (PCA)
        Route::prefix('risques')->controller(Module7RisqueContinuiteController::class)->group(function (): void {
            Route::get('overview', 'overview');
            // Risques et opportunités
            Route::get('', 'risksIndex');
            Route::post('', 'createRisk')->middleware('throttle:identity');
            Route::get('{id}', 'showRisk')->whereNumber('id');
            Route::put('{id}', 'updateRisk')->whereNumber('id')->middleware('throttle:identity');
            Route::post('{id}/assess', 'assessRisk')->whereNumber('id')->middleware('throttle:identity');
            Route::post('{id}/actions', 'createCapaAction')->whereNumber('id')->middleware('throttle:identity');
            // Scénarios PCA & Exercices
            Route::get('pca/scenarios', 'scenariosIndex');
            Route::post('pca/scenarios', 'createScenario')->middleware('throttle:identity');
            Route::get('pca/scenarios/{id}', 'showScenario')->whereNumber('id');
            Route::put('pca/scenarios/{id}', 'updateScenario')->whereNumber('id')->middleware('throttle:identity');
            Route::post('pca/scenarios/{id}/exercises', 'logExercise')->whereNumber('id')->middleware('throttle:identity');
        });

        // Module 08: Personnel & Formations (CDC 08)
        Route::prefix('personnel')->controller(Module8PersonnelFormationController::class)->group(function (): void {
            Route::get('overview', 'overview');
            Route::get('employees', 'employeesIndex');
            Route::post('employees', 'storeEmployee')->middleware('throttle:identity');
            Route::get('employees/{id}', 'showEmployee')->whereNumber('id');
            Route::put('employees/{id}', 'updateEmployee')->whereNumber('id')->middleware('throttle:identity');
            Route::get('job-descriptions', 'jobDescriptionsIndex');
            Route::post('job-descriptions', 'storeJobDescription')->middleware('throttle:identity');
            Route::put('job-descriptions/{id}', 'updateJobDescription')->whereNumber('id')->middleware('throttle:identity');
            Route::get('leave-requests', 'leaveRequestsIndex');
            Route::post('leave-requests', 'storeLeaveRequest')->middleware('throttle:identity');
            Route::post('leave-requests/{id}/decision', 'decideLeaveRequest')->whereNumber('id')->middleware('throttle:identity');
            Route::get('leave-balances', 'leaveBalancesIndex');
            Route::get('shifts', 'shiftsIndex');
            Route::post('shifts', 'storeShift')->middleware('throttle:identity');
            Route::put('shifts/{id}', 'updateShift')->whereNumber('id')->middleware('throttle:identity');
            Route::get('training-plans', 'trainingPlansIndex');
            Route::post('training-plans', 'storeTrainingPlan')->middleware('throttle:identity');
            Route::post('training-plans/{planId}/sessions', 'storeTrainingSession')->whereNumber('planId')->middleware('throttle:identity');
            Route::post('training-sessions/{sessionId}/attendances', 'recordSessionAttendance')->whereNumber('sessionId')->middleware('throttle:identity');
            Route::get('performance-reviews', 'reviewsIndex');
            Route::post('performance-reviews', 'storePerformanceReview')->middleware('throttle:identity');
        });

        // Module 09 : Équipements & Locaux (CDC 09)
        Route::prefix('locauxequipements')->controller(Module9EquipementLocauxController::class)->group(function (): void {
            Route::get('overview', 'overview');
            Route::get('locations', 'locationsIndex');
            Route::post('locations', 'storeLocation')->middleware('throttle:identity');
            Route::get('equipments', 'equipmentsIndex');
            Route::post('equipments', 'storeEquipment')->middleware('throttle:identity');
            Route::get('equipments/{id}', 'showEquipment')->whereNumber('id');
            Route::put('equipments/{id}', 'updateEquipment')->whereNumber('id')->middleware('throttle:identity');
            Route::post('equipments/{id}/commissioning', 'storeCommissioningTest')->whereNumber('id')->middleware('throttle:identity');
            Route::get('maintenance-plans', 'maintenancePlansIndex');
            Route::post('maintenance-plans', 'storeMaintenancePlan')->middleware('throttle:identity');
            Route::get('maintenance-events', 'maintenanceEventsIndex');
            Route::post('maintenance-events', 'storeMaintenanceEvent')->middleware('throttle:identity');
            Route::post('maintenance-events/{id}/verify', 'verifyMaintenanceEvent')->whereNumber('id')->middleware('throttle:identity');
            Route::get('generator-tests', 'generatorTestsIndex');
            Route::post('generator-tests', 'storeGeneratorTest')->middleware('throttle:identity');
            Route::get('cleaning-plans', 'cleaningPlansIndex');
            Route::post('cleaning-plans', 'storeCleaningPlan')->middleware('throttle:identity');
            Route::get('cleaning-occurrences', 'cleaningOccurrencesIndex');
            Route::post('cleaning-occurrences', 'storeCleaningOccurrence')->middleware('throttle:identity');
            Route::post('cleaning-occurrences/{id}/verify', 'verifyCleaningOccurrence')->whereNumber('id')->middleware('throttle:identity');
            Route::get('withdrawals', 'withdrawalsIndex');
            Route::post('withdrawals', 'requestWithdrawal')->middleware('throttle:identity');
            Route::post('withdrawals/{id}/decision', 'decideWithdrawal')->whereNumber('id')->middleware('throttle:identity');
        });

        // Module 10 : Prestataires & Fournisseurs (CDC 10 - alias qualité)
        Route::prefix('achats')->controller(Module10PrestataireFournisseurController::class)->group(function (): void {
            Route::get('overview', 'overview');
            Route::get('suppliers', 'suppliersIndex');
            Route::post('suppliers', 'storeSupplier')->middleware('throttle:identity');
            Route::get('suppliers/{id}', 'showSupplier')->whereNumber('id');
            Route::put('suppliers/{id}', 'updateSupplier')->whereNumber('id')->middleware('throttle:identity');
            Route::get('selections', 'selectionsIndex');
            Route::post('selections', 'storeSelection')->middleware('throttle:identity');
            Route::post('selections/{id}/validate', 'validateSelection')->whereNumber('id')->middleware('throttle:identity');
            Route::get('evaluation-templates', 'evaluationTemplatesIndex');
            Route::get('evaluations', 'evaluationsIndex');
            Route::post('evaluations', 'storeEvaluation')->middleware('throttle:identity');
            Route::get('complaints', 'complaintsIndex');
            Route::post('complaints', 'storeComplaint')->middleware('throttle:identity');
            Route::post('complaints/{id}/resolve', 'resolveComplaint')->whereNumber('id')->middleware('throttle:identity');
            Route::get('contracts', 'contractsIndex');
            Route::post('contracts', 'storeContract')->middleware('throttle:identity');
        });
    });
