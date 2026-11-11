<?php

declare(strict_types=1);
use App\Http\Controllers\Auth\SessionController;
use Illuminate\Support\Facades\Route;

Route::post('auth/login', [SessionController::class, 'login'])->middleware('throttle:auth.login');
Route::post('auth/logout', [SessionController::class, 'logout'])->middleware('auth:sanctum');
Route::get('health', fn () => response()->json(['status' => 'ok', 'app' => 'BestPharma']));
Route::prefix('gardes')->middleware(['auth:sanctum','tenant.context'])->group(function(){
 Route::get('',[\App\Modules\Pharmacies\Controllers\PharmacyGuardController::class,'index']);
 Route::post('',[\App\Modules\Pharmacies\Controllers\PharmacyGuardController::class,'store'])->middleware('throttle:identity');
 Route::put('{id}',[\App\Modules\Pharmacies\Controllers\PharmacyGuardController::class,'update'])->whereNumber('id')->middleware('throttle:identity');
 Route::delete('{id}',[\App\Modules\Pharmacies\Controllers\PharmacyGuardController::class,'destroy'])->whereNumber('id')->middleware('throttle:identity');
});

Route::post('auth/register', [\App\Modules\Tenancy\Controllers\ApplicationController::class, 'register'])->middleware('throttle:auth.register');
Route::middleware('auth:sanctum')->group(function () {
    Route::get('applications', [\App\Modules\Tenancy\Controllers\ApplicationController::class, 'index']);
    Route::put('applications/{id}', [\App\Modules\Tenancy\Controllers\ApplicationController::class, 'resubmit'])->whereNumber('id');
    Route::get('platform/applications', [\App\Modules\PlatformAdmin\Controllers\ApplicationReviewController::class, 'index']);
    Route::post('platform/applications/{id}/decision', [\App\Modules\PlatformAdmin\Controllers\ApplicationReviewController::class, 'update'])->whereNumber('id')->middleware('throttle:platform.review');
});

Route::post('invitations/accept', \App\Modules\Users\Controllers\AcceptInvitationController::class)->middleware('throttle:invitations.accept');
Route::prefix('team')->middleware(['auth:sanctum', 'tenant.context'])->group(function () {
    Route::get('/', [\App\Modules\Users\Controllers\TeamController::class, 'index']);
    Route::post('roles', [\App\Modules\Users\Controllers\TeamController::class, 'saveRole']);
    Route::put('roles/{roleId}', [\App\Modules\Users\Controllers\TeamController::class, 'saveRole'])->whereNumber('roleId');
    Route::put('members/{memberId}', [\App\Modules\Users\Controllers\TeamController::class, 'updateMember'])->whereNumber('memberId');
    Route::post('invitations', [\App\Modules\Users\Controllers\TeamController::class, 'invite'])->middleware('throttle:team.invite');
    Route::delete('invitations/{inviteId}', [\App\Modules\Users\Controllers\TeamController::class, 'revoke'])->whereNumber('inviteId');
});

// Module 01: account context is authenticated independently of the selected tenant.
Route::middleware('auth:sanctum')->group(function () {
 Route::get('me', [\App\Modules\Tenancy\Controllers\MyAccountController::class,'show']);
 Route::put('me', [\App\Modules\Tenancy\Controllers\MyAccountController::class,'update']);
 Route::get('platform/support-directory', [\App\Modules\Tenancy\Controllers\SupportAssignmentController::class,'directory']);
 Route::get('platform/officines/{officeId}/support', [\App\Modules\Tenancy\Controllers\SupportAssignmentController::class,'platformIndex'])->whereNumber('officeId');
 Route::post('platform/officines/{officeId}/support', [\App\Modules\Tenancy\Controllers\SupportAssignmentController::class,'propose'])->whereNumber('officeId');
});
Route::prefix('officine')->middleware(['auth:sanctum','tenant.context'])->group(function () {
 Route::get('/', [\App\Modules\Tenancy\Controllers\OfficineProfileController::class,'show']);
 Route::put('/', [\App\Modules\Tenancy\Controllers\OfficineProfileController::class,'update']);
 Route::get('contacts', [\App\Modules\Tenancy\Controllers\OfficineProfileController::class,'contacts']);
 Route::post('contacts', [\App\Modules\Tenancy\Controllers\OfficineProfileController::class,'saveContact']);
 Route::put('contacts/{contactId}', [\App\Modules\Tenancy\Controllers\OfficineProfileController::class,'saveContact'])->whereNumber('contactId');
 Route::get('history', [\App\Modules\Tenancy\Controllers\OfficineProfileController::class,'history']);
 Route::get('support', [\App\Modules\Tenancy\Controllers\SupportAssignmentController::class,'index']);
 Route::post('support/{assignmentId}/decision', [\App\Modules\Tenancy\Controllers\SupportAssignmentController::class,'decide'])->whereNumber('assignmentId');
});

Route::prefix('auth')->middleware('throttle:identity')->group(function () {
 Route::post('forgot-password',[\App\Modules\Identity\Controllers\SecurityController::class,'forgot']);
 Route::post('reset-password',[\App\Modules\Identity\Controllers\SecurityController::class,'reset']);
 Route::post('email/verify',[\App\Modules\Identity\Controllers\SecurityController::class,'verify']);
});
Route::middleware(['auth:sanctum','throttle:identity'])->group(function () {
 Route::post('auth/email/request',[\App\Modules\Identity\Controllers\SecurityController::class,'requestVerification']);
 Route::get('security',[\App\Modules\Identity\Controllers\SecurityController::class,'status']);
 Route::post('security/password',[\App\Modules\Identity\Controllers\SecurityController::class,'changePassword']);
 Route::post('security/email',[\App\Modules\Identity\Controllers\SecurityController::class,'changeEmail']);
 Route::post('security/mfa/setup',[\App\Modules\Identity\Controllers\SecurityController::class,'setupMfa']);
 Route::post('security/mfa/confirm',[\App\Modules\Identity\Controllers\SecurityController::class,'confirmMfa']);
 Route::delete('security/mfa',[\App\Modules\Identity\Controllers\SecurityController::class,'disableMfa']);
 Route::get('security/sessions',[\App\Modules\Identity\Controllers\SecurityController::class,'sessions']);
 Route::delete('security/sessions/{id}',[\App\Modules\Identity\Controllers\SecurityController::class,'revokeSession'])->whereNumber('id');
});
Route::middleware('auth:sanctum')->group(function () {
 Route::get('notifications',[\App\Modules\Identity\Controllers\SecurityController::class,'notifications']);
 Route::post('notifications/{id}/read',[\App\Modules\Identity\Controllers\SecurityController::class,'read'])->whereNumber('id');
 Route::get('notifications/{id}/preview',[\App\Modules\Identity\Controllers\SecurityController::class,'preview'])->whereNumber('id');
});

Route::middleware('auth:sanctum')->group(function () {
 Route::post('registration-applications',[\App\Modules\Tenancy\Controllers\ApplicationDraftController::class,'create']);
 Route::patch('registration-applications/{id}',[\App\Modules\Tenancy\Controllers\ApplicationDraftController::class,'save'])->whereNumber('id');
 Route::post('registration-applications/{id}/submit',[\App\Modules\Tenancy\Controllers\ApplicationDraftController::class,'submit'])->whereNumber('id');
 Route::get('registration-applications/{id}/comments',[\App\Modules\Tenancy\Controllers\ApplicationDraftController::class,'comments'])->whereNumber('id');
 Route::post('registration-applications/{id}/comments',[\App\Modules\Tenancy\Controllers\ApplicationDraftController::class,'comment'])->whereNumber('id');
 Route::get('registration-applications/{id}/documents',[\App\Modules\Tenancy\Controllers\ApplicationDraftController::class,'documents'])->whereNumber('id');
 Route::post('registration-applications/{id}/documents',[\App\Modules\Tenancy\Controllers\ApplicationDraftController::class,'upload'])->whereNumber('id');
 Route::get('registration-applications/{id}/documents/{documentId}',[\App\Modules\Tenancy\Controllers\ApplicationDraftController::class,'download'])->whereNumber('id')->whereNumber('documentId');
});
Route::prefix('team')->middleware(['auth:sanctum','tenant.context'])->group(function () {
 Route::post('roles/{roleId}/duplicate',[\App\Modules\Users\Controllers\TeamController::class,'duplicateRole'])->whereNumber('roleId');
 Route::post('roles/{roleId}/state',[\App\Modules\Users\Controllers\TeamController::class,'roleState'])->whereNumber('roleId');
 Route::post('invitations/{inviteId}/resend',[\App\Modules\Users\Controllers\TeamController::class,'resend'])->whereNumber('inviteId')->middleware('throttle:team.invite');
});
Route::get('auth/providers',[\App\Modules\Identity\Controllers\GoogleIdentityController::class,'availability']);
Route::post('auth/google/start',[\App\Modules\Identity\Controllers\GoogleIdentityController::class,'start'])->middleware('throttle:identity');
Route::get('auth/google/callback',[\App\Modules\Identity\Controllers\GoogleIdentityController::class,'callback'])->middleware('throttle:identity');
Route::post('auth/google/exchange',[\App\Modules\Identity\Controllers\GoogleIdentityController::class,'exchange'])->middleware('throttle:identity');
Route::delete('security/google',[\App\Modules\Identity\Controllers\GoogleIdentityController::class,'unlink'])->middleware(['auth:sanctum','throttle:identity']);
Route::post('platform/officines/{officeId}/support/{assignmentId}/end',[\App\Modules\Tenancy\Controllers\SupportAssignmentController::class,'end'])->middleware('auth:sanctum')->whereNumber('officeId')->whereNumber('assignmentId');
Route::get('platform/officines',[\App\Modules\PlatformAdmin\Controllers\OfficeStateController::class,'index'])->middleware('auth:sanctum');
Route::post('platform/officines/{id}/state',[\App\Modules\PlatformAdmin\Controllers\OfficeStateController::class,'update'])->middleware('auth:sanctum')->whereNumber('id');
Route::get('platform/internal-team',[\App\Modules\Identity\Controllers\InternalTeamController::class,'index'])->middleware('auth:sanctum');
Route::post('platform/internal-team/invitations',[\App\Modules\Identity\Controllers\InternalTeamController::class,'invite'])->middleware(['auth:sanctum','throttle:identity']);
Route::put('platform/internal-team/{id}',[\App\Modules\Identity\Controllers\InternalTeamController::class,'update'])->middleware('auth:sanctum')->whereNumber('id');
Route::post('internal-invitations/accept',[\App\Modules\Identity\Controllers\InternalTeamController::class,'accept'])->middleware('throttle:identity');
Route::post('security/mfa/recovery-codes',[\App\Modules\Identity\Controllers\SecurityController::class,'recoveryCodes'])->middleware(['auth:sanctum','throttle:identity']);
Route::get('platform/accounts',[\App\Modules\PlatformAdmin\Controllers\AccountStateController::class,'index'])->middleware('auth:sanctum');
Route::post('platform/accounts/{id}/state',[\App\Modules\PlatformAdmin\Controllers\AccountStateController::class,'update'])->middleware(['auth:sanctum','throttle:identity'])->whereNumber('id');
Route::middleware(['auth:sanctum','tenant.context'])->group(function(){
 Route::get('officine/logo',[\App\Modules\Tenancy\Controllers\OfficeLogoController::class,'show']);
 Route::post('officine/logo',[\App\Modules\Tenancy\Controllers\OfficeLogoController::class,'save']);
 Route::delete('officine/logo',[\App\Modules\Tenancy\Controllers\OfficeLogoController::class,'destroy']);
});
Route::middleware(['auth:sanctum','tenant.context'])->group(function(){
 Route::get('officine/summary',[\App\Modules\Tenancy\Controllers\ModuleSummaryController::class,'show']);
 Route::get('officine/journal',[\App\Modules\Tenancy\Controllers\AccessJournalController::class,'index']);
});
Route::get('platform/summary',[\App\Modules\Tenancy\Controllers\ModuleSummaryController::class,'show'])->middleware('auth:sanctum')->name('socle.platform.summary');
Route::get('platform/journal',[\App\Modules\Tenancy\Controllers\AccessJournalController::class,'index'])->middleware('auth:sanctum')->name('socle.platform.journal');
Route::post('notifications/{id}/retry',[\App\Modules\Identity\Controllers\SecurityController::class,'retry'])->middleware(['auth:sanctum','throttle:identity'])->whereNumber('id');
Route::post('officine/journal/export',[\App\Modules\Tenancy\Controllers\AccessJournalController::class,'export'])->middleware(['auth:sanctum','tenant.context','throttle:identity']);
Route::post('platform/journal/export',[\App\Modules\Tenancy\Controllers\AccessJournalController::class,'export'])->middleware(['auth:sanctum','throttle:identity'])->name('socle.platform.journal.export');
Route::prefix('support/requests')->middleware(['auth:sanctum','tenant.context'])->group(function(){
 Route::get('',[\App\Modules\Accompagnement\Controllers\SupportRequestController::class,'index']);
 Route::post('',[\App\Modules\Accompagnement\Controllers\SupportRequestController::class,'create'])->middleware('throttle:identity');
 Route::post('{id}/mission-decision',[\App\Modules\Accompagnement\Controllers\SupportMissionController::class,'decide'])->whereNumber('id')->middleware('throttle:identity');
 Route::patch('{id}',[\App\Modules\Accompagnement\Controllers\SupportRequestController::class,'save'])->whereNumber('id');
 Route::post('{id}/submit',[\App\Modules\Accompagnement\Controllers\SupportRequestController::class,'submit'])->whereNumber('id');
 Route::post('{id}/withdraw',[\App\Modules\Accompagnement\Controllers\SupportRequestController::class,'withdraw'])->whereNumber('id');
});

Route::prefix('support/intake')->middleware('auth:sanctum')->group(function(){
 Route::get('',[\App\Modules\Accompagnement\Controllers\SupportIntakeController::class,'index']);
 Route::post('{id}/qualify',[\App\Modules\Accompagnement\Controllers\SupportIntakeController::class,'qualify'])->whereNumber('id')->middleware('throttle:identity');
});

Route::post('support/intake/{id}/propose-mission',[\App\Modules\Accompagnement\Controllers\SupportMissionController::class,'propose'])->middleware(['auth:sanctum','throttle:identity'])->whereNumber('id');

Route::prefix('stock')->middleware(['auth:sanctum','tenant.context'])->group(function(){
 Route::get('workspace',[\App\Modules\Stock\Controllers\StockController::class,'index']);
 Route::post('operations',[\App\Modules\Stock\Controllers\StockController::class,'operate'])->middleware('throttle:identity');
});

Route::prefix('support/missions')->middleware(['auth:sanctum','tenant.context'])->group(function(){
 Route::get('',[\App\Modules\Accompagnement\Controllers\MissionWorkspaceController::class,'index']);
 Route::get('{id}',[\App\Modules\Accompagnement\Controllers\MissionWorkspaceController::class,'show'])->whereNumber('id');
 Route::post('{id}/transition',[\App\Modules\Accompagnement\Controllers\MissionWorkspaceController::class,'transition'])->whereNumber('id')->middleware('throttle:identity');
 Route::post('{id}/team/{memberId}/decision',[\App\Modules\Accompagnement\Controllers\MissionWorkspaceController::class,'decideMember'])->whereNumber('id')->whereNumber('memberId')->middleware('throttle:identity');
});
Route::prefix('support/intake/{requestId}/team')->middleware('auth:sanctum')->whereNumber('requestId')->group(function(){
 Route::get('',[\App\Modules\Accompagnement\Controllers\MissionWorkspaceController::class,'centralTeam']);
 Route::post('',[\App\Modules\Accompagnement\Controllers\MissionWorkspaceController::class,'proposeMember'])->middleware('throttle:identity');
});

Route::prefix('support/missions/{id}/visits')->middleware(['auth:sanctum','tenant.context'])->whereNumber('id')->group(function(){
 Route::get('',[\App\Modules\Accompagnement\Controllers\MissionVisitController::class,'index']);
 Route::post('',[\App\Modules\Accompagnement\Controllers\MissionVisitController::class,'create'])->middleware('throttle:identity');
 Route::post('{visitId}/transition',[\App\Modules\Accompagnement\Controllers\MissionVisitController::class,'transition'])->whereNumber('visitId')->middleware('throttle:identity');
 Route::post('{visitId}/reports',[\App\Modules\Accompagnement\Controllers\MissionVisitController::class,'report'])->whereNumber('visitId')->middleware('throttle:identity');
 Route::patch('{visitId}/reports/{reportId}',[\App\Modules\Accompagnement\Controllers\MissionVisitController::class,'report'])->whereNumber('visitId')->whereNumber('reportId')->middleware('throttle:identity');
 Route::post('{visitId}/reports/{reportId}/decision',[\App\Modules\Accompagnement\Controllers\MissionVisitController::class,'reportDecision'])->whereNumber('visitId')->whereNumber('reportId')->middleware('throttle:identity');
});

Route::prefix('support/missions/{id}/diagnostics')->middleware(['auth:sanctum','tenant.context'])->whereNumber('id')->group(function(){
 Route::get('',[\App\Modules\Accompagnement\Controllers\MissionDiagnosticController::class,'index']);
 Route::post('templates',[\App\Modules\Accompagnement\Controllers\MissionDiagnosticController::class,'createTemplate'])->middleware('throttle:identity');
 Route::patch('templates/{templateId}',[\App\Modules\Accompagnement\Controllers\MissionDiagnosticController::class,'saveTemplate'])->whereNumber('templateId')->middleware('throttle:identity');
 Route::post('templates/{templateId}/publish',[\App\Modules\Accompagnement\Controllers\MissionDiagnosticController::class,'publishTemplate'])->whereNumber('templateId')->middleware('throttle:identity');
 Route::post('',[\App\Modules\Accompagnement\Controllers\MissionDiagnosticController::class,'create'])->middleware('throttle:identity');
 Route::patch('{diagnosticId}',[\App\Modules\Accompagnement\Controllers\MissionDiagnosticController::class,'save'])->whereNumber('diagnosticId')->middleware('throttle:identity');
 Route::post('{diagnosticId}/decision',[\App\Modules\Accompagnement\Controllers\MissionDiagnosticController::class,'decision'])->whereNumber('diagnosticId')->middleware('throttle:identity');
});

Route::prefix('support/missions/{id}/findings')->middleware(['auth:sanctum','tenant.context'])->whereNumber('id')->group(function(){
 Route::get('',[\App\Modules\Accompagnement\Controllers\MissionFindingController::class,'index']);
 Route::post('',[\App\Modules\Accompagnement\Controllers\MissionFindingController::class,'create'])->middleware('throttle:identity');
 Route::patch('{findingId}',[\App\Modules\Accompagnement\Controllers\MissionFindingController::class,'save'])->whereNumber('findingId')->middleware('throttle:identity');
 Route::post('{findingId}/share',[\App\Modules\Accompagnement\Controllers\MissionFindingController::class,'share'])->whereNumber('findingId')->middleware('throttle:identity');
});

Route::prefix('support/missions/{id}/plan')->middleware(['auth:sanctum','tenant.context'])->whereNumber('id')->group(function(){
 Route::get('',[\App\Modules\Accompagnement\Controllers\MissionPlanController::class,'index']);
 Route::put('',[\App\Modules\Accompagnement\Controllers\MissionPlanController::class,'save'])->middleware('throttle:identity');
 Route::post('submit',[\App\Modules\Accompagnement\Controllers\MissionPlanController::class,'submit'])->middleware('throttle:identity');
 Route::post('decision',[\App\Modules\Accompagnement\Controllers\MissionPlanController::class,'decide'])->middleware('throttle:identity');
});

Route::prefix('support/missions/{id}/comments')->middleware(['auth:sanctum','tenant.context'])->whereNumber('id')->group(function(){
 Route::get('',[\App\Modules\Accompagnement\Controllers\MissionCommentController::class,'index']);
 Route::post('',[\App\Modules\Accompagnement\Controllers\MissionCommentController::class,'create'])->middleware('throttle:identity');
});
